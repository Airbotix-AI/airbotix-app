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
import { ASSET_MIME, CONSOLE_CAPTURE, EXTENSION_NOISE_GUARD } from '../code/buildPreview';

// Re-export the console protocol so game components import it from one place.
export { isConsoleMessage, type ConsoleLine } from '../code/buildPreview';

/** Self-hosted Phaser build. Version-pinned; vendored in `public/vendor/`. */
const PHASER_SRC = '/vendor/phaser-4.1.0.min.js';

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
  function __WrappedGame(cfg) {
    // Physics-debug toggle: force arcade debug draw (hitboxes/velocities) on,
    // regardless of the kid's config, when the runner asked for it.
    if (window.__airbotixDebug && cfg) {
      cfg.physics = cfg.physics || {};
      cfg.physics.arcade = cfg.physics.arcade || {};
      cfg.physics.arcade.debug = true;
    }
    __game = new __OrigGame(cfg);
    return __game;
  }
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
      if (m.action === 'snapshot') {
        // For a thumbnail. renderer.snapshot() works for WebGL (where a plain
        // canvas.toDataURL() returns blank once the drawing buffer is composited).
        if (__game.renderer && __game.renderer.snapshot) {
          __game.renderer.snapshot(function (image) {
            try { parent.postMessage({ __airbotixSnapshot: true, dataUrl: (image && image.src) || null }, '*'); } catch (er) {}
          });
        } else {
          parent.postMessage({ __airbotixSnapshot: true, dataUrl: __game.canvas ? __game.canvas.toDataURL() : null }, '*');
        }
      }
    } catch (e) { try { parent.postMessage({ __airbotixSnapshot: true, dataUrl: null }, '*'); } catch (er) {} }
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
 * Pick the entry js file from a project: prefer one ending `main.js`, else one
 * ending `game.js`, else the last js file. Returns its index in `jsFiles`, or
 * `-1` if there are no js files.
 */
function entryIndex(jsFiles: VfsFile[]): number {
  if (jsFiles.length === 0) return -1;
  const main = jsFiles.findIndex((f) => f.path.endsWith('main.js'));
  if (main !== -1) return main;
  const game = jsFiles.findIndex((f) => f.path.endsWith('game.js'));
  if (game !== -1) return game;
  return jsFiles.length - 1;
}

/**
 * Build the full sandboxed srcdoc for a Phaser game from the VFS.
 *
 * Supports a hierarchical multi-file project: every text `.js` file is injected
 * as its own classic `<script>` (so each defines its globals in document order),
 * with the ENTRY file LAST — so global classes are defined before the entry's
 * `new Phaser.Game(...)` runs. Entry = path ending `main.js`, else `game.js`,
 * else the last js file (so a single-`game.js` project still runs unchanged).
 * All text `.css` files are concatenated into the stage `<style>`.
 */
export interface BuildGameOptions {
  /** Force Phaser arcade physics debug draw (hitboxes/velocities). */
  debug?: boolean;
}

/** Where one kid script lives inside the assembled srcdoc (1-based lines). */
export interface ScriptLineRange {
  path: string;
  /** srcdoc line of the script's FIRST source line (content starts on the `<script>` line). */
  start: number;
  /** srcdoc line of the script's LAST source line. */
  end: number;
}

/**
 * Resolve an uncaught error's location to the kid's file.
 *
 * Runtime errors already arrive as kid-file:line — `//# sourceURL` names each
 * script. But a SYNTAX error means the script never parsed, browsers ignore
 * `sourceURL` in a script that fails to parse, and the error reports against
 * the srcdoc document (e.g. `about:srcdoc:57`). Without translation the
 * console (and the AI self-fix round-trip) gets a syntax error with no usable
 * location — the exact case where the location matters most. Map the document
 * line back through the known script ranges; drop the loc when it points at
 * nothing of the kid's (host chrome) rather than mislead.
 */
export function resolveErrorLoc(
  loc: { file: string; line: number; col: number } | undefined,
  ranges: ScriptLineRange[],
): { file: string; line: number; col: number } | undefined {
  if (!loc) return undefined;
  if (ranges.some((r) => r.path === loc.file)) return loc; // already a kid file (sourceURL)
  const hit = ranges.find((r) => loc.line >= r.start && loc.line <= r.end);
  if (hit) return { file: hit.path, line: loc.line - hit.start + 1, col: loc.col };
  return undefined;
}

export function buildGameSrcDoc(files: VfsFile[], opts: BuildGameOptions = {}): string {
  return buildGamePreview(files, opts).srcDoc;
}

/** buildGameSrcDoc plus the per-script line map (for syntax-error resolution). */
export function buildGamePreview(
  files: VfsFile[],
  opts: BuildGameOptions = {},
): { srcDoc: string; scriptRanges: ScriptLineRange[] } {
  const assets = files.filter((f) => f.kind === 'asset');

  const jsFiles = files.filter((f) => f.kind === 'text' && f.path.endsWith('.js'));
  const entry = entryIndex(jsFiles);
  // Non-entry js files keep their array order; the entry goes last. Each script
  // gets a `//# sourceURL=<path>` so uncaught errors (and stack traces) report
  // the kid's FILE and the correct line number — the key to debugging.
  //
  // ⚠️ The kid's content must start IMMEDIATELY after `<script>` — NO leading
  // newline. With `//# sourceURL`, the browser numbers lines relative to the
  // script's own text, so a leading `\n` would shift every reported line down by
  // one (errors would point one line below the real spot, breaking jump-to-error).
  const ordered = [...jsFiles.filter((_, i) => i !== entry), ...(entry === -1 ? [] : [jsFiles[entry]])];
  const scriptTags = ordered.map(
    (f) => `<script>${inlineAssetRefs(f.content, assets)}\n//# sourceURL=${f.path}\n${'<'}/script>`,
  );
  // Each script's content begins ON the `<script>` line (the no-leading-newline
  // contract above), so kid-file line N = the tag's srcdoc line + (N - 1).
  // inlineAssetRefs rewrites within lines and never changes line counts.
  const lineCount = (s: string) => s.split('\n').length;

  // Set before the game scripts run so the constructor wrapper can read it.
  const debugFlag = `<script>window.__airbotixDebug=${opts.debug ? 'true' : 'false'};${'<'}/script>`;

  const css = files
    .filter((f) => f.kind === 'text' && f.path.endsWith('.css'))
    .map((f) => f.content)
    .join('\n');

  const prefixParts = [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    EXTENSION_NOISE_GUARD,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    // Full-bleed black stage; the kid's optional .css files can override.
    `<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}` +
      `#game{width:100%;height:100%}#game canvas{display:block}${css}</style>`,
    '</head><body>',
    '<div id="game"></div>',
    CONSOLE_CAPTURE,
    `<script src="${PHASER_SRC}"></script>`,
    PHASER_GUARD,
    debugFlag,
    GAME_CONTROL,
  ];
  const scriptRanges: ScriptLineRange[] = [];
  // Parts join with '\n', so part k starts at 1 + the line count of all parts before it.
  let nextLine = prefixParts.reduce((n, p) => n + lineCount(p), 0) + 1;
  ordered.forEach((f, i) => {
    scriptRanges.push({ path: f.path, start: nextLine, end: nextLine + lineCount(f.content) - 1 });
    nextLine += lineCount(scriptTags[i]);
  });
  const srcDoc = [...prefixParts, ...scriptTags, '</body></html>'].join('\n');
  return { srcDoc, scriptRanges };
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
