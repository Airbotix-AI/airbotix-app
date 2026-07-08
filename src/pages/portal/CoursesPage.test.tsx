// @vitest-environment jsdom
// Portal Courses dual CTA (class-seat-checkout-prd.md D-CSC-1): the existing
// "Request a seat" reserve flow stays untouched, and "See class times" lazily
// fetches GET /courses/:slug/classes to offer "Pay now & lock a seat" for each
// purchasable class only.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code = 'ERR',
      message = 'err',
    ) {
      super(message);
    }
  },
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' },
  }),
}));

import { CoursesPage } from './CoursesPage';

const PACKS = [
  {
    id: 'pack-1',
    slug: 'robotics-101',
    title: 'Robotics 101',
    description: 'Build and code robots.',
    target_age_min: 8,
    target_age_max: 12,
    product_line: 'line_b_coding',
    lessons: [{ id: 'les-1' }],
    estimated_stars: 120,
    owner_teacher: null,
  },
];

const CLASSES = [
  {
    id: 'class-1',
    name: 'Saturday AM',
    starts_at: '2026-08-01T00:00:00Z',
    seats_remaining: 7,
    venue: { name: 'Chatswood Lab', suburb: 'Chatswood' },
    course_total_aud_cents: 39900,
    purchasable: true,
  },
  {
    id: 'class-2',
    name: 'Unpriced pilot',
    starts_at: '2026-08-02T00:00:00Z',
    seats_remaining: 5,
    venue: null,
    course_total_aud_cents: null,
    purchasable: false,
  },
];

function wireApi(classes: unknown = CLASSES) {
  api.mockImplementation((path: string) => {
    if (path === '/course-packs') return Promise.resolve(PACKS);
    if (path === '/families/fam-1/kids') return Promise.resolve([]);
    if (path === '/courses/robotics-101/classes') return Promise.resolve(classes);
    return Promise.resolve(undefined);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CoursesPage pay-now CTA', () => {
  it('keeps the reserve CTA and fetches classes only when times are opened', async () => {
    wireApi();
    renderPage();

    expect(await screen.findByText('Request a seat →')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/courses/robotics-101/classes');

    fireEvent.click(screen.getByText('See class times'));

    const pay = await screen.findByRole('link', { name: /Pay now & lock a seat/ });
    expect(pay).toHaveAttribute('href', '/portal/checkout/class/class-1');
    expect(screen.getByText(/starts/)).toHaveTextContent('Saturday AM');
    expect(screen.getByText('Chatswood Lab, Chatswood')).toBeInTheDocument();
    expect(screen.getByText('A$399')).toBeInTheDocument();
    // Non-purchasable classes never get a pay link.
    expect(screen.getAllByRole('link', { name: /Pay now & lock a seat/ })).toHaveLength(1);
    // The reserve CTA is still there alongside.
    expect(screen.getByText('Request a seat →')).toBeInTheDocument();
  });

  it('explains when no class is open for online purchase', async () => {
    wireApi([]);
    renderPage();

    fireEvent.click(await screen.findByText('See class times'));

    expect(
      await screen.findByText(/No classes are open for online purchase yet/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pay now & lock a seat/ })).not.toBeInTheDocument();
  });
});
