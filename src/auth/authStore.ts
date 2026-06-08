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

// The principal that owns the surface currently in the URL. The two surfaces are
// route-segregated (`/learn/*` = kid, everything else = parent), so a component
// or request inherits the principal of the surface it runs under. Single source
// of truth for the default principal across the api client and `useMe`.
export function surfacePrincipal(): PrincipalKind {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/learn')
    ? 'kid'
    : 'user';
}
