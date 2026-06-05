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
