import { test, expect, type Page } from '@playwright/test';

import {
  STUDIO_PROJECT_ID,
  mockBackendAsKid,
  openLanding,
  openStudio,
  type VfsFile,
} from './helpers';

// The migrated suite drives the FULL authed flow per test (hub → landing →
// generating → workspace → lazy Monaco / game iframe) — markedly heavier than the
// old direct `goto('/playground-sandbox')`. Against a single Vite dev server under
// Playwright's default fan-out (≈ CPUs/2 workers) the slowest mounts (Monaco, the
// game iframe) can brush past the 30s default. Give every test in this file more
// headroom — assertions are unchanged; this only absorbs server contention.
test.describe.configure({ timeout: 90_000 });

// E2E for the redesigned Playground — MIGRATED off the DEV-only
// `/playground-sandbox` route onto the AUTHED `/learn/playground/:projectId`
// route via the shared harness (`e2e/helpers.ts`). Every backend call is
// ROUTE-MOCKED (page.route) so the suite stays deterministic, offline and
// LLM-free (CLAUDE.md #5):
//   Landing (glow prompt + chips) → Generating (blocking) → Workspace with two
//   layout modes (Window default / Split).
// NOTE: window titles appear in 3 places (desktop icon, window titlebar, taskbar
// button) so text selectors use .first() / roles to stay unambiguous.
//
// CHAT BEHAVIOUR differs from the old offline stub: on the authed route a Lite
// kid (default age 9) gets the agency beat (`agency-card`, confirm `show-me-first`
// = "Do it", cancel `show-diff-first`), THEN the reply streams
// (`agent-msg-streaming` → `agent-msg`) and Stars debit. The chat specs below
// drive that real flow.

const LANDING_PLACEHOLDER = "Describe a game and we'll build it…";

type WindowName = 'Code Editor' | 'Game Runner' | 'Asset Viewer';

/**
 * Reach the chat-first workspace on the authed route via the shared harness:
 * `mockBackendAsKid` (seats a Lite kid + mocks every backend) + `openStudio`
 * (hub → landing prompt → studio on `game-77`). The studio launches chat-first;
 * when a test drives the editor / runner / asset viewer, open its window from the
 * desktop tile (the first button bearing the window name).
 */
async function reachWorkspace(page: Page, open?: WindowName) {
  await mockBackendAsKid(page);
  await openStudio(page);
  if (open) await page.getByRole('button', { name: open }).first().click();
}

test('landing shows the prompt + starter chips, and Enter → generating → workspace', async ({ page }) => {
  // The authed new-project LandingScreen (`/learn/playground/new`). Submitting a
  // prompt creates the (mocked) project → game-77 → generating → workspace.
  await mockBackendAsKid(page);
  await openLanding(page);
  await expect(page.getByPlaceholder(LANDING_PLACEHOLDER)).toBeVisible();
  await expect(page.getByRole('button', { name: /Pong/ })).toBeVisible();

  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('a pong game');
  await input.press('Enter');

  // The blocking generating screen shows while the (mocked) real project loads.
  // On the authed route a projectId is set, so the caption reads "Loading your
  // game…" (vs the project-less "Building…"). The URL has already advanced to the
  // created project.
  await expect(page).toHaveURL(new RegExp(`/learn/playground/${STUDIO_PROJECT_ID}$`));
  // Workspace (Window mode default): chat-first — the AI hands off the scaffold.
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Your game starter is ready/)).toBeVisible();
});

test('generated project is multi-file (nested src/scenes in the Code editor)', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor');
  await expect(page.getByText('main.js').first()).toBeVisible();
  await expect(page.getByText('scenes').first()).toBeVisible();
});

test('code editor: status bar, Files-only tree, and the file-column toggle', async ({ page }) => {
  await reachWorkspace(page);
  // Split mode → Code tab gives a clean, unobstructed editor.
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Code/ }).click();

  // Status bar: caret position + language (no "unsaved" — auto-save is planned).
  await expect(page.getByText(/Ln \d+, Col \d+/).first()).toBeVisible();
  await expect(page.getByText('JAVASCRIPT', { exact: true }).first()).toBeVisible();

  // The file tree is Files-only now — source (src) shows, the assets/ subtree
  // does NOT (assets live in the Asset Viewer, its own surface).
  await expect(page.getByText('src', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('assets', { exact: true })).toHaveCount(0);

  // Hide-files toggle collapses the column (button label flips).
  await page.getByRole('button', { name: 'Hide files' }).click();
  await expect(page.getByRole('button', { name: 'Show files' })).toBeVisible();
});

