import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { FamilyListPage } from './FamilyListPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const parent = (family_id: string | null = 'f1'): AuthPrincipal =>
  ({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id }) as AuthPrincipal;

const familyData = { id: 'f1', name: 'The Smiths', code: 'SMITH1', region: 'AU', primary_email: 'p@e.com' };
const kid = {
  id: 'k1',
  nickname: 'Robo',
  age: 9,
  pin_hash: null,
  is_active: true,
  daily_star_cap: 30,
  created_at: '2026-06-01T10:00:00Z',
  deleted_at: null,
};

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

describe('FamilyListPage', () => {
  it('prompts to set up a family when there is none', () => {
    mockUseMe(parent(null));
    renderPage(<FamilyListPage />);
    expect(screen.getByText('No family yet')).toBeInTheDocument();
  });

  it('shows the family code and a card per kid', async () => {
    mockApiByPath((p) => (p.endsWith('/kids') ? [kid] : familyData));
    renderPage(<FamilyListPage />);

    expect(await screen.findByText('The Smiths')).toBeInTheDocument();
    expect(screen.getByText('SMITH1')).toBeInTheDocument();
    expect(screen.getByText('Robo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add kid/ })).toBeInTheDocument();
  });

  it('shows the empty state when the family has no kids', async () => {
    mockApiByPath((p) => (p.endsWith('/kids') ? [] : familyData));
    renderPage(<FamilyListPage />);
    expect(await screen.findByText('No kids yet')).toBeInTheDocument();
  });
});
