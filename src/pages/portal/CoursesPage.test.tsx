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

const CATALOG = [
  {
    slug: 'robotics-101',
    title: 'Build and Drive a Robot',
    series: 'Tech Lab',
    format: null,
    weeks_count: 4,
    age_range: '8–12',
    price_label: 'A$240',
    price_note: '4 sessions · A$60 per session',
    session_length: '90 min',
    difficulty: 2,
    compare_ship: 'A robot they can drive',
    compare_best_for: 'Hands-on first-time coders',
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

function wireApi({
  classes = CLASSES,
  packs = PACKS,
  catalog = CATALOG,
  kids = [],
}: {
  classes?: unknown;
  packs?: typeof PACKS;
  catalog?: typeof CATALOG;
  kids?: Array<{ id: string; nickname: string; age: number }>;
} = {}) {
  api.mockImplementation((path: string) => {
    // The portal asks for the SELLABLE list only (bookable=true). A bare '/course-packs'
    // request would be the pre-D-6 bug: unpriced drafts shown with a seat button.
    if (path === '/course-packs?bookable=true') return Promise.resolve(packs);
    if (path === '/courses') return Promise.resolve(catalog);
    if (path === '/families/fam-1/kids') return Promise.resolve(kids);
    if (path === '/families/fam-1/my-classes') {
      return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
    }
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

describe('CoursesPage publish gate (D-6)', () => {
  it('requests only courses that are on sale, never the unfiltered pack list', async () => {
    wireApi();
    renderPage();

    expect(await screen.findByText('Build and Drive a Robot')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/course-packs?bookable=true');
    // An unfiltered call would put a seat button on unpriced drafts whose class times 404.
    expect(api).not.toHaveBeenCalledWith('/course-packs');
  });
});

describe('CoursesPage comparison', () => {
  it('joins the runtime marketing comparison fields onto only the bookable packs', async () => {
    wireApi();
    renderPage();

    expect(await screen.findByText('A robot they can drive')).toBeInTheDocument();
    expect(screen.getByText('Hands-on first-time coders')).toBeInTheDocument();
    expect(screen.getByText('A$240')).toBeInTheDocument();
    expect(screen.getByText('4 weeks')).toBeInTheDocument();
    expect(screen.getByTitle('Difficulty 2 out of 4')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/courses');
  });

  it('defaults to the family child and recommends only honest age matches', async () => {
    const olderPack = {
      ...PACKS[0],
      id: 'pack-2',
      slug: 'advanced-code',
      title: 'Advanced Code',
      target_age_min: 13,
      target_age_max: 17,
    };
    const olderCatalog = {
      ...CATALOG[0],
      slug: 'advanced-code',
      title: 'Advanced Code Lab',
      age_range: '13–17',
      difficulty: 4,
      compare_ship: 'A multiplayer game',
      compare_best_for: 'Experienced teenage coders',
    };
    wireApi({
      packs: [...PACKS, olderPack],
      catalog: [...CATALOG, olderCatalog],
      kids: [{ id: 'kid-1', nickname: 'Mia', age: 10 }],
    });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Top picks for Mia' })).toBeInTheDocument();
    expect(screen.getByText(/Based on Mia's age \(10\)/)).toBeInTheDocument();
    expect(screen.getAllByTestId('course-recommendation-card')).toHaveLength(1);
    expect(await screen.findByText('1 course suitable for Mia')).toBeInTheDocument();
    expect(screen.getByText('Good age fit for Mia')).toBeInTheDocument();
    expect(screen.queryByText('Advanced Code Lab')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All children' }));
    expect(await screen.findByText('Advanced Code Lab')).toBeInTheDocument();
    expect(screen.queryByTestId('course-recommendations')).not.toBeInTheDocument();
  });

  it('opens the recommended course and keeps the paired actions exactly the same size', async () => {
    wireApi({ kids: [{ id: 'kid-1', nickname: 'Mia', age: 10 }] });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'View course options' }));

    const request = await screen.findByRole('button', { name: 'Request a seat →' });
    const times = screen.getByRole('button', { name: 'See class times' });
    for (const action of [request, times]) {
      expect(action).toHaveClass('h-12', 'w-full', 'sm:w-[176px]');
    }
  });
});

describe('CoursesPage pay-now CTA', () => {
  it('keeps the reserve CTA and fetches classes only when times are opened', async () => {
    wireApi();
    renderPage();

    fireEvent.click(await screen.findByText('Choose this course'));
    expect(screen.getByText('Request a seat →')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/courses/robotics-101/classes');

    fireEvent.click(screen.getByText('See class times'));

    const pay = await screen.findByRole('link', { name: /Pay now & lock a seat/ });
    expect(pay).toHaveAttribute('href', '/portal/checkout/class/class-1');
    expect(screen.getByText('Saturday AM')).toBeInTheDocument();
    expect(screen.getByText(/Starts Sat.*1 Aug 2026/)).toBeInTheDocument();
    expect(screen.getByText('Chatswood Lab, Chatswood')).toBeInTheDocument();
    expect(screen.getByText('A$399')).toBeInTheDocument();
    // Non-purchasable classes never get a pay link.
    expect(screen.getAllByRole('link', { name: /Pay now & lock a seat/ })).toHaveLength(1);
    // The reserve CTA is still there alongside the paid-class path.
    expect(screen.getByText('Request a seat →')).toBeInTheDocument();
  });

  it('explains when no class is open for online purchase', async () => {
    wireApi({ classes: [] });
    renderPage();

    fireEvent.click(await screen.findByText('Choose this course'));
    fireEvent.click(await screen.findByText('See class times'));

    expect(
      await screen.findByText(/No classes are open for online purchase yet/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pay now & lock a seat/ })).not.toBeInTheDocument();
  });
});
