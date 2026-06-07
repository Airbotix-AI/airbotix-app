import { test, expect, type Page } from '@playwright/test';

// ── M0 game-smoke ─────────────────────────────────────────────────────────────
// The verification harness every Game Studio PR reuses. It launches the DEV-only,
// no-auth studio (/playground-sandbox), runs the (stub) Phaser starter, and proves
// the game actually RUNS, deterministically:
//
//   "game runs" === zero console errors  AND  the canvas renders (a stat fps > 0)
//
// Both signals come from the same postMessage channel the runner already uses
// (see buildGamePreview.ts / GameFrame.tsx): the sandboxed iframe posts
//   { __airbotixConsole, level, text, loc }   for every console call, and
//   { __airbotixStat,    fps, paused }         every ~500ms while the game loops.
// The iframe posts to `parent` (the page's own window), so we capture them with a
// page init-script — no app/source changes, no arbitrary sleeps.

const LANDING_PLACEHOLDER = "Describe a game and we'll build it…";

/**
 * Install a recorder on `window` BEFORE any app code runs. It mirrors the
 * runner's two message kinds so the test can poll deterministic counters instead
 * of sleeping. Cleared per navigation by `addInitScript` re-running on each load.
 */
async function installGameSignalRecorder(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __smokeErrors: string[];
      __smokeMaxFps: number;
    };
    w.__smokeErrors = [];
    w.__smokeMaxFps = 0;
    window.addEventListener('message', (e: MessageEvent) => {
      const m = e.data as
        | { __airbotixConsole?: true; level?: string; text?: string }
        | { __airbotixStat?: true; fps?: number }
        | null;
      if (!m || typeof m !== 'object') return;
      if ((m as { __airbotixConsole?: true }).__airbotixConsole === true) {
        const cm = m as { level?: string; text?: string };
        // Record every console error. The runtime's 'ready' handshake is posted
        // at level:'info' (see buildPreview.ts), so it is naturally excluded —
        // an error-level message means the kid's game actually errored.
        if (cm.level === 'error') {
          w.__smokeErrors.push(String(cm.text));
        }
      } else if ((m as { __airbotixStat?: true }).__airbotixStat === true) {
        const fps = (m as { fps?: number }).fps ?? 0;
        if (fps > w.__smokeMaxFps) w.__smokeMaxFps = fps;
      }
    });
  });
}

/** Landing → generate → workspace (chat-first), matching playground.spec.ts. */
async function reachWorkspace(page: Page) {
  await page.goto('/playground-sandbox');
  const input = page.getByPlaceholder(LANDING_PLACEHOLDER);
  await input.fill('a pong game');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /Split/ })).toBeVisible({ timeout: 10_000 });
}

test('game-smoke: the starter game runs with zero console errors and a live canvas (fps > 0)', async ({
  page,
}) => {
  await installGameSignalRecorder(page);
  await reachWorkspace(page);

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
