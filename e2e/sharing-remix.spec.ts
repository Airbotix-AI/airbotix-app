import { test, expect, type Page } from '@playwright/test';

// ── PR FE7 — class wall + external share-link + public /play route + remix ────
// (learn-game-studio-prd.md §17.7 J7 · §17.8 J8 · §17.10 J10 · D-GAME8/10).
//
// Every backend call is ROUTE-MOCKED (page.route) so the suite is deterministic
// and offline. No network, no live LLM. Asserts:
//   - a class-wall game plays read-only (interactive snapshot, game-smoke);
//   - the external share-link UI: kid asks → parent-approval PENDING (no URL) →
//     after a mocked approval → a copyable URL + a display-handle toggle;
//   - a LOGGED-OUT visitor opens /play/:shareId and the game runs with NONE of
//     the studio chrome (no editor/chat/console/toolbar testids, no kid PII);
//   - revoke → /play/:shareId shows the 410 gone state, no play-iframe;
//   - a wall game can be REMIXED into a new owned project.

const KID = { id: 'kid-1', nickname: 'Robo', age: 9, family_id: 'fam-1' };
const SHARE_ID = 'sh-abc123';

// A minimal but REAL Phaser game (runs the loop → posts fps > 0) for the frozen
// snapshot the play route / wall serve. The update() keeps the loop alive so the
// game-smoke oracle sees a stat with fps > 0.
const RUNNABLE_VFS = {
  files: [
    {
      path: 'main.js',
      content:
        "class Game extends Phaser.Scene { constructor(){ super('Game'); } create(){ this.add.rectangle(80,60,40,40,0x66ccff); } update(){} }\n" +
        "new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 160, height: 120, scene: [Game] });\n",
      kind: 'text',
      size: 200,
    },
  ],
};

/** Auth bootstrap + wallet so the kid-only routes don't bounce to /learn/login. */
async function mockKidSession(page: Page) {
  // NOTE the trailing `*`: the real refresh/me URLs carry a `?kind=kid` query, and
  // a bare `**/auth/refresh` glob does NOT match a query string (the page would
  // bounce to /learn/login). `**/auth/refresh*` matches the query.
  await page.route('**/auth/refresh*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'kid-token' }),
    }),
  );
  await page.route('**/auth/me*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ role: 'kid', kid: KID }),
    }),
  );
  await page.route('**/families/*/wallet*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stars_balance: 42, daily_used: 0, daily_cap: 100, paused: false }),
    }),
  );
  // `/classes/mine` gates the studio's "Ask my teacher" toggle; left unmocked it
  // 401s and logs the kid out (→ /learn/login) when the remix opens the studio.
  await page.route('**/classes/mine*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }),
  );
}

/**
 * Capture the runner's postMessage signals (mirrors game-smoke.spec.ts) so the
 * test can poll deterministic counters instead of sleeping.
 */
async function installGameSignalRecorder(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __smokeErrors: string[]; __smokeMaxFps: number };
    w.__smokeErrors = [];
    w.__smokeMaxFps = 0;
    window.addEventListener('message', (e: MessageEvent) => {
      const m = e.data as
        | { __airbotixConsole?: true; level?: string; text?: string }
        | { __airbotixStat?: true; fps?: number }
        | null;
      if (!m || typeof m !== 'object') return;
      if ((m as { __airbotixConsole?: true }).__airbotixConsole === true) {
        const cm = m as { level?: string; text?: string };
        if (cm.level === 'error') w.__smokeErrors.push(String(cm.text));
      } else if ((m as { __airbotixStat?: true }).__airbotixStat === true) {
        const fps = (m as { fps?: number }).fps ?? 0;
        if (fps > w.__smokeMaxFps) w.__smokeMaxFps = fps;
      }
    });
  });
}

/** Assert the captured snapshot game actually ran (fps > 0, zero errors). */
async function expectGameRan(page: Page) {
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), {
      timeout: 12_000,
      message: 'expected a runner stat with fps > 0 (the snapshot game is alive)',
    })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), {
      timeout: 3_000,
      message: 'the snapshot game must run clean (no console-level errors)',
    })
    .toEqual([]);
}

// ── Class wall: a game plays read-only + remix ────────────────────────────────

test('J7/J10: a class-wall game plays read-only, and can be remixed into a new project', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  await mockKidSession(page);

  // The class + its playable wall games (one remix-enabled game).
  await page.route('**/classes/c-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'c-1', name: 'Room 5', term: 'T2' }),
    }),
  );
  await page.route('**/classes/c-1/wall/games', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          postId: 'wp-1',
          shareId: SHARE_ID,
          title: 'Robo Jump',
          handle: 'StarFox',
          claps: 3,
          clapped: false,
          remix_enabled: true,
          remixed_from: null,
        },
      ]),
    }),
  );
  // The frozen read-only snapshot the wall plays (same endpoint as /play).
  await page.route(`**/play/${SHARE_ID}/files`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RUNNABLE_VFS) }),
  );
  // Remix → a new owned game project; assert remix_of carries through.
  await page.route('**/projects', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON() as { kind?: string; remix_of?: string };
    expect(body.kind).toBe('game');
    expect(body.remix_of).toBe(SHARE_ID);
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'remix-99' }),
    });
  });
  // The remixed project's studio load (so the new studio opens cleanly).
  await page.route('**/projects/*/code/files', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RUNNABLE_VFS) }),
  );

  await page.goto('/learn/classroom/c-1/games');

  const card = page.getByTestId('wall-game-card').first();
  await expect(card).toBeVisible();
  // Authorship label (no PII — a display handle), capped claps, no edit surface.
  await expect(page.getByTestId('authorship-label').first()).toContainText('with AI help');

  // Click play → the read-only snapshot runs INTERACTIVELY in the sandbox.
  await card.getByRole('button', { name: /Play Robo Jump/ }).click();
  await expect(page.getByTestId('wall-game-iframe')).toBeVisible({ timeout: 8_000 });
  await expectGameRan(page);

  // Remix → a new owned project; the URL is a NEW /learn/playground/:id.
  await page.getByTestId('wall-remix-btn').first().click();
  await expect(page).toHaveURL(/\/learn\/playground\/remix-99$/);
});

