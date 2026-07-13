// Sandboxed game preview builder — game studio runtime (learn-game-studio-prd.md §5).
//
// Two engines (learn-game-studio-3d-prd.md D‑3D‑03): Phaser (2D, default) and three.js (3D).
// Each is a vendored GLOBAL loaded via a classic `<script src="/vendor/…">`; only the engine
// global, the load guard, and the control shim differ (see `ENGINE_PROFILES`). The rest of the
// srcdoc — asset inlining, `//# sourceURL` line-mapping, the opaque-origin iframe — is shared.
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
//
// OVERLAY (D-GAME13): one reserved root file — `overlay.html` (OVERLAY_PATH) — is
// a markup-only HTML FRAGMENT injected into the shell as `<div id="overlay">`,
// layered above `#game` (HUDs / touch buttons / menus). It is sanitized with
// DOMParser (scripts stripped, malformed markup repaired so an unclosed tag can't
// swallow the kid scripts that follow), asset-inlined like kid JS, and gets a
// pointer-events pass-through base CSS injected BEFORE kid css (kid css wins).
// Every other `.html` file is INERT (editable, never injected). A project without
// overlay.html builds a BYTE-IDENTICAL srcdoc to the pre-overlay builder (pinned
// by unit snapshot) — the seam only exists when the overlay does.

import { PHASER_VENDOR_URL, THREE_VENDOR_URL } from 'virtual:engine-vendors';

import type { VfsFile } from '../code/codeApi';
import { ASSET_MIME, CONSOLE_CAPTURE, EXTENSION_NOISE_GUARD } from '../code/buildPreview';

// Re-export the console protocol so game components import it from one place.
export { isConsoleMessage, type ConsoleLine } from '../code/buildPreview';

/** Self-hosted Phaser build (content-hashed `/vendor/…` URL from the engine plugin). */
const PHASER_SRC = PHASER_VENDOR_URL;

/** Friendly guard shown if the vendored Phaser file fails to load (network/CSP). */
const PHASER_GUARD = `
<script>
if (!window.Phaser) {
  console.error('Could not load the game engine (Phaser). Check your connection and try again.');
}
</script>`;

/**
 * One snapshot-reply site inside an engine control shim. A no-overlay build
 * emits today's EXACT inline postMessage (byte-identity pinned by the unit
 * snapshot); an overlay build routes through the composited shim
 * `window.__airbotixSnapshotOut` — resolved LAZILY at reply time, because the
 * OVERLAY_SNAPSHOT part is injected AFTER the control shim — with the same
 * inline post as the fallback if the shim is somehow absent.
 */
const snapshotReply = (withOverlay: boolean, expr: string): string =>
  withOverlay
    ? `(window.__airbotixSnapshotOut || function (u) { parent.postMessage({ __airbotixSnapshot: true, dataUrl: u }, '*'); })(${expr});`
    : `parent.postMessage({ __airbotixSnapshot: true, dataUrl: ${expr} }, '*');`;

/**
 * Bidirectional control channel shim (see virtual-desktop-design.md §3).
 *
 * `Phaser.GAMES` is ABSENT in our vendored build, so we cannot read a global
 * game registry. Instead we wrap the `Phaser.Game` constructor to capture the
 * kid's game instance into a module-scope `var __game`, preserving `.prototype`
 * (and statics) so `instanceof Phaser.Game` and `Phaser.Game.*` still work.
 *
 * Parent → frame:  { __airbotixControl: true, action: 'pause'|'resume'|'mute'|'unmute' }
 * Frame → parent:  { __airbotixStat: true, fps: number, paused: boolean, frames: number }   // every ~500ms
 *
 * `frames` is the ENGINE's cumulative frame counter (Phaser's TimeStep frame) —
 * never rAF, which keeps ticking while a frozen game renders nothing. It feeds
 * the run-report collector's booted/framesAdvanced evidence (D-PAP-41).
 *
 * All control access is wrapped in try/catch (the game may not exist yet, or
 * Phaser internals may differ); communication stays on `postMessage` only, so
 * the strict opaque-origin sandbox is unchanged. `withOverlay` only swaps the
 * snapshot-reply sites through {@link snapshotReply} — nothing else may vary.
 */
