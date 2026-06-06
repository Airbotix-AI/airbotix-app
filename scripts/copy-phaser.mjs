// Materialize the vendored Phaser engine + types from the npm package into
// `public/vendor/` so they ship from our OWN origin (S3 + CloudFront) — NOT a
// CDN (platform rule), and NOT committed to git (they're git-ignored and
// regenerated here). Vite serves `public/` in dev and copies it into `dist/`
// on build, so the app's `/vendor/phaser-<v>.{min.js,d.ts}` paths are unchanged.
//
// Wired to `predev` + `prebuild` (see package.json) so the files always exist
// before the dev server or a production build runs — including the e2e suite,
// whose Playwright webServer runs `npm run dev`.
//
// Why both files:
//   - phaser.min.js  → the runtime engine, loaded as a classic <script> into the
//     sandboxed game iframe (see buildGamePreview.ts PHASER_SRC).
//   - phaser.d.ts    → editor IntelliSense, lazy-fetched into Monaco
//     (see panes/MonacoEditor.tsx). Dev/editor-only but same-origin for consistency.
//
// UPGRADING Phaser: bump the version in package.json (`npm i phaser@<new>`) AND
// `PHASER_VERSION` below AND the two app constants (buildGamePreview.ts +
// MonacoEditor.tsx). The version check below fails loudly if package.json and
// PHASER_VERSION drift, so a half-done upgrade can't ship a 404'd asset.

import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep in lockstep with the `/vendor/phaser-<v>...` paths the app hardcodes.
const PHASER_VERSION = '3.80.1';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'vendor');

const installed = require('phaser/package.json').version;
if (installed !== PHASER_VERSION) {
  console.error(
    `[copy-phaser] version mismatch: installed phaser is ${installed} but PHASER_VERSION is ${PHASER_VERSION}.\n` +
      `Update PHASER_VERSION in scripts/copy-phaser.mjs and the /vendor/ paths in ` +
      `buildGamePreview.ts + panes/MonacoEditor.tsx to match.`,
  );
  process.exit(1);
}

const copies = [
  ['phaser/dist/phaser.min.js', `phaser-${PHASER_VERSION}.min.js`],
  ['phaser/types/phaser.d.ts', `phaser-${PHASER_VERSION}.d.ts`],
];

mkdirSync(outDir, { recursive: true });
for (const [from, to] of copies) {
  copyFileSync(require.resolve(from), join(outDir, to));
  console.log(`[copy-phaser] ${from} → public/vendor/${to}`);
}
