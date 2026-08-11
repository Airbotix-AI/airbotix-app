// @vitest-environment jsdom
//
// The site runtime shim's RUN-REPORT instrumentation (creative-code-studio-
// website-prd D-WEB-13): the evidence ledgers behind the website verification
// loop. This test EXECUTES the exact injected shim (same technique as
// buildGamePreview.audioControl.test.ts) and asserts:
//   - the /api ledger records the REAL status per call: 200 for a served
//     route, 404 for no-route, 500 for a throwing handler, 0 for a blocked
//     (non-/api) URL rejected before any response;
//   - the addEventListener ledger marks buttons `wired` only when kid code
//     attached a click/pointerdown/submit listener (or delegation exists), and
//     the SHIM'S OWN document click (nav) listener never counts as delegation —
//     that false positive would suppress the unwired-button evidence for
//     EVERY site (the "Add task does nothing" doom-loop signature);
//   - the `{__airbotixControl, action:'report'}` request (the same control
//     channel the game probe uses) replies `{__airbotixSiteReport, site}` with
//     pageLoaded, the current page, the ledgers and the visible buttons.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { buildSitePreview } from './buildSitePreview';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const SITE: VfsFile[] = [
  text('index.html', '<!doctype html><html><head></head><body><h1>Hi</h1></body></html>'),
  text('server.js', '// routes registered by the test'),
];

/** Pull the site runtime shim's inner JS straight out of the built srcDoc. */
function siteRuntimeSource(files: VfsFile[] = SITE): string {
  const doc = buildSitePreview(files).srcDoc;
  const marker = doc.indexOf('window.app = {');
  const open = doc.lastIndexOf('<script>', marker) + '<script>'.length;
  const close = doc.indexOf('</script>', marker);
  return doc.slice(open, close);
}

type SiteApp = {
  get: (path: string, handler: (req: unknown, res: { status: (c: number) => unknown; json: (d: unknown) => void }) => void) => void;
  post: (path: string, handler: (req: unknown, res: { status: (c: number) => unknown; json: (d: unknown) => void }) => void) => void;
};

// Everything the shim touches in the jsdom global, saved/restored per test so
// one run never leaks into the next (fetch, the prototype wrap, listeners).
let restoreFns: Array<() => void> = [];

/** Wrap a target's `addEventListener` with an OWN-property recorder (jsdom's
 *  window carries addEventListener as an own function, which a prototype-level
 *  recorder never sees). Returns a restore fn. */
function recordListeners(
  target: EventTarget,
  registered: Registered[],
): () => void {
  const t = target as unknown as Record<'addEventListener', EventTarget['addEventListener']>;
  const hadOwn = Object.prototype.hasOwnProperty.call(target, 'addEventListener');
  const orig = t.addEventListener;
  t.addEventListener = function (type, fn, opts) {
    if (fn) registered.push({ target, type, fn, opts });
    // jsdom's window carries a brand-checked OWN addEventListener — delegate to
    // that. For document (prototype-inherited), resolve the prototype impl AT
    // CALL TIME so the shim's listener-ledger wrap (installed on the prototype
    // after this recorder) still sees kid registrations on document.
    return hadOwn
      ? orig.call(target, type, fn, opts)
      : EventTarget.prototype.addEventListener.call(target, type, fn, opts);
  } as EventTarget['addEventListener'];
  return () => {
    if (hadOwn) t.addEventListener = orig;
    else delete (target as unknown as { addEventListener?: unknown }).addEventListener;
  };
}

interface Registered {
  target: EventTarget;
  type: string;
  fn: EventListenerOrEventListenerObject;
  opts?: boolean | AddEventListenerOptions;
}

/** Execute the shim in the jsdom global scope, tracking every listener it (or
 *  the test's simulated kid code) registers so cleanup can remove them all. */
