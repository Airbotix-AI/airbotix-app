import { test, expect, type Page } from '@playwright/test';

import { mockBackendAsKid, openStudio } from './helpers';

// ── PR FE6 — safety UX: AI disclosure + safeguarding deflection + cap + raise-hand
// (learn-game-studio-prd §11 / J13 / J4). MIGRATED onto the shared harness
// (`e2e/helpers.ts`): `mockBackendAsKid` seats a kid + mocks every backend the
// studio touches (auth WITH `?kind=kid`, /classes/mine, wallet, the VFS, the
// prompt-first hub→landing→create flow), and `openStudio` drives it into the
// workspace on `game-77`. This spec layers its SPECIAL mocks ON TOP (registered
// AFTER mockBackendAsKid so Playwright's most-recently-added match wins): the
// safeguarding CLASSIFY (`POST …/code/turn/classify`) returning the deflection
// verdicts, the raise-hand signal, and the at-cap turn (402). No live LLM.
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
 * Seat a kid via the shared harness, then layer THIS PR's safety mocks ON TOP
 * (registered AFTER `mockBackendAsKid` so Playwright's most-recently-added match
 * wins). `classify` decides the safeguarding verdict per call (it can change
 * across messages to drive the sticky-mode assertion); `capped` makes the turn
 * POST return the cap error (the parent spending-cap block, §11g(e)).
 *
 * The cap test runs as a Pro kid (`age: 13`) so a send POSTs the turn directly
 * (no Lite agency beat) and immediately hits the mocked 402.
 *
 * `inClass` puts the kid in a class so the "Ask my teacher" raise-hand surfaces:
 * Workspace gates the button on `GET /classes/mine` being non-empty, and the
 * shared harness mocks it EMPTY (the right default for the other specs). The
 * raise-hand test overrides it with one class.
 */
async function seatKid(
  page: Page,
  opts: { age?: number; classify?: () => Verdict; capped?: boolean; inClass?: boolean } = {},
) {
  const classify = opts.classify ?? (() => null);

  await mockBackendAsKid(page, { age: opts.age ?? 9 });

  // Put the kid in a class so the raise-hand ("Ask my teacher") button renders
  // (the harness mocks /classes/mine empty by default → button gated off).
  if (opts.inClass) {
    await page.route('**/classes/mine*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'class-1', name: 'Robotics 101' }]),
      }),
    );
  }

  // The safeguarding classify — runs BEFORE any turn (J13). When it returns a
  // verdict the studio deflects and NEVER posts a turn. Overrides the harness's
  // always-null classify.
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

  // The at-cap turn (§11g(e)): a Pro kid's send POSTs the turn → the cap error.
  // Overrides the harness's success turn. Only registered when `capped`.
  if (opts.capped) {
    await page.route('**/projects/*/code/turn', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      return route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'DAILY_CAP_EXCEEDED', message: 'cap' } }),
      });
    });
  }
}

test('the persistent AI disclosure ("robot helper, not a person") is always shown', async ({ page }) => {
  await seatKid(page, { age: 9 });
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

  await seatKid(page, { age: 9, classify: () => DISTRESS_VERDICT });
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
  await seatKid(page, { age: 9, classify: () => PERSONAL_VERDICT });
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
  await seatKid(page, { age: 13, capped: true }); // Pro tier → turn POSTs on send
  await openStudio(page);

  await page.getByTestId('chat-input').fill('make the ball faster');
  await page.getByTestId('chat-send').click();

  await expect(page.getByTestId('cap-message')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('cap-message')).toContainText(/grown-up/i);
});

test('J4 raise-hand: "Ask my teacher" flips into a calm waiting state', async ({ page }) => {
  // Record raise-hand POSTs — the calm raised state must fire EXACTLY ONE signal,
  // even if the (now toggle-able) button is tapped again (idempotent — no second
  // signal). This is the "no second signal" guarantee the old `toBeDisabled` stood
  // in for, asserted directly now that the raised button is a lower-your-hand
  // toggle (`aria-pressed`) rather than a disabled one-shot.
  const handPosts: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/raise-hand$/.test(req.url())) handPosts.push(req.url());
  });

  await seatKid(page, { age: 9, inClass: true });
  await openStudio(page);

  const raise = page.getByTestId('raise-hand');
  await expect(raise).toContainText(/ask my teacher/i);
  await raise.click();

  await expect(page.getByTestId('raise-hand-waiting')).toBeVisible();
  await expect(page.getByTestId('raise-hand-waiting')).toContainText(/teacher will come help/i);
  // The button reflects the raised state (calm): pressed + the "hand up" affordance.
  await expect(raise).toContainText(/hand up/i);
  await expect(raise).toHaveAttribute('aria-pressed', 'true');

  // Idempotent — exactly one teacher signal fired (the raise), and tapping again
  // lowers the hand LOCALLY without emitting a second backend signal.
  await expect.poll(() => handPosts.length).toBe(1);
  await raise.click();
  await expect(page.getByTestId('raise-hand-waiting')).toBeHidden();
  expect(handPosts).toHaveLength(1);
});

// ── Stable rescue-surface screenshot ──────────────────────────────────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: the distress deflection + standing crisis resource', async ({ page }) => {
    await seatKid(page, { age: 9, classify: () => DISTRESS_VERDICT });
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
