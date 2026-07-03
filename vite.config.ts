import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { build as esbuild } from 'esbuild';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';

// Vendored game engines are npm-sourced (the `phaser` + `three` deps) and
// git-ignored — NOT a CDN (platform rule), NOT committed. This plugin
// materializes each engine's global build into `public/vendor/` on EVERY Vite run
// (dev-server start AND build, via the `buildStart` hook), so `/vendor/<engine>-<v>`
// always exists no matter HOW Vite is launched (npm script, bare `vite`, IDE, the
// e2e Playwright webServer). If an engine file is missing the sandboxed game
// throws "Phaser/THREE is not defined" — this plugin is the single safeguard.
//
// Both engines expose a GLOBAL the sandboxed game loads via a classic
// `<script src="/vendor/…">` (learn-game-studio-3d-prd.md D‑3D‑02). Phaser ships a
// UMD global build we copy verbatim; three.js is ESM-only since r160, so we
// esbuild-bundle it (+ a curated addon set) into an IIFE that assigns `window.THREE`
// — same runtime contract, no import-map / no CORS, one builder model.
//
// UPGRADING an engine: `npm i <engine>@<new>`, then bump its *_VERSION below AND the
// `/vendor/<engine>-<v>…` constants in src/pages/learn/playground/buildGamePreview.ts
// (+ panes/MonacoEditor.tsx for Phaser types). The version check throws on drift so
// a 404'd asset can't ship.
const PHASER_VERSION = '4.1.0';
const THREE_VERSION = '0.184.0';
// three.js addons bundled into the global (kid/agent reach them as `THREE.<name>`).
// Keep this curated. GLTFLoader powers `.glb` 3D-model assets (D-3D-09).
const THREE_ADDONS = [
  ['OrbitControls', 'three/addons/controls/OrbitControls.js'],
  ['GLTFLoader', 'three/addons/loaders/GLTFLoader.js'],
] as const;

function pinnedVersion(pkgDir: string, expected: string, engine: string): void {
  const installed = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
    .version as string;
  if (installed !== expected) {
    throw new Error(
      `[vendor-engines] installed ${engine} is ${installed} but the pinned version is ${expected}. ` +
        `Bump the *_VERSION constant in vite.config.ts and the /vendor/ paths in ` +
        `buildGamePreview.ts (+ MonacoEditor.tsx for Phaser) to match.`,
    );
  }
}

function vendorEngines(): Plugin {
  return {
    name: 'vendor-engines',
    async buildStart() {
      const outDir = path.resolve(__dirname, 'public/vendor');
      mkdirSync(outDir, { recursive: true });

      // --- Phaser (2D): UMD global, copied verbatim ---
      const phaserDir = path.resolve(__dirname, 'node_modules/phaser');
      pinnedVersion(phaserDir, PHASER_VERSION, 'phaser');
      for (const [from, to] of [
        ['dist/phaser.min.js', `phaser-${PHASER_VERSION}.min.js`],
        ['types/phaser.d.ts', `phaser-${PHASER_VERSION}.d.ts`],
      ] as const) {
        copyFileSync(path.join(phaserDir, from), path.join(outDir, to));
      }

      // --- three.js (3D): ESM bundled into a `window.THREE` global IIFE ---
      const threeDir = path.resolve(__dirname, 'node_modules/three');
      pinnedVersion(threeDir, THREE_VERSION, 'three');
      const threeOut = path.join(outDir, `three-${THREE_VERSION}.global.js`);
      const addonImports = THREE_ADDONS.map(
        ([name, spec]) => `import { ${name} } from '${spec}';`,
      ).join('\n');
      const addonAssign = THREE_ADDONS.map(([name]) => `${name}`).join(', ');
      await esbuild({
        stdin: {
          contents:
            `import * as THREE from 'three';\n` +
            `${addonImports}\n` +
            // ES module namespaces are sealed, so copy into a plain object before
            // attaching the addons, then publish the single global.
            `window.THREE = Object.assign({}, THREE, { ${addonAssign} });\n`,
          resolveDir: __dirname,
          loader: 'js',
        },
        bundle: true,
        format: 'iife',
        minify: true,
        target: 'es2022',
        outfile: threeOut,
        legalComments: 'none',
      });
      if (!existsSync(threeOut)) {
        throw new Error(`[vendor-engines] failed to bundle three.js global at ${threeOut}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), vendorEngines()],
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