const GAME_CONTROL = (withOverlay: boolean): string => `
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
            try { ${snapshotReply(withOverlay, '(image && image.src) || null')} } catch (er) {}
          });
        } else {
          ${snapshotReply(withOverlay, '__game.canvas ? __game.canvas.toDataURL() : null')}
        }
      }
    } catch (e) { try { ${snapshotReply(withOverlay, 'null')} } catch (er) {} }
  });

  setInterval(function () {
    if (!__game) return;
    try {
      parent.postMessage({
        __airbotixStat: true,
        fps: Math.round(__game.loop.actualFps || 0),
        paused: !__game.loop.running,
        frames: (__game.loop && typeof __game.loop.frame === 'number') ? __game.loop.frame : 0
      }, '*');
    } catch (e) {}
  }, 500);
})();
</script>`;

/** Self-hosted three.js global build (esbuild IIFE → `window.THREE`; content-hashed `/vendor/…` URL). */
const THREE_SRC = THREE_VENDOR_URL;

/** Friendly guard shown if the vendored three.js file fails to load (network/CSP). */
const THREE_GUARD = `
<script>
if (!window.THREE) {
  console.error('Could not load the 3D game engine (three.js). Check your connection and try again.');
}
</script>`;

/**
 * three.js control shim (parity with `GAME_CONTROL` for Phaser; same wire protocol).
 *
 * three has no `Phaser.Game` to wrap, so control rides a small documented contract
 * (learn-game-studio-3d-prd.md D‑3D‑04): the game publishes `window.__game = { pause(),
 * resume(), renderer, setMuted? }`. The shim drives pause/resume/mute through it, takes a
 * snapshot from the renderer's WebGL canvas (`preserveDrawingBuffer:true` is required by the
 * runtime contract), and reports FPS from the renderer's own frame counter — a stalled or
 * crashed game reads 0, which is exactly the signal the game-run oracle checks.
 *
 * Parent → frame:  { __airbotixControl: true, action: 'pause'|'resume'|'mute'|'unmute'|'snapshot' }
 * Frame → parent:  { __airbotixStat: true, fps: number, paused: boolean, frames: number }   // every ~500ms
 *
 * `frames` is the renderer's cumulative `info.render.frame` — the same engine
 * counter the FPS derives from (rAF is NOT a substitute; it ticks while frozen).
 * `withOverlay` only swaps the snapshot-reply sites through {@link snapshotReply}.
 */
const THREE_CONTROL = (withOverlay: boolean): string => `
<script>
(function () {
  var paused = false;
  var prevFrame = null, prevT = null;
  function now() { return (window.performance && performance.now) ? performance.now() : +new Date(); }
  function canvasEl() {
    var g = window.__game;
    if (g && g.renderer && g.renderer.domElement) return g.renderer.domElement;
    return document.querySelector('#game canvas');
  }
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.__airbotixControl !== true) return;
    var g = window.__game;
    try {
      if (m.action === 'pause')  { paused = true;  if (g && g.pause)  g.pause(); }
      if (m.action === 'resume') { paused = false; if (g && g.resume) g.resume(); }
      if (m.action === 'mute'    && g && g.setMuted) g.setMuted(true);
      if (m.action === 'unmute'  && g && g.setMuted) g.setMuted(false);
      if (m.action === 'snapshot') {
        var url = null;
        try { var c = canvasEl(); if (c && c.toDataURL) url = c.toDataURL(); } catch (er) {}
        ${snapshotReply(withOverlay, 'url')}
      }
    } catch (er) {
      try { ${snapshotReply(withOverlay, 'null')} } catch (e2) {}
    }
  });
  setInterval(function () {
    var g = window.__game, fps = 0, frames = 0;
    try {
      var rf = (g && g.renderer && g.renderer.info && g.renderer.info.render)
        ? g.renderer.info.render.frame : null;
      var t = now();
      if (typeof rf === 'number' && prevFrame !== null && prevT !== null && t > prevT) {
        fps = Math.round((rf - prevFrame) * 1000 / (t - prevT));
      }
      if (typeof rf === 'number') { prevFrame = rf; prevT = t; frames = rf || 0; }
    } catch (e) {}
    try { parent.postMessage({ __airbotixStat: true, fps: fps, paused: paused, frames: frames }, '*'); } catch (e) {}
  }, 500);
})();
</script>`;

