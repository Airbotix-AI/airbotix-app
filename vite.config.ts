import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';

// Vendored Phaser is npm-sourced (the `phaser` dep) and git-ignored — NOT a CDN
// (platform rule), NOT committed. This plugin copies the engine + types from
// node_modules into `public/vendor/` on EVERY Vite run (dev-server start AND
// build, via the `buildStart` hook), so `/vendor/phaser-<v>.{min.js,d.ts}` always
// exist no matter HOW Vite is launched (npm script, bare `vite`, IDE, the e2e
// Playwright webServer). If the engine file is missing the sandboxed game throws
// "Phaser is not defined" — this is the single safeguard against that.
//
// UPGRADING Phaser: `npm i phaser@<new>`, then bump PHASER_VERSION below AND the
// `/vendor/phaser-<v>…` constants in src/pages/learn/playground/buildGamePreview.ts
// + panes/MonacoEditor.tsx. The version check throws on drift so a 404'd asset
// can't ship.
const PHASER_VERSION = '4.1.0';

function vendorPhaser(): Plugin {
  return {
    name: 'vendor-phaser',
    buildStart() {
      // phaser is a direct dependency, so it lives at <root>/node_modules/phaser.
      const phaserDir = path.resolve(__dirname, 'node_modules/phaser');
      const installed = JSON.parse(
        readFileSync(path.join(phaserDir, 'package.json'), 'utf8'),
      ).version as string;
      if (installed !== PHASER_VERSION) {
        throw new Error(
          `[vendor-phaser] installed phaser is ${installed} but PHASER_VERSION is ${PHASER_VERSION}. ` +
            `Bump PHASER_VERSION in vite.config.ts and the /vendor/ paths in ` +
            `buildGamePreview.ts + MonacoEditor.tsx to match.`,
        );
      }
      const outDir = path.resolve(__dirname, 'public/vendor');
      mkdirSync(outDir, { recursive: true });
      for (const [from, to] of [
        ['dist/phaser.min.js', `phaser-${PHASER_VERSION}.min.js`],
        ['types/phaser.d.ts', `phaser-${PHASER_VERSION}.d.ts`],
      ] as const) {
        copyFileSync(path.join(phaserDir, from), path.join(outDir, to));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), vendorPhaser()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Fixed Airbotix-app dev port (5173/5174 collide with other local apps like
    // JR Academy). Pairs with platform-backend on :3030.
    port: 4321,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    target: 'es2022',
  },
  // Vitest (unit) must NOT collect the Playwright specs in e2e/ — they use the
  // Playwright runner (`test.use`, fixtures) and aren't valid under vitest. Keep
  // the defaults and add e2e/ so `npm run test` runs only the real unit tests.
  // Also exclude `.claude/worktrees/**`: a nested git worktree (gitignored) would
  // otherwise leak its own e2e specs into the unit run (canvas/Playwright → jsdom
  // failures) — `e2e/**` only matches the root, not nested worktree copies.
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**', '**/.claude/**'],
  },
});
