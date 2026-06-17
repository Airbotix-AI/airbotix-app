// @vitest-environment jsdom
// "Student work" review view inside the teacher dashboard
// (teacher-class-work-prd.md §3/§6): per-kid class-work cards rendered from
// GET /classes/:id/student-work; opening a card reuses the EXISTING per-kid
// route (/teacher/classes/:classId/kids/:kidId → LiveViewPage). FE-only:
// `@/lib/api` mocked.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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

import { StudentWorkView } from './StudentWorkView';

const STUDENT_WORK = [
  {
    kid_id: 'kid-a',
    nickname: 'Ava',
    projects: [
      {
        id: 'p-wall',
        title: 'Wall game',
        kind: 'game',
        status: 'in_progress',
        visibility: 'class',
        on_wall: true,
        thumbnail_s3_key: 'thumbs/p-wall.png',
        last_activity_at: '2026-06-15T10:00:00.000Z',
      },
      {
        id: 'p-work',
        title: 'Class doodle',
        kind: 'creative',
        status: 'accepted',
        visibility: 'class_work',
        on_wall: false,
        thumbnail_s3_key: null,
        last_activity_at: '2026-06-15T09:00:00.000Z',
      },
    ],
  },
  { kid_id: 'kid-b', nickname: 'Bo', projects: [] },
];

function wireApi() {
  api.mockImplementation((path: string) => {
    if (path === '/classes/class-1/student-work') return Promise.resolve(STUDENT_WORK);
    return Promise.resolve(undefined);
  });
}

// Probe so the test can assert which route an "open project" click navigated to.
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/teacher/classes/class-1']}>
        <LocationProbe />
        <Routes>
          <Route path="/teacher/classes/:classId" element={<StudentWorkView classId="class-1" />} />
          <Route path="/teacher/classes/:classId/kids/:kidId" element={<div>live view</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StudentWorkView', () => {
  it('calls GET /classes/:id/student-work and renders per-kid class-work cards', async () => {
    wireApi();
    renderView();

    expect(await screen.findByText('Wall game')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/classes/class-1/student-work');

    // Grouped by kid — both nicknames surface, the on-wall badge only on the
    // shared project, and kind/status badges render.
    expect(screen.getByText('Ava')).toBeInTheDocument();
    expect(screen.getByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('Class doodle')).toBeInTheDocument();
    expect(screen.getAllByTestId('on-wall-badge')).toHaveLength(1);
  });

  it('opening a project navigates to the existing per-kid LiveView route', async () => {
    wireApi();
    renderView();

    const card = (await screen.findByText('Wall game')).closest(
      '[data-testid="student-work-card"]',
    )!;
    fireEvent.click(card as HTMLElement);

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/teacher/classes/class-1/kids/kid-a',
      ),
    );
  });

  it('shows an empty state when no kid has class work', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/classes/class-1/student-work')
        return Promise.resolve([{ kid_id: 'kid-a', nickname: 'Ava', projects: [] }]);
      return Promise.resolve(undefined);
    });
    renderView();

    expect(await screen.findByTestId('student-work-empty')).toBeInTheDocument();
    // No project cards rendered.
    expect(within(document.body).queryByTestId('student-work-card')).not.toBeInTheDocument();
  });
});