/**
 * Engine-AGNOSTIC audio control (the pause/mute buttons actually silencing the game).
 *
 * The engine control shims freeze the game LOOP (`loop.sleep()` / `cancelAnimationFrame`),
 * but Web Audio runs on the AudioContext's own hardware clock — independent of any game
 * loop — so looping background music kept playing through a "pause", and three.js games
 * (which rarely wire the optional `setMuted`) ignored "mute" entirely. This shim fixes both
 * for BOTH engines by controlling the audio at the browser level, no matter how the game
 * produced it (Phaser's WebAudio sound manager, a three.js `AudioListener`, a raw
 * `AudioContext`, or an `<audio>`/`<video>` element).
 *
 * Mechanism: patch the `AudioContext` constructor BEFORE any engine boots so every context
 * the game creates is (a) tracked (for suspend/resume) and (b) re-routed through an injected
 * master GainNode (for mute). `pause` → `context.suspend()` + pause playing media; `mute` →
 * master gain 0 + `media.muted`. Mute and pause are INDEPENDENT states (a muted-then-paused
 * game stays silent on unmute until resumed). This must be injected ahead of `vendorTag`, and
 * every access is wrapped in try/catch — an audio-control bug must NEVER break a kid's game.
 */
const AUDIO_CONTROL = `
<script>
(function () {
  try {
    var Native = window.AudioContext || window.webkitAudioContext;
    var contexts = [];
    function attach(ctx) {
      try {
        if (!ctx || ctx.__airbotixTracked) return;
        ctx.__airbotixTracked = true;
        contexts.push(ctx);
        // Re-route the graph through a master gain we can zero out for mute. If
        // this fails, the context is still tracked so pause (suspend) works.
        var realDest = ctx.destination;
        var gain = ctx.createGain();
        gain.connect(realDest);
        Object.defineProperty(ctx, 'destination', { configurable: true, get: function () { return gain; } });
        ctx.__airbotixGain = gain;
      } catch (e) {}
    }
    if (Native) {
      function Patched(options) {
        var ctx = new Native(options);
        attach(ctx);
        return ctx;
      }
      Patched.prototype = Native.prototype;
      for (var k in Native) { try { Patched[k] = Native[k]; } catch (e) {} }
      window.AudioContext = Patched;
      if (window.webkitAudioContext) window.webkitAudioContext = Patched;
    }
    function media() { try { return document.querySelectorAll('audio,video'); } catch (e) { return []; } }
    var mediaPaused = [];
    function setMuted(on) {
      for (var i = 0; i < contexts.length; i++) {
        try { if (contexts[i].__airbotixGain) contexts[i].__airbotixGain.gain.value = on ? 0 : 1; } catch (e) {}
      }
      var els = media();
      for (var j = 0; j < els.length; j++) { try { els[j].muted = on; } catch (e) {} }
    }
    function setPaused(on) {
      for (var i = 0; i < contexts.length; i++) {
        try { if (on) contexts[i].suspend(); else contexts[i].resume(); } catch (e) {}
      }
      var els = media();
      if (on) {
        mediaPaused = [];
        for (var j = 0; j < els.length; j++) {
          try { if (!els[j].paused) { mediaPaused.push(els[j]); els[j].pause(); } } catch (e) {}
        }
      } else {
        for (var m = 0; m < mediaPaused.length; m++) { try { mediaPaused[m].play(); } catch (e) {} }
        mediaPaused = [];
      }
    }
    window.addEventListener('message', function (e) {
      var msg = e.data;
      if (!msg || msg.__airbotixControl !== true) return;
      try {
        if (msg.action === 'pause')  setPaused(true);
        if (msg.action === 'resume') setPaused(false);
        if (msg.action === 'mute')   setMuted(true);
        if (msg.action === 'unmute') setMuted(false);
      } catch (e) {}
    });
  } catch (e) {}
})();
</script>`;

/**
 * How many leading data:-URL chars the asset manifest (and the loader guard's
 * truncated `url`) carry — prefix + total length identify an inlined asset
 * without ever shipping the whole payload back over postMessage.
 */
export const ASSET_MANIFEST_PREFIX_CHARS = 256;

