// Typed fetch with auto-refresh on 401. See auth-system-prd.md §3 + §4.3.

import { useAuthStore } from '@/auth/authStore';
import type { GenAssetRequest, GenAssetResult } from '@/pages/learn/playground/assetGen';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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
}

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { access_token: string };
      useAuthStore.getState().setAccessToken(body.access_token);
      return body.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  const { method = 'GET', body, signal, skipAuthRefresh } = opts;

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

  let token = useAuthStore.getState().accessToken;
  let res = await exec(token);

  if (res.status === 401 && !skipAuthRefresh) {
    const next = await refreshAccessToken();
    if (next) {
      token = next;
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
      useAuthStore.getState().clear();
    }
    throw new ApiError(res.status, code, message, details, requestId);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Authenticated file download (non-JSON, e.g. CSV export). Mirrors `api`'s auth
 * + silent-refresh handling, but streams the body to a Blob and triggers a
 * browser download instead of parsing JSON.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const exec = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { headers, credentials: 'include' });
  };

  let token = useAuthStore.getState().accessToken;
  let res = await exec(token);
  if (res.status === 401) {
    const next = await refreshAccessToken();
    if (next) {
      token = next;
      res = await exec(token);
    } else {
      useAuthStore.getState().clear();
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

  const blob = await res.blob();
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
 * `runGen` seam in `@/pages/learn/playground/assetGen`. Backend endpoint TBD.
 */
export async function generateAsset(req: GenAssetRequest): Promise<GenAssetResult> {
  return api<GenAssetResult>('/llm/generate-asset', { method: 'POST', body: req });
}
