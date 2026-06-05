import { test, expect } from '@playwright/test';

// Playground e2e — expanded in Wave 6 (C6.1) to cover windows, the game control
// channel (__airbotixStat), and the AI chat. Placeholder smoke test for now.
test('playground dev route loads', async ({ page }) => {
  await page.goto('/playground-sandbox');
  await expect(page.locator('body')).toBeVisible();
});
