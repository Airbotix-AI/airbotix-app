// Access token kept in memory only (XSS-resilient). Refresh token lives in
// an HttpOnly cookie set by the backend at /auth.
// See auth-system-prd.md §3.1.
//
// `bootstrapped` is set once on app load after the bootstrap call to
// `/auth/refresh` resolves (success or failure). Routes wait for it before
// deciding "no token → redirect to login" so a page reload with a valid
// refresh cookie restores the session instead of bouncing the user out.

import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  bootstrapped: boolean;
  setAccessToken: (token: string | null) => void;
  setBootstrapped: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  bootstrapped: false,
  setAccessToken: (token) => set({ accessToken: token }),
  setBootstrapped: (v) => set({ bootstrapped: v }),
  clear: () => set({ accessToken: null }),
}));
