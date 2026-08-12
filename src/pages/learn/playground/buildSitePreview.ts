// Sandboxed WEBSITE preview builder — Website Studio runtime
// (creative-code-studio-website-prd; the backend agent prompt in
// platform-backend/src/code-sessions/website-prompt.ts teaches EXACTLY this
// contract — keep the two in sync).
//
// Unlike the game builder (a studio-owned shell hosting kid game.js), the VFS
// owns REAL pages here: the selected `.html` file provides the CONTENT — but
// the DOCUMENT SKELETON is studio-owned. Per build:
//
//   1. PAGE SELECTION — `opts.page` (default index.html) picks the page; a
//      missing page falls back to index.html; no index.html at all renders a
//      friendly kid-facing empty state.
//   2. STUDIO-OWNED SKELETON (security-load-bearing) — the srcdoc is ALWAYS
//      `<!doctype html><html><head>` + the shims + CSP + server.js, and only
//      THEN the kid page's lifted head/body. The kid page is parsed with
//      DOMParser (never executes, repairs malformed markup) and its head
//      children + body are lifted INTO the skeleton — the injection point is
//      never located by matching markup in untrusted HTML, so a `<head>`
//      hidden in a comment / string literal / attribute cannot displace the
//      shims (that bypass would disarm the fetch shim AND the CSP, the two
//      fences the backend's fetch( allowance for websites rests on, D-WEB-03).
//   3. SHIM ORDER inside the skeleton head: extension-noise guard, console
//      capture, the SITE RUNTIME shim (the `db.query` sql postMessage channel
//      to the project's REAL server-side SQLite db + `app.get/app.post` + the
//      /api-only fetch shim + the page-link nav shim), the deny-by-default CSP
//      meta, then server.js — ALWAYS the first kid script, whether or not the
//      page references it (it defines the routes).
//   4. REFERENCE INLINING — `<link rel="stylesheet" href>` / `<script src>`
//      tags are replaced with the referenced VFS file inlined (scripts carry
//      `//# sourceURL=<path>`; a literal `</script>`/`</style>` in kid text is
//      escaped so it can't truncate the tag); a missing/external reference
//      becomes a console.error (never a crash). Quoted asset paths are
//      rewritten to data: URLs via the game builder's `inlineAssetRefs`.
//   5. `scriptRanges` map srcdoc lines back to kid files so SYNTAX errors
//      (where sourceURL never applies) still resolve via `resolveErrorLoc` —
//      the same contract as `buildGamePreview`.
//
// Security model is IDENTICAL to the game: an opaque-origin iframe,
// `sandbox="allow-scripts"` only, postMessage the only channel out — plus the
// deny-by-default CSP below as the second fence.

import type { VfsFile } from '../code/codeApi';
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

/**
 * Deny-by-default CSP second fence. Everything the runtime legitimately uses is
 * inline or `data:`/`blob:` (shim + kid scripts are inline; styles are inline;
 * assets are inlined data: URLs), so every SUBRESOURCE-load vector is blocked
 * wholesale even where the reference-inlining regex wouldn't catch it:
 * external `<script src>` / `<img>` / `<link>` / font / `<iframe>` (a nested
 * frame is the classic way to get a fresh un-shimmed `window.fetch`), plus
 * XHR / WebSocket / EventSource / sendBeacon via `connect-src 'none'` (which
 * also leaves the fetch shim unaffected — it never performs real network I/O).
 *
 * ⚠️ KNOWN RESIDUAL — this does NOT stop the frame navigating ITSELF to an
 * external URL (`location.href = …`, `<meta http-equiv="refresh">`, a
 * programmatic link click): CSP has no directive for document self-navigation
 * (`navigate-to` was never shipped) and `sandbox="allow-scripts"` explicitly
 * permits a frame to navigate itself. A determined kid/AI script can therefore
 * still leak page-derived data as a GET in that URL. Accepted for now: it
 * destroys the running preview (the kid sees it), it is one-shot, and closing
 * it needs `allow-top-navigation`-style sandbox work or a navigation-blocking
 * shim — tracked as a follow-up, NOT claimed as closed here.
 */
const CSP_META =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; ` +
  `script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; ` +
  `media-src data: blob:; font-src data:; connect-src 'none'">`;

