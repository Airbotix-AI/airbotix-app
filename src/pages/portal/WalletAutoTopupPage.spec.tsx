import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { WalletAutoTopupPage } from './WalletAutoTopupPage';
import type { AutoTopupConfig } from './walletTypes';

const config: AutoTopupConfig = {
  auto_topup_enabled: false,
  auto_topup_threshold_stars: 10,
  auto_topup_sku: null,
  auto_topup_payment_method_id: null,
  auto_topup_daily_cap_aud_cents: 2000,
  auto_topup_monthly_cap_aud_cents: 10000,
  auto_topup_failure_threshold: 3,
};

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const parent = (family_id: string | null): AuthPrincipal =>
  ({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id }) as AuthPrincipal;

function renderPage(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.mocked(api).mockReset());

describe('WalletAutoTopupPage', () => {
  it('prompts to set up a family when there is none', () => {
    mockUseMe(parent(null));
    renderPage(<WalletAutoTopupPage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
  });

  it('seeds the opt-in form from the saved config (off by default)', async () => {
    mockUseMe(parent('f1'));
    mockApiByPath((p) => (p.includes('/auto-topup') ? config : [])); // methods → []
    renderPage(<WalletAutoTopupPage />);

    expect(await screen.findByRole('heading', { name: 'Auto-topup' })).toBeInTheDocument();
    // Form seeded from cfg → toggle reflects disabled, threshold pill is selected.
    expect(await screen.findByRole('button', { name: /OFF/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('10★')).toBeInTheDocument();
  });
});
