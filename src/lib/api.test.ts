import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable auth-store stand-in, hoisted so the vi.mock factory can read it.
const h = vi.hoisted(() => {
  const tokens: Record<'user' | 'kid', string | null> = { user: 'expired-token', kid: null };
  const cleared: string[] = [];
  return {
    tokens,
    cleared,
    reset(): void {
      tokens.user = 'expired-token';
      tokens.kid = null;
      cleared.length = 0;
    },
    store: {
      getState: () => ({
        tokens,
        setToken: (k: 'user' | 'kid', t: string): void => {
          tokens[k] = t;
        },
        clearToken: (k: 'user' | 'kid'): void => {
          tokens[k] = null;
          cleared.push(k);
        },
      }),
    },
  };
});

vi.mock('@/auth/authStore', () => ({
  useAuthStore: h.store,
  surfacePrincipal: () => 'user' as const,
}));
vi.mock('@/lib/devHost', () => ({ sameHostInDev: (u: string) => u }));

import { api, ApiError } from './api';

interface MockResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}

function resp(status: number, body: unknown = {}): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status-${status}`,
    json: async () => body,
  };
}

// Sequenced fetch mock: /auth/refresh calls consume `refreshQueue`, everything
// else consumes `apiQueue`.
const refreshQueue: Array<MockResponse | Error> = [];
const apiQueue: Array<MockResponse | Error> = [];

beforeEach(() => {
  h.reset();
  refreshQueue.length = 0;
  apiQueue.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const q = url.includes('/auth/refresh') ? refreshQueue : apiQueue;
      const next = q.shift();
      if (!next) throw new Error(`unexpected fetch: ${url}`);
      if (next instanceof Error) throw next;
      return next;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('api() — session survival on refresh failure (2026-07-18 incident)', () => {
  it('keeps the session when /auth/refresh is rate-limited (429)', async () => {
    apiQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    refreshQueue.push(resp(429, { error: { code: 'RATE_LIMITED', message: 'Too many attempts' } }));

    await expect(api('/families/me')).rejects.toMatchObject({ status: 401 });
    // The venue hit a shared rate limit — the refresh cookie is still valid, so
    // the session must NOT be dropped.
    expect(h.cleared).toEqual([]);
    expect(h.tokens.user).toBe('expired-token');
  });

  it('drops the session when the refresh cookie is truly dead (refresh → 401)', async () => {
    apiQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    refreshQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'no cookie' } }));

    await expect(api('/families/me')).rejects.toMatchObject({ status: 401 });
    expect(h.cleared).toEqual(['user']);
    expect(h.tokens.user).toBeNull();
  });

  it('replays the request after a successful refresh', async () => {
    apiQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    refreshQueue.push(resp(200, { access_token: 'fresh-token' }));
    apiQueue.push(resp(200, { id: 'fam_1' }));

    await expect(api('/families/me')).resolves.toEqual({ id: 'fam_1' });
    expect(h.tokens.user).toBe('fresh-token');
    expect(h.cleared).toEqual([]);
  });

  it('retries refresh once after a 5xx (deploy window) and keeps the session on success', async () => {
    vi.useFakeTimers();
    apiQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    refreshQueue.push(resp(503, {}));
    refreshQueue.push(resp(200, { access_token: 'fresh-token' }));
    apiQueue.push(resp(200, { id: 'fam_1' }));

    const call = api('/families/me');
    await vi.advanceTimersByTimeAsync(1500);
    await expect(call).resolves.toEqual({ id: 'fam_1' });
    expect(h.tokens.user).toBe('fresh-token');
    expect(h.cleared).toEqual([]);
  });

  it('keeps the session when refresh is unreachable (network error twice)', async () => {
    vi.useFakeTimers();
    apiQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    refreshQueue.push(new Error('network down'));
    refreshQueue.push(new Error('network down'));

    const call = api('/families/me');
    const assertion = expect(call).rejects.toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(h.cleared).toEqual([]);
    expect(h.tokens.user).toBe('expired-token');
  });

  it('still drops the session when a freshly-refreshed token is rejected (401 after replay)', async () => {
    apiQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    refreshQueue.push(resp(200, { access_token: 'fresh-token' }));
    apiQueue.push(resp(401, { error: { code: 'UNAUTHORIZED', message: 'revoked' } }));

    await expect(api('/families/me')).rejects.toMatchObject({ status: 401 });
    expect(h.cleared).toEqual(['user']);
  });
});
