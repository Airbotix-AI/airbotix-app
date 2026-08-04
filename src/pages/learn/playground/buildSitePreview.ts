// Sandboxed WEBSITE preview builder — Website Studio runtime
// (creative-code-studio-website-prd; the backend agent prompt in
// platform-backend/src/code-sessions/website-prompt.ts teaches EXACTLY this
// contract — keep the two in sync).
//
// Unlike the game builder (a studio-owned shell hosting kid game.js), the VFS
// owns REAL pages here: the selected `.html` file IS the document. Per build:
//
//   1. PAGE SELECTION — `opts.page` (default index.html) picks the document; a
//      missing page falls back to index.html; no index.html at all renders a
//      friendly kid-facing empty state.
//   2. SHIMS, injected into <head> BEFORE any kid script, in order: the
//      extension-noise guard, the console capture, the SITE RUNTIME shim
//      (`db` from data/**.json + `app.get/app.post` + the /api-only fetch shim
//      + the page-link nav shim), a `connect-src 'none'` CSP meta (a second
//      fence — the fetch shim never performs real network I/O, so it is
//      unaffected), then server.js — ALWAYS the first kid script, whether or
//      not the page references it (it defines the routes).
//   3. REFERENCE INLINING — `<link rel="stylesheet" href>` / `<script src>`
//      tags are replaced with the referenced VFS file inlined (scripts carry
//      `//# sourceURL=<path>`); a missing/external reference becomes a
//      console.error (never a crash). Quoted asset paths are rewritten to
//      data: URLs via the game builder's `inlineAssetRefs`.
//   4. `scriptRanges` map srcdoc lines back to kid files so SYNTAX errors
//      (where sourceURL never applies) still resolve via `resolveErrorLoc` —
//      the same contract as `buildGamePreview`.
//
// Security model is IDENTICAL to the game: an opaque-origin iframe,
// `sandbox="allow-scripts"` only, postMessage the only channel out.

import type { VfsFile } from '../code/codeApi';
import { isWebsiteDataJsonPath } from '../code/codeApi';
import { CONSOLE_CAPTURE, EXTENSION_NOISE_GUARD } from '../code/buildPreview';
import { inlineAssetRefs, type ScriptLineRange } from './buildGamePreview';

// Re-export the shared console/error-mapping contract so site components import
// from one place (mirrors buildGamePreview's re-exports).
export { isConsoleMessage, type ConsoleLine } from '../code/buildPreview';
export { resolveErrorLoc } from './buildGamePreview';
export type { ScriptLineRange } from './buildGamePreview';

/** The site's home page — the default document and every fallback target. */
export const SITE_HOME_PAGE = 'index.html';
/** The site's backend file — always injected FIRST among kid scripts. */
const SERVER_PATH = 'server.js';

/** `connect-src 'none'` second fence: the fetch shim never touches the network,
 *  so kid code can't either — even if it somehow dodged the shim. */
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">`;

/** Embed a string safely inside injected `<script>` source (a literal
 *  `</script>` or `<!--` in kid data must never terminate/confuse the tag). */
const jsStr = (s: string): string => JSON.stringify(s).replace(/</g, '\\u003c');

/** Strip a leading `./` from a relative reference (`./about.html` → `about.html`). */
const normalizeRef = (ref: string): string => (ref.startsWith('./') ? ref.slice(2) : ref);

/** db key for a seed file: filename without directory or `.json` extension. */
const dbKeyOf = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.json$/i, '');

export interface BuildSiteOptions {
  /** Which VFS `.html` page is the document (default {@link SITE_HOME_PAGE}). */
  page?: string;
  /**
   * Carried db state (from a page navigation). When present it REPLACES the
   * initial `data/**.json` hydration — db changes persist across page navs and
   * reset only on a fresh run (runKey bump).
   */
  dbState?: Record<string, unknown> | null;
  /** Extra assets to inline that are NOT in the project VFS (class shared
   *  assets resolved to ready `data:` URLs) — same seam as the game builder. */
  virtualAssets?: VfsFile[];
}

