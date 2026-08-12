// @vitest-environment jsdom
// SiteFrame — the Website Studio's sandboxed site host (creative-code-studio-
// website-prd). Asserts the strict sandbox + the load-bearing harness selectors
// (`iframe[data-site-frame]`, `site-nav-home`, `site-nav-page`), the nav-shim
// message flow (page switch — nothing rides along, the db is server-side per
// D-WEB-15), the SQL PROXY (in-frame db.query → POST /projects/:id/db/query
// with the kid's session → reply by id), the runKey reset (fresh page load,
// console cleared — the db persists), and the console panel.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { VfsFile } from '../code/codeApi';
import type { RunReport } from './runReport';
import { SiteFrame } from './SiteFrame';

const { querySiteDbMock } = vi.hoisted(() => ({ querySiteDbMock: vi.fn() }));
vi.mock('./panes/playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./panes/playgroundApi')>();
  return { ...actual, querySiteDb: querySiteDbMock };
});

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const SITE: VfsFile[] = [
  text(
    'index.html',
    '<!doctype html>\n<html>\n<head></head>\n<body><h1>Home</h1><a href="about.html">About</a></body>\n</html>',
  ),
  text('about.html', '<!doctype html>\n<html>\n<head></head>\n<body><h2>About</h2></body>\n</html>'),
  text('server.js', "app.get('/api/pets', async (req, res) => res.json(await db.query('SELECT * FROM pets')));"),
  text('data/pets.json', '[{"id":1}]'),
];

const QUERY_RESULT = {
  columns: ['id'],
  rows: [{ id: 1 }],
  row_count: 1,
  changes: null,
  last_insert_rowid: null,
};

const frame = () => document.querySelector('iframe[data-site-frame]') as HTMLIFrameElement;
const srcdoc = () => frame().getAttribute('srcdoc') ?? '';

/** Fire a message as the in-frame shims would (jsdom posts have a null source,
 *  which the frame's own-source guard deliberately admits — same as GameFrame). */
const post = (data: unknown) => fireEvent(window, new MessageEvent('message', { data }));

/** The shim's per-document nonce, echoed by every reply (srcdoc-swap guard). */
const TOKEN = 'doc-token-a';

const sqlRequest = (id: number, sql = 'SELECT * FROM pets', params: unknown[] = []) => ({
  __airbotixSiteControl: true,
  action: 'sql',
  id,
  token: TOKEN,
  sql,
  params,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SiteFrame', () => {
  it('renders the strict sandboxed iframe with the load-bearing selectors', () => {
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    const el = frame();
    expect(el).toBeInTheDocument();
    // allow-scripts ONLY — never allow-same-origin / forms / top-navigation.
    expect(el).toHaveAttribute('sandbox', 'allow-scripts');
    expect(el).toHaveAttribute('title', 'Site');
    expect(srcdoc()).toContain('<h1>Home</h1>');
    expect(screen.getByTestId('site-nav-home')).toBeInTheDocument();
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
  });

  it('a __airbotixSiteNavigate message switches the page (no state rides along)', () => {
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);

    post({ __airbotixSiteNavigate: true, path: 'about.html' });

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');
    expect(srcdoc()).toContain('<h2>About</h2>');
  });

  it('navigating to a page that no longer exists falls back to index.html', () => {
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'ghost.html' });
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('<h1>Home</h1>');
  });

  it('Home just renders the home page — no frame round-trip (the db is server-side)', () => {
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'about.html' });
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    fireEvent.click(screen.getByTestId('site-nav-home'));

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('<h1>Home</h1>');
    expect(postSpy).not.toHaveBeenCalled(); // the read-db round-trip is retired
  });

  it('a runKey bump reloads to the home page with a cleared console', () => {
    const onConsoleCount = vi.fn();
    const { rerender } = render(
      <SiteFrame files={SITE} projectId="p1" runKey={1} onConsoleCount={onConsoleCount} />,
    );
    post({ __airbotixSiteNavigate: true, path: 'about.html' });
    post({ __airbotixConsole: true, level: 'log', text: 'hello' });
    expect(onConsoleCount).toHaveBeenLastCalledWith(1);

    rerender(<SiteFrame files={SITE} projectId="p1" runKey={2} onConsoleCount={onConsoleCount} />);

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(onConsoleCount).toHaveBeenLastCalledWith(0);
  });

  it('renders captured console lines in the panel and wires "Fix this error"', () => {
    const onFixError = vi.fn();
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} showConsole onFixError={onFixError} />);

    post({ __airbotixConsole: true, level: 'error', text: 'db.pets is undefined' });

    expect(screen.getByText(/db\.pets is undefined/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /fix this error/i }));
    expect(onFixError).toHaveBeenCalledWith('db.pets is undefined');
  });

  it('reports console lines up through onConsole/onConsoleCount (pane wiring)', () => {
    const onConsole = vi.fn();
    const onConsoleCount = vi.fn();
    render(
      <SiteFrame files={SITE} projectId="p1" runKey={1} onConsole={onConsole} onConsoleCount={onConsoleCount} />,
    );
    post({ __airbotixConsole: true, level: 'info', text: 'ready' });
    expect(onConsoleCount).toHaveBeenLastCalledWith(1);
    expect(onConsole).toHaveBeenLastCalledWith([
      expect.objectContaining({ level: 'info', text: 'ready' }),
    ]);
  });
});

