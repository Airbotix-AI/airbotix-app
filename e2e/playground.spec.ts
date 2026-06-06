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
