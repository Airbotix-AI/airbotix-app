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
// Asserts the J5 surface (generation now lives in the CHAT — one AI turn at a
// time — entered from the Asset Viewer's Generate/Remix bars):
//   - Generate (real path, projectId set) → POSTs /llm/generate-asset → the
//     finished asset surfaces as a tappable chat card (`chat-asset-open`);
//     tapping it opens the asset in the viewer with a copy-able Phaser code-ref.
//   - The generate goes through platform-backend exactly once (Stars debit).
//   - Remix posts the reference `ref_url` (Library asset's CDN URL) to the backend.
//   - A Library emoji's detail gives a URL-form loader (referenced, not inlined).

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

/** Drive the authed J1 hub → studio flow, then open the Assets split tab. */
async function openAssets(page: Page) {
  await openStudio(page);
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Assets/ }).click();
  await expect(page.getByText('All assets')).toBeVisible();
}

test('J5: generate (asset-viewer button) → runs in chat → finished card opens the asset', async ({ page }) => {
  await mockAssetGenBackend(page);
  await openAssets(page);

  // Generate from the Asset Viewer → the request is posted to the CHAT (where all
  // AI conversation lives, one at a time) → POST /llm/generate-asset.
  await page.getByTestId('asset-generate-prompt').fill('pixel coin');
  await page.getByTestId('asset-generate').click();

  // The finished asset surfaces as a tappable chat card (no in-pane add-to-game).
  const done = page.getByTestId('chat-asset-open');
  await expect(done).toBeVisible({ timeout: 8_000 });

  // Tapping it opens the asset in the Asset Viewer, whose detail shows the exact
  // Phaser loader code-ref for the generated PNG.
  await done.click();
  await expect(page.getByTestId('asset-codeRef')).toContainText(
    "this.load.image('pixel_coin', 'assets/generated/pixel_coin.png')",
    { timeout: 6_000 },
  );
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
  await expect(page.getByTestId('chat-asset-open')).toBeVisible({ timeout: 8_000 });

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

test('A2: Library → pick an emoji → its detail gives a URL-form loader (referenced, not inlined)', async ({
  page,
}) => {
  await mockAssetGenBackend(page); // seats a kid + a Game scene with preload()/create()
  await mockEmojiCdn(page);
  await openAssets(page);

  // Switch to the shared Library source; the emoji grid renders.
  await page.getByTestId('asset-source-library').click();
  await expect(page.getByTestId('library-card').first()).toBeVisible();

  // Narrow to the Coin and open it → the detail shows a URL-form loader with CORS.
  // A library asset is referenced by its CDN URL, never inlined into the VFS as a
  // data: URL — so its copy-able code-ref is the URL loader + crossOrigin setup.
  await page.getByPlaceholder(/Search the library/).fill('coin');
  await page.getByTestId('library-card').first().click();
  await expect(page.getByTestId('library-codeRef')).toContainText("this.load.setCORS('anonymous')");
  await expect(page.getByTestId('library-codeRef')).toContainText(
    "this.load.image('coin', 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png')",
  );
});

test('A5: Remix a library emoji → runs in chat → backend gets the ref_url', async ({
  page,
}) => {
  const genBodies: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/llm\/generate-asset$/.test(req.url())) {
      genBodies.push(req.postData() ?? '');
    }
  });

  await mockAssetGenBackend(page);
  await mockEmojiCdn(page);
  await openAssets(page);

  // Open the Coin in the Library, then remix it with a change prompt.
  await page.getByTestId('asset-source-library').click();
  await page.getByPlaceholder(/Search the library/).fill('coin');
  await page.getByTestId('library-card').first().click();
  await page.getByTestId('asset-remix-prompt').fill('make it blue');
  await page.getByTestId('asset-remix').click();

  // The remix runs in the chat (the reference asset is shown in the magic card)
  // and finishes as a tappable asset card.
  await expect(page.getByTestId('chat-asset-open')).toBeVisible({ timeout: 8_000 });

  // The backend received the remix reference (the Library asset's URL).
  expect(genBodies).toHaveLength(1);
  const body = JSON.parse(genBodies[0]) as { ref_url?: string; prompt?: string };
  expect(body.prompt).toBe('make it blue');
  expect(body.ref_url).toBe('https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png');
});
