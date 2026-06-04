import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useLogout } from '@/auth/useAuth';
import { mockUseMe } from '@/test/mocks';
import { LearnTopBar } from './LearnTopBar';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn(), useLogout: vi.fn() }));

const logout = vi.fn();
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

beforeEach(() => {
  logout.mockReset();
  mockUseMe(kid);
  vi.mocked(useLogout).mockReturnValue(logout);
});

describe('LearnTopBar', () => {
  it('renders the learn nav, kid nickname and signs out', async () => {
    render(
      <MemoryRouter>
        <LearnTopBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/learn/projects');
    expect(screen.getByRole('link', { name: 'Missions' })).toHaveAttribute('href', '/learn/missions');
    expect(screen.getByText('Robo')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledWith(false);
  });
});
