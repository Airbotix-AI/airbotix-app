// @vitest-environment jsdom
// My Classes list (/learn/classroom) — enriched cards, Active + Finished
// sections, empty state. FE-only: `@/lib/api` + `@/auth/useAuth` mocked.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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

import { ClassroomListPage } from './ClassroomListPage';
import type { ClassMineSummary } from './classroomApi';

function makeClass(o: Partial<ClassMineSummary>): ClassMineSummary {
  return {
    id: 'c1',
    name: 'Year 5 AI Lab',
    status: 'active',
    course_title: 'AI Creative Coding · Term 2',
    cover_image_url: null,
    allowed_kinds: ['creative', 'code', 'game', 'blocks'],
    teacher_name: 'Ms. Chen',
    teacher_avatar_url: null,
    classmate_count: 12,
    is_live: false,
    next_session_at: null,
    lessons_total: 8,
    lessons_done: 3,
    stars_earned: 0,
    ...o,
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ClassroomListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClassroomListPage', () => {
  it('renders enriched cards in Active + Finished sections', async () => {
    api.mockResolvedValue([
      makeClass({ id: 'c1', name: 'Year 5 AI Lab', status: 'active', is_live: true }),
      makeClass({
        id: 'c2',
        name: 'First Steps in AI',
        status: 'completed',
        teacher_name: 'Mr. Lee',
        lessons_done: 8,
        stars_earned: 240,
      }),
    ]);
    renderPage();

    expect(await screen.findByText('Year 5 AI Lab')).toBeInTheDocument();
    expect(screen.getByText('Ms. Chen')).toBeInTheDocument();
    expect(screen.getByText('3 / 8 lessons')).toBeInTheDocument();
    expect(screen.getByText('● LIVE NOW')).toBeInTheDocument();
    expect(screen.getByText('Enter →')).toBeInTheDocument();

    // Finished section + card with stars + Revisit CTA.
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('First Steps in AI')).toBeInTheDocument();
    expect(screen.getByText('⭐ You earned 240 stars')).toBeInTheDocument();
    expect(screen.getByText('Revisit →')).toBeInTheDocument();
  });

  it('shows the classmate count and links to the class hub', async () => {
    api.mockResolvedValue([makeClass({ id: 'c1', classmate_count: 12 })]);
    renderPage();
    expect(await screen.findByText('12')).toBeInTheDocument();
    const card = screen.getByTestId('class-card');
    expect(card).toHaveAttribute('href', '/learn/classroom/c1');
  });

  it('renders the empty state when the kid has no classes', async () => {
    api.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No class yet')).toBeInTheDocument();
    expect(
      screen.getByText('Ask your parent or teacher to join a class'),
    ).toBeInTheDocument();
  });
});
