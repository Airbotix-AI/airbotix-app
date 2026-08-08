// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { BookTeacherPanel } from './BookTeacherPanel';

// The panel sets `min` on its datetime-local input to now + 1 day, and jsdom
// enforces rangeUnderflow, so a fixed calendar date silently stops submitting
// the form once that date passes. Keep the preferred time relative to now.
const DAY_MS = 24 * 60 * 60 * 1000;
const preferredStart = new Date(Date.now() + 3 * DAY_MS);
const pad = (value: number) => String(value).padStart(2, '0');
const PREFERRED_LOCAL = `${preferredStart.getFullYear()}-${pad(preferredStart.getMonth() + 1)}-${pad(preferredStart.getDate())}T10:00`;
const PREFERRED_ISO = new Date(PREFERRED_LOCAL).toISOString();

function renderPanel(initialEntry = '/portal/tutoring') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <BookTeacherPanel familyId="fam-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ⚠️ The clock is pinned, and it must stay pinned.
//
// The panel puts `min={now + 1 day}` / `max={now + 90 days}` on the
// datetime-local input, and jsdom runs constraint validation before it fires a
// form's `submit` event. So a hard-coded `2026-08-02T10:00` in the fixtures
// below stopped submitting the moment the wall clock passed 2026-08-01 — the
// POST silently never fired, no field error rendered, and three tests here went
// red on their own with nobody having touched the panel. Pinning `now` well
// before that date makes the fixtures mean what they say again, and stops the
// suite from re-expiring in a few weeks.
const NOW = new Date('2026-07-21T09:00:00.000Z');

