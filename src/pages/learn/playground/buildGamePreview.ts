// Sandboxed Phaser game preview builder — game studio runtime (learn-game-studio-prd.md §5).
//
// Mirrors the code studio's `buildPreview.ts` sandbox model: a single `srcdoc`
// loaded into an opaque-origin `<iframe sandbox="allow-scripts">` (NO
// allow-same-origin). The differences from the code studio:
//
//   1. Phaser (~1MB) is NOT inlined. It is self-hosted at `/vendor/<file>` and
//      pulled in via a classic `<script src>` tag. An opaque-origin srcdoc frame
//      may still fetch PUBLIC subresources, and a srcdoc's relative/absolute-path
//      URLs resolve against the PARENT origin — so `/vendor/...` loads from the
//      app origin without ever granting allow-same-origin. Classic external
//      scripts execute in document order before the following inline script, so
//      `window.Phaser` is guaranteed ready when `game.js` runs.
//   2. The host HTML is OWNED by the studio, not the kid. Games only edit
//      `game.js` (the Phaser scene) + assets. The runtime contract: Phaser is a
//      global, mount your game into the `#game` element.
//
// PARTIAL: asset support inlines VFS assets as data: URLs by rewriting their
// quoted path literals in game.js (Phaser's loader accepts data: URLs directly).
// This is the V0 substitute for a service-worker asset origin, exactly as the
// code studio defers in `buildPreview.ts`. Robust for the common case (a handful
// of sprites/sounds); a dedicated preview origin is deferred to V1.

import type { VfsFile } from '../code/codeApi';
import { ASSET_MIME, CONSOLE_CAPTURE } from '../code/buildPreview';

// Re-export the console protocol so game components import it from one place.
export { isConsoleMessage, type ConsoleLine } from '../code/buildPreview';

/** Self-hosted Phaser build. Version-pinned; vendored in `public/vendor/`. */
const PHASER_SRC = '/vendor/phaser-3.80.1.min.js';

/** Friendly guard shown if the vendored Phaser file fails to load (network/CSP). */
const PHASER_GUARD = `
<script>
if (!window.Phaser) {
  console.error('Could not load the game engine (Phaser). Check your connection and try again.');
}
</script>`;

function file(files: VfsFile[], path: string): string {
  return files.find((f) => f.path === path)?.content ?? '';
}

function toDataUrl(asset: VfsFile): string {
  if (asset.content.startsWith('data:')) return asset.content;
  const ext = asset.path.split('.').pop()?.toLowerCase() ?? '';
  return `data:${ASSET_MIME[ext] ?? 'application/octet-stream'};base64,${asset.content}`;
}

/**
 * Rewrite quoted VFS asset paths to inlined data: URLs. Covers both Phaser
 * loader literals in JS (`this.load.image('hero', 'sprites/hero.png')`) and any
 * `src=`/`href=` attributes — anything wrapped in matching quotes.
 */
function inlineAssetRefs(text: string, assets: VfsFile[]): string {
  if (assets.length === 0) return text;
  let out = text;
  for (const a of assets) {
    const dataUrl = toDataUrl(a);
    const escaped = a.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the path inside single, double, or backtick quotes; keep the quote.
    out = out.replace(new RegExp(`(["'\\\`])${escaped}\\1`, 'g'), `$1${dataUrl}$1`);
  }
  return out;
}

/**
 * Build the full sandboxed srcdoc for a Phaser game from the VFS.
 * Expected VFS: `game.js` (required), optional `style.css`, optional assets.
 */
export function buildGameSrcDoc(files: VfsFile[]): string {
  const assets = files.filter((f) => f.kind === 'asset');
  const gameJs = inlineAssetRefs(file(files, 'game.js'), assets);
  const css = file(files, 'style.css');
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    // Full-bleed black stage; the kid's optional style.css can override.
    `<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}` +
      `#game{width:100%;height:100%}#game canvas{display:block}${css}</style>`,
    '</head><body>',
    '<div id="game"></div>',
    CONSOLE_CAPTURE,
    `<script src="${PHASER_SRC}"></script>`,
    PHASER_GUARD,
    `<script>${gameJs}${'<'}/script>`,
    '</body></html>',
  ].join('\n');
}
