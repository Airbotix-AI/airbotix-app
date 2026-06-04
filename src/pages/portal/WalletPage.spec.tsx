import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { expectNoA11yViolations } from '@/test/axe';
import { WalletPage } from './WalletPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));
vi.mock('@/components/CliReturnBanner', () => ({ CliReturnBanner: () => null }));
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

function wallet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    family_id: 'f1',
    stars_balance: 120,
    daily_used: 8,
    weekly_used: 20,
    monthly_used: 50,
    daily_cap: 30,
    weekly_cap: 150,
    monthly_cap: 600,
    per_request_cap: 10,
    paused: false,
    ...overrides,
  };
}

const aTx = {
  id: 't1',
  type: 'topup_card',
  delta_stars: 50,
  balance_after: 120,
  reason: 'Top up',
  kid_id: null,
  created_at: '2026-06-01T10:00:00Z',
};

function mockWallet(w: Record<string, unknown>, items: unknown[]) {
  setApi((p) => {
    if (p.includes('/transactions')) return { items, next_cursor: null, has_more: false };
    if (p.includes('/pause') || p.includes('/resume')) return {};
    if (p.endsWith('/wallet')) return w;
    throw new Error(`unexpected path ${p}`);
  });
}

describe('WalletPage', () => {
  beforeEach(() => {
    mockedApi.mockReset();
    setMe(parent());
  });

  it('prompts to set up a family when there is none', () => {
    setMe(parent(null));
    renderPage(<WalletPage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
  });

  it('renders balance, today/week usage, and a transaction row', async () => {
    mockWallet(wallet(), [aTx]);
    renderPage(<WalletPage />);

    expect(await screen.findByText('120')).toBeInTheDocument(); // balance
    expect(screen.getByText('8/30')).toBeInTheDocument(); // today used/cap
    expect(screen.getByText('20/150')).toBeInTheDocument(); // week used/cap
    expect(screen.getByText('Top up')).toBeInTheDocument(); // tx reason
    expect(screen.getByText('+50')).toBeInTheDocument(); // positive delta
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('shows the Paused banner and a Resume button when the wallet is paused', async () => {
    mockWallet(wallet({ paused: true }), []);
    renderPage(<WalletPage />);

    expect(await screen.findByText(/All kid spending is blocked/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
  });

  it('pausing posts to /families/:id/wallet/pause', async () => {
    mockWallet(wallet(), []);
    renderPage(<WalletPage />);

    const pause = await screen.findByRole('button', { name: 'Pause' });
    await userEvent.click(pause);

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        '/families/f1/wallet/pause',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('shows the empty activity state when there are no transactions', async () => {
    mockWallet(wallet(), []);
    renderPage(<WalletPage />);
    expect(await screen.findByText(/No activity yet/)).toBeInTheDocument();
  });

  it('has no a11y violations when loaded', async () => {
    mockWallet(wallet(), [aTx]);
    const { container } = renderPage(<WalletPage />);
    await screen.findByText('120');
    await expectNoA11yViolations(container);
  });
});