function runShim(files: VfsFile[] = SITE): void {
  const registered: Registered[] = [];
  const origProtoAdd = EventTarget.prototype.addEventListener;
  const recorder: typeof origProtoAdd = function (this: EventTarget, type, fn, opts) {
    if (fn) registered.push({ target: this, type, fn, opts });
    return origProtoAdd.call(this, type, fn, opts);
  };
  EventTarget.prototype.addEventListener = recorder;
  const restoreWindow = recordListeners(window, registered);
  const restoreDocument = recordListeners(document, registered);
  const hadFetch = Object.prototype.hasOwnProperty.call(window, 'fetch');
  const origFetch = (window as unknown as { fetch?: unknown }).fetch;
  restoreFns.push(() => {
    // Restore the wraps FIRST (the instance removeEventListener must not run
    // through a stale wrap), then unhook every recorded listener — with the
    // same capture flag it registered with, or removal silently misses.
    restoreDocument();
    restoreWindow();
    EventTarget.prototype.addEventListener = origProtoAdd;
    for (const r of registered) r.target.removeEventListener(r.type, r.fn, r.opts);
    if (hadFetch) (window as unknown as { fetch?: unknown }).fetch = origFetch;
    else delete (window as unknown as { fetch?: unknown }).fetch;
    delete (window as unknown as { app?: unknown }).app;
    delete (window as unknown as { db?: unknown }).db;
  });
  new Function(siteRuntimeSource(files))();
}

const app = (): SiteApp => (window as unknown as { app: SiteApp }).app;
const kidFetch = (url: string, init?: { method?: string }): Promise<{ status: number }> =>
  (window as unknown as { fetch: (u: string, i?: unknown) => Promise<{ status: number }> }).fetch(url, init);

interface SiteReply {
  __airbotixSiteReport: true;
  site: {
    pageLoaded: boolean;
    page: string;
    apiCalls: Array<{ method: string; path: string; status: number }>;
    buttons: Array<{ selector: string; wired: boolean }>;
    delegatedClickHandler: boolean;
  };
}

/** Ask the shim for its report (the studio's probe request) and return the
 *  reply it posts to the parent (jsdom: parent === window, postMessage spied). */
function requestReport(): SiteReply['site'] {
  const posts: unknown[] = [];
  const spy = vi.spyOn(window, 'postMessage').mockImplementation((msg: unknown) => {
    posts.push(msg);
  });
  window.dispatchEvent(
    new MessageEvent('message', { data: { __airbotixControl: true, action: 'report' } }),
  );
  spy.mockRestore();
  const reply = posts.find(
    (p) => typeof p === 'object' && p !== null && '__airbotixSiteReport' in p,
  ) as SiteReply | undefined;
  expect(reply).toBeDefined();
  return reply!.site;
}

beforeEach(() => {
  document.body.innerHTML = '';
  // jsdom does no layout: getClientRects() is always empty, which the shim's
  // visibility filter reads as "hidden". Give every element one rect so the
  // real-browser check passes here; the hidden case overrides per element.
  restoreFns.push(
    (() => {
      const orig = Element.prototype.getClientRects;
      Element.prototype.getClientRects = function () {
        return [{}] as unknown as DOMRectList;
      };
      return () => {
        Element.prototype.getClientRects = orig;
      };
    })(),
  );
  // The shim console.errors for blocked/404/500 calls — expected noise here.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  for (const restore of restoreFns.reverse()) restore();
  restoreFns = [];
  vi.restoreAllMocks();
});

