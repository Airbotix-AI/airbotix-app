import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiByPath } from '@/test/mocks';
import { MissionDetailPage } from './MissionDetailPage';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const pack = {
  id: 'cp1',
  slug: 'ai-pet-lab',
  title: 'AI Pet Lab',
  description: 'Make an AI pet.',
  target_age_min: 8,
  target_age_max: 11,
  product_line: 'line_a_creative',
  mission_count: 1,
  estimated_stars: 14,
  missions: [
    { id: 'm1', slug: 'feed', title: 'Feed the pet', description: 'Give it a snack.', estimated_stars: 3, order_index: 0, content_md: '' },
  ],
};

function renderAt(slug = 'ai-pet-lab') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/learn/missions/${slug}`]}>
        <Routes>
          <Route path="/learn/missions/:id" element={<MissionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  mockedApi.mockReset();
});

describe('MissionDetailPage', () => {
  it('renders the course pack and its missions', async () => {
    mockApiByPath(() => pack);
    renderAt();
    expect(await screen.findByRole('heading', { name: 'AI Pet Lab' })).toBeInTheDocument();
    expect(screen.getByText('Feed the pet')).toBeInTheDocument();
  });

  it('starts a mission by navigating to project creation with mission state', async () => {
    mockApiByPath(() => pack);
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: /Start/ }));
    expect(navigate).toHaveBeenCalledWith(
      '/learn/projects/new',
      expect.objectContaining({ state: expect.objectContaining({ mission_id: 'm1', mission_slug: 'feed' }) }),
    );
  });

  it('shows a not-found state when the pack does not exist', async () => {
    mockApiByPath(() => null);
    renderAt();
    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });
});