// ── External share-link UI: pending → URL + handle toggle ─────────────────────

// The share-link control lives on the bottom bar (Taskbar) in BOTH layout modes,
// so this drives it directly from a fresh studio load — open → ask → parent-approval
// PENDING (no URL) → a parent approves out-of-band → re-open shows the copyable URL.
// The mocks below follow the ShareView contract (snake_case).
test('J8: share-link shows parent-approval pending, then a copyable URL + handle toggle', async ({
  page,
}) => {
  await mockKidSession(page);
  await page.route('**/projects/game-7/code/files', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RUNNABLE_VFS) }),
  );

  // Share state machine: GET=none → POST=pending → (mocked) GET=active.
  let shareState: 'none' | 'pending' | 'active' = 'none';
  await page.route('**/projects/game-7/share', (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      shareState = 'pending';
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'pending', share_id: SHARE_ID }),
      });
    }
    if (method === 'PUT') {
      const body = route.request().postDataJSON() as { show_handle?: boolean };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'active', share_id: SHARE_ID, show_handle: !!body.show_handle }),
      });
    }
    // GET — reflect the current state (backend ShareView is snake_case).
    const payload =
      shareState === 'active'
        ? { status: 'active', share_id: SHARE_ID, show_handle: false }
        : { status: shareState, share_id: shareState === 'pending' ? SHARE_ID : undefined };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });

  await page.goto('/learn/playground/game-7');
  // The share control lives on the bottom bar (Taskbar) in BOTH layout modes, so
  // no layout switch is needed; it's stable and not clipped by the window surface.
  await expect(page.getByTestId('share-link-btn')).toBeVisible({ timeout: 15_000 });

  // Open the share panel → ask → parent-approval PENDING (no URL yet).
  await page.getByTestId('share-link-btn').click();
  await page.getByRole('button', { name: /Ask my grown-up/ }).click();
  await expect(page.getByTestId('share-approval-pending')).toBeVisible();
  await expect(page.getByTestId('share-url')).toHaveCount(0);

  // Simulate a parent approving: flip the mocked state + re-open the panel.
  shareState = 'active';
  await page.getByTestId('share-link-btn').click(); // close
  await page.getByTestId('share-link-btn').click(); // re-open → refetches active
  const url = page.getByTestId('share-url');
  await expect(url).toBeVisible();
  await expect(url).toHaveValue(new RegExp(`/play/${SHARE_ID}$`));
});

// ── Public /play/:shareId — game-only, no chrome, no PII ───────────────────────

test('J8: a logged-out visitor plays /play/:shareId with NONE of the studio chrome', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  // NO auth mocks — the visitor is logged out. The public files endpoint takes no
  // auth header; assert we never send one.
  let sentAuthHeader: string | null = '__unset__';
  await page.route(`**/play/${SHARE_ID}/files`, (route) => {
    sentAuthHeader = route.request().headers()['authorization'] ?? null;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(RUNNABLE_VFS),
    });
  });

  await page.goto(`/play/${SHARE_ID}`);

  // The bare canvas runs.
  await expect(page.getByTestId('play-root')).toBeVisible();
  await expect(page.getByTestId('play-iframe')).toBeVisible({ timeout: 8_000 });
  await expectGameRan(page);

  // No auth token was sent for the public snapshot (D-GAME10d).
  expect(sentAuthHeader).toBeNull();

  // GAME-ONLY: none of the studio / Game-Runner chrome testids exist, and no kid
  // nickname appears anywhere on the page.
  for (const id of [
    'editor',
    'editor-sidebar',
    'chat-input',
    'share-link-btn',
    'game-toolbar',
    'game-statusbar',
    'console-panel',
    'studio-root',
  ]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  await expect(page.getByText(KID.nickname)).toHaveCount(0);

  // The ONLY chrome is the brand frame above the canvas (D-GAME10e): AirBotix
  // attribution + a first-party "Make your own" link to marketing, both new-tab.
  // It is a frame, not studio chrome — and carries no kid PII.
  await expect(page.getByTestId('play-brand-bar')).toBeVisible();
  await expect(page.getByTestId('play-brand-home')).toHaveAttribute('target', '_blank');
  const makeOwn = page.getByTestId('play-make-own');
  await expect(makeOwn).toHaveAttribute('target', '_blank');
  await expect(makeOwn).toHaveAttribute('href', /\/programs$/);
});

test('J8: a revoked/expired /play/:shareId shows the 410 gone state (no play-iframe)', async ({
  page,
}) => {
  await page.route(`**/play/${SHARE_ID}/files`, (route) =>
    route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ error: 'gone' }) }),
  );

  await page.goto(`/play/${SHARE_ID}`);
  await expect(page.getByTestId('play-revoked')).toBeVisible();
  await expect(page.getByTestId('play-iframe')).toHaveCount(0);
});

// ── Stable visual screenshot of the public play gone-state ────────────────────

test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: public play gone state', async ({ page }) => {
    await page.route(`**/play/${SHARE_ID}/files`, (route) =>
      route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ error: 'gone' }) }),
    );
    await page.goto(`/play/${SHARE_ID}`);
    await expect(page.getByTestId('play-revoked')).toBeVisible();
    await expect(page).toHaveScreenshot('play-revoked.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
