// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { CourseIntroSection } from './CourseIntroSection';

const PACKS = [
  {
    id: 'pack-1',
    slug: 'robot-lab',
    title: 'Robot Lab',
    description: 'Fallback robot description.',
    target_age_min: 8,
    target_age_max: 12,
    product_line: 'line_b_coding',
    lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }],
    estimated_stars: 80,
    owner_teacher: null,
  },
  {
    id: 'pack-2',
    slug: 'story-lab',
    title: 'Story Lab',
    description: 'Program an interactive story.',
    target_age_min: 5,
    target_age_max: 8,
    product_line: 'line_a_creative',
    lessons: [{ id: 'lesson-3' }],
    estimated_stars: 40,
    owner_teacher: null,
  },
  {
    id: 'pack-3',
    slug: 'space-game',
    title: 'Space Game',
    description: 'Create a space adventure with real code.',
    target_age_min: 9,
    target_age_max: 14,
    product_line: 'line_b_coding',
    lessons: [{ id: 'lesson-4' }, { id: 'lesson-5' }, { id: 'lesson-6' }],
    estimated_stars: 120,
    owner_teacher: null,
  },
  {
    id: 'pack-4',
    slug: 'extra-course',
    title: 'Fourth Course',
    description: 'This one belongs in the full catalogue.',
    target_age_min: 10,
    target_age_max: 14,
    product_line: 'line_b_coding',
    lessons: [{ id: 'lesson-7' }],
    estimated_stars: 30,
    owner_teacher: null,
  },
];

const CATALOG = [
  {
    slug: 'robot-lab',
    title: 'Robot Lab',
    series: 'Robot Builders',
    format: 'weekly',
    weeks_count: 4,
    age_range: '8–12',
    price_label: 'A$240',
    price_note: null,
    session_length: '60 minutes',
    difficulty: 2,
    compare_ship: 'A working robot challenge',
    compare_best_for: 'Kids who like building and testing',
  },
];

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CourseIntroSection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CourseIntroSection', () => {
  it('shows three parent-readable previews from the sellable course catalogue', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/course-packs?bookable=true') return Promise.resolve(PACKS);
      if (path === '/courses') return Promise.resolve(CATALOG);
      return Promise.resolve([]);
    });

    renderSection();

    const section = await screen.findByRole('region', {
      name: 'See what your child could make next.',
    });
    expect(api).toHaveBeenCalledWith('/course-packs?bookable=true');
    expect(api).toHaveBeenCalledWith('/courses');
    expect(await screen.findByText('Robot Lab')).toBeInTheDocument();
    expect(screen.getByText('Story Lab')).toBeInTheDocument();
    expect(screen.getByText('Space Game')).toBeInTheDocument();
    expect(screen.queryByText('Fourth Course')).not.toBeInTheDocument();
    expect(section.querySelectorAll('article')).toHaveLength(3);
    expect(await screen.findByText('A working robot challenge')).toBeInTheDocument();
    expect(screen.queryByText('Fallback robot description.')).not.toBeInTheDocument();
    expect(screen.getByText('Kids who like building and testing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all courses →' })).toHaveAttribute(
      'href',
      '/portal/courses',
    );
  });

  it('keeps the dashboard useful when course previews fail to load', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/course-packs?bookable=true') return Promise.reject(new Error('offline'));
      return Promise.resolve([]);
    });

    renderSection();

    expect(
      await screen.findByText(/Course previews are taking a moment to load/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all courses →' })).toBeInTheDocument();
  });
});
