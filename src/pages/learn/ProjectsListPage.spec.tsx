import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { ProjectsListPage } from './ProjectsListPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

const project = {
  id: 'p1',
  title: 'My Drawing',
  product_line: 'line_a_creative',
  visibility: 'private',
  thumbnail_s3_key: null,
  star_cost_total: 12,
  status: 'in_progress',
  updated_at: '2026-06-01T10:00:00Z',
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
  mockUseMe(kid);
});

describe('ProjectsListPage', () => {
  it('renders a card per project with its status and star cost', async () => {
    mockApiByPath(() => [project]);
    renderPage(<ProjectsListPage />);
    expect(await screen.findByText('My Drawing')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument(); // status underscores → spaces
    expect(screen.getByText('12★')).toBeInTheDocument();
  });

  it('shows the empty state when the kid has no projects', async () => {
    mockApiByPath(() => []);
    renderPage(<ProjectsListPage />);
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
  });
});
