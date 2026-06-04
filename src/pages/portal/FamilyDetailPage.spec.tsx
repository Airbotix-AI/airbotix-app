import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiByPath } from '@/test/mocks';
import { FamilyDetailPage } from './FamilyDetailPage';

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const kid = {
  id: 'k1',
  nickname: 'Robo',
  age: 9,
  real_name: null,
  daily_star_cap: 30,
  is_active: true,
  family_id: 'f1',
};

function renderAt(kidId = 'k1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/portal/family/${kidId}`]}>
        <Routes>
          <Route path="/portal/family/:kidId" element={<FamilyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => mockedApi.mockReset());

describe('FamilyDetailPage', () => {
  it('populates the edit form from the loaded kid', async () => {
    mockApiByPath(() => kid);
    renderAt();
    expect(await screen.findByDisplayValue('Robo')).toBeInTheDocument();
  });
});