/** Embed a string safely inside injected `<script>` source (a literal
 *  `</script>` or `<!--` in kid data must never terminate/confuse the tag). */
const jsStr = (s: string): string => JSON.stringify(s).replace(/</g, '\\u003c');

/** Escape a literal `</script>` inside inlined kid JS so it can't terminate the
 *  studio's `<script>` tag (it legally appears only in strings/comments, where
 *  `<\/script` is byte-equivalent). Never changes line counts. */
const escapeScriptText = (s: string): string => s.replace(/<\/script/gi, '<\\/script');
/** Same fence for a literal `</style>` inside inlined kid CSS. */
const escapeStyleText = (s: string): string => s.replace(/<\/style/gi, '<\\/style');

/** Strip a leading `./` from a relative reference (`./about.html` → `about.html`). */
const normalizeRef = (ref: string): string => (ref.startsWith('./') ? ref.slice(2) : ref);

/** How long the in-frame `db.query` waits for the studio's sql reply before
 *  rejecting kid-readably (a wedged studio must never hang a kid's route). */
export const SITE_SQL_TIMEOUT_MS = 10_000;

/** Serialize one DOM attribute for the studio skeleton. `&` is escaped BEFORE
 *  `"` so entity-like text survives the parse→serialize round trip unchanged
 *  (`&quot;` in the source must not come back as a literal quote). */
const serializeAttrs = (el: Element): string =>
  Array.from(el.attributes)
    .map(
      (a) =>
        ` ${a.name}="${a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`,
    )
    .join('');

