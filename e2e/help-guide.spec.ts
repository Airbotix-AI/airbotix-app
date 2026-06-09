import { test, expect } from '@playwright/test';

import { mockBackendAsKid, openStudio } from './helpers';

// HJ1 (PRD learn-game-studio-help-prd.md §9.1) — a kid opens the Game Guide from
// the desktop, browses, searches, reads, and switches reading tier. No backend AI
// path here (that's MH2); this is the self-serve browsable Guide. Route-mocked +
// LLM-free like the rest of the playground suite.
test.describe.configure({ timeout: 90_000 });

test('Game Guide: open from desktop → browse → search → read → tier toggle', async ({ page }) => {
  await mockBackendAsKid(page); // Lite kid (default age 9) → tier defaults to "Simple"
  await openStudio(page);

  // Open the Guide from its desktop tile (Window mode, chat-first launch).
  await page.getByRole('button', { name: 'Guide' }).first().click();
  await expect(page.getByTestId('help-pane')).toBeVisible();

  // Browse: the nav lists docs across pillars.
  await expect(page.getByTestId('help-nav-engine')).toBeVisible();
  await expect(page.getByTestId('help-nav-doc-phaser/arcade-physics')).toBeVisible();

  // Search: a kid synonym ("jump") surfaces the arcade-physics doc.
  await page.getByTestId('help-search-input').fill('jump');
  const result = page.getByTestId('help-result-phaser/arcade-physics');
  await expect(result).toBeVisible();
  await result.click();

  // Reader shows the doc; the always-on (Lite) prose is visible, Pro code is not.
  const reader = page.getByTestId('help-reader');
  await expect(reader).toContainText('fall');
  await expect(reader).not.toContainText('setGravityY');
  // A concept diagram (SVG) renders to help understanding.
  await expect(page.getByTestId('help-diagram-gravity-and-jump')).toBeVisible();

  // Tier toggle → "More" (Pro) reveals the deeper code passage.
  await page.getByTestId('help-tier-pro').click();
  await expect(reader).toContainText('setGravityY');
});

// HJ2 (§9.2) — the agent answers a learning question AND jumps the kid to the
// passage via an `open_help` client action. The turn is route-mocked (LLM-free):
// it returns no file changes + a client_action the studio executes after apply.
test('Game Guide: an AI turn open_help jumps the kid to the passage', async ({ page }) => {
  await mockBackendAsKid(page);
  // The turn the (mocked) agent returns for a "how do I jump" prompt: a grounded
  // reply + open_help to the arcade-physics gravity passage, no VFS changes.
  await page.route('**/projects/*/code/turn', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        turn_id: 'turn-help-1',
        requires_approval: false,
        plan: null,
        changes: [],
        files: [{ path: 'main.js', content: '// unchanged\n', kind: 'text', size: 12 }],
        summary: 'To jump, give your player gravity and an upward push — see the Guide!',
        stars_charged: 1,
        tools_fired: ['search_help', 'read_help'],
        client_actions: [{ action: 'open_help', target: 'phaser/arcade-physics', anchor: 'gravity' }],
      }),
    });
  });
  await openStudio(page);

  const chat = page.getByTestId('chat-input');
  await chat.fill('how do I make my guy jump?');
  await chat.press('Enter');
  // Lite agency beat → confirm so the turn runs (then client_actions execute).
  await page.getByTestId('agency-card').waitFor({ timeout: 6_000 });
  await page.getByTestId('show-me-first').click();
  await expect(page.getByTestId('agent-msg')).toBeVisible({ timeout: 6_000 });

  // The Guide opened itself and scrolled to the gravity passage.
  await expect(page.getByTestId('help-pane')).toBeVisible();
  await expect(page.getByTestId('help-anchor-gravity')).toBeVisible();
});