test('layout toggle switches Window ⇄ Split', async ({ page }) => {
  await reachWorkspace(page);
  await page.getByRole('button', { name: /Split/ }).click();
  await expect(page.getByRole('tab', { name: /Code/ })).toBeVisible();
  await expect(page.getByText('Press ▶ to play')).toBeVisible();

  await page.getByRole('button', { name: /Windows/ }).click();
  await expect(page.getByText('Code Editor').first()).toBeVisible();
});

test('AI chat: a prompt → agency beat → "Do it" → kid message + streamed reply (no auto-run)', async ({ page }) => {
  // Authed Lite flow (replaces the old offline stub): send → agency beat → "Do
  // it" (`show-me-first`) → the kid message + a streamed agent reply. Chatting
  // must NOT auto-run the game — the runner stays on its placeholder.
  await reachWorkspace(page, 'Game Runner');
  const chat = page.getByTestId('chat-input');
  await chat.fill('make the ball faster');
  await chat.press('Enter');
  await expect(page.getByText('make the ball faster')).toBeVisible();

  // The Lite agency beat appears; "Do it" runs the turn → a streamed reply lands.
  await expect(page.getByTestId('agency-card')).toBeVisible({ timeout: 6_000 });
  await page.getByTestId('show-me-first').click();
  await expect(page.getByTestId('agent-msg')).toBeVisible({ timeout: 6_000 });

  // Chatting must NOT auto-run the game — the runner stays on its placeholder.
  await expect(page.getByText('Press ▶ to play')).toBeVisible();
});

test('game runner: placeholder until Play, then it starts', async ({ page }) => {
  await reachWorkspace(page, 'Game Runner');
  await expect(page.getByText('Press ▶ to play')).toBeVisible();
  // The placeholder's Play button launches the game (placeholder disappears).
  await page.getByRole('button', { name: 'Play' }).first().click();
  await expect(page.getByText('Press ▶ to play')).toBeHidden();
});

