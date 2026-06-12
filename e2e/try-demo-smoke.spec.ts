// Try Demo Mode smoke (try-demo-mode-prd.md acceptance 1–5 / D-DEMO-07 parity
// alarm). Unlike every other spec, this uses NO auth seat and NO route mocks:
// the public /try/* demos must work in a clean session with ZERO /projects*,
// /llm/*, /help/* or /auth* requests (the app-shell /auth/refresh bootstrap is
// the one allowed exception). If a studio change breaks the demo script/tour/
// story/overlay, it fails here — update src/pages/try/ in the same task
// (see AGENTS.md).

import { expect, test, type Page } from '@playwright/test';

function trackForbidden(page: Page): string[] {
  const forbidden: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (/^\/(projects|llm|help)\b/.test(url.pathname)) forbidden.push(url.pathname);
    if (url.pathname.startsWith('/auth') && !url.pathname.startsWith('/auth/refresh')) {
      forbidden.push(url.pathname);
    }
  });
  return forbidden;
}

/** Walk the tour from the landing through to the "Even pros hit errors" card
 *  (the bug has landed and the REAL console shows the error). Shared by the
 *  Next-button path and the console-button path below. */
async function walkToErrorCard(page: Page) {
  await page.goto('/try/playground');

  // 1 — REAL landing phase: prompt pre-filled + locked, card beside the input,
  //     NOT skippable; ONLY the tour card creates (the landing submit is inert).
  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await expect(page.getByTestId('tour-title')).toHaveText('Every game starts with a sentence');
  await expect(page.getByTestId('tour-card')).toHaveAttribute('data-placement', 'beside-input');
  await expect(page.getByTestId('tour-skip')).toHaveCount(0);
  const prompt = page.getByLabel('Describe a game');
  await expect(prompt).toHaveValue(/fruit-catcher game/);
  await expect(prompt).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Build game')).toBeDisabled(); // tweak: inert real submit
  await page.getByTestId('tour-next').click(); // Create the game

  // 1→2 — the REAL generating progress plays: the starter's files reveal
  //       one-by-one through the same thinking → building → done arc.
  await expect(page.getByTestId('generating-screen')).toBeVisible();
  await expect(page.getByText('Building your game', { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId('generating-screen').getByText('Game.js')).toBeVisible({
    timeout: 10_000,
  });

  // 2 — workspace entry auto-opens the Game Runner and STARTS the game; the
  //     canned first-turn reply seeded the chat like a real first build.
  await expect(page.getByTestId('tour-title')).toHaveText('Meet your game', { timeout: 20_000 });
  await expect(page.getByTestId('tour-skip')).toBeVisible(); // skippable from here on
  await expect(page.getByText('Running', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('chat-starter')).toBeVisible();

  // 3 — scripted ask 1 (faster apples), auto-restart keeps the game running;
  //     the next card discusses the conversation, so it spotlights the chat.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('One ask → one change', { timeout: 15_000 });
  await expect(page.getByTestId('tour-spotlight-ring')).toBeVisible();

  // 4 — diff step: the editor opens on the changed line (real jump+highlight path).
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('See the line that changed');
  await expect(page.getByText('Code Editor').first()).toBeVisible();

  // 5 — scripted ask 2 (score +10) → auto-restart.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Keep score', { timeout: 15_000 });

  // 6a — select card: the REAL selection pipeline pops the live "✨ Explain
  //      this" toolbar over the selected snippet; the next card spotlights it.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('A ✨ button appears');
  await expect(page.getByTestId('explain-selection')).toBeVisible({ timeout: 15_000 });

  // 6b — fire card: the toolbar's real handler fires and the scripted agent
  //      answers in plain words, in the chat.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Code that explains itself', { timeout: 15_000 });
  await expect(page.getByText(/runs every time an apple lands/)).toBeVisible();

  // 7a-A — beautify: the Asset Viewer opens with the wish typed into its REAL
  //        generate box.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Describe it, Airo draws it');
  await expect(page.getByTestId('asset-generate-prompt')).toHaveValue('a shiny red apple sticker', {
    timeout: 10_000,
  });

  // 7a-B — submit through the pane's real ✨ Generate → the sticker lands
  //        (2 emoji starters + 1 generated; crafted offline art).
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Airo can draw, too', { timeout: 30_000 });
  await expect(page.getByTestId('asset-card')).toHaveCount(3, { timeout: 10_000 });

  // 7b-A — the sticker's REAL details view opens, remix wish pre-typed.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Same sticker, new twist');
  await expect(page.getByTestId('asset-remix-prompt')).toHaveValue('make it golden and sparkly', {
    timeout: 10_000,
  });

  // 7b-B — submit the real Remix → the golden sticker lands and ITS details open.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Remix until it sparkles', { timeout: 30_000 });
  await expect(page.getByTestId('asset-codeRef')).toContainText('make_it_golden_and_spark.svg', {
    timeout: 10_000,
  });

  // 7c — the remixed sticker is wired INTO the game (a scripted edit) →
  //      auto-restart shows the new art live.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Your art, in your game', { timeout: 15_000 });
  await expect(page.getByText('Running', { exact: true })).toBeVisible({ timeout: 20_000 });

  // 8 — scripted ask deliberately lands a bug → the runner's REAL console
  //     auto-opens with the error at the right file.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Even pros hit errors', { timeout: 15_000 });
  await expect(page.getByText(/makeWinBanner is not a function/)).toBeVisible({ timeout: 20_000 });
}

test('try/playground: the 16-card v3 tour → free explore → AI gate', async ({ page }) => {
  test.setTimeout(180_000); // the tour walks the whole studio (Phaser + Monaco)
  const forbidden = trackForbidden(page);
  await walkToErrorCard(page);

  // 9 — the fix turn repairs it → auto-restart → the game runs again.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Airo reads the console and fixes it', {
    timeout: 15_000,
  });
  await expect(page.getByText('Running', { exact: true })).toBeVisible({ timeout: 20_000 });

  // 10 — the in-studio Game Guide opens on the REAL corpus's most diagram-rich
  //      page (the game-loop doc with its two diagrams).
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Stuck? The Guide knows');
  await expect(page.getByTestId('help-pane')).toBeVisible();
  await expect(page.getByTestId('help-diagram-game-loop')).toBeVisible();
  await expect(page.getByTestId('help-nav-doc-engine/what-is-an-engine')).toBeVisible();

  // 11 — free explore: the applied diffs flowed through the real funnel (undo
  //      offered) and a typed message hits the contact-us gate.
  await page.getByTestId('tour-next').click(); // Last step
  await expect(page.getByTestId('tour-title')).toHaveText('Now it’s all yours');
  await page.getByTestId('tour-next').click(); // Explore freely ✨
  await expect(page.getByTestId('demo-tour')).toHaveCount(0);
  await expect(page.getByTestId('undo-turn')).toBeVisible();
  // The Guide window (step 10) may overlap the chat's send button — type into
  // the real input and send with Enter (the input's documented send path).
  await page.getByTestId('chat-input').fill('make me a dragon game');
  await page.getByTestId('chat-input').press('Enter');
  await expect(page.getByText(/airbotix\.ai\/book/)).toBeVisible({ timeout: 10_000 });

  expect(forbidden).toEqual([]);
});

test('try/playground: the console\'s real "Ask AI to fix" continues the script', async ({ page }) => {
  test.setTimeout(180_000);
  const forbidden = trackForbidden(page);
  await walkToErrorCard(page);

  // Instead of the tour's Next, click the REAL console affordance: the scripted
  // agent recognises the console's fix-request prompt, replays the fix turn,
  // restarts the game, and the tour advances to the fix card by itself.
  await page.getByRole('button', { name: 'Ask AI to fix' }).click();
  await expect(page.getByTestId('tour-title')).toHaveText('Airo reads the console and fixes it', {
    timeout: 15_000,
  });
  await expect(page.getByText(/Found it! 🔧/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Running', { exact: true })).toBeVisible({ timeout: 20_000 });

  expect(forbidden).toEqual([]);
});

test('try/blocks: story loads, Go runs, pages navigate, share hidden', async ({ page }) => {
  const forbidden = trackForbidden(page);
  await page.goto('/try/blocks');

  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await expect(page.getByTestId('blocks-studio')).toBeVisible();
  await expect(page.getByTestId('blocks-studio').getByText("Cat's Day Out")).toBeVisible();
  await expect(page.getByTestId('share-link-btn')).toHaveCount(0);

  // Skip the tour and drive the real studio: ▶ Go runs page 1's flag scripts.
  await page.getByTestId('tour-skip').click();
  await page.getByTestId('go-button').click();
  await expect(page.getByTestId('go-button')).toBeEnabled({ timeout: 20_000 }); // run finished

  // Page rail navigates the 3-page story.
  await page.getByTestId('page-thumb-2').click();
  await expect(page.getByText('Page 3 of 3')).toBeVisible();

  expect(forbidden).toEqual([]);
});
