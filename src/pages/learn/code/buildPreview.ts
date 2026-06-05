// Iframe preview builder — VFS shim (learn-code-studio-prd.md §5).
//
// PRD §5.1 specifies a sandboxed `<iframe sandbox="allow-scripts">` (no
// allow-same-origin) loading a single `srcdoc` built from the VFS, with
// external `<img src="images/cat.png">` resolved via a service worker that
// serves cached VFS reads.
//
// V0 reality: a `srcdoc` iframe WITHOUT `allow-same-origin` runs at an opaque
// origin and cannot be controlled by a service worker scoped to our app origin,
// so the SW asset-serving path can't apply here (PRD §5.1 notes this is the
// deep part). Instead we run the VFS shim in the PARENT: before injecting the
// document we rewrite any `src`/`href` that points at a VFS asset to the
// asset's inlined data: URL. This serves the exact same purpose — kid assets
// load, nothing external leaks — while keeping the strict sandbox.
//
// The true SW-based cross-fetch shim is deferred to the dedicated preview
// origin in PRD §5.2 (V1). This file is the V0 substitute and is flagged
// PARTIAL for the SW piece.

import type { VfsFile } from './codeApi';

export const CONSOLE_CAPTURE = `
<script>
(function () {
  var send = function (level, args) {
    try {
      parent.postMessage({
        __airbotixConsole: true,
        level: level,
        text: Array.prototype.map.call(args, String).join(' ')
      }, '*');
    } catch (e) {}
  };
  ['log', 'info', 'warn', 'error'].forEach(function (level) {
    var orig = console[level];
    console[level] = function () { send(level, arguments); orig && orig.apply(console, arguments); };
  });
  window.addEventListener('error', function (e) { send('error', [e.message]); });
  window.addEventListener('unhandledrejection', function (e) {
    send('error', ['Unhandled promise: ' + (e.reason && e.reason.message || e.reason)]);
  });
  parent.postMessage({ __airbotixConsole: true, level: 'info', text: 'ready' }, '*');
})();
</script>`;

export const ASSET_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

function file(files: VfsFile[], path: string): string {
  return files.find((f) => f.path === path)?.content ?? '';
}

/**
 * Rewrite VFS-relative asset references to inlined data URLs (the parent-side
 * VFS shim). An asset's `content` is already a data: URL when binary; for the
 * fallback path assets are rare, so this is mostly a guard for future uploads.
 */
function inlineAssets(html: string, files: VfsFile[]): string {
  const assets = files.filter((f) => f.kind === 'asset');
  if (assets.length === 0) return html;
  let out = html;
  for (const a of assets) {
    const ext = a.path.split('.').pop()?.toLowerCase() ?? '';
    const dataUrl = a.content.startsWith('data:')
      ? a.content
      : `data:${ASSET_MIME[ext] ?? 'application/octet-stream'};base64,${a.content}`;
    // Replace src="path" / src='path' / src=path and href variants.
    const escaped = a.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(src|href)=("|')${escaped}\\2`, 'g'), `$1=$2${dataUrl}$2`);
  }
  return out;
}

/** Build the full sandboxed srcdoc from the VFS. */
export function buildSrcDoc(files: VfsFile[]): string {
  const html = inlineAssets(file(files, 'index.html'), files);
  const css = file(files, 'style.css');
  const js = file(files, 'script.js');
  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    `<style>${css}</style>`,
    '</head><body>',
    CONSOLE_CAPTURE,
    html,
    `<script>${js}${'<'}/script>`,
    '</body></html>',
  ].join('\n');
}

export interface ConsoleLine {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

export function isConsoleMessage(data: unknown): data is { __airbotixConsole: true } & ConsoleLine {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__airbotixConsole' in data &&
    (data as { __airbotixConsole: unknown }).__airbotixConsole === true
  );
}