// The SQL proxy (creative-code-studio-website-prd D-WEB-15): SiteFrame is the
// frame's token-holding proxy — each in-frame db.query arrives as an
// `action:'sql'` postMessage, goes to the backend with the kid's session, and
// the reply is posted back INTO the frame by request id. The frame never sees
// a token; the studio never trusts a foreign frame.
describe('SiteFrame — the sql proxy (D-WEB-15)', () => {
  it('forwards a sql request to querySiteDb and posts the ok reply back echoing id + token', async () => {
    querySiteDbMock.mockResolvedValue(QUERY_RESULT);
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sqlRequest(7, 'SELECT * FROM pets WHERE id = ?', [1]));

    expect(querySiteDbMock).toHaveBeenCalledWith('p1', 'SELECT * FROM pets WHERE id = ?', [1]);
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        { __airbotixSiteSql: true, id: 7, token: TOKEN, ok: true, result: QUERY_RESULT },
        '*',
      ),
    );
  });

  it('a backend SQL error (400 DB_QUERY_ERROR) replies ok:false with the kid-readable message', async () => {
    const backendMessage = 'There is no table called "petz" — did you mean "pets"?';
    querySiteDbMock.mockRejectedValue(new ApiError(400, 'DB_QUERY_ERROR', backendMessage));
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sqlRequest(3));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        { __airbotixSiteSql: true, id: 3, token: TOKEN, ok: false, error: backendMessage },
        '*',
      ),
    );
  });

  it('a non-API failure (network) replies with a calm fallback message', async () => {
    querySiteDbMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sqlRequest(4));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        {
          __airbotixSiteSql: true,
          id: 4,
          token: TOKEN,
          ok: false,
          error: 'Your database could not be reached — try again in a moment.',
        },
        '*',
      ),
    );
  });

  it('without a projectId (project-less session) it replies kid-readably, never calls the backend', async () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sqlRequest(5));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({ __airbotixSiteSql: true, id: 5, ok: false }),
        '*',
      ),
    );
    expect(querySiteDbMock).not.toHaveBeenCalled();
  });

  it('a sql request from ANOTHER window is rejected (own-source guard)', () => {
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    // A real cross-frame message carries a source window ≠ this frame's.
    fireEvent(
      window,
      new MessageEvent('message', { data: sqlRequest(9), source: window }),
    );
    expect(querySiteDbMock).not.toHaveBeenCalled();
  });

  it('a non-ARRAY params field clamps to [] (forged wire data, the frame is untrusted)', async () => {
    querySiteDbMock.mockResolvedValue(QUERY_RESULT);
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);

    post({ ...sqlRequest(6), params: 'DROP TABLE pets' });

    await waitFor(() =>
      expect(querySiteDbMock).toHaveBeenCalledWith('p1', 'SELECT * FROM pets', []),
    );
  });

  it('a non-bindable param ELEMENT (object/Date) is rejected kid-readably, never reaches the backend', async () => {
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sqlRequest(8, 'INSERT INTO pets (born) VALUES (?)', [{ when: 'yesterday' }]));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        {
          __airbotixSiteSql: true,
          id: 8,
          token: TOKEN,
          ok: false,
          error: 'db.query params must be words, numbers, true/false or null.',
        },
        '*',
      ),
    );
    expect(querySiteDbMock).not.toHaveBeenCalled();
  });

  it('caps in-flight forwards: past 8 pending, extra queries fail locally (no authed POST spray)', async () => {
    querySiteDbMock.mockReturnValue(new Promise(() => undefined)); // never settles
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    for (let id = 1; id <= 9; id += 1) post(sqlRequest(id));

    // The 9th is answered immediately with the local backpressure error…
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          __airbotixSiteSql: true,
          id: 9,
          token: TOKEN,
          ok: false,
          error: expect.stringContaining('Too many database queries at once'),
        }),
        '*',
      ),
    );
    // …and only the first 8 ever reached the backend.
    expect(querySiteDbMock).toHaveBeenCalledTimes(8);
  });
});

