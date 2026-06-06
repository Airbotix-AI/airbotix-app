import { test, expect, type Page } from '@playwright/test';

// E2E for the redesigned Playground (DEV-only /playground-sandbox, no auth):
// Landing (glow prompt + chips) → Generating (blocking) → Workspace with two
// layout modes (Window default / Split). Stubbed generation + AI turn.
// NOTE: window titles appear in 3 places (desktop icon, window titlebar, taskbar
// button) so text selectors use .first() / roles to stay unambiguous.

const LANDING_PLACEHOLDER = "Describe a game and we'll build it…";

async function reachWorkspace(page: Page) {
  await page.goto('/playground-sandbox');
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('a pong game');
  await input.press('Enter');
  // Workspace marker: the layout toggle (taskbar) appears.
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
}

test('landing shows the prompt + starter chips, and Enter → generating → workspace', async ({ page }) => {
  await page.goto('/playground-sandbox');
  await expect(page.getByPlaceholder(LANDING_PLACEHOLDER)).toBeVisible();
  await expect(page.getByRole('button', { name: /Pong/ })).toBeVisible();

  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('a pong game');
  await input.press('Enter');

  await expect(page.getByText('Building your game…')).toBeVisible({ timeout: 4_000 });
  // Workspace (Window mode default): the Game Runner window + taskbar toggle.
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Game Runner').first()).toBeVisible();
});

test('generated project is multi-file (nested src/scenes in the Code editor)', async ({ page }) => {
  await reachWorkspace(page);
  await expect(page.getByText('main.js').first()).toBeVisible();
  await expect(page.getByText('scenes').first()).toBeVisible();
});

test('code editor: status bar, Files/Assets split, and the file-column toggle', async ({ page }) => {
  await reachWorkspace(page);
  // Split mode → Code tab gives a clean, unobstructed editor.
  await page.getByRole('button', { name: /Split/ }).click();
  await page.getByRole('tab', { name: /Code/ }).click();

  // Status bar: caret position + language (no "unsaved" — auto-save is planned).
  await expect(page.getByText(/Ln \d+, Col \d+/).first()).toBeVisible();
  await expect(page.getByText('JAVASCRIPT', { exact: true }).first()).toBeVisible();

  // Files tab shows source (src) but NOT the assets folder (it has its own tab).
  await expect(page.getByText('src', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('assets', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Assets/ }).click();
  await expect(page.getByText(/README/).first()).toBeVisible();
  await page.getByRole('button', { name: /Files/ }).click();

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

test('AI chat (stub): sending a prompt shows the kid message and a reply', async ({ page }) => {
  await reachWorkspace(page);
  const chat = page.getByPlaceholder('What should we build?');
  await chat.fill('make the ball faster');
  await chat.press('Enter');
  await expect(page.getByText('make the ball faster')).toBeVisible();
  await expect(page.getByText(/AI demo|sample tweak|isn.t connected/i)).toBeVisible({ timeout: 6_000 });
  // Chatting must NOT auto-run the game — the runner stays on its placeholder.
  await expect(page.getByText('Press ▶ to play')).toBeVisible();
});

test('game runner: placeholder until Play, then it starts', async ({ page }) => {
  await reachWorkspace(page);
  await expect(page.getByText('Press ▶ to play')).toBeVisible();
  // The placeholder's Play button launches the game (placeholder disappears).
  await page.getByRole('button', { name: 'Play' }).first().click();
  await expect(page.getByText('Press ▶ to play')).toBeHidden();
});

test('game runner: a problem (error OR warning) auto-opens the console', async ({ page }) => {
  // Serve a project whose entry file logs a WARNING (like Phaser's "Scene not
  // found") — warnings must auto-open the console too, not just thrown errors.
  const code = "console.warn('Scene not found for key: Game1');\n";
  await page.route('**/projects/**/code/files', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ files: [{ path: 'main.js', content: code, kind: 'text', size: code.length }] }),
    }),
  );
  await page.goto('/playground-sandbox?projectId=warn-1');
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('x');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });

  // Console is closed until something goes wrong.
  await expect(page.getByText('Console', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Play' }).first().click();
  // The warning auto-opens the console and shows the message.
  await expect(page.getByText('Console', { exact: true })).toBeVisible({ timeout: 6_000 });
  await expect(page.getByText(/Scene not found for key: Game1/)).toBeVisible();
});