test('game runner: a problem (error OR warning) auto-opens the console', async ({ page }) => {
  // Serve a project whose entry file logs a WARNING (like Phaser's "Scene not
  // found") — warnings must auto-open the console too, not just thrown errors.
  // Injected via the harness's `files` override (a single warning-logging main.js).
  const code = "console.warn('Scene not found for key: Game1');\n";
  await mockBackendAsKid(page, {
    files: [{ path: 'main.js', content: code, kind: 'text', size: code.length }],
  });
  await openStudio(page);
  // Chat-first: open the Game Runner to drive it.
  await page.getByRole('button', { name: 'Game Runner' }).first().click();

  // Console is closed until something goes wrong.
  await expect(page.getByText('Console', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Play' }).first().click();
  // The warning auto-opens the console and shows the message. The iframe must
  // load Phaser + run before the warn fires, so allow generous headroom under
  // parallel load.
  await expect(page.getByText('Console', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Scene not found for key: Game1/)).toBeVisible({ timeout: 6_000 });
});

test('game runner: screen-size presets reshape the stage (portrait vs landscape)', async ({ page }) => {
  await reachWorkspace(page, 'Game Runner');
  await page.getByRole('button', { name: 'Play' }).first().click();
  const frame = page.locator('iframe[title="Game"]');
  await expect(frame).toBeVisible();

  const aspect = async () => {
    const b = await frame.boundingBox();
    return b!.width / b!.height;
  };
  // iPhone (390×844) → portrait stage (taller than wide).
  await page.getByLabel('Screen size').selectOption('iphone');
  expect(await aspect()).toBeLessThan(1);
  // 720p (1280×720) → landscape stage (wider than tall).
  await page.getByLabel('Screen size').selectOption('720p');
  expect(await aspect()).toBeGreaterThan(1);
});

test('theme: light by default, toggles, and the choice carries into the workspace', async ({ page }) => {
  await mockBackendAsKid(page);
  await openLanding(page);
  const root = page.locator('[data-theme]').first();
  await expect(root).toHaveAttribute('data-theme', 'light');

  // Toggle to dark on the landing screen.
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(root).toHaveAttribute('data-theme', 'dark');

  // The chosen theme is global — it survives the move into the workspace.
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('a pong game');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'dark');
  // The workspace exposes the toggle too (now switching back to light).
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});

test('chat history persists across a layout-mode switch', async ({ page }) => {
  await reachWorkspace(page);
  const chat = page.getByPlaceholder('What should we build?');
  await chat.fill('persist me please');
  await chat.press('Enter');
  await expect(page.getByText('persist me please')).toBeVisible();

  // Toggle Window → Split → Window; the message must survive both.
  await page.getByRole('button', { name: /Split/ }).click();
  await expect(page.getByText('persist me please')).toBeVisible();
  await page.getByRole('button', { name: /Windows/ }).click();
  await expect(page.getByText('persist me please')).toBeVisible();
});

test('double-click the title bar maximizes, and restore returns to the prior position', async ({ page }) => {
  await reachWorkspace(page);
  const win = page.locator('.react-draggable:has(.pg-win-title:has-text("Chat"))').first();
  const bar = page.locator('.pg-win-title:has-text("Chat")').first();

  // Maximize fills the DESKTOP SURFACE — on the authed route that surface sits
  // BELOW the Learn top nav, so the maximized window snaps to the surface's
  // top-left (not the viewport's 0,0). Measure relative to the surface.
  const surface = page.locator('.pg-desktop-bg').first();
  const surfaceBox = await surface.boundingBox();

  const before = await win.boundingBox();
  // Double-click the title bar → maximized (fills the desktop, grows).
  await bar.dblclick();
  const maxed = await win.boundingBox();
  expect(maxed!.width).toBeGreaterThan(before!.width);
  expect(Math.round(maxed!.x)).toBe(Math.round(surfaceBox!.x));
  expect(Math.round(maxed!.y)).toBe(Math.round(surfaceBox!.y));

  // Double-click again → restored to the SAME spot it was before (not 0,0).
  await bar.dblclick();
  const restored = await win.boundingBox();
  expect(Math.round(restored!.x)).toBe(Math.round(before!.x));
  expect(Math.round(restored!.y)).toBe(Math.round(before!.y));
  expect(Math.round(restored!.width)).toBe(Math.round(before!.width));
});

test('code editor window launches wide (editor area doubled, file column unchanged)', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor'); // Window mode default.
  // The launch width doubles the editor area while the fixed file column keeps
  // its width: width = files col + 2·(W/3 − files col). (Keep FILES_COL in sync
  // with CODE_FILES_COL_W / FILES_DEFAULT_W in the app.)
  const FILES_COL = 280; // CODE_FILES_COL_W / FILES_DEFAULT_W
  const W = await page.evaluate(() => window.innerWidth);
  const expected = FILES_COL + 2 * (W / 3 - FILES_COL);
  const win = page
    .locator('.react-draggable:has(.pg-win-title:has-text("Code Editor"))')
    .first();
  const box = await win.boundingBox();
  expect(box).not.toBeNull();
  // Tolerance covers the store's Math.round + the window border.
  expect(Math.abs(box!.width - expected)).toBeLessThan(12);
});

test('code editor: hover/overflow widgets render outside the window (not clipped)', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor'); // Window mode; the Code Editor mounts Monaco.
  // Monaco renders hover/suggest widgets into a BODY-level node (not inside the
  // editor), so the window's overflow:hidden can't clip a long doc tooltip. The
  // `.overflowingContentWidgets` container living under `body > .monaco-editor`
  // is the proof the widgets escape the window.
  await expect(
    page.locator('body > div.monaco-editor .overflowingContentWidgets'),
  ).toHaveCount(1, { timeout: 15_000 });
});

test('file tree: create, rename, and delete a file', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor'); // Window mode; Code Editor on the scaffold.
  const nameInput = page.getByLabel('File or folder name');

  // CREATE — header "New file" → type → Enter. The new file opens as a tab too.
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await nameInput.fill('Hello.js');
  await nameInput.press('Enter');
  await expect(page.getByText('Hello.js').first()).toBeVisible();

  // RENAME — the row's rename action (clickable even before hover) → new name.
  await page.getByRole('button', { name: 'Rename Hello.js' }).click();
  await nameInput.fill('World.js');
  await nameInput.press('Enter');
  await expect(page.getByText('World.js').first()).toBeVisible();
  await expect(page.getByText('Hello.js')).toHaveCount(0); // tree + tab both remapped

  // DELETE — trash → confirm → gone from tree and the tab closes.
  await page.getByRole('button', { name: 'Delete World.js' }).click();
  await page.getByRole('button', { name: 'Confirm delete World.js' }).click();
  await expect(page.getByText('World.js')).toHaveCount(0);
});

