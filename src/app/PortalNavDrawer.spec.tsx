import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useLogout } from '@/auth/useAuth';
import { mockUseMe } from '@/test/mocks';
import { PortalNavDrawer } from './PortalNavDrawer';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn(), useLogout: vi.fn() }));

const logout = vi.fn();
const parent: AuthPrincipal = { kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id: 'f1' } as AuthPrincipal;

beforeEach(() => {
  logout.mockReset();
  mockUseMe(parent);
  vi.mocked(useLogout).mockReturnValue(logout);
});

describe('PortalNavDrawer', () => {
  it('renders the portal nav, the signed-in parent, and signs out', async () => {
    render(
      <MemoryRouter>
        <PortalNavDrawer />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/portal');
    expect(screen.getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/portal/wallet');
    expect(screen.getByText('Sam')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledWith(false);
  });
});
