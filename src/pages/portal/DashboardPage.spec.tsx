import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { expectNoA11yViolations } from '@/test/axe';
import { DashboardPage } from './DashboardPage';

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

describe('DashboardPage', () => {
  beforeEach(() => {
    mockedApi.mockReset();
    setMe(parent());
    // sensible defaults; individual tests override
    setApi((p) => (p.includes('/approvals') ? [] : { stars_balance: 0, daily_used: 0, daily_cap: 0 }));
  });

  it('shows the family stat tiles once wallet + approvals load', async () => {
    setApi((p) =>
      p.includes('/approvals')
        ? [{ id: 'a1', status: 'pending' }, { id: 'a2', status: 'granted' }]
        : { stars_balance: 120, daily_used: 8, daily_cap: 30 },
    );

    renderPage(<DashboardPage />);

    expect(await screen.findByText('120')).toBeInTheDocument(); // balance
    expect(screen.getByText('8')).toBeInTheDocument(); // stars used today
    const approvalsLink = screen.getByRole('link', { name: /Approvals waiting/i });
    expect(approvalsLink).toHaveTextContent('1'); // only the one pending approval counts
  });

  it('greets the parent by display name', () => {
    setMe(parent());
    renderPage(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /Hello, Sam/i })).toBeInTheDocument();
  });

  it('renders the "set up your family" empty state and skips data fetches when there is no family', () => {
    setMe(parent(null));
    renderPage(<DashboardPage />);
    expect(screen.getByText('Set up your family')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start setup/i })).toHaveAttribute('href', '/portal/register');
    expect(mockedApi).not.toHaveBeenCalled(); // both queries are disabled without a family
  });

  it('has no a11y violations when populated', async () => {
    setApi((p) =>
      p.includes('/approvals')
        ? [{ id: 'a1', status: 'pending' }]
        : { stars_balance: 120, daily_used: 8, daily_cap: 30 },
    );
    const { container } = renderPage(<DashboardPage />);
    await screen.findByText('120');
    await expectNoA11yViolations(container);
  });
});
