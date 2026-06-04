import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';

// jsdom doesn't implement Element.scrollTo; components that auto-scroll a chat
// pane call it in effects. Polyfill to a no-op so those renders don't throw.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

// Reset DOM + in-memory Zustand auth state between tests so specs are isolated.
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
  vi.restoreAllMocks();
});
