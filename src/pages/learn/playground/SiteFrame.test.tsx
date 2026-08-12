// @vitest-environment jsdom
// SiteFrame — the Website Studio's sandboxed site host (creative-code-studio-
// website-prd). Asserts the strict sandbox + the load-bearing harness selectors
// (`iframe[data-site-frame]`, `site-nav-home`, `site-nav-page`), the nav-shim
// message flow (page switch carrying db state), Home preserving db, the runKey
// reset (db back to seeds, home page), and the console panel.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import type { RunReport } from './runReport';
import { SiteFrame } from './SiteFrame';
import { useSiteDbStore } from './siteDbStore';

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
  text('server.js', "app.get('/api/pets', (req, res) => res.json(db.pets));"),
  text('data/pets.json', '[{"id":1}]'),
];

const frame = () => document.querySelector('iframe[data-site-frame]') as HTMLIFrameElement;
const srcdoc = () => frame().getAttribute('srcdoc') ?? '';

/** Fire a message as the in-frame shims would (jsdom posts have a null source,
 *  which the frame's own-source guard deliberately admits — same as GameFrame). */
const post = (data: unknown) => fireEvent(window, new MessageEvent('message', { data }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SiteFrame', () => {
  it('renders the strict sandboxed iframe with the load-bearing selectors', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    const el = frame();
    expect(el).toBeInTheDocument();
    // allow-scripts ONLY — never allow-same-origin / forms / top-navigation.
    expect(el).toHaveAttribute('sandbox', 'allow-scripts');
    expect(el).toHaveAttribute('title', 'Site');
    expect(srcdoc()).toContain('<h1>Home</h1>');
    expect(screen.getByTestId('site-nav-home')).toBeInTheDocument();
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
  });

  it('a __airbotixSiteNavigate message switches the page and carries the db through', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    expect(srcdoc()).toContain('var carried = null');

    post({ __airbotixSiteNavigate: true, path: 'about.html', db: { pets: [{ id: 1, adopted: true }] } });

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');
    expect(srcdoc()).toContain('<h2>About</h2>');
    // The carried db is embedded into the new page's runtime — the site
    // "remembers" across the navigation.
    expect(srcdoc()).toContain('var carried = {"pets":[{"id":1,"adopted":true}]}');
  });

  it('navigating to a page that no longer exists falls back to index.html', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'ghost.html', db: null });
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('<h1>Home</h1>');
  });

  it('Home reads the LIVE db from the frame (read-db reply), so post-click mutations survive', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'about.html', db: { pets: [] } });
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    fireEvent.click(screen.getByTestId('site-nav-home'));
    // The button asks the frame for its live db before rebuilding…
    expect(postSpy).toHaveBeenCalledWith({ __airbotixSiteControl: true, action: 'read-db' }, '*');
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html'); // not yet

    // …and navigates with the reply — FRESHER than the last-carried db, so
    // mutations made since the last link click are not lost.
    post({ __airbotixSiteDb: true, db: { pets: [{ id: 1, adopted: true }] } });

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('<h1>Home</h1>');
    // db is NOT reset by Home — only a restart (runKey) resets it.
    expect(srcdoc()).toContain('var carried = {"pets":[{"id":1,"adopted":true}]}');
  });

  it('Home falls back to the last-carried db when the frame never answers (timeout)', () => {
    vi.useFakeTimers();
    try {
      render(<SiteFrame files={SITE} runKey={1} />);
      fireEvent(
        window,
        new MessageEvent('message', {
          data: { __airbotixSiteNavigate: true, path: 'about.html', db: { pets: [{ id: 3 }] } },
        }),
      );
      fireEvent.click(screen.getByTestId('site-nav-home'));
      expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');

      act(() => vi.advanceTimersByTime(400)); // > HOME_DB_REPLY_TIMEOUT_MS

      expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
      expect(srcdoc()).toContain('var carried = {"pets":[{"id":3}]}');
    } finally {
      vi.useRealTimers();
    }
  });

  it('an unsolicited __airbotixSiteDb message (no pending Home) is ignored', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'about.html', db: null });
    post({ __airbotixSiteDb: true, db: { pets: [{ id: 9 }] } });
    // No Home request in flight — the page and db stay put.
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');
    expect(srcdoc()).toContain('var carried = null');
  });

  it('a runKey bump resets the db to its seeds and returns home', () => {
    const { rerender } = render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'about.html', db: { pets: [{ id: 7 }] } });
    expect(srcdoc()).toContain('var carried = {"pets":[{"id":7}]}');

    rerender(<SiteFrame files={SITE} runKey={2} />);

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('var carried = null'); // seeds hydrate afresh
  });

  it('renders captured console lines in the panel and wires "Fix this error"', () => {
    const onFixError = vi.fn();
    render(<SiteFrame files={SITE} runKey={1} showConsole onFixError={onFixError} />);

    post({ __airbotixConsole: true, level: 'error', text: 'db.pets is undefined' });

    expect(screen.getByText(/db\.pets is undefined/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /fix this error/i }));
    expect(onFixError).toHaveBeenCalledWith('db.pets is undefined');
  });

  it('reports console lines up through onConsole/onConsoleCount (pane wiring)', () => {
    const onConsole = vi.fn();
    const onConsoleCount = vi.fn();
    render(
      <SiteFrame files={SITE} runKey={1} onConsole={onConsole} onConsoleCount={onConsoleCount} />,
    );
    post({ __airbotixConsole: true, level: 'info', text: 'ready' });
    expect(onConsoleCount).toHaveBeenLastCalledWith(1);
    expect(onConsole).toHaveBeenLastCalledWith([
      expect.objectContaining({ level: 'info', text: 'ready' }),
    ]);
  });
});

