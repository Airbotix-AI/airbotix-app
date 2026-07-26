// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from './authStore';

const { api, getSocket } = vi.hoisted(() => ({
  api: vi.fn(),
  getSocket: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/lib/ws', () => ({ closeSocket: vi.fn(), getSocket }));

import { useParentKidLogin } from './useAuth';

describe('useParentKidLogin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.getState().clearAll();
    useAuthStore.getState().setBootstrapped(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('creates a family-scoped kid session without replacing the parent token', async () => {
    useAuthStore.getState().setToken('user', 'parent-token');
    api.mockResolvedValue({
      access_token: 'kid-token',
      expires_in: 900,
      kid: { id: 'kid-1', nickname: 'Mia', age: 9, family_id: 'family-1' },
    });
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useParentKidLogin(), { wrapper });

    await act(() => result.current('kid-1'));
    vi.runAllTimers();

    expect(api).toHaveBeenCalledWith('/auth/parent/kids/kid-1/login', {
      method: 'POST',
      principal: 'user',
    });
    expect(useAuthStore.getState().tokens).toEqual({
      user: 'parent-token',
      kid: 'kid-token',
    });
    expect(useAuthStore.getState().bootstrapped).toBe(true);
    expect(getSocket).toHaveBeenCalledWith('kid');
  });
});