export interface BuildSiteOptions {
  /** Which VFS `.html` page is the document (default {@link SITE_HOME_PAGE}). */
  page?: string;
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

/** The in-frame nav shim's message: the kid clicked a link to another page.
 *  Nothing else travels — the db is server-side (D-WEB-15), so navigation has
 *  no state to carry. */
export interface SiteNavigateMessage {
  path: string;
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

/** The in-frame shim's `db.query` request (frame → studio): SiteFrame proxies
 *  it to `POST /projects/:id/db/query` with the kid's session — the session
 *  token never enters the frame — and posts the {@link SiteSqlReply} back.
 *
 *  `token` is a PER-DOCUMENT nonce (minted at shim init): `id` alone cannot
 *  key a reply, because a srcdoc swap (live rebuild / page nav) keeps the SAME
 *  WindowProxy while the new document's counter restarts at 0 — a late reply
 *  for the OLD document would otherwise resolve the new document's same-id
 *  query with the wrong rows. The studio echoes the token; the shim ignores
 *  replies whose token is not its own. `params` is untrusted wire data — the
 *  studio validates the elements before anything reaches the backend. */
export interface SiteSqlRequest {
  id: number;
  token: string;
  sql: string;
  params: unknown[];
}

export function isSiteSqlRequest(
  data: unknown,
): data is { __airbotixSiteControl: true; action: 'sql' } & SiteSqlRequest {
  if (typeof data !== 'object' || data === null) return false;
  const m = data as {
    __airbotixSiteControl?: unknown;
    action?: unknown;
    id?: unknown;
    token?: unknown;
    sql?: unknown;
  };
  return (
    m.__airbotixSiteControl === true &&
    m.action === 'sql' &&
    typeof m.id === 'number' &&
    typeof m.token === 'string' &&
    typeof m.sql === 'string'
  );
}

/** The studio's reply to a {@link SiteSqlRequest} (studio → frame), echoing
 *  the request's `id` + per-document `token`. `result` is the backend query
 *  envelope on success; `error` is the backend's kid-readable message on
 *  failure. */
export interface SiteSqlReply {
  __airbotixSiteSql: true;
  id: number;
  token: string;
  ok: boolean;
  result?: {
    columns: string[];
    rows: Record<string, unknown>[];
    row_count: number;
    changes: number | null;
    last_insert_rowid: string | null;
  };
  error?: string;
}

/**
 * The site runtime shim (contract items the backend agent teaches verbatim):
 * `db.query(sql, ...params)` — REAL SQL on the project's server-side SQLite db
 * (D-WEB-15), each query posted to the parent studio over the sql postMessage
 * channel (the frame stays token-free; the studio calls the backend with the
 * kid's session) — `app.get/app.post` route registration, the /api-only fetch
 * shim (query/body parsing, chainable `res.status().json()`, ASYNC handlers
 * awaited, kid-friendly 404/500 console errors, everything else blocked), the
 * capture-phase nav shim that posts relative `*.html` link clicks to the
 * studio (no state rides along — the db is server-side and simply persists),
 * and a kid-readable reporter for silent CSP violations.
 *
 * Run-report instrumentation (D-WEB-13): the shim ALSO keeps evidence ledgers —
 * every /api fetch it served/blocked (with the real status; 0 = rejected before
 * any response), which elements kid code attached click/pointerdown/submit
 * listeners to (via an `EventTarget.prototype.addEventListener` wrap installed
 * LAST, so the shim's own listeners never count), whether document/body got a
 * delegated click handler, and whether the page finished loading. A
 * `{__airbotixControl, action:'report'}` request (the same control channel the
 * game probe uses) replies `{__airbotixSiteReport, site}` with those ledgers
 * plus the visible interactive elements cross-checked for `wired`. The parent
 * collector re-clamps everything — this frame is untrusted.
 */
function siteRuntime(page: string): string {
  return `<script>
(function () {
  // ── db.query: REAL SQL on the project's server-side database (D-WEB-15) ────
  // Params: db.query(sql, a, b) and db.query(sql, [a, b]) both work.
  //
  // RETURN SHAPE (the Web Critter prompt teaches EXACTLY this — keep in sync):
  //   - a READER statement (the reply carries columns, e.g. SELECT) resolves
  //     with the ROWS ARRAY:      var pets = await db.query('SELECT * FROM pets');
  //   - a WRITE statement (no columns: INSERT/UPDATE/DELETE/CREATE …) resolves
  //     with { changes, lastInsertRowid }.
  // An SQL error rejects with the server's kid-readable message AND
  // console.errors it verbatim (feeds the D-WEB-13 logs ledger).
  var sqlSeq = 0;
  var sqlPending = {};
  // Per-DOCUMENT nonce: a srcdoc swap keeps the same WindowProxy but restarts
  // sqlSeq, so id alone could match a LATE reply meant for the previous
  // document (wrong rows for a same-id query). Replies must echo this token.
  var sqlToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
  window.db = {
    query: function (sql) {
      var params = Array.prototype.slice.call(arguments, 1);
      if (params.length === 1 && Array.isArray(params[0])) params = params[0];
      return new Promise(function (resolve, reject) {
        var id = ++sqlSeq;
        var timer = setTimeout(function () {
          delete sqlPending[id];
          var msg = 'Your database took too long to answer (10 seconds) — try again, or reload your site.';
          console.error(msg);
          reject(new Error(msg));
        }, ${SITE_SQL_TIMEOUT_MS});
        sqlPending[id] = { resolve: resolve, reject: reject, timer: timer };
        parent.postMessage({ __airbotixSiteControl: true, action: 'sql', id: id, token: sqlToken, sql: String(sql), params: params }, '*');
      });
    }
  };
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.__airbotixSiteSql !== true) return;
    if (m.token !== sqlToken) return; // a reply for another document — not ours
    var pending = sqlPending[m.id];
    if (!pending) return; // timed out / not ours
    delete sqlPending[m.id];
    clearTimeout(pending.timer);
    if (m.ok) {
      var r = m.result || {};
      if (r.columns && r.columns.length > 0) pending.resolve(r.rows || []);
      else pending.resolve({ changes: r.changes == null ? 0 : r.changes, lastInsertRowid: r.last_insert_rowid == null ? null : r.last_insert_rowid });
    } else {
      var msg = typeof m.error === 'string' && m.error !== '' ? m.error : 'Your SQL could not run.';
      console.error(msg);
      pending.reject(new Error(msg));
    }
  });

  // ── run-report evidence ledgers (D-WEB-13) — read by the 'report' request ──
  var evidence = { pageLoaded: false, api: [], wired: null, delegated: false };
  try { evidence.wired = new WeakSet(); } catch (e) { evidence.wired = null; }
  // Loaded = DOM parsed + kid scripts executed (they're inline, so they've all
  // run by DOMContentLoaded). The shim lives in <head>, so readyState is
  // normally 'loading' here; the direct check covers late execution.
  if (document.readyState !== 'loading') { evidence.pageLoaded = true; }
  else { document.addEventListener('DOMContentLoaded', function () { evidence.pageLoaded = true; }); }
  function recordApi(method, path, status) {
    if (evidence.api.length < 30) {
      evidence.api.push({ method: method, path: String(path).slice(0, 120), status: status });
    }
  }

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
    var method = (init && init.method ? String(init.method) : 'GET').toUpperCase();
    if (url.slice(0, 5) !== '/api/') {
      recordApi(method, url, 0); // 0 = rejected before any response
      console.error('fetch("' + url + '") was blocked — the sandbox blocks the outside internet. Your site can only fetch its own /api/... routes.');
      return Promise.reject(new TypeError('Failed to fetch: ' + url));
    }
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
        recordApi(method, path, 404);
        console.error('No route answered ' + method + ' ' + path + " — add app." + method.toLowerCase() + "('" + path + "', (req, res) => { ... }) in server.js.");
        resolve(toResponse(404, { error: 'No route for ' + method + ' ' + path }));
        return;
      }
      var req = { method: method, path: path, query: query, body: body };
      var status = 200;
      var recorded = false; // ledger once per call, whichever path answers first
      var res = {
        status: function (code) { status = code; return res; },
        json: function (data) {
          if (!recorded) { recorded = true; recordApi(method, path, status); }
          resolve(toResponse(status, data));
        }
      };
      var crash = function (err) {
        if (!recorded) { recorded = true; recordApi(method, path, 500); }
        console.error('Your ' + method + ' ' + path + ' route crashed: ' + (err && err.message ? err.message : err));
        resolve(toResponse(500, { error: String(err && err.message ? err.message : err) }));
      };
      // Handlers may be ASYNC (they await db.query) — the fetch settles only
      // when res.json fires (possibly after awaits), and a rejected handler
      // promise answers 500 with the real ledger status, same as a sync throw.
      try {
        var out = handler(req, res);
        if (out && typeof out.then === 'function') { out.then(null, crash); }
      }
      catch (err) { crash(err); }
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
    parent.postMessage({ __airbotixSiteNavigate: true, path: clean }, '*');
  }, true);

  // ── CSP violations → a kid-readable console line ───────────────────────────
  // The deny-by-default CSP silently drops blocked subresources: without this a
  // kid sees a broken picture and an EMPTY console (violations don't surface as
  // console errors the capture shim can see). Content-free on purpose — the
  // blocked directive only, never the URL (it can carry page data / PII).
  var CSP_HINTS = {
    'img-src': 'Pictures from the internet are blocked — import the picture into your project instead, then use its file name.',
    'media-src': 'Sound and video from the internet are blocked — import the file into your project, then use its file name.',
    'font-src': 'Fonts from the internet are blocked — use a normal system font in your CSS instead.',
    'script-src': 'Loading code from the internet is blocked — put your code in a .js file in your project instead.',
    'style-src': 'Loading styles from the internet is blocked — put your styles in style.css instead.',
    'connect-src': 'Your site can only talk to its OWN backend with fetch("/api/..."). The outside internet is blocked.',
    'frame-src': 'Putting another website inside your page is blocked.',
    'default-src': 'That came from the internet, which is blocked here — keep everything inside your project.'
  };
  window.addEventListener('securitypolicyviolation', function (e) {
    try {
      var directive = String((e && (e.effectiveDirective || e.violatedDirective)) || 'default-src').split(' ')[0];
      console.error(CSP_HINTS[directive] || CSP_HINTS['default-src']);
    } catch (err) {}
  });

  // ── report: the studio's run probe (D-WEB-13) ──────────────────────────────
  // Replies with the evidence ledgers + the VISIBLE interactive elements
  // cross-checked against the listener ledger. Selector: #id when the element
  // has one, else tag.firstClass best-effort. With no ledger (no WeakSet) we
  // never guess AGAINST the kid: everything reports wired.
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.__airbotixControl !== true || m.action !== 'report') return;
    var buttons = [];
    try {
      var els = document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
      for (var bi = 0; bi < els.length && buttons.length < 30; bi++) {
        var el = els[bi];
        if (!el.getClientRects || el.getClientRects().length === 0) continue; // hidden
        var sel = el.id
          ? '#' + el.id
          : el.tagName.toLowerCase() + (el.classList && el.classList.length > 0 ? '.' + el.classList[0] : '');
        var isWired = evidence.wired === null || evidence.wired.has(el) ||
          (el.form != null && evidence.wired.has(el.form)) ||
          typeof el.onclick === 'function' ||
          (el.form != null && typeof el.form.onsubmit === 'function');
        buttons.push({ selector: String(sel).slice(0, 80), wired: isWired });
      }
    } catch (err) { buttons = []; }
    parent.postMessage({ __airbotixSiteReport: true, site: {
      pageLoaded: evidence.pageLoaded,
      page: ${jsStr(page)},
      apiCalls: evidence.api,
      buttons: buttons,
      delegatedClickHandler: evidence.delegated
    } }, '*');
  });

  // ── listener ledger (D-WEB-13) — installed LAST, deliberately ──────────────
  // Only registrations made AFTER this point (i.e. by kid scripts) land in the
  // ledger. The shim's OWN document click (nav) / message listeners above must
  // never count, or delegatedClickHandler would be true for EVERY site and the
  // unwired-button evidence — the "Add task does nothing" signature — would be
  // permanently suppressed.
  try {
    var addListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      try {
        if (type === 'click' || type === 'pointerdown' || type === 'submit') {
          if (type === 'click' && (this === document || (document.body != null && this === document.body))) {
            evidence.delegated = true;
          }
          if (evidence.wired !== null && this instanceof Element) evidence.wired.add(this);
        }
      } catch (err) {}
      return addListener.call(this, type, listener, options);
    };
  } catch (e) {}
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
    // A literal `</script>` in kid text is escaped (same line count) so it
    // can't truncate the tag and corrupt every scriptRange after it.
    const content = escapeScriptText(inlineAssetRefs(f.content, assets));
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
    return `<style>${escapeStyleText(inlineAssetRefs(file.content, assets))}</style>`;
  });

  // NOTE (D-WEB-15): `data/*.json` files never enter the frame — they are the
  // SEEDS the backend rebuilds the server-side db from (`POST …/db/reset`).
  // The shim's `db.query` reaches that db over the sql postMessage channel.

  // ── STUDIO-OWNED SKELETON (security-load-bearing — never locate the
  // injection point by matching markup in the UNTRUSTED page). The kid page is
  // parsed with DOMParser (no execution, malformed markup repaired) and its
  // head children + body are lifted in AFTER the shims — so a `<head>` hidden
  // in a comment / string literal / attribute can never displace the fetch
  // shim or the CSP (the fences the backend's website fetch( allowance rests
  // on). A DOMParser failure degrades to raw page content in the body — still
  // strictly AFTER every shim byte.
  let kidHead = '';
  let kidBody = html;
  let kidBodyAttrs = '';
  // `<html>` attributes are carried too: every backend template ships
  // `<html lang="en">`, and an AI-written `<html class="dark">` pairs with
  // `html.dark {…}` CSS — dropping them renders the preview differently from
  // what the kid reads in the editor.
  let kidHtmlAttrs = '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    kidHead = doc.head.innerHTML;
    kidBody = doc.body.innerHTML;
    kidBodyAttrs = serializeAttrs(doc.body);
    kidHtmlAttrs = serializeAttrs(doc.documentElement);
  } catch {
    // keep the raw-content fallback above
  }

  const srcDoc = [
    '<!doctype html>',
    `<html${kidHtmlAttrs}><head><meta charset="utf-8">`,
    EXTENSION_NOISE_GUARD,
    CONSOLE_CAPTURE,
    siteRuntime(pageFile.path),
    CSP_META,
    // server.js — the FIRST kid script, before anything the page brought along
    // (even an inline script the kid page put in its own head).
    ...(serverTag ? [serverTag] : []),
    kidHead,
    '</head>',
    `<body${kidBodyAttrs}>`,
    kidBody,
    '</body></html>',
  ].join('\n');

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
