// Access tokens kept in memory only (XSS-resilient). Refresh tokens live in
// HttpOnly cookies set by the backend at /auth.
// See auth-system-prd.md §3.1.
//
// Two tokens, one per principal kind, so a parent (`user`) and a kid (`kid`) can
// be signed in at the same time in one browser — logging one in no longer evicts
// the other. The backend mirrors this with two refresh cookies. Within a kind a
// re-login replaces the slot (you can't be two parents).
//
// `bootstrapped` is set once on app load after the bootstrap calls to
// `/auth/refresh` resolve (success or failure). Routes wait for it before
// deciding "no token → redirect to login" so a page reload with a valid
// refresh cookie restores the session instead of bouncing the user out.

import { create } from 'zustand';

import type { PrincipalKind } from './types';

type TokenMap = Record<PrincipalKind, string | null>;

interface AuthState {
  tokens: TokenMap;
  bootstrapped: boolean;
  setToken: (kind: PrincipalKind, token: string | null) => void;
  clearToken: (kind: PrincipalKind) => void;
  clearAll: () => void;
  setBootstrapped: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  tokens: { user: null, kid: null },
  bootstrapped: false,
  setToken: (kind, token) =>
    set((s) => ({ tokens: { ...s.tokens, [kind]: token } })),
  clearToken: (kind) => set((s) => ({ tokens: { ...s.tokens, [kind]: null } })),
  clearAll: () => set({ tokens: { user: null, kid: null } }),
  setBootstrapped: (v) => set({ bootstrapped: v }),
}));

// Non-reactive read for use outside React (api client, ws).
export function getToken(kind: PrincipalKind): string | null {
  return useAuthStore.getState().tokens[kind];
}

// Decode the (unverified) JWT body to read a claim. Client-side this is for UX
// only — the server is authz source of truth (CLAUDE.md §4), so a tampered claim
// can never grant access; it only decides whether to *show* a control. Returns
// null on any malformed/absent token.
function decodeJwtClaims(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Non-reactive read of the kid's `class_id` JWT claim — null when the kid is not
// in a live class. Used to gate the raise-hand control (it only makes sense in a
// class). See ws.gateway: the same claim auto-joins the kid to `class:{id}`.
export function getKidClassId(): string | null {
  const claims = decodeJwtClaims(useAuthStore.getState().tokens.kid);
  const classId = claims?.class_id;
  return typeof classId === 'string' && classId.length > 0 ? classId : null;
}

// Non-reactive read of the kid's own subject id (`sub`) from the kid token, so a
// class-room broadcast can be matched to "this is about ME". null when no token.
export function getKidSub(): string | null {
  const claims = decodeJwtClaims(useAuthStore.getState().tokens.kid);
  const sub = claims?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : null;
}

// Reactive selector for components: re-derives `class_id` whenever the kid token
// changes (login / class-code login / logout). Decoding is cheap and the token
// rarely changes, so deriving on each render is fine.
export function useKidClassId(): string | null {
  const token = useAuthStore((s) => s.tokens.kid);
  const claims = decodeJwtClaims(token);
  const classId = claims?.class_id;
  return typeof classId === 'string' && classId.length > 0 ? classId : null;
}

// Reactive selector for the kid access token. WS subscribers depend on this so
// they (re)attach to the kid socket the moment auth lands (the bootstrap refresh
// resolves AFTER the layout mounts) and again when the token rotates — otherwise
// a listener attached at mount (when the socket didn't exist yet) never fires.
export function useKidToken(): string | null {
  return useAuthStore((s) => s.tokens.kid);
}

// The principal that owns the surface currently in the URL. The two surfaces are
// route-segregated (`/learn/*` = kid, everything else = parent), so a component
// or request inherits the principal of the surface it runs under. Single source
// of truth for the default principal across the api client and `useMe`.
export function surfacePrincipal(): PrincipalKind {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/learn')
    ? 'kid'
    : 'user';
}
