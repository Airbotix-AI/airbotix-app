import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { ApprovalsPage } from './ApprovalsPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedUseMe = vi.mocked(useMe);
const mockedApi = vi.mocked(api);

function parent(family_id: string | null = 'f1'): AuthPrincipal {
  return {
    kind: 'user',
    sub: 'u1',
    email: 'p@e.com',
    display_name: 'Sam',
    role: 'parent',
    family_id,
  } as AuthPrincipal;
}

function setMe(data: AuthPrincipal) {
  mockedUseMe.mockReturnValue({ data } as ReturnType<typeof useMe>);
}

function setApi(impl: (path: string) => unknown) {
  mockedApi.mockImplementation(((p: string) => Promise.resolve(impl(p))) as unknown as typeof api);
}

function renderPage(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const pendingExtraStars = {
  id: 'a1',
  type: 'extra_stars',
  status: 'pending',
  payload: { amount: 20, reason: 'a big project' },
  kid_id: 'k1',
  created_at: '2026-06-01T10:00:00Z',
  expires_at: null,
};
const grantedShare = {
  id: 'a2',
  type: 'public_share',
  status: 'granted',
  payload: { title: 'My game' },
  kid_id: 'k1',
  created_at: '2026-06-01T09:00:00Z',
  expires_at: null,
};

describe('ApprovalsPage', () => {
  beforeEach(() => {
    mockedApi.mockReset();
    setMe(parent());
  });

  it('prompts to set up a family when there is none', () => {
    setMe(parent(null));
    renderPage(<ApprovalsPage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start setup/i })).toHaveAttribute('href', '/portal/register');
  });

  it('lists pending requests with Grant/Deny plus a resolved item', async () => {
    setApi(() => [pendingExtraStars, grantedShare]);
    renderPage(<ApprovalsPage />);

    expect(await screen.findByText('Extra Stars')).toBeInTheDocument();
    expect(screen.getByText(/Needs 20 extra Stars for a big project/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument();
    expect(screen.getByText('Recently resolved')).toBeInTheDocument();
    expect(screen.getByText('Public share')).toBeInTheDocument();
  });

  it('shows the all-caught-up empty state when nothing is pending', async () => {
    setApi(() => [grantedShare]);
    renderPage(<ApprovalsPage />);
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
  });

  it('grants a pending approval via POST /approvals/:id/grant', async () => {
    setApi((p) => (p.includes('/grant') ? {} : [pendingExtraStars]));
    renderPage(<ApprovalsPage />);

    const grant = await screen.findByRole('button', { name: 'Grant' });
    await userEvent.click(grant);

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        '/approvals/a1/grant',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
