// @vitest-environment jsdom
//
// The site runtime shim's SQL CHANNEL (creative-code-studio-website-prd
// D-WEB-15): the in-frame `db.query` that reaches the project's REAL
// server-side SQLite db through the parent studio. This test EXECUTES the
// exact injected shim (same technique as buildSitePreview.runReport.test.ts)
// and asserts:
//   - db.query posts `{__airbotixSiteControl, action:'sql', id, sql, params}`
//     to the parent, accepting params spread OR as a single array;
//   - the reply resolves per the FROZEN return shape: a reader statement
//     (columns present) → the ROWS ARRAY; a write (no columns) →
//     `{changes, lastInsertRowid}`;
//   - an error reply console.errors the backend's kid-readable message
//     VERBATIM (the D-WEB-13 logs ledger) and rejects with it;
//   - no reply for 10 s → a kid-readable timeout rejection;
//   - the old `read-db` control channel is GONE (no `__airbotixSiteDb` reply);
//   - ASYNC route handlers are awaited: res.json after an await still answers
//     the fetch and the /api ledger records the FINAL status; a rejected
//     handler answers 500 exactly like a sync throw.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { buildSitePreview, SITE_SQL_TIMEOUT_MS } from './buildSitePreview';

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

interface Registered {
  target: EventTarget;
  type: string;
  fn: EventListenerOrEventListenerObject;
  opts?: boolean | AddEventListenerOptions;
}

// Everything the shim touches in the jsdom global, saved/restored per test so
// one run never leaks into the next (fetch, the prototype wrap, listeners).
let restoreFns: Array<() => void> = [];

/** Wrap a target's `addEventListener` with an OWN-property recorder (jsdom's
 *  window carries addEventListener as an own function, which a prototype-level
 *  recorder never sees). Returns a restore fn. */
