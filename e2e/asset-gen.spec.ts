import { test, expect, type Page } from '@playwright/test';

// ── PR FE4 — AI asset generation wired + one-tap "Add to my game" (PRD J5) ─────
// Every backend call is ROUTE-MOCKED (page.route) so the suite is deterministic
// and offline: auth bootstrap, /auth/me (a kid), wallet, project list, the
// seeded VFS read, the real game-project create, and — the heart of this PR —
// the ASSET GENERATION endpoint (`POST /llm/generate-asset`). No network, no
// live LLM (CLAUDE.md #5): the backend meters Stars + content-filters; the kid
// surface only POSTs a prompt and renders the returned data URL.
//
// Asserts the J5 surface:
//   - Generate (real path, projectId set) → POSTs /llm/generate-asset → an asset
//     card appears in the grid → its detail shows a copy-able Phaser code-ref.
//   - One-tap "Add to my game" → inserts the loader into a scene the game can use
//     (the runner's srcdoc now contains `this.load.image('…','assets/…')`) and the
//     game still runs clean (fps > 0, zero errors) — the asset is loadable.
//   - A stable screenshot of the generated-asset detail (with the add-to-game CTA).

// A tiny green PNG the mocked generate endpoint returns (1×1, valid image bytes).
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC';

// A runnable multi-file Phaser game with a Game scene that has preload()/create()
// — so the one-tap insert has a real scene to write the loader + use into, and the
// game keeps running clean afterwards (Phaser global, mount #game, no modules).
const GAME_JS = `class Game extends Phaser.Scene {
  constructor() { super('Game'); }
  preload() {
  }
  create() {
    this.add.rectangle(160, 120, 40, 40, 0x38bdf8);
  }
}
`;
const MAIN_JS = `new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 320,
  height: 240,
  backgroundColor: '#0f172a',
  scene: [Game],
});
`;

const SEEDED_VFS = {
  version: 1,
  files: [
    { path: 'main.js', content: MAIN_JS, kind: 'text', size: MAIN_JS.length },
    { path: 'src/scenes/Game.js', content: GAME_JS, kind: 'text', size: GAME_JS.length },
  ],
};

/** Seat a kid session + mock every backend the studio touches, incl. generate-asset. */
async function mockBackendAsKid(page: Page) {
  const kid = { id: 'kid-1', nickname: 'Robo', age: 9, family_id: 'fam-1' };
  let stars = 42;

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

  // THE PR ENDPOINT: generate-asset. Returns a real image data URL + mime; the
  // backend (modelled here) meters Stars — debit once per generation.
  await page.route('**/llm/generate-asset', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    stars -= 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dataUrl: PNG_DATA_URL, mime: 'image/png', meta: { stars_charged: 1 } }),
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

/** Drive the authed J1 hub → studio flow, then open the Assets split tab. */
async function openAssets(page: Page) {
  await page.goto('/learn/create/code');
  await page.getByTestId('hub-template-pong').click();
  await expect(page).toHaveURL(/\/learn\/playground\/game-77$/);
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Assets/ }).click();
  await expect(page.getByText('All assets')).toBeVisible();
}

test('J5: generate (real backend) → asset card → add-to-game inserts a loader the game uses', async ({ page }) => {
  await installGameSignalRecorder(page);
  await mockBackendAsKid(page);
  await openAssets(page);

  // Generate → POST /llm/generate-asset → the generated asset's detail opens.
  await page.getByTestId('asset-generate-prompt').fill('pixel coin');
  await page.getByTestId('asset-generate').click();

  // The detail shows the exact Phaser loader code-ref for the generated PNG.
  await expect(page.getByTestId('asset-codeRef')).toContainText(
    "this.load.image('pixel_coin', 'assets/generated/pixel_coin.png')",
    { timeout: 6_000 },
  );

  // ONE-TAP add: the loader + a use are written into the Game scene.
  await expect(page.getByTestId('asset-add-to-game')).toBeVisible();
  await page.getByTestId('asset-add-to-game').click();
  await expect(page.getByText(/Added .* to your game/)).toBeVisible();

  // The game can now LOAD the asset: run it → the runner's srcdoc carries the
  // inserted loader, and the game runs clean (fps > 0, zero errors). In Split
  // mode the Game Runner is always mounted on the right; press its Play button
  // (the toolbar control — the center overlay shares the "Play" name).
  await page.getByRole('button', { name: 'Play' }).first().click();
  const frame = page.locator('iframe[title="Game"]');
  await expect(frame).toBeVisible({ timeout: 6_000 });
  const src = await frame.getAttribute('srcdoc');
  expect(src).toContain("this.load.image('pixel_coin'");
  // The path literal was inlined to a data: URL (Phaser loads it directly).
  expect(src).toContain('data:image/png;base64');

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), { timeout: 10_000 })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), { timeout: 3_000 })
    .toEqual([]);
});

test('J5: generate goes through the backend (Stars debit) — kid never calls an LLM', async ({ page }) => {
  // Pin CLAUDE.md #5 + J5 metering: the generate hits platform-backend (not a
  // direct LLM), and the metered wallet decrements after a generation.
  const genPosts: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/llm\/generate-asset$/.test(req.url())) genPosts.push(req.url());
  });

  await mockBackendAsKid(page);
  await openAssets(page);

  await page.getByTestId('asset-generate-prompt').fill('pixel coin');
  await page.getByTestId('asset-generate').click();
  await expect(page.getByTestId('asset-codeRef')).toBeVisible({ timeout: 6_000 });

  // Exactly one backend generate call fired (no direct-LLM, no duplicate).
  expect(genPosts).toHaveLength(1);
});

// ── Stable detail screenshot (generated asset + add-to-game CTA) ───────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: a generated asset detail with the Add-to-my-game CTA', async ({ page }) => {
    await mockBackendAsKid(page);
    await openAssets(page);

    await page.getByTestId('asset-generate-prompt').fill('pixel coin');
    await page.getByTestId('asset-generate').click();
    await expect(page.getByTestId('asset-add-to-game')).toBeVisible({ timeout: 6_000 });
    // Screenshot the detail's action column (deterministic — fixed mock result).
    await expect(page.getByTestId('asset-add-to-game')).toHaveScreenshot('asset-add-to-game.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    });
  });
});