test('file tree: create a folder and a file inside it', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor');
  const nameInput = page.getByLabel('File or folder name');

  // New empty folder — it renders even with no files yet (explicit empty folder).
  await page.getByRole('button', { name: 'New folder', exact: true }).click();
  await nameInput.fill('levels');
  await nameInput.press('Enter');
  await expect(page.getByText('levels').first()).toBeVisible();

  // New file inside that folder via its hover "+file" action.
  await page.getByRole('button', { name: 'New file in levels' }).click();
  await nameInput.fill('one.js');
  await nameInput.press('Enter');
  await expect(page.getByText('one.js').first()).toBeVisible();
});

test('file tree: drag a file into a folder moves it', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor');
  // main.js sits at the root; `src` is a folder. Native HTML5 DnD needs dispatched
  // drag events sharing one DataTransfer (Playwright's mouse drag won't trigger it).
  const dt = await page.evaluateHandle(() => new DataTransfer());
  const source = page.locator('[data-path="main.js"]');
  const folder = page.locator('[data-path="src"]');
  await expect(source).toHaveCount(1);
  await source.dispatchEvent('dragstart', { dataTransfer: dt });
  await folder.dispatchEvent('dragover', { dataTransfer: dt });
  await folder.dispatchEvent('drop', { dataTransfer: dt });

  // main.js is now under src/, and no longer at the root.
  await expect(page.locator('[data-path="src/main.js"]')).toHaveCount(1);
  await expect(page.locator('[data-path="main.js"]')).toHaveCount(0);
});

test('time machine: snapshot → see what changed → go back', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor'); // Window mode; Code Editor on the scaffold.
  // The Code window + lazy Monaco take a beat to mount under the authed flow —
  // give it room before driving the editor.
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Time Machine', exact: true }).click();
  await expect(page.getByText('Your game started here')).toBeVisible();

  // Type into the editor → after the idle pause it auto-commits + snapshots. The
  // new save point becomes the current ("Now") one, titled in plain language.
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.type('// time machine test\n');
  await expect(page.getByText(/Changed main\.js/)).toBeVisible({ timeout: 6_000 });

  // "What changed" on that save point → tap the file → before/after opens as its
  // own tab, with clear Before / After labels.
  const now = page.getByTestId('history-entry').filter({ hasText: 'Changed main.js' }).first();
  await now.getByRole('button', { name: 'What changed' }).click();
  await now.getByTestId('history-file').first().click();
  await expect(page.getByTestId('history-diff')).toBeVisible();
  await expect(page.getByTestId('history-diff').getByText('Before')).toBeVisible();
  await expect(page.getByTestId('history-diff').getByText('After')).toBeVisible();

  // Go back to the start → reassuring confirm → restore (recorded as its own
  // "Went back in time" save point).
  const start = page.getByTestId('history-entry').filter({ hasText: 'Your game started here' }).first();
  await start.getByTestId('history-goback').click();
  await page.getByTestId('history-goback-confirm').click();
  await expect(page.getByText('Went back in time')).toBeVisible();
});

test('persistence: edits survive a page refresh', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor');
  // Create a file, then let the debounced IndexedDB save land.
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await page.getByLabel('File or folder name').fill('Persist.js');
  await page.getByLabel('File or folder name').press('Enter');
  await expect(page.getByText('Persist.js').first()).toBeVisible();
  await page.waitForTimeout(1200); // > SAVE_DEBOUNCE_MS (600)

  // Reload → the studio re-reads the project; the created file is restored from
  // the persisted VFS (the PUT autosave landed). Chat-first reopens with only
  // Chat — open Code to verify the restored file.
  await page.reload();
  await expect(page.getByTestId('chat-starter')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Code Editor' }).first().click();
  await expect(page.getByText('Persist.js').first()).toBeVisible();
});

