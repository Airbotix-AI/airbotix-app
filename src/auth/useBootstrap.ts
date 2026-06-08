// On app mount, attempt /auth/refresh for BOTH principal kinds to restore the
// in-memory access tokens from their HttpOnly refresh cookies. Each populates its
// slot only if its cookie is present (absent → 401, ignored). Sets
// `bootstrapped: true` once both settle so route guards can stop showing the
// loading splash. A parent and a kid can therefore both be restored on reload.

import { useEffect } from 'react';

import { refreshAccessToken } from '@/lib/api';
import { getSocket } from '@/lib/ws';
import { useAuthStore } from './authStore';

export function useBootstrap(): void {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [, kidToken] = await Promise.all([
        refreshAccessToken('user'),
        refreshAccessToken('kid'),
      ]);
      if (cancelled) return;
      // Only the kid surface uses WS today; spin it up if the kid session restored.
      if (kidToken) {
        setTimeout(() => getSocket('kid'), 0);
      }
      useAuthStore.getState().setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
