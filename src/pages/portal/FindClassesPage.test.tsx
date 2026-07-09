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
  window.localStorage?.clear();
  vi.clearAllMocks();
});

describe('FindClassesPage', () => {
  it('defaults to the family city, lists purchasable classes, and links to checkout', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/families/fam-1') return Promise.resolve({ id: 'fam-1', city: 'Gold Coast' });
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [{ city: 'Gold Coast', state: 'QLD' }], has_online: false });
      }
      if (path === '/class-seats/classes') return Promise.resolve([]);
      if (path === '/class-seats/classes?city=Gold%20Coast') {
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
        ]);
      }
      return Promise.resolve(undefined);
    });

    renderPage();

    expect(await screen.findByText('Kids AI Game Lab')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pay & lock a seat/ })).toHaveAttribute(
      'href',
      '/portal/checkout/class/class-1',
    );
    expect(screen.getByLabelText('City')).toHaveValue('Gold Coast');
    expect(api).toHaveBeenCalledWith('/class-seats/classes?city=Gold%20Coast');
  });

  it('writes a newly selected city to the family profile', async () => {
    api.mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === 'PATCH') return Promise.resolve({});
      if (path === '/families/fam-1') return Promise.resolve({ id: 'fam-1', city: null });
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [{ city: 'Brisbane', state: 'QLD' }], has_online: false });
      }
      return Promise.resolve([]);
    });

    renderPage();

    await screen.findByRole('option', { name: 'Brisbane, QLD' });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Brisbane' } });

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/families/fam-1', {
        method: 'PATCH',
        body: { city: 'Brisbane' },
      }),
    );
  });

  it('lets a family-city parent choose "All cities" without snapping back (B3)', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/families/fam-1') return Promise.resolve({ id: 'fam-1', city: 'Gold Coast' });
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
      return Promise.resolve([]);
    });

    renderPage();

    // First visit seeds the family city.
    await waitFor(() => expect(screen.getByLabelText('City')).toHaveValue('Gold Coast'));

    // Parent explicitly picks "All cities".
    fireEvent.change(screen.getByLabelText('City'), { target: { value: '__all__' } });

    await waitFor(() => expect(api).toHaveBeenCalledWith('/class-seats/classes'));

    // It must persist and NEVER snap back to the family city on re-render / refetch.
    expect(screen.getByLabelText('City')).toHaveValue('__all__');
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByLabelText('City')).toHaveValue('__all__');
    expect(window.localStorage.getItem('airbotix:portal:class-city')).toBe('__all__');
  });

  it('keeps an explicitly stored "All cities" choice on reload (B3)', async () => {
    window.localStorage.setItem('airbotix:portal:class-city', '__all__');
    api.mockImplementation((path: string) => {
      if (path === '/families/fam-1') return Promise.resolve({ id: 'fam-1', city: 'Gold Coast' });
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [{ city: 'Gold Coast', state: 'QLD' }], has_online: false });
      }
      return Promise.resolve([]);
    });

    renderPage();

    await waitFor(() => expect(api).toHaveBeenCalledWith('/class-seats/classes'));
    // Stored "All cities" is not overridden by Family.city.
    expect(screen.getByLabelText('City')).toHaveValue('__all__');
    expect(api).not.toHaveBeenCalledWith('/class-seats/classes?city=Gold%20Coast');
  });

  it('wires the Online option to ?online=true and never persists it as a city', async () => {
    const patchCalls: unknown[][] = [];
    api.mockImplementation((path: string, opts?: { method?: string }) => {
      if (opts?.method === 'PATCH') {
        patchCalls.push([path, opts]);
        return Promise.resolve({});
      }
      if (path === '/families/fam-1') return Promise.resolve({ id: 'fam-1', city: null });
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [{ city: 'Brisbane', state: 'QLD' }], has_online: true });
      }
      return Promise.resolve([]);
    });

    renderPage();

    await screen.findByRole('option', { name: 'Online' });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: '__online__' } });

    await waitFor(() => expect(api).toHaveBeenCalledWith('/class-seats/classes?online=true'));
    // Never PATCH the family profile, never query ?city=Online, never store 'Online'.
    expect(patchCalls).toHaveLength(0);
    expect(api).not.toHaveBeenCalledWith('/class-seats/classes?city=Online');
    expect(window.localStorage.getItem('airbotix:portal:class-city')).toBe('__online__');
  });

  it('shows a distinct error state with retry when the classes query fails', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/families/fam-1') return Promise.resolve({ id: 'fam-1', city: null });
      if (path === '/families/fam-1/my-classes') {
        return Promise.resolve({ enrollments: [], pending_orders: [], booking_requests: [] });
      }
      if (path === '/class-seats/cities') {
        return Promise.resolve({ cities: [], has_online: false });
      }
      if (path === '/class-seats/classes') return Promise.reject(new Error('boom'));
      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findByText(/Something went wrong loading classes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
    // A transient failure must NOT tell the parent there are no seats.
    expect(screen.queryByText('No open seats')).not.toBeInTheDocument();
  });
});
