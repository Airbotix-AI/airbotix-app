import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { WalletTopupPage } from './WalletTopupPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/components/CliReturnBanner', () => ({ CliReturnBanner: () => null }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const parent = (family_id: string | null = 'f1'): AuthPrincipal =>
  ({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id }) as AuthPrincipal;

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
  mockUseMe(parent());
});
afterEach(() => vi.unstubAllGlobals());

describe('WalletTopupPage', () => {
  it('prompts to set up a family when there is none', () => {
    mockUseMe(parent(null));
    renderPage(<WalletTopupPage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
  });

  it('renders the Stars packs with their tags', () => {
    renderPage(<WalletTopupPage />);
    expect(screen.getByRole('button', { name: /Starter/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Family/ })).toBeInTheDocument();
    expect(screen.getByText('Popular')).toBeInTheDocument();
    expect(screen.getByText('Best value')).toBeInTheDocument();
  });

  it('starts an Airwallex checkout for the chosen pack', async () => {
    vi.stubGlobal('location', { href: '' });
    mockApiByPath(() => ({
      payment_id: 'pay1',
      checkout_url: 'https://checkout.example',
      pack: 'starter_10',
      stars_credited_pending: 10,
    }));
    renderPage(<WalletTopupPage />);

    await userEvent.click(screen.getByRole('button', { name: /Starter/ }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        '/families/f1/wallet/topup',
        expect.objectContaining({ method: 'POST', body: { pack: 'starter_10' } }),
      ),
    );
  });
});