export interface SitePreview {
  srcDoc: string;
  /** Where each inlined kid script lives in the srcdoc (syntax-error mapping). */
  scriptRanges: ScriptLineRange[];
  /** The page actually rendered (the requested page, or the fallback). */
  currentPage: string;
}

/** The in-frame nav shim's message: the kid clicked a link to another page. */
export interface SiteNavigateMessage {
  path: string;
  /** JSON-safe clone of the live `db` at click time (null if uncloneable). */
  db: Record<string, unknown> | null;
}

export function isSiteNavigateMessage(
  data: unknown,
): data is { __airbotixSiteNavigate: true } & SiteNavigateMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__airbotixSiteNavigate' in data &&
    (data as { __airbotixSiteNavigate: unknown }).__airbotixSiteNavigate === true &&
    typeof (data as { path?: unknown }).path === 'string'
  );
}

/**
 * The site runtime shim (contract items the backend agent teaches verbatim):
 * `db` hydrated from the bundled data/**.json seeds (a parse failure
 * console.errors and skips that file; `dbState` replaces the seeds wholesale),
 * `app.get/app.post` route registration, the /api-only fetch shim (query/body
 * parsing, chainable `res.status().json()`, kid-friendly 404/500 console
 * errors, everything else blocked), and the capture-phase nav shim that turns
 * relative `*.html` link clicks into a postMessage to the studio.
 */
function siteRuntime(
  seeds: Array<{ key: string; path: string; text: string }>,
  dbState: Record<string, unknown> | null,
): string {
  const seedsJs = `[${seeds
    .map((s) => `{key:${jsStr(s.key)},path:${jsStr(s.path)},text:${jsStr(s.text)}}`)
    .join(',')}]`;
  const stateJs = dbState === null ? 'null' : JSON.stringify(dbState).replace(/</g, '\\u003c');
  return `<script>
(function () {
  // ── db: the site's in-memory database, hydrated from data/*.json ──────────
  var seeds = ${seedsJs};
  var carried = ${stateJs};
  var db = {};
  if (carried !== null) {
    db = carried; // carried across a page navigation — replaces the seeds
  } else {
    for (var i = 0; i < seeds.length; i++) {
      try { db[seeds[i].key] = JSON.parse(seeds[i].text); }
      catch (e) { console.error('Could not read ' + seeds[i].path + ' — it is not valid JSON: ' + (e && e.message ? e.message : e)); }
    }
  }
  window.db = db;

  // ── app: the route table server.js registers into ──────────────────────────
  var routes = { GET: {}, POST: {} };
  window.app = {
    get: function (path, handler) { routes.GET[path] = handler; },
    post: function (path, handler) { routes.POST[path] = handler; }
  };

  // ── fetch: serves ONLY the site's own /api/* routes — no real network I/O ──
  function toResponse(status, data) {
    var body = JSON.stringify(data === undefined ? null : data);
    var ok = status >= 200 && status < 300;
    try {
      return new Response(body, { status: status, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return {
        ok: ok,
        status: status,
        json: function () { return Promise.resolve(JSON.parse(body)); },
        text: function () { return Promise.resolve(body); }
      };
    }
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
    if (url.slice(0, 5) !== '/api/') {
      console.error('fetch("' + url + '") was blocked — the sandbox blocks the outside internet. Your site can only fetch its own /api/... routes.');
      return Promise.reject(new TypeError('Failed to fetch: ' + url));
    }
    var method = (init && init.method ? String(init.method) : 'GET').toUpperCase();
    var qi = url.indexOf('?');
    var path = qi === -1 ? url : url.slice(0, qi);
    var query = {};
    if (qi !== -1) {
      var pairs = url.slice(qi + 1).split('&');
      for (var p = 0; p < pairs.length; p++) {
        if (!pairs[p]) continue;
        var eq = pairs[p].indexOf('=');
        var k = eq === -1 ? pairs[p] : pairs[p].slice(0, eq);
        var v = eq === -1 ? '' : pairs[p].slice(eq + 1);
        try { query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\\+/g, ' ')); }
        catch (e) { query[k] = v; }
      }
    }
    var body = null;
    if (init && init.body != null) {
      try { body = JSON.parse(String(init.body)); } catch (e) { body = null; }
    }
    var handler = routes[method] && routes[method][path];
    return new Promise(function (resolve) {
      if (!handler) {
        console.error('No route answered ' + method + ' ' + path + " — add app." + method.toLowerCase() + "('" + path + "', (req, res) => { ... }) in server.js.");
        resolve(toResponse(404, { error: 'No route for ' + method + ' ' + path }));
        return;
      }
      var req = { method: method, path: path, query: query, body: body };
      var status = 200;
      var res = {
        status: function (code) { status = code; return res; },
        json: function (data) { resolve(toResponse(status, data)); }
      };
      try { handler(req, res); }
      catch (err) {
        console.error('Your ' + method + ' ' + path + ' route crashed: ' + (err && err.message ? err.message : err));
        resolve(toResponse(500, { error: String(err && err.message ? err.message : err) }));
      }
    });
  };

  // ── nav: relative *.html link clicks post a navigation to the studio ───────
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && !(el.tagName && el.tagName.toUpperCase() === 'A')) el = el.parentElement;
    if (!el) return;
    var href = el.getAttribute('href');
    if (href == null || href === '') return;
    if (href.charAt(0) === '#') return; // same-page anchor — native scroll is fine
    var clean = href.split('#')[0].split('?')[0];
    if (clean.slice(0, 2) === './') clean = clean.slice(2);
    var external = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(clean) || clean.slice(0, 2) === '//' || clean.charAt(0) === '/';
    if (external || !/\\.html$/i.test(clean)) {
      e.preventDefault();
      console.info('Only links to your own pages (like "about.html") work here.');
      return;
    }
    e.preventDefault();
    var snapshot = null;
    try { snapshot = JSON.parse(JSON.stringify(window.db)); } catch (err) { snapshot = null; }
    parent.postMessage({ __airbotixSiteNavigate: true, path: clean, db: snapshot }, '*');
  }, true);
})();
</script>`;
}