function recordListeners(target: EventTarget, registered: Registered[]): () => void {
  const t = target as unknown as Record<'addEventListener', EventTarget['addEventListener']>;
  const hadOwn = Object.prototype.hasOwnProperty.call(target, 'addEventListener');
  const orig = t.addEventListener;
  t.addEventListener = function (type, fn, opts) {
    if (fn) registered.push({ target, type, fn, opts });
    return hadOwn
      ? orig.call(target, type, fn, opts)
      : EventTarget.prototype.addEventListener.call(target, type, fn, opts);
  } as EventTarget['addEventListener'];
  return () => {
    if (hadOwn) t.addEventListener = orig;
    else delete (target as unknown as { addEventListener?: unknown }).addEventListener;
  };
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

interface SiteDb {
  query: (sql: string, ...params: unknown[]) => Promise<unknown>;
}
const db = (): SiteDb => (window as unknown as { db: SiteDb }).db;

type Res = { status: (c: number) => Res; json: (d: unknown) => void };
interface SiteApp {
  get: (path: string, handler: (req: unknown, res: Res) => unknown) => void;
  post: (path: string, handler: (req: unknown, res: Res) => unknown) => void;
}
const app = (): SiteApp => (window as unknown as { app: SiteApp }).app;
const kidFetch = (url: string, init?: { method?: string }): Promise<{ status: number }> =>
  (window as unknown as { fetch: (u: string, i?: unknown) => Promise<{ status: number }> }).fetch(
    url,
    init,
  );

interface SqlPost {
  __airbotixSiteControl: true;
  action: 'sql';
  id: number;
  /** The per-DOCUMENT nonce — replies must echo it or the shim drops them. */
  token: string;
  sql: string;
  params: unknown[];
}

/** Capture what the shim posts to the parent while `act` runs (jsdom: parent
 *  === window, postMessage spied — same technique as the runReport spec). */
function capturePosts(act: () => void): unknown[] {
  const posts: unknown[] = [];
  const spy = vi.spyOn(window, 'postMessage').mockImplementation((msg: unknown) => {
    posts.push(msg);
  });
  act();
  spy.mockRestore();
  return posts;
}

const sqlPostOf = (posts: unknown[]): SqlPost => {
  const post = posts.find(
    (p) => typeof p === 'object' && p !== null && (p as { action?: unknown }).action === 'sql',
  ) as SqlPost | undefined;
  expect(post).toBeDefined();
  return post!;
};

const replySql = (data: Record<string, unknown>) =>
  window.dispatchEvent(new MessageEvent('message', { data: { __airbotixSiteSql: true, ...data } }));

beforeEach(() => {
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  for (const restore of restoreFns.reverse()) restore();
  restoreFns = [];
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('site runtime — db.query request wire shape', () => {
  // These queries never get a reply — fake timers keep their 10s timeout
  // timers from firing (as console noise) after the test ends.
  beforeEach(() => vi.useFakeTimers());

  it('posts {action:"sql", id, token, sql, params} with spread params', () => {
    runShim();
    let posts: unknown[] = [];
    posts = capturePosts(() => {
      void db().query('SELECT * FROM pets WHERE id = ?', 1).catch(() => undefined);
    });
    const post = sqlPostOf(posts);
    expect(post.__airbotixSiteControl).toBe(true);
    expect(post.sql).toBe('SELECT * FROM pets WHERE id = ?');
    expect(post.params).toEqual([1]);
    expect(typeof post.id).toBe('number');
    // The per-document nonce rides every request (reply-matching key #2).
    expect(typeof post.token).toBe('string');
    expect(post.token.length).toBeGreaterThan(0);
  });

  it('accepts a single ARRAY as the params (both kid spellings work)', () => {
    runShim();
    const posts = capturePosts(() => {
      void db().query('INSERT INTO pets (name, age) VALUES (?, ?)', ['Biscuit', 3]).catch(() => undefined);
    });
    expect(sqlPostOf(posts).params).toEqual(['Biscuit', 3]);
  });

  it('each query gets its OWN id (concurrent queries can settle independently)', () => {
    runShim();
    const posts = capturePosts(() => {
      void db().query('SELECT 1').catch(() => undefined);
      void db().query('SELECT 2').catch(() => undefined);
    });
    const ids = posts.map((p) => (p as SqlPost).id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('site runtime — db.query reply → the FROZEN return shape', () => {
  it('a reader reply (columns present) resolves with the ROWS ARRAY', async () => {
    runShim();
    let promise: Promise<unknown> = Promise.resolve();
    const posts = capturePosts(() => {
      promise = db().query('SELECT * FROM pets');
    });
    const post = sqlPostOf(posts);
    replySql({
      id: post.id,
      token: post.token,
      ok: true,
      result: {
        columns: ['id', 'name'],
        rows: [{ id: 1, name: 'Biscuit' }],
        row_count: 1,
        changes: null,
        last_insert_rowid: null,
      },
    });
    await expect(promise).resolves.toEqual([{ id: 1, name: 'Biscuit' }]);
  });

  it('a write reply (no columns) resolves with {changes, lastInsertRowid}', async () => {
    runShim();
    let promise: Promise<unknown> = Promise.resolve();
    const posts = capturePosts(() => {
      promise = db().query('INSERT INTO pets (name) VALUES (?)', 'Mochi');
    });
    const post = sqlPostOf(posts);
    replySql({
      id: post.id,
      token: post.token,
      ok: true,
      result: { columns: [], rows: [], row_count: 0, changes: 1, last_insert_rowid: '4' },
    });
    await expect(promise).resolves.toEqual({ changes: 1, lastInsertRowid: '4' });
  });

  it('an error reply rejects with the backend message AND console.errors it VERBATIM', async () => {
    runShim();
    let promise: Promise<unknown> = Promise.resolve();
    const posts = capturePosts(() => {
      promise = db().query('SELEC * FROM pets');
    });
    const backendMessage = 'Your SQL has a problem near "SELEC" — did you mean SELECT?';
    const post = sqlPostOf(posts);
    replySql({ id: post.id, token: post.token, ok: false, error: backendMessage });
    await expect(promise).rejects.toThrow(backendMessage);
    // Verbatim into the console — this line feeds the D-WEB-13 logs ledger.
    expect(console.error).toHaveBeenCalledWith(backendMessage);
  });

  it('a reply with a matching id but a STALE token never settles the promise (srcdoc-swap race)', async () => {
    // A srcdoc swap keeps the WindowProxy but restarts the id counter — a late
    // reply for the PREVIOUS document must not resolve this document's query.
    runShim();
    let promise: Promise<unknown> = Promise.resolve();
    const posts = capturePosts(() => {
      promise = db().query('SELECT * FROM pets');
    });
    const post = sqlPostOf(posts);
    let settled = false;
    promise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    replySql({
      id: post.id,
      token: 'a-previous-documents-token',
      ok: true,
      result: { columns: ['id'], rows: [{ id: 99 }], row_count: 1, changes: null, last_insert_rowid: null },
    });
    await Promise.resolve(); // flush the microtask the settle would ride
    await Promise.resolve();
    expect(settled).toBe(false);

    // The RIGHT token still resolves it — the query wasn't torn down, just guarded.
    replySql({
      id: post.id,
      token: post.token,
      ok: true,
      result: { columns: ['id'], rows: [{ id: 1 }], row_count: 1, changes: null, last_insert_rowid: null },
    });
    await expect(promise).resolves.toEqual([{ id: 1 }]);
  });

  it('no reply within 10s rejects kid-readably (a wedged studio never hangs a route)', async () => {
    vi.useFakeTimers();
    runShim();
    let promise: Promise<unknown> = Promise.resolve();
    capturePosts(() => {
      promise = db().query('SELECT * FROM pets');
    });
    const expectation = expect(promise).rejects.toThrow(/took too long/);
    vi.advanceTimersByTime(SITE_SQL_TIMEOUT_MS);
    await expectation;
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('took too long'));
  });

  it('a reply for an unknown/settled id is ignored (timeout already answered)', async () => {
    vi.useFakeTimers();
    runShim();
    let promise: Promise<unknown> = Promise.resolve();
    const posts = capturePosts(() => {
      promise = db().query('SELECT 1');
    });
    const expectation = expect(promise).rejects.toThrow(/took too long/);
    vi.advanceTimersByTime(SITE_SQL_TIMEOUT_MS);
    await expectation;
    // A late reply — even with the RIGHT token — must not throw or resurrect
    // the settled promise.
    const post = sqlPostOf(posts);
    expect(() =>
      replySql({
        id: post.id,
        token: post.token,
        ok: true,
        result: { columns: ['x'], rows: [], row_count: 0, changes: null, last_insert_rowid: null },
      }),
    ).not.toThrow();
  });
});

describe('site runtime — the read-db channel is RETIRED (D-WEB-15)', () => {
  it('a read-db control request gets NO __airbotixSiteDb reply', () => {
    runShim();
    const posts = capturePosts(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { __airbotixSiteControl: true, action: 'read-db' } }),
      );
    });
    expect(
      posts.some((p) => typeof p === 'object' && p !== null && '__airbotixSiteDb' in p),
    ).toBe(false);
  });
});

describe('site runtime — ASYNC route handlers are awaited', () => {
  it('res.json after an await answers the fetch; the ledger records the final status', async () => {
    runShim();
    app().get('/api/pets', async (_req, res) => {
      await Promise.resolve(); // e.g. await db.query(...)
      res.status(201).json([{ id: 1 }]);
    });

    const response = await kidFetch('/api/pets');
    expect(response.status).toBe(201);

    const posts = capturePosts(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { __airbotixControl: true, action: 'report' } }),
      );
    });
    const report = posts.find(
      (p) => typeof p === 'object' && p !== null && '__airbotixSiteReport' in p,
    ) as unknown as { site: { apiCalls: unknown[] } };
    expect(report.site.apiCalls).toEqual([{ method: 'GET', path: '/api/pets', status: 201 }]);
  });

  it('a REJECTED async handler answers 500 with a kid-readable crash line (like a sync throw)', async () => {
    runShim();
    app().get('/api/boom', async () => {
      await Promise.resolve();
      throw new Error('pets is not defined');
    });

    const response = await kidFetch('/api/boom');
    expect(response.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Your GET /api/boom route crashed: pets is not defined'),
    );
  });
});
