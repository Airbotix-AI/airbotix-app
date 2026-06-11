// Try Demo Mode smoke (try-demo-mode-prd.md acceptance 1–5 / D-DEMO-07 parity
// alarm). Unlike every other spec, this uses NO auth seat and NO route mocks:
// the public /try/* demos must work in a clean session with ZERO /projects*,
// /llm/* or /auth* requests (the app-shell /auth/refresh bootstrap is the one
// allowed exception). If a studio change breaks the demo script/story/overlay,
// it fails here — update src/pages/try/ in the same task (see AGENTS.md).

import { expect, test } from '@playwright/test';

function trackForbidden(page: import('@playwright/test').Page): string[] {
  const forbidden: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (/^\/(projects|llm)\b/.test(url.pathname)) forbidden.push(url.pathname);
    if (url.pathname.startsWith('/auth') && !url.pathname.startsWith('/auth/refresh')) {
      forbidden.push(url.pathname);
    }
  });
  return forbidden;
}

test('try/playground: tour → 3 scripted turns → win-state code → AI gate', async ({ page }) => {
  const forbidden = trackForbidden(page);
  await page.goto('/try/playground');

  // Intro card + banner; no auth redirect.
  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await expect(page.getByTestId('tour-title')).toHaveText('This is how a lesson starts');
  await page.getByTestId('tour-next').click(); // ▶ Start the demo

  // The real studio builds the locked prompt, then the workspace opens.
  await expect(page.getByTestId('generating-screen')).toBeVisible();
  await expect(page.getByTestId('tour-title')).toHaveText('A real, playable game', { timeout: 15_000 });
  await expect(page.getByTestId('chat-starter')).toBeVisible();

  // Drive the three scripted turns from the tour.
  for (const title of ['One ask → one visible change', 'Real code, kid-sized steps', 'A finished game in 3 asks']) {
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-title')).toHaveText(title, { timeout: 15_000 });
  }
  // The applied diffs flowed through the real funnel: undo is offered.
  await expect(page.getByTestId('undo-turn')).toBeVisible();

  // Finish the tour → free explore; a typed message hits the contact-us gate.
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('demo-tour')).toHaveCount(0);
  await page.getByTestId('chat-input').fill('make me a dragon game');
  await page.getByTestId('chat-send').click();
  await expect(page.getByText(/airbotix\.ai\/book/)).toBeVisible({ timeout: 10_000 });

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
