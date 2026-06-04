import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockUseMe } from '@/test/mocks';
import { WalletAutoTopupPage } from './WalletAutoTopupPage';

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
});
