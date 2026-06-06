import { defineConfig, devices } from '@playwright/test';

// E2E config for the Playground virtual desktop (see docs/virtual-desktop-design.md §9).
// Tests live in e2e/ and run against the Vite dev server on the dev-only,
// no-auth /playground-sandbox route.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
