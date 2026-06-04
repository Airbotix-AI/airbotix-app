import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { BillingPage } from './BillingPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
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

describe('BillingPage', () => {
  it('prompts to set up a family when there is none', () => {
    mockUseMe(parent(null));
    renderPage(<BillingPage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
  });

  it('lists paid Stars Pack purchases', async () => {
    mockApiByPath(() => ({
      items: [
        {
          id: 't1',
          type: 'topup_card',
          delta_stars: 500,
          reason: 'Topup',
          metadata: { pack_sku: 'starter_pack', airwallex_payment_id: 'pay_abcdef123456' },
          created_at: '2026-06-01T10:00:00Z',
        },
      ],
      has_more: false,
      next_cursor: null,
    }));
    renderPage(<BillingPage />);
    expect(await screen.findByText('starter pack')).toBeInTheDocument(); // pack_sku underscores → spaces
    expect(screen.getByText('+500★')).toBeInTheDocument();
  });

  it('shows the empty state when there are no purchases', async () => {
    mockApiByPath(() => ({ items: [], has_more: false, next_cursor: null }));
    renderPage(<BillingPage />);
    expect(await screen.findByText('No purchases')).toBeInTheDocument();
  });
});
