// @vitest-environment jsdom
// Class hub (/learn/classroom/:classId) — tabbed shell (Wall · My work ·
// Lessons · Next class, NO Classmates), graceful "coming soon" for the unbuilt
// V2 tabs, and the in-place "Create for this class" sheet.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super('err');
    }
  },
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-1', nickname: 'Pip' } }),
}));
vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));

import { ClassHubPage } from './ClassHubPage';

const ENRICHED = [
  {
    id: 'class-1',
    name: 'Year 5 AI Lab',
    status: 'active',
    course_title: 'AI Creative Coding',
    cover_image_url: null,
    allowed_kinds: ['game', 'blocks'],
    teacher_name: 'Ms. Chen',
    teacher_avatar_url: null,
    classmate_count: 5,
    is_live: false,
    next_session_at: null,
    lessons_total: 8,
    lessons_done: 3,
    stars_earned: 0,
  },
];

const PROJECTS = [
  {
    id: 'p1',
    title: 'Maze Game',
    kind: 'game',
    product_line: 'line_b_coding',
    visibility: 'class_work',
    class_id: 'class-1',
    thumbnail_s3_key: null,
    star_cost_total: 0,
    artifact_count: 1,
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  },
];

function wireApi() {
  api.mockImplementation((path: string) => {
    if (path === '/classes/mine') return Promise.resolve(ENRICHED);
    if (path === '/classes/class-1') return Promise.resolve({ id: 'class-1', name: 'Year 5 AI Lab' });
    if (path === '/classes/class-1/wall') return Promise.resolve([]);
    if (path === '/kids/kid-1/projects') return Promise.resolve(PROJECTS);
    return Promise.resolve(undefined);
  });
}

function renderHub() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/learn/classroom/class-1']}>
        <Routes>
          <Route path="/learn/classroom/:classId" element={<ClassHubPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClassHubPage', () => {
  it('renders the four tabs and no Classmates tab', async () => {
    wireApi();
    renderHub();
    expect(await screen.findByTestId('tab-wall')).toBeInTheDocument();
    expect(screen.getByTestId('tab-mywork')).toBeInTheDocument();
    expect(screen.getByTestId('tab-lessons')).toBeInTheDocument();
    expect(screen.getByTestId('tab-next')).toBeInTheDocument();
    expect(screen.queryByText('Classmates')).not.toBeInTheDocument();
  });

  it('defaults to the Wall tab', async () => {
    wireApi();
    renderHub();
    expect(await screen.findByText(/What your/)).toBeInTheDocument();
  });

  it('switches to My work and shows this class’s projects', async () => {
    wireApi();
    renderHub();
    fireEvent.click(await screen.findByTestId('tab-mywork'));
    expect(await screen.findByText('My work for this class')).toBeInTheDocument();
    expect(await screen.findByText('Maze Game')).toBeInTheDocument();
  });

  it('renders a graceful "coming soon" for Lessons and Next class', async () => {
    wireApi();
    renderHub();
    fireEvent.click(await screen.findByTestId('tab-lessons'));
    expect(await screen.findByTestId('coming-soon')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-next'));
    expect(await screen.findByText(/schedule is coming soon/)).toBeInTheDocument();
  });

  it('opens the in-place "Create for this class" sheet (no Create-tab jump)', async () => {
    wireApi();
    renderHub();
    fireEvent.click(await screen.findByTestId('hub-create'));
    const sheet = await screen.findByTestId('create-for-class-sheet');
    expect(within(sheet).getByText(/pick a tool/)).toBeInTheDocument();
    // Defaults class work — teacher-visible framing.
    expect(within(sheet).getByText(/Class work/)).toBeInTheDocument();
  });
});
