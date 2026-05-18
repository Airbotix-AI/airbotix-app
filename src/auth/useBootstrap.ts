// On app mount, attempt one /auth/refresh to restore an in-memory access token
// from the HttpOnly refresh cookie. Sets `bootstrapped: true` regardless of the
// outcome so route guards can stop showing the loading splash.

import { useEffect } from 'react';

import { refreshAccessToken } from '@/lib/api';
import { getSocket } from '@/lib/ws';
import { useAuthStore } from './authStore';

export function useBootstrap(): void {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (token) {
        // Token already set inside refreshAccessToken; spin up WS too.
        setTimeout(() => getSocket(), 0);
      }
      useAuthStore.getState().setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
