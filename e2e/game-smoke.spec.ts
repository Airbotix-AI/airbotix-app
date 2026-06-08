import { test, expect } from '@playwright/test';

import { installGameSignalRecorder, mockBackendAsKid, openStudio } from './helpers';

// ── M0 game-smoke ─────────────────────────────────────────────────────────────
// The verification harness every Game Studio PR reuses. Migrated off the DEV-only
// `/playground-sandbox` route onto the AUTHED `/learn/playground/:projectId` route
// with a fully route-mocked backend (see `helpers.ts`): it seats a kid session,
// seeds the REAL multi-file `STARTER_PROJECT` scaffold as the project's VFS, opens
// the studio chat-first, runs the (stub) Phaser starter, and proves the game
// actually RUNS, deterministically:
//
//   "game runs" === zero console errors  AND  the canvas renders (a stat fps > 0)
//
// Both signals come from the same postMessage channel the runner already uses
// (see buildGamePreview.ts / GameFrame.tsx): the sandboxed iframe posts
//   { __airbotixConsole, level, text, loc }   for every console call, and
//   { __airbotixStat,    fps, paused }         every ~500ms while the game loops.
// The iframe posts to `parent` (the page's own window), so we capture them with a
// page init-script (`installGameSignalRecorder`) — no app/source changes, no
// arbitrary sleeps.

test('game-smoke: the starter game runs with zero console errors and a live canvas (fps > 0)', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  // Seed the REAL starter scaffold as the project VFS so the studio opens on a
  // runnable multi-file Phaser game (main.js + Boot/Game scenes).
  await mockBackendAsKid(page, { age: 9 });
  await openStudio(page);

  // Chat-first launch: "Run game" opens the runner AND plays it (mounts the game
  // iframe, no Play-placeholder). This is the same path a kid takes from chat.
  await page.getByRole('button', { name: 'Run game' }).click();
  await expect(page.locator('iframe[title="Game"]')).toBeVisible({ timeout: 6_000 });

  // Signal 1 — the canvas renders: the game loop is posting stats with fps > 0.
  // Polled (not slept): waits on the explicit condition, then settles.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeMaxFps: number }).__smokeMaxFps), {
      timeout: 10_000,
      message: 'expected a runner stat with fps > 0 (the game loop is alive)',
    })
    .toBeGreaterThan(0);

  // Cross-check the same signal via the runner's own status-bar fps readout — so
  // the smoke also guards the visible UI, not just the wire.
  await expect(page.getByText(/\bRunning\b/)).toBeVisible();
  await expect(page.getByText(/[1-9]\d* fps/)).toBeVisible({ timeout: 6_000 });

  // Signal 2 — zero uncaught console errors from the kid's game. The recorder
  // captures every error-level console message (the runtime's 'ready' handshake
  // is info-level, so it never counts). Give a beat for any late error to
  // arrive AFTER we've already confirmed the loop is running.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __smokeErrors: string[] }).__smokeErrors), {
      timeout: 3_000,
      message: 'the starter game must run clean (no console-level errors)',
    })
    .toEqual([]);
});
