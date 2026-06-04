import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiByPath } from '@/test/mocks';
import { ClassPostPage } from './ClassPostPage';
import { getWall } from './classroomApi';

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));
vi.mock('./classroomApi', async (orig) => ({
  ...(await orig<typeof import('./classroomApi')>()),
  getWall: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const mockedGetWall = vi.mocked(getWall);

function renderAt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/learn/classroom/c1/post/pp1']}>
        <Routes>
          <Route path="/learn/classroom/:classId/post/:projectId" element={<ClassPostPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApi.mockReset();
  mockedGetWall.mockReset();
  mockedGetWall.mockResolvedValue([]);
});

describe('ClassPostPage', () => {
  it('renders the shared project title', async () => {
    mockApiByPath((p) =>
      p.includes('/artifacts') ? [] : { id: 'pp1', title: 'My Game', visibility: 'class' },
    );
    renderAt();
    expect(await screen.findByRole('heading', { name: 'My Game' })).toBeInTheDocument();
  });

  it('shows a not-found state when the project is missing', async () => {
    mockApiByPath((p) => (p.includes('/artifacts') ? [] : null));
    renderAt();
    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });
});