/**
 * Engine-agnostic run probe (post-apply verification, D-PAP-40/41). On the
 * parent's `{ action: 'report' }` request it samples the game canvas and replies
 * `{ __airbotixRunReport: true, canvas: { present, nonBlank, sampled } }` — the
 * "did anything actually draw?" evidence in the RunReport. Sampling draws the
 * canvas into an 8×8 2D canvas and counts pixels that are neither transparent
 * nor pure black; ANY failure (WebGL without preserveDrawingBuffer can read
 * black, getImageData can throw) degrades to `nonBlank: null` — a probe bug must
 * NEVER break (or fail) a kid's game, so every line is wrapped in try/catch.
 */
const RUN_PROBE = `
<script>
(function () {
  try {
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (!m || m.__airbotixControl !== true || m.action !== 'report') return;
      var canvas = null, present = false, nonBlank = null, sampled = 0;
      try {
        canvas = document.querySelector('#game canvas');
        present = !!canvas;
      } catch (err) {}
      try {
        if (canvas) {
          var sample = document.createElement('canvas');
          sample.width = 8; sample.height = 8;
          var ctx = sample.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, 8, 8);
            var px = ctx.getImageData(0, 0, 8, 8).data;
            var lit = 0;
            for (var i = 0; i < px.length; i += 4) {
              if (px[i + 3] > 0 && (px[i] > 0 || px[i + 1] > 0 || px[i + 2] > 0)) lit++;
            }
            nonBlank = lit > 0;
            sampled = 64;
          }
        }
      } catch (err) { nonBlank = null; sampled = 0; }
      try {
        parent.postMessage({ __airbotixRunReport: true, canvas: { present: present, nonBlank: nonBlank, sampled: sampled } }, '*');
      } catch (err) {}
    });
  } catch (err) {}
})();
</script>`;

/**
 * three.js loader guard (D-PAP-41) — makes SILENT asset failures loud. Kid/AI
 * code routinely passes its own `onError` that swallows the failure (the exact
 * broken-GLB signature this loop exists to catch), so the guard wraps
 * `GLTFLoader.prototype.load` + `TextureLoader.prototype.load` to (a) post an
 * `{ __airbotixAsset }` outcome (url truncated to the manifest prefix + total
 * length, so the parent can map a data: URL back to the kid's path) and (b)
 * `console.error('[airbotix] …')` BEFORE the app's own callbacks run. Success
 * posts the same message with ok:true before onLoad. Behaviour is otherwise
 * preserved exactly. Phaser needs no equivalent: its loader already
 * console.warns failures (covered by the curated warn allowlist).
 */
const THREE_LOADER_GUARD = `
<script>
(function () {
  try {
    if (!window.THREE) return;
    function post(url, ok, err) {
      try {
        var u = String(url);
        var m = { __airbotixAsset: true, url: u.slice(0, ${ASSET_MANIFEST_PREFIX_CHARS}), len: u.length, ok: ok };
        if (!ok) m.error = String(err && (err.message || err)).slice(0, 200);
        parent.postMessage(m, '*');
      } catch (e) {}
    }
    function wrap(Loader, label) {
      try {
        if (!Loader || !Loader.prototype || typeof Loader.prototype.load !== 'function') return;
        var orig = Loader.prototype.load;
        Loader.prototype.load = function (url, onLoad, onProgress, onError) {
          return orig.call(this, url, function (result) {
            post(url, true);
            if (onLoad) onLoad(result);
          }, onProgress, function (err) {
            var msg = String(err && (err.message || err)).slice(0, 200);
            post(url, false, err);
            try { console.error('[airbotix] ' + label + ' failed to load: ' + String(url).slice(0, 200) + ' — ' + msg); } catch (e) {}
            if (onError) onError(err);
          });
        };
      } catch (e) {}
    }
    wrap(window.THREE.GLTFLoader, '3D model');
    wrap(window.THREE.TextureLoader, 'Texture');
  } catch (e) {}
})();
</script>`;

/**
 * The ONE reserved HTML fragment the runtime renders (D-GAME13). Only a root
 * `overlay.html` (kind 'text') is injected; every other `.html` file is inert.
 * FROZEN cross-repo: the backend write gate + agent prompts quote this path.
 */
export const OVERLAY_PATH = 'overlay.html';

/**
 * Overlay base CSS (D-GAME13, FROZEN cross-repo — the agent prompt quotes it).
 * Injected into the shell `<style>` ONLY when overlay.html exists, BEFORE kid
 * css so kid css wins. The container swallows no input (`pointer-events:none`);
 * interactive elements (and anything tagged `data-ui`) opt back in with
 * kid-tap-friendly defaults (44px minimum, no double-tap zoom / callouts).
 */
