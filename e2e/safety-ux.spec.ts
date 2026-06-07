import { test, expect, type Page } from '@playwright/test';

// ── PR FE6 — safety UX: AI disclosure + safeguarding deflection + cap + raise-hand
// (learn-game-studio-prd §11 / J13 / J4). Every backend call is ROUTE-MOCKED
// (page.route) so the suite is offline + byte-deterministic: auth bootstrap,
// /auth/me (a kid), wallet, project list, the seeded VFS read, the create, AND —
// the heart of this PR — the safeguarding CLASSIFY (`POST …/code/turn/classify`)
// which the studio calls BEFORE any turn (J13 sequence: classify before any LLM).
// No network, no live LLM (CLAUDE.md #5).
//
// Asserts the J13/J4 surface:
//   - the persistent AI disclosure ("robot helper, not a person") is always shown;
//   - a DISTRESS message shows the break-character deflection + a STANDING crisis
//     resource AND does NOT run a game turn (no POST /code/turn, no Stars, no diff);
//   - the crisis resource is STICKY (a second message keeps it pinned);
//   - a PERSONAL-DISCLOSURE deflects WITHOUT a crisis resource;
//   - the at-cap turn shows the "ask your grown-up" cap message;
//   - "Ask my teacher" raise-hand flips into a calm waiting state;
//   - a stable screenshot of the rescue surface.

const GAME_JS = `new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 320,
  height: 240,
  backgroundColor: '#0f172a',
  scene: { create() { this.add.rectangle(160, 120, 40, 40, 0x38bdf8); } },
});
`;

const SEEDED_VFS = {
  version: 1,
  files: [{ path: 'main.js', content: GAME_JS, kind: 'text', size: GAME_JS.length }],
};

const CRISIS = {
  name: 'Kids Helpline',
  phone: '1800 55 1800',
  note: "You're not in trouble. Talk to a grown-up you trust, any time.",
};

const DISTRESS_VERDICT = {
  class: 'distress',
  message: "I'm just a game helper, so I can't help with this — but a grown-up you trust can. Please talk to someone now.",
  crisisResource: CRISIS,
};

const PERSONAL_VERDICT = {
  class: 'personal-disclosure',
  message: "That sounds important — I'm just a game helper, so it's best to share that with a grown-up you trust.",
};

type Verdict = typeof DISTRESS_VERDICT | typeof PERSONAL_VERDICT | null;

/**
 * Seat a kid session + mock every backend the studio touches. `classify` decides
 * the safeguarding verdict per call (it can change across messages to drive the
 * sticky-mode assertion). `capped` makes the turn POST return the cap error.
 */
async function mockBackendAsKid(
  page: Page,
  opts: { age?: number; classify?: () => Verdict; capped?: boolean } = {},
) {
  const kid = { id: 'kid-1', nickname: 'Robo', age: opts.age ?? 9, family_id: 'fam-1' };
  const stars = 42;
  const classify = opts.classify ?? (() => null);

  await page.route('**/auth/refresh', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'kid-token' }) }),
  );
  await page.route('**/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'kid', kid }) }),
  );
  await page.route('**/families/*/wallet', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stars_balance: stars }) }),
  );
  await page.route('**/kids/*/projects*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
  );

  // The safeguarding classify — runs BEFORE any turn (J13). When it returns a
  // verdict the studio deflects and NEVER posts a turn.
  await page.route('**/projects/*/code/turn/classify', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ safeguarding: classify() }),
    }),
  );

  // The "Ask my teacher" raise-hand signal (J4) — accept it; the calm waiting
  // state never depends on it.
  await page.route('**/projects/*/raise-hand', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );

  // The agent turn. In `capped` mode it returns the cap error (the parent
  // spending-cap block, §11g(e)); otherwise it's a no-op success (these tests
  // never reach a turn on the happy safeguarding path).
  await page.route('**/projects/*/code/turn', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    if (opts.capped) {
      return route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'DAILY_CAP_EXCEEDED', message: 'cap' } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        turn_id: 'turn-1',
        requires_approval: false,
        plan: null,
        changes: [],
        files: SEEDED_VFS.files,
        summary: 'ok',
        stars_charged: 0,
        tools_fired: [],
      }),
    });
  });

  await page.route('**/projects/*/code/files', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SEEDED_VFS) });
    }
    const b = route.request().postDataJSON() as { files: unknown; version: number };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: b.files, version: b.version + 1 }) });
  });

  await page.route('**/projects', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'game-77' }) });
  });
}

