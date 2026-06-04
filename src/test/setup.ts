import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';

// jsdom doesn't implement Element.scrollTo; components that auto-scroll a chat
// pane call it in effects. Polyfill to a no-op so those renders don't throw.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

// Reset shared/module-level state between tests so specs stay isolated. Done
// globally here (not per-spec) so a future test can't leak by forgetting to.
// - DOM + Zustand auth token
// - the ws.ts socket singleton — reset via a DYNAMIC import so this setup file
//   never statically pulls ws (and socket.io-client) into a spec's module graph
//   ahead of that spec's own vi.mock('socket.io-client'). The import resolves to
//   whatever the spec sees (real ws, or its own '@/lib/ws' mock — both safe).
// - api.ts `refreshInFlight` self-clears in its own `finally`, so it needs no
//   reset — it is only ever non-null mid-refresh, which every test awaits.
afterEach(async () => {
  cleanup();
  useAuthStore.getState().clear();
  try {
    // Real ws → tears down the socket singleton. A spec that mocks '@/lib/ws'
    // without a closeSocket export makes vitest throw on access; that's caught
    // and ignored (nothing real to reset there).
    const ws = await import('@/lib/ws');
    ws.closeSocket();
  } catch {
    /* ws mocked without closeSocket, or not loaded — nothing to reset */
  }
  vi.restoreAllMocks();
});
