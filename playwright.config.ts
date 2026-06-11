import { defineConfig, devices } from '@playwright/test';

// E2E config for the Playground virtual desktop (see docs/virtual-desktop-design.md §9).
// Tests live in e2e/ and run against the Vite dev server on the authed
// `/learn/playground/:projectId` route via a route-mocked authed harness
// (`e2e/helpers.ts`) — there is no separate no-auth route.
//
// `PW_PORT` overrides the dev-server port for ad-hoc runs (so an e2e pass never
// reuses/steals a developer's already-running dev server on the default 4321).
const PORT = Number(process.env.PW_PORT ?? 4321);

export default defineConfig({
  testDir: './e2e',
  // Visual-regression baselines (toHaveScreenshot) live in one committed dir,
  // keyed by spec + name only — NOT by OS/arch. CI runs the same headless
  // Chromium as local, so a flat, portable path keeps baselines reusable.
  // Update them with: npm run test:e2e -- visual.spec.ts --update-snapshots
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The studio mounts are heavy (self-hosted ~1.18 MB Phaser engine + Monaco);
  // under CI CPU contention the game-runner FPS smoke-poll can miss its first
  // window. 2 retries absorb that environmental flake (the suite is deterministic
  // when run serially). Non-CI stays at 0 so local flakes surface.
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
