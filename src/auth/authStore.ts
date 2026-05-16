// Access token kept in memory only (XSS-resilient). Refresh token lives in
// an HttpOnly cookie set by the backend at /auth.
// See auth-system-prd.md §3.1.

import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  clear: () => set({ accessToken: null }),
}));