test('search: find across files and jump to a result', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor');
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByLabel('Search files').fill('Boot');

  // A Boot.js match → click it → that file opens at the line (status bar = path).
  const match = page.getByTestId('search-results').getByRole('button', { name: /Boot\.js:\d+/ }).first();
  await expect(match).toBeVisible();
  await match.click();
  await expect(page.getByText('src/scenes/Boot.js')).toBeVisible();
});

test('search: replace all across files', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByLabel('Search files').fill('paddle');
  await expect(page.getByTestId('search-results').getByRole('button', { name: /Game\.js:\d+/ }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Show replace' }).click();
  await page.getByLabel('Replace with').fill('bat');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByText(/Replaced \d+ match/)).toBeVisible();
});

test('time machine: file-tree operations are recorded', async ({ page }) => {
  await reachWorkspace(page, 'Code Editor');
  // Create a file via the tree → it should appear in the Time Machine timeline.
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await page.getByLabel('File or folder name').fill('Note.js');
  await page.getByLabel('File or folder name').press('Enter');
  await page.getByRole('button', { name: 'Time Machine', exact: true }).click();
  await expect(page.getByText(/Added Note\.js/)).toBeVisible();
});

// Reach the chat-first workspace with a single-file project whose entry THROWS on
// a known line — the thrown error is what the debugging specs below act on. Built
// on the shared harness: the throwing main.js is injected via `files`.
async function reachWorkspaceWithThrow(page: Page, throwLine = 3) {
  // `throwLine` is 1-based in the authored file. Pad with comment lines so the
  // throw sits exactly on that line — the jump-to-error spec asserts the caret
  // lands there, which only holds if `//# sourceURL` line numbers match the file.
  const pad = Array.from({ length: throwLine - 1 }, (_, i) => `// line ${i + 1}`);
  const code = [...pad, "throw new Error('kaboom from main');", ''].join('\n');
  const files: VfsFile[] = [{ path: 'main.js', content: code, kind: 'text', size: code.length }];
  await mockBackendAsKid(page, { files });
  await openStudio(page);
}

