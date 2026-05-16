// Typed fetch with auto-refresh on 401. See auth-system-prd.md §3 + §4.3.

import { useAuthStore } from '@/auth/authStore';

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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
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
