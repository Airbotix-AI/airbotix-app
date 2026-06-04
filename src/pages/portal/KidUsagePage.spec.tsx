import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiByPath } from '@/test/mocks';
import { KidUsagePage } from './KidUsagePage';

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);

const detail = {
  nickname: 'Robo',
  stars: 80,
  requests: 45,
  active_seconds: 600,
  tokens_in: 1000,
  tokens_out: 2000,
  by_task_type: { image: { stars: 50, requests: 20 } },
  by_model: { 'claude-haiku': { stars: 80, calls: 45 } },
  flagged_count: 0,
  approvals_asked: 2,
  approvals_granted: 1,
};

function renderAt(kidId = 'k1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/portal/usage/${kidId}`]}>
        <Routes>
          <Route path="/portal/usage/:kidId" element={<KidUsagePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => mockedApi.mockReset());

describe('KidUsagePage', () => {
  it('renders the per-kid stat tiles and tool/model breakdown', async () => {
    mockApiByPath((p) => (p.includes('/trend') ? [] : detail));
    renderAt();

    expect(await screen.findByRole('heading', { name: /Robo — AI usage/ })).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument(); // stars
    expect(screen.getByText('45')).toBeInTheDocument(); // requests
    expect(screen.getByText('By tool')).toBeInTheDocument();
    expect(screen.getByText('By model')).toBeInTheDocument();
  });

  it('shows the no-data state when the kid has no usage', async () => {
    mockApiByPath((p) => (p.includes('/trend') ? [] : null));
    renderAt();
    expect(await screen.findByText('No data')).toBeInTheDocument();
  });
});