/** Find a text `.html` VFS file at exactly this (normalized) path. */
function htmlFile(files: VfsFile[], path: string): VfsFile | undefined {
  return files.find((f) => f.kind === 'text' && f.path === path && /\.html$/i.test(f.path));
}

/** Friendly kid-facing empty state when the project has no index.html at all. */
function emptyStatePreview(): SitePreview {
  const srcDoc = [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    EXTENSION_NOISE_GUARD,
    CONSOLE_CAPTURE,
    CSP_META,
    '<style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui,sans-serif;background:#f8fafc;color:#334155;text-align:center}</style>',
    '</head><body>',
    '<div><div style="font-size:56px">🌐</div><h1 style="font-size:20px">No pages yet!</h1><p>Ask your AI helper to build your first page (index.html).</p></div>',
    '</body></html>',
  ].join('\n');
  return { srcDoc, scriptRanges: [], currentPage: SITE_HOME_PAGE };
}

/** Match `<script src="…"></script>` reference tags (the runtime contract's
 *  plain relative form; anything the regex catches is replaced — an external
 *  URL is thereby neutralized into a console.error instead of loading). */
const SCRIPT_REF_RE = /<script\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>\s*<\/script>/gi;
/** Match any `<link …>` tag; stylesheet ones are inlined, others left alone. */
const LINK_TAG_RE = /<link\b[^>]*>/gi;

