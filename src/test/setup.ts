import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';

// Reset DOM + in-memory Zustand auth state between tests so specs are isolated.
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
  vi.restoreAllMocks();
});
