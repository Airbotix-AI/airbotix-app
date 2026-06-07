import { test, expect } from '@playwright/test';

// ── M0 visual-regression gate ─────────────────────────────────────────────────
// STABLE baselines via Playwright's built-in toHaveScreenshot. The rule here is
// "deterministic > comprehensive": a flaky screenshot gate is worse than a small
// stable one. So we:
//   • pin the viewport (1280×800),
//   • disable animations (the landing's glow halo + button transitions),
//   • force the light theme (default, but asserted so a theme flip can't drift it),
//   • allow a tiny maxDiffPixelRatio for sub-pixel font/AA noise,
//   • and screenshot STABLE containers — never Monaco, the game iframe, or chat
//     timestamps.
//
// To (re)generate baselines after an intentional UI change:
//   npm run test:e2e -- visual.spec.ts --update-snapshots
// Commit the regenerated PNGs under e2e/__screenshots__/.

const LANDING_PLACEHOLDER = "Describe a game and we'll build it…";
const VIEWPORT = { width: 1280, height: 800 };

// Sub-pixel anti-aliasing differs across machines; a tiny ratio absorbs it
// without masking a real regression.
const SHOT = {
  animations: 'disabled',
  maxDiffPixelRatio: 0.01,
} as const;

test.use({ viewport: VIEWPORT });

test('visual: landing prompt box', async ({ page }) => {
  await page.goto('/playground-sandbox');
  // Light theme is the default; assert it so a stray persisted dark theme can't
  // silently change the baseline.
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'light');

  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await expect(input).toBeVisible();
  // The glow-halo prompt box — a small, self-contained, deterministic container.
  const promptBox = page.locator('.pg-glow').first();
  await expect(promptBox).toHaveScreenshot('landing-prompt-box.png', SHOT);
});

test('visual: landing screen shell', async ({ page }) => {
  await page.goto('/playground-sandbox');
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'light');
  // Wait on a stable element (a starter chip) so the screen is fully laid out.
  await expect(page.getByRole('button', { name: /Pong/ })).toBeVisible();
  // Full landing is deterministic once animations are off (header + prompt + chips
  // are static). Pinned viewport keeps the layout identical run-to-run.
  await expect(page).toHaveScreenshot('landing-screen.png', SHOT);
});