// Database window seam (creative-code-studio-website-prd): SiteFrame owns the
// store's refresh trigger (it is the only thing talking to the frame) and
// feeds EVERY read-db reply into siteDbStore; a fresh run (runKey) drops the
// snapshot (D-WEB-04 — the frame db is back to its seeds).
describe('SiteFrame — the Database window store (siteDbStore)', () => {
  beforeEach(() => {
    useSiteDbStore.setState({ db: null, updatedAt: null, refreshTrigger: null });
  });

  it('registers a refresh trigger that posts read-db into the frame; unmount unregisters', () => {
    const { unmount } = render(<SiteFrame files={SITE} runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    useSiteDbStore.getState().requestRefresh();
    expect(postSpy).toHaveBeenCalledWith({ __airbotixSiteControl: true, action: 'read-db' }, '*');

    unmount();
    expect(useSiteDbStore.getState().refreshTrigger).toBeNull();
  });

  it('a __airbotixSiteDb reply feeds the store (Home reads and polls alike)', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteDb: true, db: { pets: [{ id: 1, adopted: true }] } });
    expect(useSiteDbStore.getState().db).toEqual({ pets: [{ id: 1, adopted: true }] });
    expect(useSiteDbStore.getState().updatedAt).not.toBeNull();
    // …and with no Home request pending the page stays put (poll ≠ navigation).
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
  });

  it('a reply from ANOTHER frame is rejected (own-source guard covers the store too)', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    // A real cross-frame message carries a source window ≠ this frame's.
    fireEvent(
      window,
      new MessageEvent('message', {
        data: { __airbotixSiteDb: true, db: { forged: true } },
        source: window,
      }),
    );
    expect(useSiteDbStore.getState().db).toBeNull();
  });

  it('a runKey bump (fresh run) drops the snapshot — the pane repolls the fresh seeds', () => {
    const { rerender } = render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteDb: true, db: { pets: [1] } });
    expect(useSiteDbStore.getState().db).toEqual({ pets: [1] });

    rerender(<SiteFrame files={SITE} runKey={2} />);
    expect(useSiteDbStore.getState().db).toBeNull();
    expect(useSiteDbStore.getState().updatedAt).toBeNull();
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
      <SiteFrame files={SITE} runKey={1} reportAttempt={2} onRunReport={(r) => reports.push(r)} />,
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
    render(<SiteFrame files={SITE} runKey={1} onRunReport={(r) => reports.push(r)} />);
    act(() => vi.advanceTimersByTime(4000 + 1500)); // observe + reply timeout
    expect(reports).toHaveLength(1);
    expect(reports[0].probeError).toBe('no-response');
    expect('site' in reports[0]).toBe(false);
    expect(reports[0].booted).toBe(false);
  });

  it('a runKey bump (fresh run) starts a fresh collector at the new attempt', () => {
    const reports: RunReport[] = [];
    const { rerender } = render(
      <SiteFrame files={SITE} runKey={1} onRunReport={(r) => reports.push(r)} />,
    );
    post({ __airbotixConsole: true, level: 'error', text: 'old-run error' });
    act(() => vi.advanceTimersByTime(4000 + 1500));
    expect(reports).toHaveLength(1);

    rerender(
      <SiteFrame files={SITE} runKey={2} reportAttempt={2} onRunReport={(r) => reports.push(r)} />,
    );
    act(() => vi.advanceTimersByTime(4000));
    post({ __airbotixSiteReport: true, site: SHIM_SITE });
    expect(reports).toHaveLength(2);
    expect(reports[1].attempt).toBe(2);
    expect(reports[1].consoleErrors).toEqual([]); // not carried over from run 1
  });

  it('collects nothing when onRunReport is not set (no probe request goes out)', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');
    act(() => vi.advanceTimersByTime(10_000));
    expect(postSpy).not.toHaveBeenCalled();
  });
});
