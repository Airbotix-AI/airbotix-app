import { test, expect, type Page } from '@playwright/test';

// ── PR FE3 — real streaming AI turn (Lite/Pro, Stars, undo) (PRD J2 / OD-1/OD-3) ─
// Every backend call is ROUTE-MOCKED (page.route) so the suite is deterministic
// and offline: auth bootstrap, /auth/me (a kid — age sets the Lite/Pro tier),
// wallet (Stars, refetched after a debit), project list, the seeded VFS read, and
// — the heart of this PR — the AGENT TURN (`POST …/code/turn`) + its approve
// (`POST …/code/turn/:id/approve`). No network, no live LLM (CLAUDE.md #5).
//
// Asserts the J2 surface:
//   - Lite agency beat: prompt → "Do it / Show me first" + a default-on predict
//     beat → "Do it" → streamed agent message → files apply → game runs clean.
//     The agency beat fires BEFORE the turn is spent (a Lite non-approval turn
//     auto-applies + debits inside POST /code/turn), so:
//       · "Do it" ('show-me-first') is what RUNS the turn (charges Stars), and
//       · "Show me first" ('show-diff-first') CANCELS — no turn, no Stars, and a
//         reload's GET /code/files returns the ORIGINAL files (no desync).
//   - free local undo reverts the last change (no Stars, no turn);
//   - Pro plan→approve gate (a 12yo, multi-file): plan card → Approve → applies;
//   - a Stars-metered badge that decrements after a turn;
//   - a stable screenshot of the chat states.

// A runnable single-file Phaser game (the loop ticks → fps > 0, zero errors) so
// the game-smoke signal holds after the turn applies. Mirrors the runtime
// contract (Phaser global, mount #game, no module system).
const GAME_JS_BEFORE = `new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 320,
  height: 240,
  backgroundColor: '#0f172a',
  scene: { create() { this.add.rectangle(160, 120, 40, 40, 0x38bdf8); } },
});
`;
// The "after" the turn produced — a one-file edit (colour swap), so the kid sees
// a real diff flow through. Still runnable (clean, fps > 0).
const GAME_JS_AFTER = GAME_JS_BEFORE.replace('0x38bdf8', '0xff6ba9');

const SEEDED_VFS = {
  version: 1,
  files: [{ path: 'main.js', content: GAME_JS_BEFORE, kind: 'text', size: GAME_JS_BEFORE.length }],
};

function turnResult(over: Record<string, unknown> = {}) {
  return {
    turn_id: 'turn-1',
    requires_approval: false,
    plan: null,
    changes: [
      { path: 'main.js', before: GAME_JS_BEFORE, after: GAME_JS_AFTER, lines_added: 1, lines_removed: 1 },
    ],
    files: [{ path: 'main.js', content: GAME_JS_AFTER, kind: 'text', size: GAME_JS_AFTER.length }],
    summary: 'I changed the block colour to pink — press Play to see it!',
    stars_charged: 2,
    tools_fired: ['edit_file:main.js'],
    ...over,
  };
}

