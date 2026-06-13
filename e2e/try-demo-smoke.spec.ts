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
    if (/^\/(projects|llm|help|share)\b/.test(url.pathname)) forbidden.push(url.pathname);
    if (url.pathname.startsWith('/auth') && !url.pathname.startsWith('/auth/refresh')) {
      forbidden.push(url.pathname);
    }
  });
  return forbidden;
}

type WorkspaceLayout = 'window' | 'split';

/** Flip the workspace layout through the taskbar's REAL LayoutToggle. */
async function setLayout(page: Page, layout: WorkspaceLayout) {
  await page.getByRole('button', { name: layout === 'split' ? 'Split' : 'Windows' }).click();
}

/** Walk the tour from the landing through to the "Even pros hit errors" card
 *  (the bug has landed and the REAL console shows the error). Shared by the
 *  Next-button path, the console-button path, and the split-layout walk below
 *  (`layout: 'split'` flips the real taskbar toggle at "Meet your game" — a
 *  mid-tour layout change — and the whole tour must keep working). */
async function walkToErrorCard(page: Page, layout: WorkspaceLayout = 'window') {
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

  if (layout === 'split') {
    // Mid-tour layout flip through the REAL taskbar toggle: the Game pane is
    // now the permanent right region and the card's spotlight re-resolves onto
    // it (the layout-proof selector pair + the mask's poll).
    await setLayout(page, 'split');
    await expect(page.locator('[data-pane="game"]')).toBeVisible();
    await expect(page.getByTestId('tour-spotlight-ring')).toBeVisible();
    await page.screenshot({ path: '/tmp/split-meet-your-game.png' });
  }

  // 3 — scripted ask 1 (faster apples), auto-restart keeps the game running;
  //     the next card discusses the conversation, so it spotlights the chat.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('One ask → one change', { timeout: 15_000 });
  await expect(page.getByTestId('tour-spotlight-ring')).toBeVisible();

  // 4 — diff step: the editor opens on the changed line (real jump+highlight
  //     path) — the floating Code window, or the split layout's Code tab.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('See the line that changed');
  await expect(page.locator('[data-window="code"], [data-pane="code"]')).toBeVisible();

  // 5 — scripted ask 2 (score +10) → auto-restart.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Keep score', { timeout: 15_000 });
  if (layout === 'split') await page.screenshot({ path: '/tmp/split-keep-score.png' });

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
  if (layout === 'split') await page.screenshot({ path: '/tmp/split-asset-prompt.png' });

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

/**
 * Walk the share block (D-DEMO-09) — the caller must already be on the share-open
 * card. Drives the REAL share panel (open → ask-a-grown-up `pending` → simulated
 * approval → `active` link) then opens `/play/:shareId` in a REAL new tab: the
 * unmodified PublicPlayPage on the bundled snapshot. Verifies the popup/overlay
 * layering empirically (the tour's Next never dismisses the panel). Leaves the
 * tour on the free-explore card.
 */
async function walkShareBeat(
  page: Page,
  panelTestId: 'share-popup' | 'share-panel',
  shareId: 'try-demo-playground' | 'try-demo-blocks',
) {
  // share-open: its Next opens the REAL share panel (it stays open across the beat).
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId(panelTestId)).toBeVisible();
  // share-request: the panel's real "ask a grown-up" → its genuine pending state.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('share-approval-pending')).toBeVisible();
  // share-approve: the preview-framed simulated approval → the real active link.
  await page.getByTestId('tour-next').click();
  const url = page.getByTestId('share-url');
  await expect(url).toBeVisible();
  await expect(url).toHaveValue(new RegExp(`/play/${shareId}$`));
  // share-recipient: opens a REAL new tab to the REAL public play page (offline).
  const popupPromise = page.context().waitForEvent('page');
  await page.getByTestId('tour-next').click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(new RegExp(`/play/${shareId}$`));
  // Assert the REAL player actually mounted from the bundled snapshot — not just
  // the always-present `play-root` shell (which also shows during loading/errors).
  const playerTestId = shareId === 'try-demo-blocks' ? 'blocks-play-root' : 'play-iframe';
  await expect(popup.getByTestId(playerTestId)).toBeVisible({ timeout: 15_000 });
  await popup.close();
}

