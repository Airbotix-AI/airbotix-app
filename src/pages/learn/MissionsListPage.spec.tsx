import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { MissionsListPage } from './MissionsListPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const kid = (age = 10): AuthPrincipal =>
  ({ kind: 'kid', sub: 'k1', nickname: 'Robo', age, family_id: 'f1' }) as AuthPrincipal;

const pack = {
  id: 'cp1',
  slug: 'ai-pet-lab',
  title: 'AI Pet Lab',
  description: 'Make an AI pet.',
  target_age_min: 8,
  target_age_max: 11,
  product_line: 'line_a_creative',
  mission_count: 4,
  estimated_stars: 14,
  missions: [],
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
  mockUseMe(kid());
});

describe('MissionsListPage', () => {
  it('groups age-appropriate course packs under a "just right" section', async () => {
    mockApiByPath(() => [pack]);
    renderPage(<MissionsListPage />);
    expect(await screen.findByText('AI Pet Lab')).toBeInTheDocument();
    expect(screen.getByText(/Just right for age 10/)).toBeInTheDocument();
  });

  it('shows the coming-soon state when there are no packs', async () => {
    mockApiByPath(() => []);
    renderPage(<MissionsListPage />);
    expect(await screen.findByText('Coming soon')).toBeInTheDocument();
  });
});
