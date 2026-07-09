// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' } }),
}));

import { MyClassesPanel } from './MyClassesPanel';

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MyClassesPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MyClassesPanel', () => {
  it('renders locked seats, resumable payments, and reserve request status', async () => {
    api.mockResolvedValue({
      enrollments: [
        {
          id: 'enr-1',
          status: 'active',
          enrolled_at: '2026-07-08T00:00:00Z',
          kid: { id: 'kid-1', nickname: 'Mia', age: 9 },
          class: {
            id: 'class-1',
            name: 'Kids AI Game Lab',
            starts_at: '2026-07-18T03:30:00Z',
            ends_at: '2026-07-18T05:00:00Z',
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
            course_pack: { id: 'pack-1', slug: 'game-lab', title: 'AI Game Lab' },
          },
        },
      ],
      pending_orders: [
        {
          payment_intent_id: 'intent-1',
          amount_aud_cents: 3900,
          created_at: '2026-07-08T01:00:00Z',
          class: {
            id: 'class-2',
            name: 'Pending Lab',
            starts_at: '2026-07-19T03:30:00Z',
            ends_at: '2026-07-19T05:00:00Z',
            delivery_mode: 'workshop',
            venue: null,
            course_pack: null,
          },
        },
      ],
      booking_requests: [
        {
          id: 'booking-1',
          status: 'new',
          parent_status: 'received',
          source: 'parent_portal',
          created_at: '2026-07-08T02:00:00Z',
          kid: null,
          course_pack: { id: 'pack-2', slug: 'rhythm-game', title: 'Rhythm Game' },
        },
      ],
    });

    renderPanel();

    expect(await screen.findByText('Kids AI Game Lab')).toBeInTheDocument();
    expect(screen.getByText(/Mia/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resume checkout/ })).toHaveAttribute(
      'href',
      '/portal/checkout/class/class-2',
    );
    expect(screen.getByText('Rhythm Game')).toBeInTheDocument();
    expect(screen.getByText(/within 1 business day/)).toBeInTheDocument();
  });

  it('renders exactly one card per purchase with no phantom "we\'ll contact you" card (B2)', async () => {
    // A pay-now class-seat purchase surfaces as an enrollment + (until confirmed) a
    // pending order. The backend excludes it from booking_requests, so the panel must
    // NOT render an extra "we'll contact you" reserve card for the same purchase.
    api.mockResolvedValue({
      enrollments: [
        {
          id: 'enr-1',
          status: 'active',
          enrolled_at: '2026-07-08T00:00:00Z',
          kid: { id: 'kid-1', nickname: 'Mia', age: 9 },
          class: {
            id: 'class-1',
            name: 'Kids AI Game Lab',
            starts_at: '2026-07-18T03:30:00Z',
            ends_at: '2026-07-18T05:00:00Z',
            delivery_mode: 'workshop',
            venue: null,
            course_pack: { id: 'pack-1', slug: 'game-lab', title: 'AI Game Lab' },
          },
        },
      ],
      pending_orders: [
        {
          payment_intent_id: 'intent-1',
          amount_aud_cents: 3900,
          created_at: '2026-07-08T01:00:00Z',
          class: {
            id: 'class-2',
            name: 'Pending Lab',
            starts_at: '2026-07-19T03:30:00Z',
            ends_at: '2026-07-19T05:00:00Z',
            delivery_mode: 'workshop',
            venue: null,
            course_pack: null,
          },
        },
      ],
      booking_requests: [],
    });

    renderPanel();

    // One locked card + one payment-open card = one card per purchase.
    expect(await screen.findByText('Kids AI Game Lab')).toBeInTheDocument();
    expect(screen.getByText('Pending Lab')).toBeInTheDocument();
    // No phantom reserve card.
    expect(screen.queryByText(/within 1 business day/)).not.toBeInTheDocument();
    expect(screen.queryByText(/contacted you about this request/)).not.toBeInTheDocument();
  });

  it('shows a distinct error state with retry instead of "No bookings yet." on query failure', async () => {
    api.mockRejectedValue(new Error('boom'));

    renderPanel();

    await waitFor(() =>
      expect(screen.getByText(/We couldn’t load your bookings\./)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    // A paid parent must never be told they have no bookings on a transient error.
    expect(screen.queryByText('No bookings yet.')).not.toBeInTheDocument();
  });
});