test('game runner: screen-size presets reshape the stage (portrait vs landscape)', async ({ page }) => {
  await reachWorkspace(page);
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
  await page.goto('/playground-sandbox');
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

  const before = await win.boundingBox();
  // Double-click the title bar → maximized (fills the desktop, grows).
  await bar.dblclick();
  const maxed = await win.boundingBox();
  expect(maxed!.width).toBeGreaterThan(before!.width);
  expect(Math.round(maxed!.x)).toBe(0);
  expect(Math.round(maxed!.y)).toBe(0);

  // Double-click again → restored to the SAME spot it was before (not 0,0).
  await bar.dblclick();
  const restored = await win.boundingBox();
  expect(Math.round(restored!.x)).toBe(Math.round(before!.x));
  expect(Math.round(restored!.y)).toBe(Math.round(before!.y));
  expect(Math.round(restored!.width)).toBe(Math.round(before!.width));
});

test('code editor window launches wide (editor area doubled, file column unchanged)', async ({ page }) => {
  await reachWorkspace(page); // Window mode default.
  // The launch width doubles the editor area while the fixed file column keeps
  // its width: width = files col + 2·(W/3 − files col). (Keep FILES_COL in sync
  // with CODE_FILES_COL_W / FILES_DEFAULT_W in the app.)
  const FILES_COL = 220;
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
  await reachWorkspace(page); // Window mode; the Code Editor mounts Monaco.
  // Monaco renders hover/suggest widgets into a BODY-level node (not inside the
  // editor), so the window's overflow:hidden can't clip a long doc tooltip. The
  // `.overflowingContentWidgets` container living under `body > .monaco-editor`
  // is the proof the widgets escape the window.
  await expect(
    page.locator('body > div.monaco-editor .overflowingContentWidgets'),
  ).toHaveCount(1, { timeout: 15_000 });
});

test('file tree: create, rename, and delete a file', async ({ page }) => {
  await reachWorkspace(page); // Window mode; Code Editor open on the scaffold.
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
  await reachWorkspace(page);
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
  await reachWorkspace(page);
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

test('history: idle autosnapshot records a checkpoint, then diff + revert', async ({ page }) => {
  await reachWorkspace(page); // Window mode; Code Editor on the scaffold.
  await expect(page.locator('.monaco-editor').first()).toBeVisible();

  // History starts seeded with the initial version.
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('Initial version')).toBeVisible();

  // Type into the editor → after the idle pause it auto-commits + snapshots.
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.type('// history checkpoint test\n');
  await expect(page.getByText(/edited main\.js/)).toBeVisible({ timeout: 6_000 });

  // Click the entry → a detail column lists the files THAT entry changed.
  await page.getByText(/edited main\.js/).click();
  await expect(page.getByTestId('history-detail')).toBeVisible();
  // Click the changed file → its diff opens as its OWN tab next to the files.
  await page.getByRole('button', { name: 'Diff main.js' }).click();
  await expect(page.getByTestId('history-diff')).toBeVisible();

  // It's a real tab: switch to the file tab (diff hides), then back to the diff tab.
  await page.getByRole('button', { name: 'main.js', exact: true }).click();
  await expect(page.getByTestId('history-diff')).toBeHidden();
  await page.getByRole('button', { name: 'main.js (diff)', exact: true }).click();
  await expect(page.getByTestId('history-diff')).toBeVisible();

  // Close the diff tab.
  await page.getByRole('button', { name: 'Close main.js (diff)' }).click();
  await expect(page.getByTestId('history-diff')).toBeHidden();

  // Select the initial version → revert from the detail header.
  await page.getByText('Initial version').click();
  await page.getByRole('button', { name: 'Revert to Initial version' }).click();
  await expect(page.getByText(/reverted/)).toBeVisible();
});

// Serve a single-file project whose entry throws on a known line, then reach the
// workspace. The thrown error is what the debugging specs below act on.
async function reachWorkspaceWithThrow(page: Page, projectId: string, throwLine = 3) {
  // `throwLine` is 1-based in the authored file. Pad with comment lines so the
  // throw sits exactly on that line — the jump-to-error spec asserts the caret
  // lands there, which only holds if `//# sourceURL` line numbers match the file.
  const pad = Array.from({ length: throwLine - 1 }, (_, i) => `// line ${i + 1}`);
  const code = [...pad, "throw new Error('kaboom from main');", ''].join('\n');
  await page.route('**/projects/**/code/files', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ files: [{ path: 'main.js', content: code, kind: 'text', size: code.length }] }),
    }),
  );
  await page.goto(`/playground-sandbox?projectId=${projectId}`);
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('x');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
}