test('jump-to-error: a console error location opens that file at that line in the editor', async ({ page }) => {
  await reachWorkspaceWithThrow(page, 3);
  // Split mode keeps the runner (right) and editor (left) un-occluded.
  await page.getByRole('button', { name: /Split/ }).click();

  // Run the game → the entry script throws → console auto-opens with a LOCATED
  // error (this only works if `//# sourceURL` makes the error's filename = the
  // kid's file and the line number match the authored line).
  await page.getByRole('button', { name: 'Play' }).first().click();
  // The iframe must load Phaser + throw before the located error surfaces — allow
  // headroom under parallel load.
  const jump = page.getByRole('button', { name: 'main.js:3' });
  await expect(jump).toBeVisible({ timeout: 15_000 });

  // Click the location → the editor opens main.js and the caret lands on line 3.
  await jump.click();
  await expect(page.getByRole('tab', { name: /Code/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Ln 3, Col 1')).toBeVisible();
});

test('Ask AI to fix: a console error is sent to the chat agent', async ({ page }) => {
  await reachWorkspaceWithThrow(page, 3);
  await page.getByRole('button', { name: /Split/ }).click();

  await page.getByRole('button', { name: 'Play' }).first().click();
  // The iframe must load Phaser + throw before the error (and its "Ask AI to fix"
  // button) surfaces — allow headroom under parallel load.
  const askFix = page.getByRole('button', { name: /Ask AI to fix/ });
  await expect(askFix).toBeVisible({ timeout: 15_000 });

  // Clicking routes the error to chat (focuses the Chat tab). On the authed route
  // the error prompt becomes a kid message; a Lite kid then sees the agency beat
  // (the turn is staged, not yet spent) — the error reached the chat agent.
  await askFix.click();
  await expect(page.getByRole('tab', { name: /Chat/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(/kaboom from main/).first()).toBeVisible();
  await expect(page.getByTestId('agency-card')).toBeVisible({ timeout: 6_000 });
});

test('editor lazy-loads the vendored Phaser .d.ts for IntelliSense', async ({ page }) => {
  await mockBackendAsKid(page);
  // Arm the wait BEFORE the editor mounts (Monaco onMount triggers the fetch).
  // Assert the RESPONSE (not just the request) is 200 — the .d.ts is now
  // materialized from the `phaser` npm dep by the vendor-phaser Vite plugin, so
  // this also guards that the build-time copy actually served the file.
  const dtsResponse = page.waitForResponse(
    (r) => r.url().includes('/vendor/phaser-4.1.0.d.ts'),
    { timeout: 15_000 },
  );
  await openStudio(page);
  // Chat-first: open the Code Editor — its Monaco onMount lazy-fetches the defs.
  await page.getByRole('button', { name: 'Code Editor' }).first().click();
  const res = await dtsResponse;
  expect(res.status()).toBe(200);
});

test('a closed window leaves the taskbar and reopens from its desktop icon', async ({ page }) => {
  await reachWorkspace(page, 'Game Runner');
  // Close the Game Runner window via its titlebar close button.
  await page.getByRole('button', { name: 'Close Game Runner' }).click();
  await expect(page.getByRole('button', { name: 'Close Game Runner' })).toBeHidden();
  // Closed windows are removed from the taskbar; reopen from the desktop icon
  // (the first 'Game Runner' button = the desktop shortcut).
  await page.getByRole('button', { name: 'Game Runner' }).first().click();
  await expect(page.getByRole('button', { name: 'Close Game Runner' })).toBeVisible();
});

// ── Asset Viewer (4th window / Assets split tab) ─────────────────────────────

// 1×1 transparent PNG for import tests.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC',
  'base64',
);

test('asset viewer: opens from its desktop tile (window mode)', async ({ page }) => {
  // Chat-first: the Asset Viewer starts closed; opening its tile shows the grid.
  await reachWorkspace(page, 'Asset Viewer');
  await expect(page.getByText('All assets')).toBeVisible();
});

test('asset viewer: AI-generates an asset and shows its code-ref (split tab)', async ({ page }) => {
  // On the authed route the asset-gen seam routes through the REAL backend
  // (`POST /llm/generate-asset`, because a projectId is set), unlike the old
  // project-less sandbox which used the offline stub. Mock it (registered AFTER
  // mockBackendAsKid so it wins) to return an SVG → the same generated snippet.
  await mockBackendAsKid(page);
  const SVG = 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64');
  await page.route('**/llm/generate-asset', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dataUrl: SVG, mime: 'image/svg+xml' }),
    });
  });
  await openStudio(page);
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Assets/ }).click();

  await expect(page.getByText('All assets')).toBeVisible();
  await page.getByPlaceholder(/Describe an asset/).fill('a happy coin');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();

  // The generated asset's detail opens with a copy-able Phaser loader snippet.
  await expect(
    page.getByText("this.load.image('a_happy_coin', 'assets/generated/a_happy_coin.svg')"),
  ).toBeVisible({ timeout: 5_000 });
});

test('asset viewer: import an image → grid card + code-ref + Copy', async ({ page }) => {
  await reachWorkspace(page);
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Assets/ }).click();

  await page.setInputFiles('input[type="file"]', {
    name: 'hero.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });

  // Card appears in the grid; open it → exact loader snippet → Copy confirms.
  await page.getByText('hero.png').click({ timeout: 5_000 });
  await expect(page.getByText("this.load.image('hero', 'assets/imported/hero.png')")).toBeVisible();
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByText('Code copied — paste it into your game.')).toBeVisible();
});

test('asset viewer: a text asset previews as plain text', async ({ page }) => {
  await reachWorkspace(page);
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Assets/ }).click();
  // Import a text file → opening it shows its text content in the preview.
  await page.setInputFiles('input[type="file"]', {
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Drop sprites/sounds here.'),
  });
  await page.getByText('notes.txt').click({ timeout: 5_000 });
  await expect(page.getByText(/Drop sprites\/sounds here/)).toBeVisible();
});

// ── Chat-first launch ────────────────────────────────────────────────────────