const OVERLAY_BASE_CSS =
  '#overlay{position:fixed;inset:0;z-index:10;pointer-events:none;-webkit-user-select:none;user-select:none;' +
  '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;font-family:system-ui,sans-serif;color:#fff}' +
  '#overlay :where(button,a,input,select,textarea,label,[role="button"],[data-ui]){pointer-events:auto;touch-action:manipulation}' +
  '#overlay button{min-width:44px;min-height:44px}';

/**
 * Render-time overlay hygiene (D-GAME13 — determinism, NOT the security
 * boundary; that stays the opaque-origin sandbox). DOMParser never executes
 * scripts or loads resources while parsing; it also REPAIRS malformed markup —
 * the point: an unclosed tag in raw injection would swallow the kid `<script>`s
 * that follow the overlay in the srcdoc. Scripts are stripped (the backend
 * write gate already bounces them from AI writes; this covers kid hand-edits
 * without bouncing kid saves). Any parser failure degrades to an empty overlay.
 *
 * Asset refs in `src`/`href` attributes are inlined HERE, on the parsed DOM —
 * NOT by the text-level `inlineAssetRefs` pass afterwards — because
 * `body.innerHTML` entity-encodes `&` in attribute values (`assets/a&b.png` →
 * `assets/a&amp;b.png`), which a raw-path text match can never hit. The text
 * pass still runs after as a best-effort net for non-attribute refs (e.g.
 * quoted paths inside inline `style` urls).
 *
 * Known parser quirk (documented, accepted): a fragment BEGINNING with
 * head-only content (`<style>`, `<meta>`, `<link>`, `<template>`) is parsed
 * into `doc.head` and silently dropped by `body.innerHTML` — consistent with
 * the backend gate rejecting those tags in AI writes. Styles belong in
 * style.css.
 */
export function sanitizeOverlay(fragment: string, assets: VfsFile[] = []): string {
  try {
    const doc = new DOMParser().parseFromString(fragment, 'text/html');
    doc.querySelectorAll('script').forEach((el) => el.remove());
    if (assets.length > 0) {
      const byPath = new Map(assets.map((a) => [a.path, a] as const));
      for (const el of Array.from(doc.body.querySelectorAll('[src], [href]'))) {
        for (const attr of ['src', 'href'] as const) {
          const val = el.getAttribute(attr);
          const asset = val ? byPath.get(val) : undefined;
          if (asset) el.setAttribute(attr, toDataUrl(asset));
        }
      }
    }
    return doc.body.innerHTML;
  } catch {
    return '';
  }
}

/**
 * Composited-snapshot shim (D-HARN-21b) — injected ONLY when overlay.html is
 * present. Installs `window.__airbotixSnapshotOut`, which the engine control
 * shims route their snapshot replies through (lazily — this part sits AFTER the
 * control shim, so the seam resolves at reply time, not load time). It draws
 * the engine's canvas snapshot at the canvas's on-screen rect onto an offscreen
 * frame-sized canvas (letterbox reproduced), rasterizes the live `#overlay` DOM
 * over it via an SVG foreignObject (document `<style>` text + XMLSerializer —
 * no libs; every asset is already a data: URL), and posts
 * `{ __airbotixSnapshot, dataUrl, composited: true }`. EVERY step is try/caught:
 * any failure (e.g. Safari foreignObject quirks) falls back to posting the RAW
 * canvas dataUrl with `composited: false` — exactly the pre-overlay behaviour.
 */
