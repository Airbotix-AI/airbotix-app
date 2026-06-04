import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useAuthStore } from '@/auth/authStore';
import { mockUseMe } from '@/test/mocks';
import { RootPage } from './RootPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));

function renderRoot() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/portal/login" element={<div>LOGIN</div>} />
        <Route path="/portal" element={<div>PORTAL</div>} />
        <Route path="/learn" element={<div>LEARN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => useAuthStore.getState().clear());

describe('RootPage', () => {
  it('sends signed-out visitors to login', () => {
    mockUseMe(undefined);
    renderRoot();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('routes a signed-in kid to /learn', () => {
    useAuthStore.setState({ accessToken: 'jwt' });
    mockUseMe({ kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal);
    renderRoot();
    expect(screen.getByText('LEARN')).toBeInTheDocument();
  });

  it('routes a signed-in parent to /portal', () => {
    useAuthStore.setState({ accessToken: 'jwt' });
    mockUseMe({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id: 'f1' } as AuthPrincipal);
    renderRoot();
    expect(screen.getByText('PORTAL')).toBeInTheDocument();
  });
});