test('workspace launches chat-first: only Chat open, with the scaffold hand-off', async ({ page }) => {
  await reachWorkspace(page);
  // The kid's landing prompt + a generic "starter ready" message + the CTAs.
  await expect(page.getByText('a pong game').first()).toBeVisible();
  await expect(page.getByText(/Your game starter is ready/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run game' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'See code' })).toBeVisible();
  // Code / Runner / Assets windows are CLOSED (no titlebar close buttons, and the
  // editor's file tree isn't mounted).
  await expect(page.getByRole('button', { name: 'Close Game Runner' })).toHaveCount(0);
  await expect(page.getByText('main.js')).toHaveCount(0);
});

test('chat "Run game" opens and plays the Game Runner', async ({ page }) => {
  await reachWorkspace(page);
  await page.getByRole('button', { name: 'Run game' }).click();
  // The runner opens AND runs (the game iframe mounts; no Play-placeholder).
  await expect(page.locator('iframe[title="Game"]')).toBeVisible({ timeout: 6_000 });
});

test('chat "See code" opens the Code Editor', async ({ page }) => {
  await reachWorkspace(page);
  await page.getByRole('button', { name: 'See code' }).click();
  await expect(page.getByText('main.js').first()).toBeVisible();
});

test('a project that fails to load shows an error and a way back to creation (no scaffold fallback)', async ({ page }) => {
  // Backend is the source of truth: a failed load must NOT silently open a local
  // scaffold — it shows an error and routes back to project creation. This is
  // authed-route behaviour already; the harness seats the session, then a
  // 500 on GET /code/files (registered AFTER mockBackendAsKid so it wins) fails
  // the load.
  await mockBackendAsKid(page);
  await page.route('**/projects/*/code/files', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' });
    }
    return route.continue();
  });
  await openLanding(page);
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('x');
  await input.press('Enter');

  // Error screen, not the workspace / not a scaffold.
  await expect(page.getByText(/couldn't open this game/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /Make something new/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Split/ })).toBeHidden();
});

// ── New chat-UX features (chat-ux-design.md §2.1 / §2.2 / §3) ─────────────────
// On the authed route each turn is the real Lite flow: send → agency beat → "Do
// it" (`show-me-first`) → the thinking bubble shows during the POST/stream → a
// streamed `agent-msg` settles. These exercise that flow on the live chat.

test('AI chat: a fun thinking bubble shows while the AI works', async ({ page }) => {
  await mockBackendAsKid(page);
  // Delay the turn POST so the thinking bubble (the pending bubble while the turn
  // is in flight) is reliably catchable — the harness's instant mock would settle
  // before the assertion could see it. Registered AFTER mockBackendAsKid so it wins.
  await page.route('**/projects/*/code/turn', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await new Promise((r) => setTimeout(r, 1_500));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        turn_id: 'turn-1',
        requires_approval: false,
        plan: null,
        changes: [],
        files: [{ path: 'main.js', content: '// ok\n', kind: 'text', size: 6 }],
        summary: 'I made it bouncier for you!',
        stars_charged: 2,
        tools_fired: ['edit_file:main.js'],
      }),
    });
  });
  await openStudio(page);
  const chat = page.getByTestId('chat-input');
  await chat.fill('make the ball bouncier');
  await chat.press('Enter');
  await expect(page.getByText('make the ball bouncier')).toBeVisible();

  // Confirm the agency beat — the turn POSTs here, and the animated thinking
  // bubble shows for the round-trip (Gap B — replaces the dull italic "Thinking…").
  await expect(page.getByTestId('agency-card')).toBeVisible({ timeout: 6_000 });
  await page.getByTestId('show-me-first').click();
  await expect(page.getByTestId('thinking-bubble')).toBeVisible();

  // When the turn resolves, the thinking bubble is REPLACED by a settled reply.
  await expect(page.getByTestId('agent-msg')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('thinking-bubble')).toBeHidden();
});

