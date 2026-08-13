// The public per-share OPEN fetch proxy (creative-code-studio-website-prd
// D-WEB-23): `fetchPublicSourceUrl` must hit the frozen NO-AUTH wire contract
// — a BARE `fetch` (never the authed `api` client) POSTing `{ url }` to
// `/play/:shareId/sources/fetch`, stateless (no session field — unlike the
// db.query variant, an open fetch carries no per-visitor state). Backend
// errors surface as kid-readable ApiErrors, verbatim.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { fetchPublicSourceUrl } from './sharingApi';

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchPublicSourceUrl (D-WEB-23 frozen wire contract)', () => {
  it('POSTs { url } — and nothing else — to /play/:shareId/sources/fetch with NO auth header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { data: { setup: 'Knock knock' }, cached: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchPublicSourceUrl('s1', 'https://api.chucknorris.io/jokes/random'),
    ).resolves.toEqual({ data: { setup: 'Knock knock' }, cached: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/play\/s1\/sources\/fetch$/);
    expect(init.method).toBe('POST');
    // Stateless + unauthed: exactly { url } in the body, no Authorization header.
    expect(JSON.parse(String(init.body))).toEqual({
      url: 'https://api.chucknorris.io/jokes/random',
    });
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('a backend error envelope becomes a kid-readable ApiError (surfaced verbatim upstream)', async () => {
    const message = 'That website is not available here — try a different API.';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, { error: { code: 'SOURCE_BLOCKED', message } }),
      ),
    );

    const failure: unknown = await fetchPublicSourceUrl(
      's1',
      'https://blocked.example.com/data',
    ).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 400, code: 'SOURCE_BLOCKED', message });
  });
});