/** Seat a kid session + mock every backend the studio touches. `age` sets tier. */
async function mockBackendAsKid(page: Page, opts: { age?: number; pro?: boolean } = {}) {
  const kid = { id: 'kid-1', nickname: 'Robo', age: opts.age ?? 9, family_id: 'fam-1' };
  // The wallet debits on a turn so the metered badge visibly decrements.
  let stars = 42;
  // The persisted server-side VFS. POST /code/turn AUTO-APPLIES a non-approval turn
  // (writes to S3) — modelled by mutating this. A subsequent GET /code/files (the
  // reload read) returns it, so the test can prove a CANCEL never persisted (files
  // stay original) vs a CONFIRM (the pink change is now persisted).
  let persistedFiles = SEEDED_VFS.files;

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

  // The agent turn + approve. Registered BEFORE `/code/files` so the more-specific
  // turn globs win (Playwright matches most-recently-added first).
  await page.route('**/projects/*/code/turn', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    // A Pro multi-file turn (requires_approval) only COLLECTS writes — it does NOT
    // persist or debit until approve. A non-approval turn (Lite confirm path)
    // AUTO-APPLIES: it persists to the VFS and debits Stars right here, inside the
    // POST (D-CODE1c, §10 "后扣模式"). Modelling both is what lets the cancel test
    // prove a Lite turn that was never confirmed never ran (no debit, no persist).
    if (opts.pro) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          turnResult({
            requires_approval: true,
            plan: { plan_text: "I'll edit main.js to change the colour.", planned_tools: [] },
          }),
        ),
      });
    }
    stars -= 2;
    persistedFiles = turnResult().files;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(turnResult()) });
  });
  await page.route('**/projects/*/code/turn/*/approve', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const decision = (route.request().postDataJSON() as { decision: string }).decision;
    if (decision === 'reject') {
      // Reject discards the collected writes — nothing persists, nothing debits.
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...turnResult(), changes: [], stars_charged: 0 }) });
    }
    // Approve persists the collected writes + debits once (后扣模式 on approve).
    stars -= 2;
    persistedFiles = turnResult().files;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(turnResult({ requires_approval: false })) });
  });

  // The VFS read (studio opens on these; a reload re-reads the PERSISTED files).
  await page.route('**/projects/*/code/files', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...SEEDED_VFS, files: persistedFiles }) });
    }
    // PUT autosave — accept + bump (not under test here, keep the studio happy).
    const b = route.request().postDataJSON() as { files: unknown; version: number };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: b.files, version: b.version + 1 }) });
  });

  // The real game-project create (authed hub → studio).
  await page.route('**/projects', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'game-77' }) });
  });
}

/** Record the runner's game signals (errors + fps) — the game-smoke oracle. */
async function installGameSignalRecorder(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __smokeErrors: string[]; __smokeMaxFps: number };
    w.__smokeErrors = [];
    w.__smokeMaxFps = 0;
    window.addEventListener('message', (e: MessageEvent) => {
      const m = e.data as { __airbotixConsole?: true; level?: string; text?: string; __airbotixStat?: true; fps?: number } | null;
      if (!m || typeof m !== 'object') return;
      if (m.__airbotixConsole === true) {
        if (m.level === 'error') w.__smokeErrors.push(String(m.text));
      } else if (m.__airbotixStat === true) {
        const fps = m.fps ?? 0;
        if (fps > w.__smokeMaxFps) w.__smokeMaxFps = fps;
      }
    });
  });
}

/** Drive the authed J1 hub → studio flow into the chat-first workspace. */
async function openStudio(page: Page) {
  await page.goto('/learn/create/code');
  await page.getByTestId('hub-template-pong').click();
  await expect(page).toHaveURL(/\/learn\/playground\/game-77$/);
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 10_000 });
}

test('J2 Lite: prompt → agency beat → Do it → streamed message → files apply → game runs', async ({ page }) => {
  await installGameSignalRecorder(page);
  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);

  // The Stars-metered badge is shown (OD-3 "meter every turn").
  await expect(page.getByTestId('stars-badge')).toContainText('42');

  // Send a prompt → a Lite kid gets the agency beat ("Do it / Show me first")
  // with a default-on prediction beat — NOT an immediate apply.
  await page.getByTestId('chat-input').fill('make the block pink');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('agency-card')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('predict-beat')).toBeVisible();
  await expect(page.getByTestId('predict-beat')).toContainText(/colour|change/i);

  // "Do it" ('show-me-first' = the CONFIRM button) RUNS the turn → the agent
  // message streams (live → final) and the turn applies. The turn POSTs HERE, on
  // confirm — not on send — so Stars are only spent once the kid commits.
  await page.getByTestId('show-me-first').click();
  await expect(page.getByTestId('agent-msg-streaming')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('agent-msg')).toContainText('pink', { timeout: 6_000 });

  // Stars debited exactly once → the badge decrements (42 → 40).
  await expect(page.getByTestId('stars-badge')).toContainText('40', { timeout: 6_000 });

  // The applied change flows into the game: open + run the runner → it runs clean.
  await page.getByRole('button', { name: 'Run game' }).click();
  await expect(page.locator('iframe[title="Game"]')).toBeVisible({ timeout: 6_000 });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), { timeout: 10_000 })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), { timeout: 3_000 })
    .toEqual([]);
});