const OVERLAY_SNAPSHOT = `
<script>
(function () {
  function fallback(u) { try { parent.postMessage({ __airbotixSnapshot: true, dataUrl: u, composited: false }, '*'); } catch (e) {} }
  window.__airbotixSnapshotOut = function (canvasUrl) {
    try {
      var overlay = document.getElementById('overlay');
      var gameCanvas = document.querySelector('#game canvas');
      if (!canvasUrl || !overlay || !gameCanvas) return fallback(canvasUrl || null);
      var w = window.innerWidth, h = window.innerHeight;
      var out = document.createElement('canvas');
      out.width = w; out.height = h;
      var ctx = out.getContext('2d');
      if (!ctx) return fallback(canvasUrl);
      var rect = gameCanvas.getBoundingClientRect();
      var game = new Image();
      game.onload = function () {
        try {
          ctx.drawImage(game, rect.left, rect.top, rect.width, rect.height);
          var cssText = '';
          var styles = document.querySelectorAll('style');
          for (var i = 0; i < styles.length; i++) cssText += styles[i].textContent || '';
          var xhtml = '<div xmlns="http://www.w3.org/1999/xhtml"><style>' + cssText + '</style>' +
            new XMLSerializer().serializeToString(overlay) + '</div>';
          var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
            '<foreignObject width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
          var ov = new Image();
          ov.onload = function () {
            try {
              ctx.drawImage(ov, 0, 0, w, h);
              parent.postMessage({ __airbotixSnapshot: true, dataUrl: out.toDataURL(), composited: true }, '*');
            } catch (e) { fallback(canvasUrl); }
          };
          ov.onerror = function () { fallback(canvasUrl); };
          ov.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        } catch (e) { fallback(canvasUrl); }
      };
      game.onerror = function () { fallback(canvasUrl); };
      game.src = canvasUrl;
    } catch (e) { fallback(canvasUrl); }
  };
})();
</script>`;

/** Which 2D/3D engine a game project runs on (mirrors backend `Project.engine`; null ⇒ phaser). */
export type GameEngine = 'phaser' | 'three';

/**
 * Engine-coupled pieces of the sandbox srcdoc (learn-game-studio-3d-prd.md D‑3D‑03). Everything
 * else in the builder — asset inlining, `//# sourceURL` line-mapping, CSS, the opaque-origin
 * iframe — is engine-agnostic. The Phaser profile is the verbatim extraction of the original
 * constants, so a `phaser` build is byte-identical to before.
 */
interface EngineProfile {
  /** Classic `<script src>` tag that loads the vendored global engine. */
  vendorTag: string;
  /** Guard that warns to the console if the global failed to load. */
  guard: string;
  /** Control shim (pause/resume/mute/snapshot/fps over postMessage).
   *  `control(false)` is byte-identical to the pre-overlay shim; `control(true)`
   *  routes snapshot replies through the composited overlay seam. */
  control: (withOverlay: boolean) => string;
  /** Optional loader instrumentation (asset-outcome reporting) — three only;
   *  OMITTED (not an empty part) for phaser so its srcdoc gains no extra line. */
  loaderGuard?: string;
}

const ENGINE_PROFILES: Record<GameEngine, EngineProfile> = {
  phaser: {
    vendorTag: `<script src="${PHASER_SRC}"></script>`,
    guard: PHASER_GUARD,
    control: GAME_CONTROL,
  },
  three: {
    vendorTag: `<script src="${THREE_SRC}"></script>`,
    guard: THREE_GUARD,
    control: THREE_CONTROL,
    loaderGuard: THREE_LOADER_GUARD,
  },
};

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
  /** Which engine global + control shim to inject. Defaults to `phaser` (back-compat). */
  engine?: GameEngine;
  /**
   * Extra assets to inline that are NOT in the project VFS — the class shared
   * assets a game references at `assets/class/<name>` (class-shared-assets-prd,
   * Model A). They are resolved from the shared class library at build time (their
   * `content` is a ready `data:` URL) and inlined exactly like a real VFS asset, so
   * the game loads them WITHOUT the kid copying them into their project. Persisted
   * copies only happen when a game is SHARED (the backend bakes referenced class
   * assets into the frozen public snapshot). Empty/omitted for a game that
   * references none.
   */
  virtualAssets?: VfsFile[];
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

/**
 * One inlined VFS asset's identity inside the running frame (D-PAP-41): the
 * loader guard reports a data: URL only as its first
 * {@link ASSET_MANIFEST_PREFIX_CHARS} chars + total length; prefix+length match
 * maps it back to the kid's path in the run-report collector.
 */
export interface AssetManifestEntry {
  path: string;
  prefix: string;
  length: number;
}

