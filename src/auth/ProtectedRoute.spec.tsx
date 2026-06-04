import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from './authStore';
import { ProtectedRoute } from './ProtectedRoute';
import type { AuthPrincipal, PrincipalKind } from './types';
import { useMe } from './useAuth';

// ProtectedRoute reads only me.data / me.isLoading / me.isError, so mock the
// hook directly rather than spinning up react-query + a fake /auth/me server.
vi.mock('./useAuth', () => ({ useMe: vi.fn() }));
const mockedUseMe = vi.mocked(useMe);

type MeState = { data?: AuthPrincipal; isLoading: boolean; isError: boolean };
function setMe(state: MeState) {
  mockedUseMe.mockReturnValue(state as ReturnType<typeof useMe>);
}

const parent: AuthPrincipal = {
  kind: 'user',
  sub: 'u1',
  email: 'p@e.com',
  display_name: null,
  role: 'parent',
  family_id: 'f1',
};
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' };

function mountAt(path: string, kind: PrincipalKind, child: ReactNode = <div>PROTECTED</div>) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/portal/login" element={<div>PORTAL LOGIN</div>} />
        <Route path="/learn/login" element={<div>LEARN LOGIN</div>} />
        <Route path="/portal" element={<div>PORTAL HOME</div>} />
        <Route path="/learn" element={<div>LEARN HOME</div>} />
        <Route path="*" element={<ProtectedRoute kind={kind}>{child}</ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    useAuthStore.getState().setBootstrapped(false);
    setMe({ isLoading: false, isError: false });
  });

  it('shows a loading state until the bootstrap /auth/refresh settles', () => {
    useAuthStore.getState().setAccessToken('jwt'); // token present, but not bootstrapped yet
    mountAt('/portal/x', 'user');
    expect(screen.getByText(/Loading session/i)).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated parent to /portal/login', () => {
    useAuthStore.getState().setBootstrapped(true);
    mountAt('/portal/x', 'user');
    expect(screen.getByText('PORTAL LOGIN')).toBeInTheDocument();
  });

  it('redirects an unauthenticated kid to /learn/login', () => {
    useAuthStore.getState().setBootstrapped(true);
    mountAt('/learn/x', 'kid');
    expect(screen.getByText('LEARN LOGIN')).toBeInTheDocument();
  });

  it('shows loading while /auth/me is in flight', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setAccessToken('jwt');
    setMe({ isLoading: true, isError: false });
    mountAt('/portal/x', 'user');
    expect(screen.getByText(/Loading session/i)).toBeInTheDocument();
  });

  it('redirects to login when /auth/me errors', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setAccessToken('jwt');
    setMe({ isLoading: false, isError: true });
    mountAt('/portal/x', 'user');
    expect(screen.getByText('PORTAL LOGIN')).toBeInTheDocument();
  });

  it('renders children when the principal kind matches the route', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setAccessToken('jwt');
    setMe({ data: parent, isLoading: false, isError: false });
    mountAt('/portal/x', 'user');
    expect(screen.getByText('PROTECTED')).toBeInTheDocument();
  });

  it('bounces a signed-in kid away from a parent route to /learn', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setAccessToken('jwt');
    setMe({ data: kid, isLoading: false, isError: false });
    mountAt('/portal/x', 'user');
    expect(screen.getByText('LEARN HOME')).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED')).not.toBeInTheDocument();
  });

  it('bounces a signed-in parent away from a kid route to /portal', () => {
    useAuthStore.getState().setBootstrapped(true);
    useAuthStore.getState().setAccessToken('jwt');
    setMe({ data: parent, isLoading: false, isError: false });
    mountAt('/learn/x', 'kid');
    expect(screen.getByText('PORTAL HOME')).toBeInTheDocument();
  });
});