test('J2 Lite cancel: "Show me first" spends NOTHING — no Stars debit, no persisted VFS change', async ({ page }) => {
  // The contract this pins (D-CODE1c / OD-3 metering honesty): a Lite agency beat
  // fires BEFORE the turn is spent. Cancelling it ("Show me first") must never have
  // run the turn, so: (a) the Stars badge is unchanged, and (b) a RELOAD re-reads
  // the original files — the backend never auto-applied a "pink" change the kid
  // believed they rejected. The pre-fix code (run-then-stage) failed both.
  const turnPosts: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/code\/turn$/.test(req.url())) turnPosts.push(req.url());
  });

  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);

  // Baseline Stars before any send.
  await expect(page.getByTestId('stars-badge')).toContainText('42');

  // Send → the Lite agency beat appears (NO turn POST yet — nothing spent).
  await page.getByTestId('chat-input').fill('make the block pink');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('agency-card')).toBeVisible({ timeout: 6_000 });

  // Click the ACTUAL cancel button ('show-diff-first' = "Show me first").
  await page.getByTestId('show-diff-first').click();
  await expect(page.getByText(/nothing changed/i)).toBeVisible();
  await expect(page.getByTestId('agency-card')).toHaveCount(0);

  // (a) Stars unchanged — the turn never ran, so nothing was charged.
  await expect(page.getByTestId('stars-badge')).toContainText('42');
  // No POST /code/turn ever fired across the whole cancel flow.
  expect(turnPosts).toHaveLength(0);

  // (b) Reload → GET /code/files returns the ORIGINAL files (no 'pink' persisted),
  // i.e. the client VFS and the server VFS agree — no desync.
  await page.reload();
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Run game' }).click();
  const src = await page.locator('iframe[title="Game"]').getAttribute('srcdoc');
  expect(src).toContain('0x38bdf8'); // original blue
  expect(src).not.toContain('0xff6ba9'); // never the rejected pink
});

test('J2 undo: a free local undo reverts the last AI change (no Stars, no turn)', async ({ page }) => {
  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);

  await page.getByTestId('chat-input').fill('make the block pink');
  await page.getByTestId('chat-send').click();
  await page.getByTestId('show-me-first').click();
  await expect(page.getByTestId('agent-msg')).toContainText('pink', { timeout: 6_000 });

  // Undo is offered after a change; clicking it reverts (a free local revert).
  const undo = page.getByTestId('undo-turn');
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(page.getByText(/Undone/)).toBeVisible();
  // No further Stars were spent (still 40 from the one turn) and undo offer clears.
  await expect(page.getByTestId('stars-badge')).toContainText('40');
  await expect(undo).toHaveCount(0);
});

test('J2 Pro: a 12yo multi-file turn is gated behind a plan → Approve applies it', async ({ page }) => {
  await mockBackendAsKid(page, { age: 13, pro: true });
  await openStudio(page);

  await page.getByTestId('chat-input').fill('add a scoreboard');
  await page.getByTestId('chat-send').click();

  // Pro multi-file → a plan card (NOT applied yet), with approve/reject.
  await expect(page.getByTestId('plan-card')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('plan-approve')).toBeVisible();
  await page.getByTestId('plan-approve').click();

  // Approve persists + applies → the streamed result lands.
  await expect(page.getByTestId('agent-msg')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('plan-card')).toHaveCount(0);
});

// ── Stable chat-state screenshot ──────────────────────────────────────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: the agency beat + prediction card', async ({ page }) => {
    await mockBackendAsKid(page, { age: 9 });
    await openStudio(page);

    await page.getByTestId('chat-input').fill('make the block pink');
    await page.getByTestId('chat-send').click();
    const card = page.getByTestId('agency-card');
    await expect(card).toBeVisible({ timeout: 6_000 });
    await expect(card).toHaveScreenshot('agency-beat.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});
