import { test, expect, type Page } from '@playwright/test';

import { mockBackendAsKid, openStudio, type VfsFile } from './helpers';

// ── PR FE4 — AI asset generation wired + one-tap "Add to my game" (PRD J5) ─────
// MIGRATED onto the shared harness (`e2e/helpers.ts`): `mockBackendAsKid` seats a
// kid + mocks every backend the studio touches (auth WITH `?kind=kid`,
// /classes/mine, the prompt-first hub→landing→create flow), and `openStudio`
// drives it into the workspace on `game-77`. This spec layers its SPECIAL mock —
// the ASSET GENERATION endpoint (`POST /llm/generate-asset`) — on top, registered
// AFTER mockBackendAsKid so Playwright's most-recently-added match wins.
// No network, no live LLM (CLAUDE.md #5): the backend meters Stars +
// content-filters; the kid surface only POSTs a prompt and renders the data URL.
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

// The asset-gen tests need a Game scene with preload()/create() so the one-tap
// insert has a real scene to write the loader + use into. Serve this 2-file VFS
// via the shared harness's `files` override (vs its default STARTER_PROJECT).
const ASSET_GEN_VFS: VfsFile[] = [
  { path: 'main.js', content: MAIN_JS, kind: 'text', size: MAIN_JS.length },
  { path: 'src/scenes/Game.js', content: GAME_JS, kind: 'text', size: GAME_JS.length },
];

/**
 * Seat a kid session via the shared harness + layer THIS PR's generate-asset mock
 * ON TOP (registered AFTER `mockBackendAsKid` so Playwright's most-recently-added
 * match wins). The harness already mocks auth (with `?kind=kid`), /classes/mine,
 * wallet, the VFS, and the prompt-first hub→landing→create flow; we only override
 * the VFS seed (a Game scene with preload/create) and add generate-asset.
 */
async function mockAssetGenBackend(page: Page) {
  await mockBackendAsKid(page, { files: ASSET_GEN_VFS });

  // THE PR ENDPOINT: generate-asset. Returns a real image data URL + mime; the
  // backend (modelled here) meters Stars — debit once per generation. Registered
  // after the harness so this specific route wins over its broader globs.
  await page.route('**/llm/generate-asset', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dataUrl: PNG_DATA_URL, mime: 'image/png', meta: { stars_charged: 1 } }),
    });
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
  await openStudio(page);
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Assets/ }).click();
  await expect(page.getByText('All assets')).toBeVisible();
}

test('J5: generate (real backend) → asset card → add-to-game inserts a loader the game uses', async ({ page }) => {
  await installGameSignalRecorder(page);
  await mockAssetGenBackend(page);
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

  await mockAssetGenBackend(page);
  await openAssets(page);

  await page.getByTestId('asset-generate-prompt').fill('pixel coin');
  await page.getByTestId('asset-generate').click();
  await expect(page.getByTestId('asset-codeRef')).toBeVisible({ timeout: 6_000 });

  // Exactly one backend generate call fired (no direct-LLM, no duplicate).
  expect(genPosts).toHaveLength(1);
});

/**
 * Mock the emoji CDN (Twemoji on jsDelivr) so the Library's cross-origin image
 * loads deterministically with `Access-Control-Allow-Origin: *` — the crossOrigin
 * load succeeds and the canvas stays untainted (D-ASSET-7/12). No real network.
 */
async function mockEmojiCdn(page: Page) {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC',
    'base64',
  );
  await page.route('**/jdecked/twemoji@**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: PNG,
    }),
  );
}

test('A2: Library → pick an emoji → add-to-game loads it by URL (not inlined) and runs', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  await mockAssetGenBackend(page); // seats a kid + a Game scene with preload()/create()
  await mockEmojiCdn(page);
  await openAssets(page);

  // Switch to the shared Library source; the emoji grid renders.
  await page.getByTestId('asset-source-library').click();
  await expect(page.getByTestId('library-card').first()).toBeVisible();

  // Narrow to the Coin and open it → the detail shows a URL-form loader with CORS.
  await page.getByPlaceholder(/Search the library/).fill('coin');
  await page.getByTestId('library-card').first().click();
  await expect(page.getByTestId('library-codeRef')).toContainText("this.load.setCORS('anonymous')");
  await expect(page.getByTestId('library-codeRef')).toContainText(
    "this.load.image('coin', 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png')",
  );

  // One-tap add → the URL loader + a use are written into the Game scene.
  await page.getByTestId('library-add-to-game').click();
  await expect(page.getByText(/Added .* to your game/)).toBeVisible();

  // Run it: the runner's srcdoc carries the URL loader VERBATIM — a library asset
  // is referenced by URL, never inlined into the VFS as a data: URL.
  await page.getByRole('button', { name: 'Play' }).first().click();
  const frame = page.locator('iframe[title="Game"]');
  await expect(frame).toBeVisible({ timeout: 6_000 });
  const src = await frame.getAttribute('srcdoc');
  expect(src).toContain("this.load.image('coin', 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png')");
  expect(src).toContain("this.load.setCORS('anonymous')");

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), { timeout: 10_000 })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), { timeout: 3_000 })
    .toEqual([]);
});

// ── Stable detail screenshot (generated asset + add-to-game CTA) ───────────────
test.describe('visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('visual: a generated asset detail with the Add-to-my-game CTA', async ({ page }) => {
    await mockAssetGenBackend(page);
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
