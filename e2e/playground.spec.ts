import { test, expect } from '@playwright/test';

// E2E for the Playground virtual desktop (design §9.3). Runs against the dev-only,
// no-auth /playground-sandbox route. Covers the desktop shell, the game control
// channel (__airbotixStat fps + pause/resume), window minimize/restore, and the
// stubbed AI chat turn→reply.

test.beforeEach(async ({ page }) => {
  await page.goto('/playground-sandbox');
});

test('desktop shows shortcut icons, both default windows, and taskbar', async ({ page }) => {
  // Shortcut icons (DesktopIcon buttons use aria-label = label).
  await expect(page.getByRole('button', { name: 'Code Editor' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Game Runner' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share' }).first()).toBeVisible();

  // Both default windows open on mount (their titlebar minimize buttons exist).
  await expect(page.getByRole('button', { name: 'Minimize Code Editor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Minimize Game Runner' })).toBeVisible();
});

test('game control channel: fps ticks (>0) and pause/resume flips status', async ({ page }) => {
  // Bring the Game Runner to front (the Code Editor opens on top and overlaps its
  // toolbar) so the toolbar buttons are clickable — same as a real user would.
  await page.getByRole('button', { name: 'Game Runner' }).first().click();

  // The status bar fps comes from the sandboxed game via __airbotixStat. A value
  // > 0 proves the full control/stat channel is live end-to-end.
  await expect
    .poll(
      async () => {
        const text = await page.getByText(/\d+ fps/).first().innerText();
        const m = text.match(/(\d+)\s*fps/);
        return m ? Number(m[1]) : 0;
      },
      { timeout: 10_000, message: 'fps should become > 0' },
    )
    .toBeGreaterThan(0);

  // Pause → status flips to Paused (and the shim sleeps the Phaser loop).
  // The Code Editor's run button is labelled "Run game", so 'Pause'/'Play' here
  // resolve only to the Game Runner toolbar.
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByText('Paused')).toBeVisible();

  // Resume → back to Running.
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByText('Running')).toBeVisible();
});

test('windows are draggable by their titlebar', async ({ page }) => {
  const bar = page.locator('.pg-titlebar', { hasText: 'Code Editor' });
  const before = await bar.boundingBox();
  if (!before) throw new Error('Code Editor titlebar not found');

  // Drag the titlebar right + down a modest amount (the tall window has limited
  // vertical room before bounds="parent" clamps it).
  await page.mouse.move(before.x + 80, before.y + 12);
  await page.mouse.down();
  await page.mouse.move(before.x + 80 + 130, before.y + 12 + 45, { steps: 12 });
  await page.mouse.up();

  const after = await bar.boundingBox();
  if (!after) throw new Error('Code Editor titlebar missing after drag');
  expect(after.x - before.x).toBeGreaterThan(80);
  expect(after.y - before.y).toBeGreaterThan(25);
});

test('screen-size preset changes the stage dimensions', async ({ page }) => {
  await page.getByLabel('Screen size').selectOption('iphone');
  // Scope to the status-bar readout (the <option> label also contains these dims).
  await expect(page.getByText('390 × 844', { exact: true })).toBeVisible();
});

test('window minimize to taskbar and restore via desktop icon', async ({ page }) => {
  await page.getByRole('button', { name: 'Minimize Game Runner' }).click();
  await expect(page.getByRole('button', { name: 'Minimize Game Runner' })).toBeHidden();

  // Restore by clicking the desktop shortcut icon (openOrFocus restores + focuses).
  await page.getByRole('button', { name: 'Game Runner' }).first().click();
  await expect(page.getByRole('button', { name: 'Minimize Game Runner' })).toBeVisible();
});

test('AI chat (stub): sending a prompt shows the kid message and a reply', async ({ page }) => {
  const input = page.getByPlaceholder('What should we build?');
  await input.fill('make the ball faster');
  await input.press('Enter');

  await expect(page.getByText('make the ball faster')).toBeVisible();
  // Stubbed assistant reply (clearly-placeholder text from runTurnStub).
  await expect(page.getByText(/AI demo|sample tweak|isn.t connected/i)).toBeVisible({ timeout: 6_000 });
});