test('try/playground: the 20-card v3 tour → share beat → free explore → AI gate', async ({ page }) => {
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

  // 11 — share beat (D-DEMO-09): the REAL share panel, then the REAL public play
  //      page in a new tab. ZERO /projects*/share* network (the in-memory adapter).
  await page.getByTestId('tour-next').click(); // guide → "Show it off — safely"
  await expect(page.getByTestId('tour-title')).toHaveText('Show it off — safely');
  await walkShareBeat(page, 'share-popup', 'try-demo-playground');

  // 12 — free explore: the applied diffs flowed through the real funnel (undo
  //      offered) and a typed message hits the contact-us gate.
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

test('try/playground: the full tour in the SPLIT layout, with mid-tour layout flips', async ({ page }) => {
  test.setTimeout(180_000);
  const forbidden = trackForbidden(page);
  // The walk flips to Split at "Meet your game" (a mid-tour toggle in itself)
  // and every card must keep working: chat/code/assets/help surface through
  // the REAL tab strip, the Game pane is the permanent right region.
  await walkToErrorCard(page, 'split');

  // Mid-tour flips at the error card: the spotlight (the runner's console) must
  // re-resolve in EACH layout — the mask re-measures on its own poll.
  await setLayout(page, 'window');
  await expect(page.getByText(/makeWinBanner is not a function/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('tour-spotlight-ring')).toBeVisible();
  await setLayout(page, 'split');
  await expect(page.getByText(/makeWinBanner is not a function/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('tour-spotlight-ring')).toBeVisible();
  await page.screenshot({ path: '/tmp/split-error-card.png' });

  // 9 — the fix turn repairs it → auto-restart → the game runs again.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Airo reads the console and fixes it', {
    timeout: 15_000,
  });
  await expect(page.getByText('Running', { exact: true })).toBeVisible({ timeout: 20_000 });

  // 10 — the Game Guide surfaces as the split layout's REAL Guide tab.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-title')).toHaveText('Stuck? The Guide knows');
  await expect(page.getByRole('tab', { name: 'Guide' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('help-pane')).toBeVisible();
  await expect(page.getByTestId('help-diagram-game-loop')).toBeVisible();
  await page.screenshot({ path: '/tmp/split-guide.png' });

  // 11 — share beat (D-DEMO-09): the taskbar Share button + portaled popup are
  //      layout-independent — the same walk works in split.
  await page.getByTestId('tour-next').click(); // guide → "Show it off — safely"
  await expect(page.getByTestId('tour-title')).toHaveText('Show it off — safely');
  await walkShareBeat(page, 'share-popup', 'try-demo-playground');

  // 12 — free explore: in split the conversation lives behind the Chat tab —
  //      the same real affordance a user would click.
  await expect(page.getByTestId('tour-title')).toHaveText('Now it’s all yours');
  await page.getByTestId('tour-next').click(); // Explore freely ✨
  await expect(page.getByTestId('demo-tour')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Chat' }).click();
  await expect(page.getByTestId('undo-turn')).toBeVisible();
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

test('try/blocks: story loads, Go runs, pages navigate, share is demoed', async ({ page }) => {
  const forbidden = trackForbidden(page);
  await page.goto('/try/blocks');

  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await expect(page.getByTestId('blocks-studio')).toBeVisible();
  await expect(page.getByTestId('blocks-studio').getByText("Cat's Day Out")).toBeVisible();
  // Share is DEMOED, not hidden (D-DEMO-09): the REAL share button is present.
  await expect(page.getByTestId('share-link-btn')).toBeVisible();

  // Skip the tour and drive the real studio: ▶ Go runs page 1's flag scripts.
  await page.getByTestId('tour-skip').click();
  await page.getByTestId('go-button').click();
  await expect(page.getByTestId('go-button')).toBeEnabled({ timeout: 20_000 }); // run finished

  // Page rail navigates the 3-page story.
  await page.getByTestId('page-thumb-2').click();
  await expect(page.getByText('Page 3 of 3')).toBeVisible();

  // The REAL share panel opens with the parent-approval CTA (in-memory adapter):
  // request → its genuine pending state, then the public play page in a new tab.
  await page.getByTestId('share-link-btn').click();
  await expect(page.getByTestId('share-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Ask my grown-up to share' }).click();
  await expect(page.getByTestId('share-approval-pending')).toBeVisible();
  // The REAL public play page renders the bundled story snapshot offline — the
  // real ReadOnlyBlocksPlayer mounts (its root only renders when parseProject
  // succeeds on the bundled project.blocks.json).
  await page.goto('/play/try-demo-blocks');
  await expect(page.getByTestId('blocks-play-root')).toBeVisible({ timeout: 15_000 });

  expect(forbidden).toEqual([]);
});
