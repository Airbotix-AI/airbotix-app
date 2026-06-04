import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { closeSocket, getSocket } from '@/lib/ws';
import { mockApiResolved } from '@/test/mocks';
import { useAuthStore } from './authStore';
import { classCodeLogin, kidLogin, requestOtp, useLogout, useMe, verifyOtp } from './useAuth';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));
vi.mock('@/lib/ws', () => ({ getSocket: vi.fn(), closeSocket: vi.fn() }));

const mockedApi = vi.mocked(api);

const resolveApi = mockApiResolved;

function qcWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  mockedApi.mockReset();
  vi.mocked(getSocket).mockReset();
  vi.mocked(closeSocket).mockReset();
  useAuthStore.getState().clear();
  useAuthStore.getState().setBootstrapped(false);
});

describe('auth flows', () => {
  it('requestOtp posts the email with skipAuthRefresh + parent role hint', async () => {
    resolveApi(undefined);
    await requestOtp('p@e.com');
    expect(mockedApi).toHaveBeenCalledWith(
      '/auth/request-otp',
      expect.objectContaining({
        method: 'POST',
        skipAuthRefresh: true,
        body: expect.objectContaining({ email: 'p@e.com', role_hint: 'parent' }),
      }),
    );
  });

  it('verifyOtp stores the token and marks the session bootstrapped', async () => {
    resolveApi({
      access_token: 'jwt-parent',
      expires_in: 900,
      user: { id: 'u', email: 'p@e.com', display_name: null, role: 'parent', family_id: 'f1', is_new_user: false },
    });

    const res = await verifyOtp('p@e.com', '123456');

    expect(res.access_token).toBe('jwt-parent');
    expect(useAuthStore.getState().accessToken).toBe('jwt-parent');
    expect(useAuthStore.getState().bootstrapped).toBe(true);
    await waitFor(() => expect(getSocket).toHaveBeenCalled());
  });

  it('kidLogin stores the token (family-code flow)', async () => {
    resolveApi({ access_token: 'jwt-kid', expires_in: 900, kid: { id: 'k', nickname: 'Robo', age: 9, family_id: 'f1' } });

    await kidLogin('FAM123', 'Robo', '1234');

    expect(mockedApi).toHaveBeenCalledWith(
      '/auth/kid-login',
      expect.objectContaining({ method: 'POST', skipAuthRefresh: true }),
    );
    expect(useAuthStore.getState().accessToken).toBe('jwt-kid');
  });

  it('classCodeLogin stores the token (one-shot workshop flow)', async () => {
    resolveApi({
      access_token: 'jwt-class',
      expires_in: 900,
      kid: { id: 'k', nickname: 'Robo', class_id: 'c1', is_ephemeral: true },
    });

    await classCodeLogin('CLASS9');

    expect(mockedApi).toHaveBeenCalledWith(
      '/auth/class-code-login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useAuthStore.getState().accessToken).toBe('jwt-class');
  });

  it('useLogout clears the session and closes the socket', async () => {
    useAuthStore.getState().setAccessToken('jwt');
    resolveApi(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: qcWrapper() });
    await act(async () => {
      await result.current();
    });

    expect(mockedApi).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({ method: 'POST' }));
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(closeSocket).toHaveBeenCalled();
  });

  it('useLogout(true) hits the logout-everywhere endpoint', async () => {
    useAuthStore.getState().setAccessToken('jwt');
    resolveApi(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: qcWrapper() });
    await act(async () => {
      await result.current(true);
    });

    expect(mockedApi).toHaveBeenCalledWith('/auth/logout-everywhere', expect.objectContaining({ method: 'POST' }));
  });

  it('useMe normalises a parent /auth/me into a user principal', async () => {
    useAuthStore.getState().setAccessToken('jwt');
    resolveApi({ role: 'parent', user: { id: 'u', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id: 'f1' } });

    const { result } = renderHook(() => useMe(), { wrapper: qcWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toMatchObject({ kind: 'user', sub: 'u', email: 'p@e.com', role: 'parent' });
  });

  it('useMe normalises a kid /auth/me into a kid principal', async () => {
    useAuthStore.getState().setAccessToken('jwt');
    resolveApi({ role: 'kid', kid: { id: 'k', nickname: 'Robo', age: 9, family_id: 'f1' } });

    const { result } = renderHook(() => useMe(), { wrapper: qcWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toMatchObject({ kind: 'kid', sub: 'k', nickname: 'Robo' });
  });
});
