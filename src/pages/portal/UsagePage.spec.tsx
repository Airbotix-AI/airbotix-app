import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { UsagePage } from './UsagePage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const parent = (family_id: string | null = 'f1'): AuthPrincipal =>
  ({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id }) as AuthPrincipal;

const summary = {
  total_stars: 120,
  total_requests: 45,
  wow_delta_pct: 10,
  top_kid: { nickname: 'Robo', stars: 80 },
  top_model: 'claude-haiku',
};
const usage = {
  by_kid: [{ kid_id: 'k1', nickname: 'Robo', requests: 45, active_seconds: 600, flagged_count: 0, stars: 80 }],
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

describe('UsagePage', () => {
  it('prompts to set up a family when there is none', () => {
    mockUseMe(parent(null));
    renderPage(<UsagePage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
  });

  it('renders the summary tiles, range toggle, and per-kid breakdown', async () => {
    mockApiByPath((p) => (p.includes('/usage/summary') ? summary : usage));
    renderPage(<UsagePage />);

    expect(screen.getByRole('heading', { name: 'AI usage' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('120')).toBeInTheDocument()); // total stars
    expect(screen.getByText('45')).toBeInTheDocument(); // total requests
    expect(screen.getByRole('button', { name: '28d' })).toBeInTheDocument(); // range toggle
    expect(await screen.findByRole('link', { name: /Details/ })).toBeInTheDocument(); // per-kid row
  });

  it('shows the no-usage empty state when no kid has used AI', async () => {
    mockApiByPath((p) => (p.includes('/usage/summary') ? {} : { by_kid: [] }));
    renderPage(<UsagePage />);
    expect(await screen.findByText('No usage yet')).toBeInTheDocument();
  });
});
