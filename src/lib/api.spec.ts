import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';
import { ApiError, api } from './api';

// Minimal Response stand-in — api.ts only touches ok/status/statusText/json().
function res(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    json: async () => body,
  } as unknown as Response;
}

function authOf(init: RequestInit | undefined): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.authorization;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  useAuthStore.getState().clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api()', () => {
  it('attaches the bearer token + credentials and returns the parsed body', async () => {
    useAuthStore.getState().setAccessToken('tok');
    fetchMock.mockResolvedValueOnce(res(200, { hello: 'world' }));

    const out = await api<{ hello: string }>('/x');

    expect(out).toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/x');
    expect(authOf(init)).toBe('Bearer tok');
    expect((init as RequestInit).credentials).toBe('include');
  });

  it('omits the Authorization header when there is no token', async () => {
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await api('/x');
    expect(authOf(fetchMock.mock.calls[0][1])).toBeUndefined();
  });

  it('on 401, silently refreshes the token and retries the original request', async () => {
    useAuthStore.getState().setAccessToken('old');
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).includes('/auth/refresh')) return res(200, { access_token: 'new' });
      return authOf(init) === 'Bearer new'
        ? res(200, { ok: true })
        : res(401, { error: { code: 'UNAUTH', message: 'no' } });
    });

    const out = await api<{ ok: boolean }>('/data');

    expect(out).toEqual({ ok: true });
    expect(useAuthStore.getState().accessToken).toBe('new');
    // exec(old 401) → /auth/refresh → exec(new 200) = 3 fetches
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('dedupes concurrent refreshes (single-flight): two 401s trigger ONE /auth/refresh', async () => {
    useAuthStore.getState().setAccessToken('old');
    let refreshCount = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCount += 1;
        return res(200, { access_token: 'new' });
      }
      return authOf(init) === 'Bearer new'
        ? res(200, { path: String(url) })
        : res(401, { error: { code: 'UNAUTH', message: 'no' } });
    });

    const [a, b] = await Promise.all([api<{ path: string }>('/a'), api<{ path: string }>('/b')]);

    expect(refreshCount).toBe(1);
    expect(useAuthStore.getState().accessToken).toBe('new');
    expect(a.path).toContain('/a');
    expect(b.path).toContain('/b');
  });

  it('when refresh fails, clears the session and throws ApiError(401)', async () => {
    useAuthStore.getState().setAccessToken('old');
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/auth/refresh')) return res(401); // refresh itself fails
      return res(401, { error: { code: 'UNAUTH', message: 'no' } });
    });

    const err = (await api('/data').catch((e) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('with skipAuthRefresh, a 401 throws immediately without hitting /auth/refresh', async () => {
    useAuthStore.getState().setAccessToken('old');
    fetchMock.mockResolvedValue(res(401, { error: { code: 'UNAUTH', message: 'no' } }));

    const err = (await api('/auth/verify-otp', { method: 'POST', skipAuthRefresh: true }).catch(
      (e) => e,
    )) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    const hitRefresh = fetchMock.mock.calls.some((c) => String(c[0]).includes('/auth/refresh'));
    expect(hitRefresh).toBe(false);
  });

  it('returns undefined for 204 No Content', async () => {
    useAuthStore.getState().setAccessToken('tok');
    fetchMock.mockResolvedValueOnce(res(204));
    const out = await api('/thing', { method: 'DELETE' });
    expect(out).toBeUndefined();
  });

  it('parses the backend error envelope into ApiError fields', async () => {
    useAuthStore.getState().setAccessToken('tok');
    fetchMock.mockResolvedValueOnce(
      res(422, {
        error: { code: 'VALIDATION', message: 'bad', details: { field: 'x' }, request_id: 'req-1' },
      }),
    );

    const err = (await api('/x').catch((e) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toBe('bad');
    expect(err.details).toEqual({ field: 'x' });
    expect(err.requestId).toBe('req-1');
  });
});
