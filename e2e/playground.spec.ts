import { test, expect } from '@playwright/test';

// E2E for the Playground (design §9.3). Runs against the dev-only, no-auth
// /playground-sandbox route. The UI is a permanent two-pane split (Code Editor
// left, Game Runner right) — no windows/desktop/taskbar. Covers both panes, the
// game control channel (__airbotixStat fps + pause/resume), screen presets, and
// the stubbed AI chat turn→reply.

test.beforeEach(async ({ page }) => {
  await page.goto('/playground-sandbox');
});

test('both panes render: editor (game.js + AI Helper) and runner (Running)', async ({ page }) => {
  await expect(page.getByText('game.js').first()).toBeVisible();
  await expect(page.getByText('AI Helper')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible();
});

test('game control channel: fps ticks (>0) and pause/resume flips status', async ({ page }) => {
  // The status-bar fps comes from the sandboxed game via __airbotixStat. A value
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

  // 'Pause'/'Play' (exact) match only the runner toolbar; the editor's run
  // button is labelled "Run game".
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByText('Paused')).toBeVisible();

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByText('Running')).toBeVisible();
});

test('screen-size preset changes the stage dimensions', async ({ page }) => {
  await page.getByLabel('Screen size').selectOption('iphone');
  // Scope to the status-bar readout (the <option> label also contains these dims).
  await expect(page.getByText('390 × 844', { exact: true })).toBeVisible();
});

test('AI chat (stub): sending a prompt shows the kid message and a reply', async ({ page }) => {
  const input = page.getByPlaceholder('What should we build?');
  await input.fill('make the ball faster');
  await input.press('Enter');

  await expect(page.getByText('make the ball faster')).toBeVisible();
  // Stubbed assistant reply (clearly-placeholder text from runTurnStub).
  await expect(page.getByText(/AI demo|sample tweak|isn.t connected/i)).toBeVisible({ timeout: 6_000 });
});
