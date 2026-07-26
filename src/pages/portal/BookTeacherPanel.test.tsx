// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import { BookTeacherPanel } from './BookTeacherPanel';

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BookTeacherPanel', () => {
  it('submits a family child, learning goal, and preferred time as a tutoring request', async () => {
    api.mockImplementation((path: string, options?: { method?: string }) => {
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
      target: { value: '2026-08-02T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send booking request' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/bookings/tutoring-requests', {
        method: 'POST',
        body: expect.objectContaining({
          kid_id: 'kid-1',
          subject_interest: 'Build a platform game',
          preferred_start: expect.stringMatching(/^2026-08-02T/),
        }),
      });
    });
    expect(await screen.findByText(/Request received\. We’ll match a teacher/)).toBeInTheDocument();
    expect(screen.getByText('Mia · Build a platform game')).toBeInTheDocument();
    expect(screen.getByText('Request received', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows existing request status and directs families without an active child to setup', async () => {
    api.mockImplementation((path: string) => {
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
      if (path === '/teachers/amy-chen')
        return Promise.resolve({ slug: 'amy-chen', display_name: 'Amy Chen' });
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
      target: { value: '2026-08-02T10:00' },
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
});
