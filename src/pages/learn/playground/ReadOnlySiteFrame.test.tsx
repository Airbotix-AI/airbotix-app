// @vitest-environment jsdom
// ReadOnlySiteFrame — the public `/play/:shareId` WEBSITE host (creative-code-
// studio-website-prd D-WEB-22). It reuses the studio's site runtime
// (buildSitePreview) and the shared backend channel, so its security posture is
// IDENTICAL to the studio SiteFrame — allow-scripts ONLY, deny-by-default CSP —
// but its transport hits the NO-AUTH per-share endpoints and threads the opaque
// per-visitor `session` token (obtained on the first db.query reply, echoed
// thereafter). Asserted against a mocked transport (no network).

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { VfsFile } from '../code/codeApi';
import { ReadOnlySiteFrame } from './ReadOnlySiteFrame';

const { queryPublicSiteDbMock, fetchPublicSourceMock } = vi.hoisted(() => ({
  queryPublicSiteDbMock: vi.fn(),
  fetchPublicSourceMock: vi.fn(),
}));
vi.mock('./sharingApi', async (orig) => {
  const actual = await orig<typeof import('./sharingApi')>();
  return {
    ...actual,
    queryPublicSiteDb: queryPublicSiteDbMock,
    fetchPublicSource: fetchPublicSourceMock,
  };
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
    '<!doctype html>\n<html>\n<head></head>\n<body><h1>Pets</h1><a href="about.html">About</a></body>\n</html>',
  ),
  text('about.html', '<!doctype html>\n<html>\n<head></head>\n<body><h2>About us</h2></body>\n</html>'),
  text('server.js', "app.get('/api/pets', async (req, res) => res.json(await db.query('SELECT * FROM pets')));"),
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

/** Fire a message as the in-frame shim would (jsdom posts have a null source,
 *  which the own-source guard deliberately admits — same as SiteFrame). */
const post = (data: unknown) => fireEvent(window, new MessageEvent('message', { data }));

/** The shim's per-document nonce, echoed by every reply. */
const TOKEN = 'doc-token-p';
const sqlRequest = (id: number, sql = 'SELECT * FROM pets', params: unknown[] = []) => ({
  __airbotixSiteControl: true,
  action: 'sql',
  id,
  token: TOKEN,
  sql,
  params,
});
const sourceRequest = (id: number, name = 'weather', params: unknown = { city: 'Sydney' }) => ({
  __airbotixSiteControl: true,
  action: 'source',
  id,
  token: TOKEN,
  name,
  params,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReadOnlySiteFrame — security posture (mirrors the studio SiteFrame)', () => {
  it('renders the frozen site in the strict sandbox with a deny-by-default CSP', () => {
    render(<ReadOnlySiteFrame files={SITE} shareId="s1" testId="play-site-iframe" />);
    const el = frame();
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-testid', 'play-site-iframe');
    // allow-scripts ONLY — never allow-same-origin / forms / top-navigation.
    expect(el).toHaveAttribute('sandbox', 'allow-scripts');
    const doc = srcdoc();
    expect(doc).toContain('<h1>Pets</h1>');
    expect(doc).toContain('Content-Security-Policy');
    expect(doc).toContain("connect-src 'none'"); // no egress (the second fence)
  });

  it('a page-link nav message rebuilds the target page (same nav shim)', () => {
    render(<ReadOnlySiteFrame files={SITE} shareId="s1" testId="play-site-iframe" />);
    post({ __airbotixSiteNavigate: true, path: 'about.html' });
    expect(srcdoc()).toContain('<h2>About us</h2>');
  });
});

describe('ReadOnlySiteFrame — public per-share db proxy + session threading (D-WEB-22)', () => {
  it('threads the opaque session: first call has none, stores the reply session, echoes it next', async () => {
    // First call mints a session; the second must carry it back.
    queryPublicSiteDbMock
      .mockResolvedValueOnce({ result: QUERY_RESULT, session: 'sess-1' })
      .mockResolvedValueOnce({ result: QUERY_RESULT, session: 'sess-1' });
    render(<ReadOnlySiteFrame files={SITE} shareId="s1" testId="play-site-iframe" />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sqlRequest(1, 'SELECT * FROM pets WHERE id = ?', [1]));

    // The FIRST forward carries NO session (undefined) and replies ok echoing id+token.
    await waitFor(() =>
      expect(queryPublicSiteDbMock).toHaveBeenCalledWith(
        's1',
        'SELECT * FROM pets WHERE id = ?',
        [1],
        undefined,
      ),
    );
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        { __airbotixSiteSql: true, id: 1, token: TOKEN, ok: true, result: QUERY_RESULT },
        '*',
      ),
    );

    // The SECOND forward echoes the session the first reply handed back.
    post(sqlRequest(2));
    await waitFor(() =>
      expect(queryPublicSiteDbMock).toHaveBeenLastCalledWith('s1', 'SELECT * FROM pets', [], 'sess-1'),
    );
  });

  it('a backend SQL error surfaces its kid-readable message verbatim', async () => {
    queryPublicSiteDbMock.mockRejectedValue(
      new ApiError(400, 'DB_QUERY_ERROR', 'There is no table called "petz".'),
    );
    render(<ReadOnlySiteFrame files={SITE} shareId="s1" testId="play-site-iframe" />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sqlRequest(3));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        {
          __airbotixSiteSql: true,
          id: 3,
          token: TOKEN,
          ok: false,
          error: 'There is no table called "petz".',
        },
        '*',
      ),
    );
  });

  it('a source request hits the public per-share proxy (no auth, no projectId)', async () => {
    fetchPublicSourceMock.mockResolvedValue({ data: { temperature_c: 21 }, cached: false });
    render(<ReadOnlySiteFrame files={SITE} shareId="s1" testId="play-site-iframe" />);
    const postSpy = vi.spyOn(frame().contentWindow!, 'postMessage');

    post(sourceRequest(4, 'weather', { city: 'Sydney' }));

    await waitFor(() =>
      expect(fetchPublicSourceMock).toHaveBeenCalledWith('s1', 'weather', { city: 'Sydney' }),
    );
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        { __airbotixSiteSource: true, id: 4, token: TOKEN, ok: true, data: { temperature_c: 21 } },
        '*',
      ),
    );
  });
});