test('AI chat: a "new messages" pill appears when scrolled up, and click re-pins', async ({ page }) => {
  await reachWorkspace(page);
  const chat = page.getByTestId('chat-input');
  const list = page.getByRole('log');

  // One authed turn = send → agency beat → "Do it" → await the settled agent msg.
  const runTurn = async (text: string) => {
    await chat.fill(text);
    await chat.press('Enter');
    await expect(page.getByTestId('agency-card')).toBeVisible({ timeout: 6_000 });
    await page.getByTestId('show-me-first').click();
    // Wait for the reply to settle (the input is busy-gated while it streams).
    await expect.poll(async () => page.getByTestId('agent-msg').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('agent-msg').last()).toBeVisible({ timeout: 6_000 });
  };

  // Seed enough turns that the list overflows (each turn adds a kid bubble + a
  // reply). Loop until the list actually overflows (robust to row heights).
  for (let i = 0; i < 6; i++) {
    await runTurn(`tweak number ${i}`);
    const overflow = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
    if (overflow > 40) break;
  }
  await expect
    .poll(async () => list.evaluate((el) => el.scrollHeight - el.clientHeight))
    .toBeGreaterThan(40);

  // Scroll UP to re-read → releases the stick-to-bottom. Dispatch the scroll
  // event explicitly and let the handler's `setAtBottom(false)` commit BEFORE the
  // next content change — otherwise the layout effect still reads "pinned" and
  // glues back down (no pill). Poll the list stays parked at the top.
  await list.evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(async () => list.evaluate((el) => el.scrollTop)).toBeLessThan(40);

  // A new message arrives while released → the kid bubble appends (content grew
  // while not pinned) and the "↓ New stuff!" pill surfaces. We assert the pill on
  // this single, stable append (no streaming churn): the agency beat hasn't been
  // confirmed, so the list isn't re-arming the pill token-by-token.
  await chat.fill('one more tweak');
  await chat.press('Enter');
  await expect(page.getByText('one more tweak')).toBeVisible();
  const pill = page.getByTestId('chat-jump-newest');
  await expect(pill).toBeVisible({ timeout: 6_000 });

  // Tapping it re-pins: the pill disappears and the newest message scrolls into
  // view (the user-facing guarantee — robust to sub-threshold padding/animation).
  await pill.click();
  await expect(pill).toBeHidden();
  const newest = page.getByText('one more tweak');
  await expect
    .poll(
      async () =>
        newest.evaluate((msg) => {
          const log = msg.closest('[role="log"]')!;
          const m = msg.getBoundingClientRect();
          const l = log.getBoundingClientRect();
          // The newest bubble's bottom is at/above the list's visible bottom edge.
          return m.bottom - l.bottom;
        }),
      { timeout: 10_000 },
    )
    .toBeLessThan(8);
});

test('AI chat: the message list is an accessible live region', async ({ page }) => {
  await reachWorkspace(page);
  const list = page.getByRole('log');
  await expect(list).toBeVisible();
  await expect(list).toHaveAttribute('aria-live', 'polite');
});

// ── Stop / skip the streaming animation (H1) — REAL (authed) path ─────────────
// `chat-stop` renders only while the client-side token replay (`streamTurn`)
// runs, which is the authed (projectId) chat path. To widen the streaming window
// enough to reliably catch the Stop button, we register OUR OWN turn override
// (AFTER mockBackendAsKid so it wins) returning a LONG summary — the per-token
// replay (~18ms/token) then takes long enough to click Stop mid-stream. Stop
// finalizes the reply (it's already paid for): the streaming bubble settles to a
// full `agent-msg`, never discarding the result.
test('Stop skips the streaming animation and finalizes the reply', async ({ page }) => {
  await mockBackendAsKid(page);
  // A long summary widens the per-token replay window so Stop is reliably catchable.
  const longSummary = (
    'I changed the block colour to pink for you. ' +
    'Press the Play button to see it run in the Game Runner. ' +
    'Then come back and tell me what you want to change next — ' +
    'we can make it faster, bigger, or add a whole new thing to your game.'
  ).repeat(3);
  await page.route('**/projects/*/code/turn', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        turn_id: 'turn-1',
        requires_approval: false,
        plan: null,
        changes: [],
        files: [{ path: 'main.js', content: '// stopped\n', kind: 'text', size: 11 }],
        summary: longSummary,
        stars_charged: 2,
        tools_fired: ['edit_file:main.js'],
      }),
    });
  });
  await openStudio(page);

  // Send → agency beat → "Do it" runs the turn → the reply STREAMS (a long
  // summary keeps the replay running long enough to catch Stop).
  await page.getByTestId('chat-input').fill('make the block pink');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('agency-card')).toBeVisible({ timeout: 6_000 });
  await page.getByTestId('show-me-first').click();

  await expect(page.getByTestId('agent-msg-streaming')).toBeVisible({ timeout: 6_000 });
  // The Stop button is visible during streaming → click it.
  const stop = page.getByTestId('chat-stop');
  await expect(stop).toBeVisible({ timeout: 6_000 });
  await stop.click();

  // Stop finalizes (skip-to-end, not discard): the streaming bubble settles to a
  // full `agent-msg` with the complete summary, and the Stop button is gone.
  await expect(page.getByTestId('agent-msg')).toContainText('pink', { timeout: 6_000 });
  await expect(page.getByTestId('agent-msg-streaming')).toHaveCount(0);
  await expect(stop).toHaveCount(0);
});