beforeEach(() => {
  // `shouldAdvanceTime` so React Query's own timers and userEvent's delays are
  // not frozen along with `Date.now()`.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('BookTeacherPanel', () => {
  it('submits a family child, learning goal, and preferred time as a tutoring request', async () => {
    api.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/teachers') return Promise.resolve([]);
      if (path === '/families/fam-1/kids') {
        return Promise.resolve([{ id: 'kid-1', nickname: 'Mia', age: 10, is_active: true }]);
      }
      if (path === '/bookings/tutoring-requests' && options?.method === 'POST') {
        return Promise.resolve({
          id: 'booking-1',
          status: 'new',
          subject_interest: 'Build a platform game',
          preferred_date: '2026-08-02T00:00:00.000Z',
          notes: null,
          created_at: '2026-07-21T00:00:00.000Z',
          already_requested: false,
          kid: { id: 'kid-1', nickname: 'Mia' },
        });
      }
      if (path === '/bookings/tutoring-requests') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Book a teacher →' }));

    const child = await screen.findByLabelText('Child');
    fireEvent.change(child, { target: { value: 'kid-1' } });
    fireEvent.change(screen.getByLabelText('What would your child like help with?'), {
      target: { value: 'Build a platform game' },
    });
    fireEvent.change(screen.getByLabelText('Preferred date and time'), {
      target: { value: PREFERRED_LOCAL },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/bookings/tutoring-requests', {
        method: 'POST',
        body: expect.objectContaining({
          kid_id: 'kid-1',
          subject_interest: 'Build a platform game',
          preferred_start: PREFERRED_ISO,
        }),
      });
    });
    expect(await screen.findByText(/Request received\. We’ll match a teacher/)).toBeInTheDocument();
    expect(screen.getByText('Mia · Build a platform game')).toBeInTheDocument();
    expect(screen.getByText('Request received', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows existing request status and directs families without an active child to setup', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/teachers') return Promise.resolve([]);
      if (path === '/families/fam-1/kids') return Promise.resolve([]);
      if (path === '/bookings/tutoring-requests') {
        return Promise.resolve([
          {
            id: 'booking-2',
            status: 'contacted',
            subject_interest: 'Python basics',
            preferred_date: '2026-08-03T00:00:00.000Z',
            notes: null,
            created_at: '2026-07-21T00:00:00.000Z',
            kid: { id: 'kid-2', nickname: 'Leo' },
          },
        ]);
      }
      return Promise.resolve(undefined);
    });

    renderPanel();
    expect(await screen.findByText('Leo · Python basics')).toBeInTheDocument();
    expect(screen.getByText('Matching teacher')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Book a teacher →' }));
    expect(
      await screen.findByText('Add a child profile before requesting a teacher.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a child →' })).toHaveAttribute(
      'href',
      '/portal/family/new',
    );
  });

  it('submits an approved teacher and city as a non-guaranteed preference', async () => {
    api.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/teachers')
        return Promise.resolve([
          {
            slug: 'amy-chen',
            display_name: 'Amy Chen',
            service_areas: [
              {
                city: 'Brisbane',
                state: 'QLD',
                area_label: 'Southside',
                suburbs: [],
                is_primary: true,
              },
            ],
          },
        ]);
      if (path === '/families/fam-1/kids')
        return Promise.resolve([{ id: 'kid-1', nickname: 'Mia', age: 10, is_active: true }]);
      if (path === '/bookings/tutoring-requests' && options?.method === 'POST')
        return Promise.resolve({
          id: 'booking-3',
          status: 'new',
          subject_interest: 'Creative coding',
          preferred_date: '2026-08-02T00:00:00.000Z',
          notes: null,
          created_at: '2026-07-22T00:00:00.000Z',
          already_requested: false,
          kid: { id: 'kid-1', nickname: 'Mia' },
        });
      if (path === '/bookings/tutoring-requests') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    renderPanel('/portal/tutoring?teacher=amy-chen&city=Brisbane');
    expect(await screen.findByText('Preferred teacher: Amy Chen')).toBeVisible();
    expect(screen.getByText(/record this preference/i)).toBeVisible();
    fireEvent.change(screen.getByLabelText('Child'), { target: { value: 'kid-1' } });
    fireEvent.change(screen.getByLabelText('What would your child like help with?'), {
      target: { value: 'Creative coding' },
    });
    fireEvent.change(screen.getByLabelText('Preferred date and time'), {
      target: { value: PREFERRED_LOCAL },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/bookings/tutoring-requests',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            preferred_teacher_slug: 'amy-chen',
            preferred_city: 'Brisbane',
          }),
        }),
      ),
    );
  });

  it('lets a parent choose an approved teacher directly in the tutoring form', async () => {
    api.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/teachers')
        return Promise.resolve([
          {
            slug: 'amy-chen',
            display_name: 'Amy Chen',
            service_areas: [
              {
                city: 'Brisbane',
                state: 'QLD',
                area_label: 'Southside',
                suburbs: [],
                is_primary: true,
              },
            ],
          },
        ]);
      if (path === '/families/fam-1/kids')
        return Promise.resolve([{ id: 'kid-1', nickname: 'Mia', age: 10, is_active: true }]);
      if (path === '/bookings/tutoring-requests' && options?.method === 'POST')
        return Promise.resolve({
          id: 'booking-4',
          status: 'new',
          subject_interest: 'Python',
          preferred_date: '2026-08-02T00:00:00.000Z',
          notes: null,
          created_at: '2026-07-22T00:00:00.000Z',
          kid: { id: 'kid-1', nickname: 'Mia' },
        });
      if (path === '/bookings/tutoring-requests') return Promise.resolve([]);
      return Promise.resolve(undefined);
    });

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Book a teacher →' }));
    fireEvent.change(await screen.findByLabelText('Child'), { target: { value: 'kid-1' } });
    fireEvent.change(screen.getByLabelText('Preferred teacher (optional)'), {
      target: { value: 'amy-chen' },
    });
    fireEvent.change(screen.getByLabelText('What would your child like help with?'), {
      target: { value: 'Python' },
    });
    fireEvent.change(screen.getByLabelText('Preferred date and time'), {
      target: { value: PREFERRED_LOCAL },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/bookings/tutoring-requests',
        expect.objectContaining({
          body: expect.objectContaining({
            preferred_teacher_slug: 'amy-chen',
            preferred_city: 'Brisbane',
          }),
        }),
      ),
    );
  });
});