test('jump-to-error: a console error location opens that file at that line in the editor', async ({ page }) => {
  await reachWorkspaceWithThrow(page, 'throw-1', 3);
  // Split mode keeps the runner (right) and editor (left) un-occluded.
  await page.getByRole('button', { name: /Split/ }).click();

  // Run the game → the entry script throws → console auto-opens with a LOCATED
  // error (this only works if `//# sourceURL` makes the error's filename = the
  // kid's file and the line number match the authored line).
  await page.getByRole('button', { name: 'Play' }).first().click();
  const jump = page.getByRole('button', { name: 'main.js:3' });
  await expect(jump).toBeVisible({ timeout: 6_000 });

  // Click the location → the editor opens main.js and the caret lands on line 3.
  await jump.click();
  await expect(page.getByRole('tab', { name: /Code/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Ln 3, Col 1')).toBeVisible();
});

test('Ask AI to fix: a console error is sent to the chat agent', async ({ page }) => {
  await reachWorkspaceWithThrow(page, 'throw-2', 3);
  await page.getByRole('button', { name: /Split/ }).click();

  await page.getByRole('button', { name: 'Play' }).first().click();
  const askFix = page.getByRole('button', { name: /Ask AI to fix/ });
  await expect(askFix).toBeVisible({ timeout: 6_000 });

  // Clicking routes the error to chat (focuses the Chat tab) and gets a reply.
  await askFix.click();
  await expect(page.getByRole('tab', { name: /Chat/ })).toHaveAttribute('aria-selected', 'true');
  // The kid bubble carries the error; the stub agent replies (chat-only text).
  await expect(page.getByText(/kaboom from main/).first()).toBeVisible();
  await expect(page.getByText(/AI demo|sample tweak|isn.t connected/i)).toBeVisible({ timeout: 6_000 });
});

test('editor lazy-loads the vendored Phaser .d.ts for IntelliSense', async ({ page }) => {
  await page.goto('/playground-sandbox');
  // Arm the wait BEFORE the editor mounts (Monaco onMount triggers the fetch).
  // Assert the RESPONSE (not just the request) is 200 — the .d.ts is now
  // materialized from the `phaser` npm dep by scripts/copy-phaser.mjs (predev),
  // so this also guards that the build-time copy actually served the file.
  const dtsResponse = page.waitForResponse(
    (r) => r.url().includes('/vendor/phaser-3.80.1.d.ts'),
    { timeout: 15_000 },
  );
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('a pong game');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
  // The Code Editor mounting (Window mode default) lazy-fetches the type defs.
  const res = await dtsResponse;
  expect(res.status()).toBe(200);
});

test('a closed window leaves the taskbar and reopens from its desktop icon', async ({ page }) => {
  await reachWorkspace(page);
  // Close the Game Runner window via its titlebar close button.
  await page.getByRole('button', { name: 'Close Game Runner' }).click();
  await expect(page.getByRole('button', { name: 'Close Game Runner' })).toBeHidden();
  // Closed windows are removed from the taskbar; reopen from the desktop icon
  // (the first 'Game Runner' button = the desktop shortcut).
  await page.getByRole('button', { name: 'Game Runner' }).first().click();
  await expect(page.getByRole('button', { name: 'Close Game Runner' })).toBeVisible();
});