/** Drive the authed J1 hub → studio flow into the chat-first workspace. */
async function openStudio(page: Page) {
  await page.goto('/learn/create/code');
  await page.getByTestId('hub-template-pong').click();
  await expect(page).toHaveURL(/\/learn\/playground\/game-77$/);
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 10_000 });
}

test('the persistent AI disclosure ("robot helper, not a person") is always shown', async ({ page }) => {
  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);
  const disclosure = page.getByTestId('ai-disclosure');
  await expect(disclosure).toBeVisible();
  await expect(disclosure).toContainText(/robot helper, not a person/i);
});

test('J13 distress: deflection + standing crisis resource, and NO game turn runs', async ({ page }) => {
  // Record every turn POST — a distress message must NEVER become a game turn.
  const turnPosts: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/code\/turn$/.test(req.url())) turnPosts.push(req.url());
  });

  await mockBackendAsKid(page, { age: 9, classify: () => DISTRESS_VERDICT });
  await openStudio(page);

  await page.getByTestId('chat-input').fill('i feel like nobody would care if i was gone');
  await page.getByTestId('chat-send').click();

  // The agent breaks character (deflection) — NOT an agency beat / streamed turn.
  await expect(page.getByTestId('safeguard-break')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('agency-card')).toHaveCount(0);
  await expect(page.getByTestId('agent-msg-streaming')).toHaveCount(0);

  // A STANDING, region-correct crisis resource is shown with the backend's number.
  await expect(page.getByTestId('crisis-resource')).toBeVisible();
  await expect(page.getByTestId('crisis-phone')).toHaveText('1800 55 1800');

  // No game turn was ever issued — the classifier deflected before any LLM call.
  expect(turnPosts).toHaveLength(0);
  // Stars unchanged — nothing was spent on a deflection.
  await expect(page.getByTestId('stars-badge')).toContainText('42');

  // Sticky safe-mode: a SECOND message keeps the crisis resource pinned (it does
  // not reset to normal game-help).
  await page.getByTestId('chat-input').fill('add a coin');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('crisis-resource')).toBeVisible();
});

test('J13 personal-disclosure: deflects WITHOUT a crisis resource or escalation', async ({ page }) => {
  await mockBackendAsKid(page, { age: 9, classify: () => PERSONAL_VERDICT });
  await openStudio(page);

  await page.getByTestId('chat-input').fill('my dog died yesterday');
  await page.getByTestId('chat-send').click();

  await expect(page.getByTestId('safeguard-break')).toBeVisible({ timeout: 6_000 });
  // A personal disclosure deflects + logs, but is NOT a distress event — no
  // standing crisis resource is surfaced.
  await expect(page.getByTestId('crisis-resource')).toHaveCount(0);
  await expect(page.getByTestId('agency-card')).toHaveCount(0);
});

test('at-cap: a blocked turn shows the "ask your grown-up" cap message', async ({ page }) => {
  await mockBackendAsKid(page, { age: 13, capped: true }); // Pro tier → turn POSTs on send
  await openStudio(page);

  await page.getByTestId('chat-input').fill('make the ball faster');
  await page.getByTestId('chat-send').click();

  await expect(page.getByTestId('cap-message')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('cap-message')).toContainText(/grown-up/i);
});

test('J4 raise-hand: "Ask my teacher" flips into a calm waiting state', async ({ page }) => {
  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);

  const raise = page.getByTestId('raise-hand');
  await expect(raise).toContainText(/ask my teacher/i);
  await raise.click();

  await expect(page.getByTestId('raise-hand-waiting')).toBeVisible();
  await expect(page.getByTestId('raise-hand-waiting')).toContainText(/teacher will come help/i);
  // The button reflects the raised state (calm, idempotent — no second signal).
  await expect(raise).toContainText(/hand up/i);
  await expect(raise).toBeDisabled();
});

// ── Stable rescue-surface screenshot ──────────────────────────────────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: the distress deflection + standing crisis resource', async ({ page }) => {
    await mockBackendAsKid(page, { age: 9, classify: () => DISTRESS_VERDICT });
    await openStudio(page);

    await page.getByTestId('chat-input').fill('i feel like nobody would care if i was gone');
    await page.getByTestId('chat-send').click();
    const crisis = page.getByTestId('crisis-resource');
    await expect(crisis).toBeVisible({ timeout: 6_000 });
    await expect(crisis).toHaveScreenshot('crisis-resource.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});
