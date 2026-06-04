import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassWallViewPage } from './ClassWallViewPage';
import { getClass, getWall, type WallPost } from './classroomApi';

function wallPost(id: string): WallPost {
  return {
    id,
    project_id: 'p1',
    caption: null,
    title: 'A project',
    kid_nickname: 'Robo',
    thumbnail_url: null,
    reaction_counts: {},
    my_reaction: null,
    is_owner: false,
    shared_at: '2026-06-01T10:00:00Z',
  };
}

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
  mockedGetClass.mockResolvedValue({ id: 'c1', name: 'Room 5', term: 'T1', is_live: false });
});

describe('ClassWallViewPage', () => {
  it('renders the class name and a card per wall post', async () => {
    mockedGetWall.mockResolvedValue([wallPost('wp1'), wallPost('wp2')]);
    renderAt();
    expect(await screen.findByRole('heading', { name: /Room 5/ })).toBeInTheDocument();
    expect(await screen.findAllByTestId('wall-card')).toHaveLength(2);
  });

  it('shows the empty state when nothing is shared', async () => {
    mockedGetWall.mockResolvedValue([]);
    renderAt();
    expect(await screen.findByText('Nothing yet')).toBeInTheDocument();
  });
});
