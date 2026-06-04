import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassWallViewPage } from './ClassWallViewPage';
import { getClass, getWall } from './classroomApi';

vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));
vi.mock('./classroomApi', async (orig) => ({
  ...(await orig<typeof import('./classroomApi')>()),
  getClass: vi.fn(),
  getWall: vi.fn(),
}));
vi.mock('./WallCard', (): typeof import('./WallCard') => ({
  WallCard: () => <div data-testid="wall-card" />,
}));

const mockedGetClass = vi.mocked(getClass);
const mockedGetWall = vi.mocked(getWall);

function renderAt(classId = 'c1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/learn/classroom/${classId}`]}>
        <Routes>
          <Route path="/learn/classroom/:classId" element={<ClassWallViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedGetClass.mockReset();
  mockedGetWall.mockReset();
  mockedGetClass.mockResolvedValue({ id: 'c1', name: 'Room 5', term: 'T1', is_live: false } as never);
});

describe('ClassWallViewPage', () => {
  it('renders the class name and a card per wall post', async () => {
    mockedGetWall.mockResolvedValue([{ id: 'wp1' }, { id: 'wp2' }] as never);
    renderAt();
    expect(await screen.findByRole('heading', { name: /Room 5/ })).toBeInTheDocument();
    expect(await screen.findAllByTestId('wall-card')).toHaveLength(2);
  });

  it('shows the empty state when nothing is shared', async () => {
    mockedGetWall.mockResolvedValue([] as never);
    renderAt();
    expect(await screen.findByText('Nothing yet')).toBeInTheDocument();
  });
});
