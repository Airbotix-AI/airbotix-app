import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useLogout } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { ProfilePage } from './ProfilePage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn(), useLogout: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const logout = vi.fn();
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', age: 9, family_id: 'f1' } as AuthPrincipal;

function renderPage(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApi.mockReset();
  logout.mockReset();
  mockUseMe(kid);
  vi.mocked(useLogout).mockReturnValue(logout);
});

describe('ProfilePage', () => {
  it('shows the kid nickname and account details', () => {
    mockApiByPath(() => []);
    renderPage(<ProfilePage />);
    expect(screen.getByRole('heading', { name: /I'm Robo/ })).toBeInTheDocument();
    expect(screen.getByText('Nickname')).toBeInTheDocument();
  });

  it('signs out when the Sign out button is clicked', async () => {
    mockApiByPath(() => []);
    renderPage(<ProfilePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledWith(false);
  });
});