describe('site runtime — /api call ledger (status per call)', () => {
  it('records 200 (served), 404 (no route), 500 (throwing handler) and 0 (blocked URL)', async () => {
    runShim();
    app().get('/api/pets', (_req, res) => res.json([1]));
    app().get('/api/boom', () => {
      throw new Error('nope');
    });

    await kidFetch('/api/pets');
    await kidFetch('/api/ghost');
    await kidFetch('/api/boom');
    await kidFetch('https://evil.example/x').catch(() => undefined);

    expect(requestReport().apiCalls).toEqual([
      { method: 'GET', path: '/api/pets', status: 200 },
      { method: 'GET', path: '/api/ghost', status: 404 },
      { method: 'GET', path: '/api/boom', status: 500 },
      { method: 'GET', path: 'https://evil.example/x', status: 0 },
    ]);
  });

  it('records the handler-set status (res.status), the method, and strips the query', async () => {
    runShim();
    app().post('/api/tasks', (_req, res) => {
      (res.status(201) as { json: (d: unknown) => void }).json({ ok: true });
    });
    app().get('/api/tasks', (_req, res) => res.json([]));

    await kidFetch('/api/tasks', { method: 'POST' });
    await kidFetch('/api/tasks?done=1');

    expect(requestReport().apiCalls).toEqual([
      { method: 'POST', path: '/api/tasks', status: 201 },
      { method: 'GET', path: '/api/tasks', status: 200 },
    ]);
  });
});

describe('site runtime — button wiring ledger + delegation', () => {
  it('marks a button wired ONLY when kid code attached a listener; the report carries both', () => {
    runShim();
    document.body.innerHTML =
      '<button id="add-task">Add</button><button id="dead">Dead</button>';
    document.getElementById('add-task')!.addEventListener('click', () => undefined);

    const site = requestReport();
    expect(site.buttons).toEqual([
      { selector: '#add-task', wired: true },
      { selector: '#dead', wired: false },
    ]);
    // The shim's OWN capture-phase nav listener on document must NOT read as
    // delegation — that would suppress unwired-button evidence for every site.
    expect(site.delegatedClickHandler).toBe(false);
  });

  it('a submit listener on the form wires its submit button; selectors fall back to tag.class', () => {
    runShim();
    document.body.innerHTML =
      '<form id="f"><input type="submit" value="Go"></form><button class="save primary">Save</button>';
    document.getElementById('f')!.addEventListener('submit', () => undefined);

    expect(requestReport().buttons).toEqual([
      { selector: 'input', wired: true },
      { selector: 'button.save', wired: false },
    ]);
  });

  it('a kid click listener on document reads as delegation; hidden buttons are skipped', () => {
    runShim();
    document.body.innerHTML = '<button id="hidden-one">x</button><button id="shown">y</button>';
    const hidden = document.getElementById('hidden-one')!;
    hidden.getClientRects = () => [] as unknown as DOMRectList; // hidden: no boxes
    document.addEventListener('click', () => undefined);

    const site = requestReport();
    expect(site.delegatedClickHandler).toBe(true);
    expect(site.buttons).toEqual([{ selector: '#shown', wired: false }]);
  });
});

describe('site runtime — report request → reply', () => {
  it('replies {__airbotixSiteReport, site} with pageLoaded + the current page', () => {
    runShim();
    // jsdom's document is fully parsed here (readyState complete) — the shim's
    // direct readyState check must read that as loaded.
    const site = requestReport();
    expect(site.pageLoaded).toBe(true);
    expect(site.page).toBe('index.html');
    expect(Object.keys(site).sort()).toEqual([
      'apiCalls',
      'buttons',
      'delegatedClickHandler',
      'page',
      'pageLoaded',
    ]);
  });

  it('other control actions and foreign messages are ignored (no reply)', () => {
    runShim();
    const posts: unknown[] = [];
    const spy = vi.spyOn(window, 'postMessage').mockImplementation((msg: unknown) => {
      posts.push(msg);
    });
    window.dispatchEvent(
      new MessageEvent('message', { data: { __airbotixControl: true, action: 'pause' } }),
    );
    window.dispatchEvent(new MessageEvent('message', { data: { action: 'report' } }));
    spy.mockRestore();
    expect(posts.some((p) => typeof p === 'object' && p !== null && '__airbotixSiteReport' in p)).toBe(
      false,
    );
  });
});
