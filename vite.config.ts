import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { build as esbuild } from 'esbuild';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';

// Vendored game engines are npm-sourced (the `phaser` + `three` deps) and
// git-ignored — NOT a CDN (platform rule), NOT committed. This plugin
// materializes each engine's CONTENT-HASHED global build into `public/vendor/` on
// EVERY Vite run (dev-server start AND build, via the `buildStart` hook), so a
// `/vendor/<engine>-<v>-<hash>.…` URL always exists no matter HOW Vite is launched
// (npm script, bare `vite`, IDE, the e2e Playwright webServer). If an engine file
// is missing the sandboxed game throws "Phaser/THREE is not defined" — this plugin
// is the single safeguard. The app never hardcodes the hashed name: it imports the
// resolved URLs from `virtual:engine-vendors` (see resolveId/load below).
//
// Both engines expose a GLOBAL the sandboxed game loads via a classic
// `<script src="/vendor/…">` (learn-game-studio-3d-prd.md D‑3D‑02). Phaser ships a
// UMD global build we copy verbatim; three.js is ESM-only since r160, so we
// esbuild-bundle it (+ a curated addon set) into an IIFE that assigns `window.THREE`
// — same runtime contract, no import-map / no CORS, one builder model.
//
// UPGRADING an engine: `npm i <engine>@<new>`, then bump its *_VERSION below — the
// filenames are hashed and the app reads them from `virtual:engine-vendors`, so
// there are no per-file `/vendor/…` path constants to update. The version check
// throws on drift so a 404'd asset can't ship.
const PHASER_VERSION = '4.1.0';
const THREE_VERSION = '0.184.0';
// three.js addons bundled into the global (kid/agent reach them as `THREE.<name>`).
// Keep this curated. GLTFLoader powers `.glb` 3D-model assets (D-3D-09).
const THREE_ADDONS = [
  ['OrbitControls', 'three/addons/controls/OrbitControls.js'],
  ['GLTFLoader', 'three/addons/loaders/GLTFLoader.js'],
] as const;

// The vendored engines are served with a fixed, version-only name — so a deploy
// that changes an engine's BYTES (e.g. adding the GLTFLoader addon) overwrites the
// SAME `/vendor/…` URL. Under `immutable, max-age=1yr` (deploy.yml) a browser/CDN
// that cached the old bytes then keeps serving them for a year, and the sandbox
// game sees a `window.THREE` with no `GLTFLoader` ("GLTFLoader is not available").
// Fix: CONTENT-HASH the filename so the URL changes iff the bytes do, making the
// immutable cache correct. buildStart resolves the hashed URLs; the app reads them
// from the `virtual:engine-vendors` module (below). UNHASHED fallbacks are used
// only under vitest, where buildStart is skipped and the exact URL is irrelevant.
const VENDOR_MODULE_ID = 'virtual:engine-vendors';
const RESOLVED_VENDOR_MODULE_ID = '\0' + VENDOR_MODULE_ID;

interface VendorUrls {
  three: string;
  phaser: string;
  phaserDts: string;
}

const FALLBACK_VENDOR_URLS: VendorUrls = {
  three: `/vendor/three-${THREE_VERSION}.global.js`,
  phaser: `/vendor/phaser-${PHASER_VERSION}.min.js`,
  phaserDts: `/vendor/phaser-${PHASER_VERSION}.d.ts`,
};

/**
 * A content-hashed vendored filename: `<base>-<8hex><suffix>` (e.g.
 * `three-0.184.0-1a2b3c4d.global.js`). The 8-hex sha256 slice changes iff the
 * bytes change, so the file can be served `immutable` for a year yet a rebuild
 * that alters the engine can never be masked by a stale cache at the old name.
 */
export function hashedVendorName(base: string, suffix: string, content: Buffer | string): string {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
  return `${base}-${hash}${suffix}`;
}

