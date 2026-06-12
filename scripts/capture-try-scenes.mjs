// Recapture the marketing /try previews from the LIVE demos.
//
// The airbotix.ai/try page plays REAL screenshots of the demos as animated
// scenes (airbotix/src/components/TryScenePlayer.tsx). Parity mandate
// (AGENTS.md + try-demo-mode-prd §5): whenever the workspace UX changes —
// Game Playground, Blocks Studio, or a future demo — these captures MUST be
// refreshed so the marketing previews never show a stale product.
//
// Usage (from airbotix-app/, with the app dev server running):
//   node scripts/capture-try-scenes.mjs
//   APP_URL=http://localhost:5173 OUT=/tmp/try node scripts/capture-try-scenes.mjs
//
// Writes 1600px-wide JPEGs (q80) over ../airbotix/public/media/try/*.jpg —
// review the diff, check the zoom origins/captions in the marketing Try.tsx
// still point at the right UI, then commit the images in the airbotix repo.

import { chromium } from 'playwright';

const APP_URL = process.env.APP_URL ?? 'http://localhost:4399';
const OUT = process.env.OUT ?? new URL('../../airbotix/public/media/try', import.meta.url).pathname;

/** 1280 css px × 1.25 = 1600px output — matches the originals. */
const VIEWPORT = { width: 1280, height: 800 };
const SCALE = 1.25;
const JPEG = { type: 'jpeg', quality: 80 };

const hideTour = (pg) =>
  pg.evaluate(() => {
    const t = document.querySelector('[data-testid=demo-tour]');
    if (t) t.style.display = 'none';
  });
const showTour = (pg) =>
  pg.evaluate(() => {
    const t = document.querySelector('[data-testid=demo-tour]');
    if (t) t.style.display = '';
  });

/** Click Next, then wait until the tour is idle again (busy ⇒ poll). */
async function next(pg, settleMs = 500) {
  await pg.getByTestId('tour-next').click({ timeout: 20_000 });
  for (let i = 0; i < 40; i += 1) {
    await pg.waitForTimeout(500);
    const busy = await pg.getByTestId('tour-next').isDisabled().catch(() => false);
    if (!busy) break;
  }
  await pg.waitForTimeout(settleMs);
}

const shot = async (pg, name) => {
  await hideTour(pg);
  await pg.screenshot({ path: `${OUT}/${name}.jpg`, ...JPEG });
  await showTour(pg);
  console.log(`  ✓ ${name}.jpg`);
};

const b = await chromium.launch();
const pg = await b.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE });

console.log(`Capturing playground scenes from ${APP_URL}/try/playground → ${OUT}`);
await pg.goto(`${APP_URL}/try/playground`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1800);
await shot(pg, 'pg-1-landing'); // the sentence, ready to go
await pg.getByTestId('tour-next').click(); // Create the game
await pg.waitForTimeout(1700);
await shot(pg, 'pg-2-building'); // mid build-reveal
await pg.waitForTimeout(6500); // workspace + auto-run settle
await shot(pg, 'pg-3-playing'); // chat + running game
for (let i = 0; i < 7; i += 1) await next(pg); // asks → diff → explain → assets → wire-in
await pg.waitForTimeout(1200);
await shot(pg, 'pg-4-beautify'); // golden apple in viewer + game

console.log(`Capturing blocks scenes from ${APP_URL}/try/blocks`);
await pg.goto(`${APP_URL}/try/blocks`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1500);
await pg.getByTestId('tour-skip').click().catch(() => {});
await pg.waitForTimeout(600);
await shot(pg, 'bl-1-studio'); // the loaded story, all zones visible
await pg.getByTestId('go-button').click();
await pg.waitForTimeout(1400);
await shot(pg, 'bl-2-playing'); // mid-play

await b.close();
console.log('Done. Review the diff in airbotix/public/media/try/, verify the');
console.log('zoom origins + captions in airbotix/src/pages/Try.tsx, then commit.');