/** buildGameSrcDoc plus the per-script line map (for syntax-error resolution). */
export function buildGamePreview(
  files: VfsFile[],
  opts: BuildGameOptions = {},
): { srcDoc: string; scriptRanges: ScriptLineRange[]; assetManifest: AssetManifestEntry[] } {
  // Real VFS assets PLUS any virtual class-shared assets referenced at
  // `assets/class/<name>` — both inline identically (a data: URL rewritten into
  // the quoted path). A virtual asset never enters the persisted VFS (Model A).
  const assets = [...files.filter((f) => f.kind === 'asset'), ...(opts.virtualAssets ?? [])];
  const assetManifest: AssetManifestEntry[] = assets.map((a) => {
    const dataUrl = toDataUrl(a);
    return { path: a.path, prefix: dataUrl.slice(0, ASSET_MANIFEST_PREFIX_CHARS), length: dataUrl.length };
  });

  // The ONE reserved overlay fragment (D-GAME13). Sanitize FIRST, inline asset
  // refs AFTER — DOMParser re-quotes attributes, so inlining pre-sanitize could
  // split a quoted-path match. Other `.html` files are inert (never injected).
  const overlayFile = files.find((f) => f.kind === 'text' && f.path === OVERLAY_PATH);
  const overlayHtml = overlayFile
    ? inlineAssetRefs(sanitizeOverlay(overlayFile.content, assets), assets)
    : '';

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

  // Engine-coupled srcdoc pieces (vendored global + guard + control shim).
  const profile = ENGINE_PROFILES[opts.engine ?? 'phaser'];

  const css = files
    .filter((f) => f.kind === 'text' && f.path.endsWith('.css'))
    .map((f) => f.content)
    .join('\n');

  const prefixParts = [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    EXTENSION_NOISE_GUARD,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    // Full-bleed black stage; the overlay base CSS (only when overlay.html
    // exists) sits BEFORE the kid's .css so kid css can override BOTH.
    `<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}` +
      `#game{width:100%;height:100%}#game canvas{display:block}${overlayFile ? OVERLAY_BASE_CSS : ''}${css}</style>`,
    '</head><body>',
    '<div id="game"></div>',
    CONSOLE_CAPTURE,
    // Engine-agnostic audio control — MUST precede the engine so its AudioContext
    // patch is installed before Phaser/three ever create a context (so the pause
    // and mute buttons actually silence the game's audio, not just its loop).
    AUDIO_CONTROL,
    profile.vendorTag,
    profile.guard,
    // Loader instrumentation must sit AFTER the vendored global (it wraps its
    // prototypes) and BEFORE any kid script. Spread — never an empty part — so
    // the phaser srcdoc's line count is untouched.
    ...(profile.loaderGuard ? [profile.loaderGuard] : []),
    debugFlag,
    profile.control(!!overlayFile),
    RUN_PROBE,
    // Overlay fragment + composited-snapshot shim (D-GAME13/D-HARN-21b) — the
    // div precedes every kid `<script>` so getElementById works at script time.
    // Spread — never an empty part — so a no-overlay srcdoc is byte-identical.
    ...(overlayFile ? [`<div id="overlay">${overlayHtml}</div>`, OVERLAY_SNAPSHOT] : []),
  ];
  const scriptRanges: ScriptLineRange[] = [];
  // Parts join with '\n', so part k starts at 1 + the line count of all parts before it.
  let nextLine = prefixParts.reduce((n, p) => n + lineCount(p), 0) + 1;
  ordered.forEach((f, i) => {
    scriptRanges.push({ path: f.path, start: nextLine, end: nextLine + lineCount(f.content) - 1 });
    nextLine += lineCount(scriptTags[i]);
  });
  const srcDoc = [...prefixParts, ...scriptTags, '</body></html>'].join('\n');
  return { srcDoc, scriptRanges, assetManifest };
}

export interface StatMessage {
  fps: number;
  paused: boolean;
  /** Cumulative ENGINE frame counter (0 when the game hasn't rendered).
   *  Optional on the parent side: any frame could post a stat-shaped message. */
  frames?: number;
}

export function isStatMessage(data: unknown): data is { __airbotixStat: true } & StatMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__airbotixStat' in data &&
    (data as { __airbotixStat: unknown }).__airbotixStat === true
  );
}

/** The frame's snapshot reply. `composited` is ADDITIVE (absent on no-overlay
 *  builds): true = canvas + overlay composited; false = raw canvas fallback. */
export interface SnapshotMessage {
  dataUrl: string | null;
  composited?: boolean;
}

export function isSnapshotMessage(
  data: unknown,
): data is { __airbotixSnapshot: true } & SnapshotMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__airbotixSnapshot' in data &&
    (data as { __airbotixSnapshot: unknown }).__airbotixSnapshot === true
  );
}
