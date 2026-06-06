import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useAuthStore } from '@/auth/authStore';
import { useLogout } from '@/auth/useAuth';
import { mockUseMe } from '@/test/mocks';
import { RegisterPage } from './RegisterPage';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn(), useLogout: vi.fn() }));

const parent = (family_id: string | null): AuthPrincipal =>
  ({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id }) as AuthPrincipal;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  // The page now guards on a bootstrapped, authenticated parent session before
  // it shows the form (otherwise: "Loading session…" or bounce to login).
  useAuthStore.setState({ accessToken: 'jwt', bootstrapped: true });
  vi.mocked(useLogout).mockReturnValue(vi.fn());
});

describe('RegisterPage', () => {
  it('redirects to the portal when the parent already has a family', async () => {
    mockUseMe(parent('f1'));
    renderPage();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/portal', { replace: true }));
  });

  it('renders the family setup form for a brand-new parent', () => {
    mockUseMe(parent(null));
    const { container } = renderPage();
    expect(container.querySelector('form')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
