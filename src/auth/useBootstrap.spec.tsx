import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshAccessToken } from '@/lib/api';
import { getSocket } from '@/lib/ws';
import { useAuthStore } from './authStore';
import { useBootstrap } from './useBootstrap';

vi.mock('@/lib/api', () => ({ refreshAccessToken: vi.fn() }));
vi.mock('@/lib/ws', () => ({ getSocket: vi.fn() }));

const mockedRefresh = vi.mocked(refreshAccessToken);
const mockedGetSocket = vi.mocked(getSocket);

beforeEach(() => {
  mockedRefresh.mockReset();
  mockedGetSocket.mockReset();
  useAuthStore.getState().clear();
  useAuthStore.getState().setBootstrapped(false);
});

describe('useBootstrap', () => {
  it('restores the session and opens the socket when the refresh cookie is valid', async () => {
    mockedRefresh.mockResolvedValue('jwt');
    renderHook(() => useBootstrap());

    await waitFor(() => expect(useAuthStore.getState().bootstrapped).toBe(true));
    await waitFor(() => expect(mockedGetSocket).toHaveBeenCalled());
  });

  it('still marks the session bootstrapped (no socket) when there is no refresh cookie', async () => {
    mockedRefresh.mockResolvedValue(null);
    renderHook(() => useBootstrap());

    await waitFor(() => expect(useAuthStore.getState().bootstrapped).toBe(true));
    expect(mockedGetSocket).not.toHaveBeenCalled();
  });
});
