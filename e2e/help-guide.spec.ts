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

  // Tier toggle → "More" (Pro) reveals the deeper code passage.
  await page.getByTestId('help-tier-pro').click();
  await expect(reader).toContainText('setGravityY');
});
