// @vitest-environment jsdom
// "My Works" (/learn/projects) — segmented grouping (All · Personal · classes),
// the ⋯ placement menu (PATCH /projects/:id/placement), and the destructive
// "Move to Personal" confirm. FE-only: `@/lib/api` + `@/auth/useAuth` mocked.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
// Local thumbnail loader hits IndexedDB — stub it out.
vi.mock('./playground/projectPersistence', () => ({ loadThumbnail: vi.fn(async () => null) }));

import { ProjectsListPage } from './ProjectsListPage';

const CLASSES = [
  {
    id: 'class-1',
    name: 'Year 5 AI Lab',
    status: 'active',
    course_title: null,
    cover_image_url: null,
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
    id: 'p-personal',
    title: 'My Dragon Story',
    kind: 'creative',
    product_line: 'line_a_creative',
    visibility: 'private',
    class_id: null,
    thumbnail_s3_key: null,
    star_cost_total: 0,
    artifact_count: 1,
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-classwork',
    title: 'Maze Game',
    kind: 'game',
    product_line: 'line_b_coding',
    visibility: 'class_work',
    class_id: 'class-1',
    thumbnail_s3_key: null,
    star_cost_total: 0,
    artifact_count: 2,
    status: 'in_progress',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-onwall',
    title: 'Robot in Space',
    kind: 'creative',
    product_line: 'line_a_creative',
    visibility: 'class',
    class_id: 'class-1',
    thumbnail_s3_key: null,
    star_cost_total: 0,
    artifact_count: 1,
    status: 'accepted',
    updated_at: new Date().toISOString(),
  },
];

// Route the api mock by path: projects list, classes list, placement PATCH.
function wireApi() {
  api.mockImplementation((path: string, opts?: { method?: string }) => {
    if (path === '/classes/mine') return Promise.resolve(CLASSES);
    if (path === '/kids/kid-1/projects') return Promise.resolve(PROJECTS);
    if (path.includes('/placement') && opts?.method === 'PATCH') return Promise.resolve(undefined);
    return Promise.resolve(undefined);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjectsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProjectsListPage — grouping', () => {
  it('groups by Personal + each enrolled class and exposes a class tab', async () => {
    wireApi();
    renderPage();
    expect(await screen.findByText('My Dragon Story')).toBeInTheDocument();

    // Segmented tabs include All, Personal, and the class name.
    const tabs = screen.getByTestId('works-tabs');
    expect(within(tabs).getByText('All')).toBeInTheDocument();
    expect(within(tabs).getByText('Personal')).toBeInTheDocument();
    expect(within(tabs).getByText('Year 5 AI Lab')).toBeInTheDocument();

    // The class group label renders the class-work + on-wall projects.
    expect(screen.getByText('Maze Game')).toBeInTheDocument();
    expect(screen.getByText('Robot in Space')).toBeInTheDocument();
  });

  it('shows placement badges separate from working/finished status', async () => {
    wireApi();
    renderPage();
    await screen.findByText('Maze Game');
    // class_work badge + on_wall badge both present.
    expect(screen.getByText('Class work')).toBeInTheDocument();
    expect(screen.getByText('On the wall')).toBeInTheDocument();
  });
});

describe('ProjectsListPage — ⋯ placement menu', () => {
  it('Personal → "Use for a class" sends PATCH use_for_class with class_id', async () => {
    wireApi();
    renderPage();
    await screen.findByText('My Dragon Story');

    const card = screen.getByText('My Dragon Story').closest('[data-testid="work-card"]')!;
    fireEvent.click(within(card as HTMLElement).getByTestId('work-kebab'));
    fireEvent.click(within(card as HTMLElement).getByTestId('action-use-for-class'));
    // Class picker → choose the class.
    fireEvent.click(within(card as HTMLElement).getByTestId('class-picker-option'));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/projects/p-personal/placement', {
        method: 'PATCH',
        body: { action: 'use_for_class', class_id: 'class-1' },
      }),
    );
  });

  it('On the wall → "Take off the wall" sends PATCH take_off_wall', async () => {
    wireApi();
    renderPage();
    await screen.findByText('Robot in Space');

    const card = screen.getByText('Robot in Space').closest('[data-testid="work-card"]')!;
    fireEvent.click(within(card as HTMLElement).getByTestId('work-kebab'));
    fireEvent.click(within(card as HTMLElement).getByTestId('action-take-off-wall'));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/projects/p-onwall/placement', {
        method: 'PATCH',
        body: { action: 'take_off_wall' },
      }),
    );
  });

  it('Class work → "Move to Personal" requires a confirm before PATCH', async () => {
    wireApi();
    renderPage();
    await screen.findByText('Maze Game');

    const card = screen.getByText('Maze Game').closest('[data-testid="work-card"]')!;
    fireEvent.click(within(card as HTMLElement).getByTestId('work-kebab'));
    fireEvent.click(within(card as HTMLElement).getByTestId('action-move-personal'));

    // Confirm dialog appears; no PATCH yet.
    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith(
      '/projects/p-classwork/placement',
      expect.objectContaining({ method: 'PATCH' }),
    );

    // Confirm → PATCH move_to_personal fires.
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/projects/p-classwork/placement', {
        method: 'PATCH',
        body: { action: 'move_to_personal' },
      }),
    );
  });

  it('cancelling the "Move to Personal" confirm sends no PATCH', async () => {
    wireApi();
    renderPage();
    await screen.findByText('Maze Game');

    const card = screen.getByText('Maze Game').closest('[data-testid="work-card"]')!;
    fireEvent.click(within(card as HTMLElement).getByTestId('work-kebab'));
    fireEvent.click(within(card as HTMLElement).getByTestId('action-move-personal'));
    fireEvent.click(await screen.findByTestId('confirm-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(api).not.toHaveBeenCalledWith(
      '/projects/p-classwork/placement',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