// Website run verification (creative-code-studio-website-prd D-WEB-13): when
// armed (onRunReport), each RUN (runKey) is observed for RUN_OBSERVE_MS, the
// in-frame shim is asked to report over the game control channel, and ONE
// finalized website RunReport is emitted — console evidence + the shim's site
// ledgers, or `probeError: 'no-response'` when the shim never answers.
describe('SiteFrame — run reports (D-WEB-13)', () => {
  const SHIM_SITE = {
    pageLoaded: true,
    page: 'index.html',
    apiCalls: [{ method: 'GET', path: '/api/pets', status: 500 }],
    buttons: [{ selector: '#add-task', wired: false }],
    delegatedClickHandler: false,
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks the shim to report after the observation window, emits ONCE with site + console evidence', () => {
    const reports: RunReport[] = [];
    render(
      <SiteFrame files={SITE} projectId="p1" runKey={1} reportAttempt={2} onRunReport={(r) => reports.push(r)} />,
    );
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post({ __airbotixConsole: true, level: 'error', text: 'TypeError: boom' });
    post({ __airbotixConsole: true, level: 'log', text: 'step 1: handler entered' });
    act(() => vi.advanceTimersByTime(4000)); // RUN_OBSERVE_MS → probe request
    expect(postSpy).toHaveBeenCalledWith({ __airbotixControl: true, action: 'report' }, '*');

    post({ __airbotixSiteReport: true, site: SHIM_SITE });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      reportVersion: 1,
      attempt: 2,
      engine: 'website',
      booted: true,
      framesAdvanced: 0,
      fps: 0,
      assets: [],
      canvas: { present: false, nonBlank: null, sampled: 0 },
      consoleErrors: ['TypeError: boom'],
      site: { ...SHIM_SITE, logs: ['step 1: handler entered'] },
    });
    expect(reports[0].probeError).toBeUndefined();

    // A duplicate reply and the stale no-response timer never re-emit.
    post({ __airbotixSiteReport: true, site: SHIM_SITE });
    act(() => vi.advanceTimersByTime(10_000));
    expect(reports).toHaveLength(1);
  });

  it('no shim reply → probeError no-response and NO site field (inconclusive, never "broken")', () => {
    const reports: RunReport[] = [];
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} onRunReport={(r) => reports.push(r)} />);
    act(() => vi.advanceTimersByTime(4000 + 1500)); // observe + reply timeout
    expect(reports).toHaveLength(1);
    expect(reports[0].probeError).toBe('no-response');
    expect('site' in reports[0]).toBe(false);
    expect(reports[0].booted).toBe(false);
  });

  it('a runKey bump (fresh run) starts a fresh collector at the new attempt', () => {
    const reports: RunReport[] = [];
    const { rerender } = render(
      <SiteFrame files={SITE} projectId="p1" runKey={1} onRunReport={(r) => reports.push(r)} />,
    );
    post({ __airbotixConsole: true, level: 'error', text: 'old-run error' });
    act(() => vi.advanceTimersByTime(4000 + 1500));
    expect(reports).toHaveLength(1);

    rerender(
      <SiteFrame files={SITE} projectId="p1" runKey={2} reportAttempt={2} onRunReport={(r) => reports.push(r)} />,
    );
    act(() => vi.advanceTimersByTime(4000));
    post({ __airbotixSiteReport: true, site: SHIM_SITE });
    expect(reports).toHaveLength(2);
    expect(reports[1].attempt).toBe(2);
    expect(reports[1].consoleErrors).toEqual([]); // not carried over from run 1
  });

  it('collects nothing when onRunReport is not set (no probe request goes out)', () => {
    render(<SiteFrame files={SITE} projectId="p1" runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');
    act(() => vi.advanceTimersByTime(10_000));
    expect(postSpy).not.toHaveBeenCalled();
  });
});
