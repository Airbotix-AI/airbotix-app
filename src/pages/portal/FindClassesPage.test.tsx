// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' } }),
}));
import { FindClassesPage } from './FindClassesPage';
import { formatClassDateLabel } from './classTime';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FindClassesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FindClassesPage', () => {
  it('defaults to all cities and lists bookable classes from different cities', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({
          cities: [
            { city: 'Gold Coast', state: 'QLD' },
            { city: 'Brisbane', state: 'QLD' },
          ],
          has_online: false,
        });
      }
      if (path === '/courses') return Promise.resolve([]);
      if (path === '/class-seats/classes') {
        return Promise.resolve([
          {
            id: 'class-1',
            name: 'Kids AI Game Lab',
            starts_at: '2026-07-18T03:30:00Z',
            ends_at: '2026-07-18T05:00:00Z',
            seats_remaining: 14,
            max_students: 16,
            delivery_mode: 'workshop',
            venue: {
              name: 'Southport Community Centre',
              address_line: '1 Nerang St',
              suburb: 'Southport',
              city: 'Gold Coast',
              state: 'QLD',
              postcode: '4215',
              country: 'AU',
            },
            course_total_aud_cents: 3900,
            session_count: 1,
            session_minutes: 90,
            course_pack: { id: 'pack-1', slug: 'game-lab', title: 'AI Game Lab' },
          },
          {
            id: 'class-2',
            name: 'Brisbane AI Builders',
            starts_at: '2026-07-19T03:30:00Z',
            ends_at: '2026-07-19T05:00:00Z',
            seats_remaining: 8,
            max_students: 12,
            delivery_mode: 'weekly',
            venue: {
              name: 'Brisbane Community Hub',
              address_line: '1 Queen St',
              suburb: 'Brisbane City',
              city: 'Brisbane',
              state: 'QLD',
              postcode: '4000',
              country: 'AU',
            },
            course_total_aud_cents: 12900,
            session_count: 6,
            session_minutes: 90,
            course_pack: { id: 'pack-2', slug: 'ai-builders', title: 'AI Builders' },
          },
        ]);
      }
      return Promise.resolve(undefined);
    });

    renderPage();

    expect(await screen.findByText('18 Jul · 1:30 pm')).toBeInTheDocument();
    expect(screen.getByText('19 Jul · 1:30 pm')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Class timetable' })).toBeInTheDocument();
    expect(screen.getByText('2 courses across all cities')).toBeInTheDocument();
    expect(document.querySelector('a[href="/portal/checkout/class/class-1"]')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AI Game Lab' })).toHaveAttribute(
      'href',
      '/portal/courses/game-lab',
    );
    expect(screen.getByLabelText('City')).toHaveValue('__all__');
    expect(api).toHaveBeenCalledWith('/class-seats/classes');
  });

  it('filters by city without changing the family profile', async () => {
    api.mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === 'PATCH') return Promise.resolve({});
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [{ city: 'Brisbane', state: 'QLD' }], has_online: false });
      }
      if (path === '/courses') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderPage();

    await screen.findByRole('option', { name: 'Brisbane, QLD' });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Brisbane' } });

    await waitFor(() => expect(api).toHaveBeenCalledWith('/class-seats/classes?city=Brisbane'));
    expect(api.mock.calls.some(([, opts]) => opts?.method === 'PATCH')).toBe(false);
  });

  it('wires the Online option to ?online=true and never persists it as a city', async () => {
    const patchCalls: unknown[][] = [];
    api.mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === 'PATCH') {
        patchCalls.push([path, opts]);
        return Promise.resolve({});
      }
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [{ city: 'Brisbane', state: 'QLD' }], has_online: true });
      }
      if (path === '/courses') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderPage();

    await screen.findByRole('option', { name: 'Online' });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: '__online__' } });

    await waitFor(() => expect(api).toHaveBeenCalledWith('/class-seats/classes?online=true'));
    // Never PATCH the family profile or query ?city=Online.
    expect(patchCalls).toHaveLength(0);
    expect(api).not.toHaveBeenCalledWith('/class-seats/classes?city=Online');
  });

  it('shows a distinct error state with retry when the classes query fails', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [], has_online: false });
      }
      if (path === '/courses') return Promise.resolve([]);
      if (path === '/class-seats/classes') return Promise.reject(new Error('boom'));
      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findByText(/Something went wrong loading classes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
    // A transient failure must NOT tell the parent there are no seats.
    expect(screen.queryByText('No open seats')).not.toBeInTheDocument();
  });

  it('shows planned courses from every catalog city when no class seats are open', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [], has_online: false });
      }
      if (path === '/class-seats/classes') return Promise.resolve([]);
      if (path === '/courses') {
        return Promise.resolve([
          {
            slug: 'ai-study-tools',
            title: 'Make Amazing Slides & Study Tools with AI',
          },
        ]);
      }
      if (path === '/courses/ai-study-tools') {
        return Promise.resolve({
          page_config: {
            plannedOfferings: [
              {
                city: 'Brisbane',
                state: 'QLD',
                periodLabel: 'Term 4 2026',
                deliveryLabel: '6 weekly sessions',
              },
              {
                city: 'Sydney',
                state: 'NSW',
                periodLabel: 'Term 4 2026',
                deliveryLabel: '6 weekly sessions',
              },
            ],
          },
        });
      }
      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findByText('2 courses across all cities')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Class timetable' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Brisbane, QLD' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sydney, NSW' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Make Amazing Slides & Study Tools with AI' })).toHaveLength(2);
    expect(screen.getAllByTestId('classes-timetable-scroll')[0]).toHaveClass('overflow-x-auto');
    expect(document.querySelector('img[aria-hidden="true"]')).toHaveAttribute(
      'src',
      '/media/course-stickers/ai-study-tools.webp',
    );

    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Sydney' } });
    await waitFor(() => expect(screen.getByText('1 course in Sydney')).toBeInTheDocument());
    expect(screen.getAllByRole('link', { name: 'Make Amazing Slides & Study Tools with AI' })).toHaveLength(1);
  });
});

describe('formatClassDateLabel', () => {
  it('uses the venue state time zone instead of the runtime machine time zone', () => {
    expect(formatClassDateLabel('2026-07-18T03:30:00Z', 'QLD')).toBe('18 Jul · 1:30 pm');
    expect(formatClassDateLabel('2026-01-18T03:30:00Z', 'NSW')).toBe('18 Jan · 2:30 pm');
  });
});
