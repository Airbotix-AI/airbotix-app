// @vitest-environment jsdom
// Pack detail (/learn/missions/:slug) under the Lesson(content)/Mission(task) split:
// a pack renders its ordered Lessons (课节), and each Lesson renders its kid-facing
// Mission task(s). FE-only — `@/lib/api` is mocked (no network).

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { PackLessonsPage } from './PackLessonsPage';

const PACK = {
  id: 'p1',
  slug: 'creative-starter',
  title: 'Creative Starter',
  description: 'A gentle intro.',
  target_age_min: 7,
  target_age_max: 9,
  product_line: 'line_a_creative' as const,
  estimated_stars: 30,
  lessons: [
    {
      id: 'l1',
      slug: 'first-lesson',
      title: 'First Lesson',
      description: 'Warm up.',
      order_index: 0,
      missions: [
        {
          id: 'm1',
          slug: 'draw-a-cat',
          title: 'Draw a cat',
          description: 'Make a picture.',
          estimated_stars: 5,
          order_index: 0,
        },
      ],
    },
  ],
};

function renderPack() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/learn/missions/creative-starter']}>
        <Routes>
          <Route path="/learn/missions/:id" element={<PackLessonsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PackLessonsPage (pack → Lessons → Mission tasks)', () => {
  it('renders the pack content count as a count of Lessons (课节), not Mission tasks', async () => {
    api.mockResolvedValue(PACK);
    renderPack();
    // 1 Lesson in the pack — the headline count is lessons.length, singular.
    expect(await screen.findByText(/1 lesson · 30★ total/)).toBeInTheDocument();
  });

  it('renders each Lesson and its nested kid Mission task(s)', async () => {
    api.mockResolvedValue(PACK);
    renderPack();
    expect(await screen.findByText('First Lesson')).toBeInTheDocument();
    // The Mission task lives inside the Lesson with a Start button.
    const task = (await screen.findByText('Draw a cat')).closest('li');
    expect(task).not.toBeNull();
    expect(within(task as HTMLElement).getByText(/5★ to complete/)).toBeInTheDocument();
    expect(within(task as HTMLElement).getByRole('button', { name: /Start/ })).toBeInTheDocument();
  });
});
