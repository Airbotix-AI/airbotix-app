// Typed fetch with auto-refresh on 401. See auth-system-prd.md §3 + §4.3.

import { surfacePrincipal, useAuthStore } from '@/auth/authStore';
import type { PrincipalKind } from '@/auth/types';
import type { GenAssetRequest, GenAssetResult } from '@/pages/learn/playground/assetGen';
import { sameHostInDev } from '@/lib/devHost';

// In dev, when the app is opened from a LAN device (phone/tablet), talk to the
// dev machine that served it rather than the device's own localhost.
export const BASE_URL = sameHostInDev(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000');

// A request inherits the principal of the surface it is fired from unless an
// explicit `principal` is passed (e.g. /auth/me, login/logout target a kind).
const defaultPrincipal = surfacePrincipal;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

interface ApiOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
  /** Which session's token to use. Defaults to the current surface's principal. */
  principal?: PrincipalKind;
}

// Distinguishes "the refresh cookie is truly dead" (401/403 → drop the session)
// from a transient refresh failure (429 rate-limit, 5xx, network — e.g. a shared
// venue IP hitting a limit, or a deploy window). Transient failures must NOT
// kill the session: the 2026-07-18 incident mass-logged-out whole venues because
// every refresh failure was treated as session death.
interface RefreshOutcome {
  token: string | null;
  sessionDead: boolean;
}

// One retry after a short pause covers a backend restart blip without turning
// the client into a retry storm.
const REFRESH_RETRY_DELAY_MS = 1500;

// In-flight dedupe is per kind so a parent and kid refresh can run concurrently
// without clobbering each other.
const refreshInFlight: Record<PrincipalKind, Promise<RefreshOutcome> | null> = {
  user: null,
  kid: null,
};

function fetchRefresh(kind: PrincipalKind): Promise<Response> {
  return fetch(`${BASE_URL}/auth/refresh?kind=${kind}`, {
    method: 'POST',
    credentials: 'include',
  });
}

function refreshSession(kind: PrincipalKind): Promise<RefreshOutcome> {
  const existing = refreshInFlight[kind];
  if (existing) return existing;
  const run = (async (): Promise<RefreshOutcome> => {
    try {
      let res: Response | null = null;
      try {
        res = await fetchRefresh(kind);
      } catch {
        res = null; // network error — retry below
      }
      if (!res || res.status >= 500) {
        await new Promise((r) => setTimeout(r, REFRESH_RETRY_DELAY_MS));
        try {
          res = await fetchRefresh(kind);
        } catch {
          return { token: null, sessionDead: false };
        }
      }
      if (res.status === 401 || res.status === 403) return { token: null, sessionDead: true };
      if (!res.ok) return { token: null, sessionDead: false }; // 429 / lingering 5xx
      try {
        const body = (await res.json()) as { access_token: string };
        useAuthStore.getState().setToken(kind, body.access_token);
        return { token: body.access_token, sessionDead: false };
      } catch {
        return { token: null, sessionDead: false };
      }
    } finally {
      refreshInFlight[kind] = null;
    }
  })();
  refreshInFlight[kind] = run;
  return run;
}

export async function refreshAccessToken(
  kind: PrincipalKind = defaultPrincipal(),
): Promise<string | null> {
  return (await refreshSession(kind)).token;
}

export async function api<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  const { method = 'GET', body, signal, skipAuthRefresh } = opts;
  const principal = opts.principal ?? defaultPrincipal();

  const exec = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (token) headers.authorization = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let token = useAuthStore.getState().tokens[principal];
  let res = await exec(token);

  let refresh: RefreshOutcome | null = null;
  if (res.status === 401 && !skipAuthRefresh) {
    refresh = await refreshSession(principal);
    if (refresh.token) {
      token = refresh.token;
      res = await exec(token);
    }
  }

  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = res.statusText;
    let details: unknown;
    let requestId: string | undefined;
    try {
      const errBody = (await res.json()) as {
        error?: { code: string; message: string; details?: unknown; request_id?: string };
      };
      if (errBody.error) {
        code = errBody.error.code;
        message = errBody.error.message;
        details = errBody.error.details;
        requestId = errBody.error.request_id;
      }
    } catch {
      // ignore
    }
    if (res.status === 401) {
      // Only drop the failing principal's session — the other one survives.
      // And only when the session is actually dead: the refresh cookie was
      // rejected (401/403), or a freshly-minted access token still got 401.
      // A refresh that merely couldn't run (429 / 5xx / offline) keeps the
      // session — the next request will try again.
      const refreshWasTransient = refresh !== null && !refresh.sessionDead && refresh.token === null;
      if (!refreshWasTransient) {
        useAuthStore.getState().clearToken(principal);
      }
    }
    throw new ApiError(res.status, code, message, details, requestId);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Authenticated same-origin binary fetch → Blob. Mirrors `api`'s auth +
 * silent-refresh handling but returns the raw bytes (no JSON parse). Use it to pull
 * private media (e.g. a class/course asset's bytes) from a backend proxy on the app
 * origin — that keeps the signed S3 URL server-side and avoids the cross-origin S3
 * CORS a direct `fetch()` of the signed URL would need.
 */
export async function apiBlob(
  path: string,
  principal: PrincipalKind = defaultPrincipal(),
): Promise<Blob> {
  const exec = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { headers, credentials: 'include' });
  };

  let token = useAuthStore.getState().tokens[principal];
  let res = await exec(token);
  if (res.status === 401) {
    const refresh = await refreshSession(principal);
    if (refresh.token) {
      token = refresh.token;
      res = await exec(token);
    } else if (refresh.sessionDead) {
      // Transient refresh failures (429/5xx/offline) keep the session — see api().
      useAuthStore.getState().clearToken(principal);
    }
  }

  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = res.statusText;
    try {
      const errBody = (await res.json()) as { error?: { code: string; message: string } };
      if (errBody.error) {
        code = errBody.error.code;
        message = errBody.error.message;
      }
    } catch {
      // body wasn't JSON — keep the status-based defaults
    }
    throw new ApiError(res.status, code, message);
  }

  return res.blob();
}

/**
 * Authenticated file download (non-JSON, e.g. CSV export). Fetches the bytes with
 * `apiBlob` (auth + silent-refresh) and triggers a browser download.
 */
export async function apiDownload(
  path: string,
  filename: string,
  principal: PrincipalKind = defaultPrincipal(),
): Promise<void> {
  const blob = await apiBlob(path, principal);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generate a game asset via platform-backend (Stars-metered, audited). The kid
 * surface never calls an LLM directly — this is the real target for the
 * `runGen` seam in `@/pages/learn/playground/assetGen`.
 */
export async function generateAsset(
  req: GenAssetRequest,
  signal?: AbortSignal,
): Promise<GenAssetResult> {
  // The backend DTO (`GenerateAssetSchema`) is snake_case — map the camelCase seam.
  const body = {
    project_id: req.projectId,
    kind: req.kind,
    prompt: req.prompt,
    ref_asset_path: req.refAssetPath,
    ref_url: req.refUrl,
    size: req.size,
  };
  return api<GenAssetResult>('/llm/generate-asset', { method: 'POST', body, signal });
}
