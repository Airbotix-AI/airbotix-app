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

/**
 * Bidirectional control channel shim (see virtual-desktop-design.md §3).
 *
 * `Phaser.GAMES` is ABSENT in our vendored build, so we cannot read a global
 * game registry. Instead we wrap the `Phaser.Game` constructor to capture the
 * kid's game instance into a module-scope `var __game`, preserving `.prototype`
 * (and statics) so `instanceof Phaser.Game` and `Phaser.Game.*` still work.
 *
 * Parent → frame:  { __airbotixControl: true, action: 'pause'|'resume'|'mute'|'unmute' }
 * Frame → parent:  { __airbotixStat: true, fps: number, paused: boolean }   // every ~500ms
 *
 * All control access is wrapped in try/catch (the game may not exist yet, or
 * Phaser internals may differ); communication stays on `postMessage` only, so
 * the strict opaque-origin sandbox is unchanged.
 */
const GAME_CONTROL = `
<script>
(function () {
  if (!window.Phaser || !window.Phaser.Game) return;
  var __OrigGame = window.Phaser.Game;
  var __game = null;
  function __WrappedGame(cfg) { __game = new __OrigGame(cfg); return __game; }
  __WrappedGame.prototype = __OrigGame.prototype;
  for (var k in __OrigGame) { try { __WrappedGame[k] = __OrigGame[k]; } catch (e) {} }
  window.Phaser.Game = __WrappedGame;

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.__airbotixControl !== true || !__game) return;
    try {
      if (m.action === 'pause')  __game.loop.sleep();
      if (m.action === 'resume') __game.loop.wake();
      if (m.action === 'mute')   __game.sound.mute = true;
      if (m.action === 'unmute') __game.sound.mute = false;
    } catch (e) {}
  });

  setInterval(function () {
    if (!__game) return;
    try {
      parent.postMessage({
        __airbotixStat: true,
        fps: Math.round(__game.loop.actualFps || 0),
        paused: !__game.loop.running
      }, '*');
    } catch (e) {}
  }, 500);
})();
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
    GAME_CONTROL,
    `<script>${gameJs}${'<'}/script>`,
    '</body></html>',
  ].join('\n');
}

export interface StatMessage {
  fps: number;
  paused: boolean;
}

export function isStatMessage(data: unknown): data is { __airbotixStat: true } & StatMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__airbotixStat' in data &&
    (data as { __airbotixStat: unknown }).__airbotixStat === true
  );
}