function pinnedVersion(pkgDir: string, expected: string, engine: string): void {
  const installed = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
    .version as string;
  if (installed !== expected) {
    throw new Error(
      `[vendor-engines] installed ${engine} is ${installed} but the pinned version is ${expected}. ` +
        `Bump the *_VERSION constant in vite.config.ts; hashed /vendor/ URLs are resolved ` +
        `through virtual:engine-vendors.`,
    );
  }
}

function vendorEngines(): Plugin {
  // Resolved by buildStart (dev + build); handed to the app by the load() hook
  // below. Null under vitest (buildStart skipped) → the app reads the fallbacks.
  let resolved: VendorUrls | null = null;

  return {
    name: 'vendor-engines',
    async buildStart() {
      // Unit tests (vitest) don't need the real bundled engines and must stay
      // fast + filesystem-free; the app reads FALLBACK_VENDOR_URLS there.
      if (process.env.VITEST) return;

      const outDir = path.resolve(__dirname, 'public/vendor');
      mkdirSync(outDir, { recursive: true });
      // Drop any prior engine builds (hashed or not) so stale hashes can't pile
      // up in public/ and leak into `dist/` (then S3) on the next build.
      for (const f of readdirSync(outDir)) {
        if (/^(three|phaser)-.*\.(global\.js|min\.js|d\.ts)$/.test(f)) {
          rmSync(path.join(outDir, f));
        }
      }

      // --- Phaser (2D): UMD global + its .d.ts, copied verbatim, content-hashed ---
      const phaserDir = path.resolve(__dirname, 'node_modules/phaser');
      pinnedVersion(phaserDir, PHASER_VERSION, 'phaser');
      const phaserMin = readFileSync(path.join(phaserDir, 'dist/phaser.min.js'));
      const phaserDts = readFileSync(path.join(phaserDir, 'types/phaser.d.ts'));
      const phaserMinName = hashedVendorName(`phaser-${PHASER_VERSION}`, '.min.js', phaserMin);
      const phaserDtsName = hashedVendorName(`phaser-${PHASER_VERSION}`, '.d.ts', phaserDts);
      writeFileSync(path.join(outDir, phaserMinName), phaserMin);
      writeFileSync(path.join(outDir, phaserDtsName), phaserDts);

      // --- three.js (3D): ESM bundled into a `window.THREE` global IIFE ---
      const threeDir = path.resolve(__dirname, 'node_modules/three');
      pinnedVersion(threeDir, THREE_VERSION, 'three');
      const addonImports = THREE_ADDONS.map(
        ([name, spec]) => `import { ${name} } from '${spec}';`,
      ).join('\n');
      const addonAssign = THREE_ADDONS.map(([name]) => `${name}`).join(', ');
      const bundled = await esbuild({
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
        write: false, // hash the bytes before choosing the filename
        legalComments: 'none',
      });
      const threeOut = bundled.outputFiles?.[0]?.contents;
      if (!threeOut) {
        throw new Error('[vendor-engines] failed to bundle three.js global (no esbuild output)');
      }
      const threeBuf = Buffer.from(threeOut);
      const threeName = hashedVendorName(`three-${THREE_VERSION}`, '.global.js', threeBuf);
      writeFileSync(path.join(outDir, threeName), threeBuf);

      resolved = {
        three: `/vendor/${threeName}`,
        phaser: `/vendor/${phaserMinName}`,
        phaserDts: `/vendor/${phaserDtsName}`,
      };
    },

    resolveId(id) {
      return id === VENDOR_MODULE_ID ? RESOLVED_VENDOR_MODULE_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_VENDOR_MODULE_ID) return null;
      const u = resolved ?? FALLBACK_VENDOR_URLS;
      return (
        `export const THREE_VENDOR_URL = ${JSON.stringify(u.three)};\n` +
        `export const PHASER_VENDOR_URL = ${JSON.stringify(u.phaser)};\n` +
        `export const PHASER_DTS_URL = ${JSON.stringify(u.phaserDts)};\n`
      );
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
