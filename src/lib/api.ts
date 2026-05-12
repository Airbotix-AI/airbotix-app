import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

type RequestInit2 = RequestInit & { json?: unknown }

/** Authenticated API client. Attaches Supabase JWT, parses JSON, throws on !ok. */
export async function api<T = unknown>(path: string, init: RequestInit2 = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers ?? {})
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)

  let body: BodyInit | undefined
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.json)
  } else if (init.body) {
    body = init.body as BodyInit
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers, body })
  const ct = res.headers.get('content-type') ?? ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const message = typeof data === 'object' && data && 'error' in data
      ? String((data as { error: unknown }).error)
      : `HTTP ${res.status}`
    throw new ApiError(message, res.status, data)
  }
  return data as T
}

export class ApiError extends Error {
  constructor(msg: string, public status: number, public body: unknown) {
    super(msg)
    this.name = 'ApiError'
  }
}