export function buildSitePreview(files: VfsFile[], opts: BuildSiteOptions = {}): SitePreview {
  // Real VFS assets PLUS virtual class-shared assets — inlined identically to
  // the game builder (a data: URL rewritten into the quoted path).
  const assets = [...files.filter((f) => f.kind === 'asset'), ...(opts.virtualAssets ?? [])];

  // 1. Page selection: requested → index.html fallback → friendly empty state.
  const requested = normalizeRef(opts.page ?? SITE_HOME_PAGE);
  const pageFile = htmlFile(files, requested) ?? htmlFile(files, SITE_HOME_PAGE);
  if (!pageFile) return emptyStatePreview();

  // Each inlined kid script, keyed by its exact final tag text — located in the
  // assembled srcdoc afterwards to compute line ranges (dedup: a page that
  // references the same file twice reuses one entry, every occurrence ranged).
  const injected = new Map<string, { path: string; content: string }>();
  const kidScriptTag = (f: VfsFile): string => {
    // ⚠️ Content starts IMMEDIATELY after `<script>` — no leading newline — so
    // sourceURL line numbers match the kid's file (same contract as the game).
    const content = inlineAssetRefs(f.content, assets);
    const tag = `<script>${content}\n//# sourceURL=${f.path}\n${'<'}/script>`;
    injected.set(tag, { path: f.path, content });
    return tag;
  };
  const missingRefTag = (ref: string): string =>
    `<script>console.error(${jsStr(
      `Missing file "${ref}" — this page references it but it isn't in your project (outside URLs are blocked).`,
    )});${'<'}/script>`;

  // server.js — ALWAYS injected first among kid scripts (it defines the routes),
  // whether or not the page references it.
  const server = files.find((f) => f.kind === 'text' && f.path === SERVER_PATH);
  const serverTag = server ? kidScriptTag(server) : undefined;

  // 2/3. Transform the page: inline asset refs FIRST (script/style src attrs
  // are text files, never assets, so they survive untouched), then swap the
  // reference tags for inline content.
  let html = inlineAssetRefs(pageFile.content, assets);
  html = html.replace(SCRIPT_REF_RE, (_m, dq: string | undefined, sq: string | undefined) => {
    const src = normalizeRef(dq ?? sq ?? '');
    // The page's own server.js reference is dropped — it already runs first.
    if (src === SERVER_PATH) return '<!-- server.js runs first (injected by the studio) -->';
    const file = files.find((f) => f.kind === 'text' && f.path === src);
    return file ? kidScriptTag(file) : missingRefTag(src);
  });
  html = html.replace(LINK_TAG_RE, (tag: string) => {
    if (!/\brel\s*=\s*["']stylesheet["']/i.test(tag)) return tag; // icons etc. — leave
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    const ref = normalizeRef(href?.[1] ?? href?.[2] ?? '');
    const file = files.find((f) => f.kind === 'text' && f.path === ref);
    if (!file) return missingRefTag(ref);
    return `<style>${inlineAssetRefs(file.content, assets)}</style>`;
  });

  // Shim block, in the mandated order, then server.js as the first kid script.
  const seeds = files
    .filter((f) => f.kind === 'text' && isWebsiteDataJsonPath(f.path))
    .map((f) => ({ key: dbKeyOf(f.path), path: f.path, text: f.content }));
  const headBlock = [
    EXTENSION_NOISE_GUARD,
    CONSOLE_CAPTURE,
    siteRuntime(seeds, opts.dbState ?? null),
    CSP_META,
    ...(serverTag ? [serverTag] : []),
  ].join('\n');

  // Inject right after the opening <head> tag so the shims precede ANY kid
  // script (even an inline one in the head). A page with no <head> (the agent
  // contract requires one, but never crash) gets the block prepended — the
  // parser hoists early scripts into the head it synthesizes.
  const headOpen = /<head\b[^>]*>/i.exec(html);
  const srcDoc = headOpen
    ? html.slice(0, headOpen.index + headOpen[0].length) + '\n' + headBlock + html.slice(headOpen.index + headOpen[0].length)
    : headBlock + '\n' + html;

  // 4. Locate every inlined kid script in the final document → line ranges.
  // The tag text is unique per (path, content); content starts ON the
  // `<script>` line, so kid-file line N = tag line + (N - 1).
  const lineOf = (offset: number): number => {
    let line = 1;
    for (let i = 0; i < offset; i += 1) if (srcDoc.charCodeAt(i) === 10) line += 1;
    return line;
  };
  const scriptRanges: ScriptLineRange[] = [];
  for (const [tag, { path, content }] of injected) {
    let from = 0;
    for (;;) {
      const at = srcDoc.indexOf(tag, from);
      if (at === -1) break;
      const start = lineOf(at);
      scriptRanges.push({ path, start, end: start + content.split('\n').length - 1 });
      from = at + tag.length;
    }
  }
  scriptRanges.sort((a, b) => a.start - b.start);

  return { srcDoc, scriptRanges, currentPage: pageFile.path };
}
