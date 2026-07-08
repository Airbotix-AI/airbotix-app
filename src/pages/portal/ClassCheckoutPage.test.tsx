// @vitest-environment jsdom
// Pay-now class seat checkout (/portal/checkout/class/:classId,
// class-seat-checkout-prd.md D-CSC-8): class summary + price render, the pay
// step POSTs /class-seats/checkout and hands off to the Airwallex hosted page,
// family-less parents bounce to /portal/register, and the return-trip poll
// renders the "Seat locked" success state.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, me } = vi.hoisted(() => ({
  api: vi.fn(),
  me: {
    data: {
      kind: 'user',
      family_id: 'fam-1',
      email: 'parent@example.com',
    } as { kind: string; family_id: string | null; email: string },
  },
}));
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
vi.mock('@/auth/useAuth', () => ({ useMe: () => me }));

import { ClassCheckoutPage } from './ClassCheckoutPage';

const CLASS = {
  id: 'class-1',
  name: 'Robotics 101 — Saturday AM',
  delivery_mode: 'in_person',
  starts_at: '2026-08-01T00:00:00Z',
  ends_at: '2026-09-19T02:00:00Z',
  max_students: 10,
  enrolled: 3,
  seats_remaining: 7,
  venue: {
    name: 'Chatswood Lab',
    address_line: '1 Help St',
    suburb: 'Chatswood',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2067',
    country: 'AU',
  },
  fixed_price_aud_cents: null,
  price_aud_cents: null,
  course_total_aud_cents: 39900,
  session_count: 8,
  session_minutes: 90,
  purchasable: true,
  course_pack: { id: 'pack-1', slug: 'robotics-101', title: 'Robotics 101' },
};

const KIDS = [{ id: 'kid-1', nickname: 'Mia', age: 9 }];

function wireApi(handlers: Record<string, unknown> = {}) {
  api.mockImplementation((path: string) => {
    if (path in handlers) return Promise.resolve(handlers[path]);
    if (path === '/class-seats/classes/class-1') return Promise.resolve(CLASS);
    if (path === '/families/fam-1/kids') return Promise.resolve(KIDS);
    return Promise.resolve(undefined);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/portal/checkout/class/class-1']}>
        <Routes>
          <Route path="/portal/checkout/class/:classId" element={<ClassCheckoutPage />} />
          <Route path="/portal/register" element={<div>REGISTER PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  me.data = { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('ClassCheckoutPage', () => {
  it('renders the class summary with venue and price', async () => {
    wireApi();
    renderPage();

    expect(await screen.findByText('Robotics 101 — Saturday AM')).toBeInTheDocument();
    expect(screen.getByText(/Chatswood Lab/)).toBeInTheDocument();
    expect(screen.getByText('A$399')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Pay A\$399 & lock the seat/ }),
    ).toBeInTheDocument();
  });

  it('POSTs /class-seats/checkout for the picked kid and redirects to the hosted page', async () => {
    wireApi({
      '/class-seats/checkout': {
        booking_id: 'bk-1',
        payment_intent_id: 'intent_1',
        checkout_url: 'https://checkout.airwallex.example/intent_1',
      },
    });
    // jsdom navigation isn't implemented — swap in a plain object so the
    // hosted-page redirect (`window.location.href = …`) is observable.
    const original = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...original, href: 'http://localhost/' },
      writable: true,
      configurable: true,
    });
    try {
      renderPage();

      fireEvent.change(await screen.findByLabelText(/Kid/), { target: { value: 'kid-1' } });
      fireEvent.click(screen.getByRole('button', { name: /lock the seat/ }));

      await waitFor(() =>
        expect(api).toHaveBeenCalledWith('/class-seats/checkout', {
          method: 'POST',
          body: { class_id: 'class-1', kid_id: 'kid-1' },
        }),
      );
      await waitFor(() =>
        expect(window.location.href).toBe('https://checkout.airwallex.example/intent_1'),
      );
      // Intent id stashed for the return-trip poll.
      expect(sessionStorage.getItem('class_seat:class-1')).toBe('intent_1');
    } finally {
      Object.defineProperty(window, 'location', {
        value: original,
        writable: true,
        configurable: true,
      });
    }
  });

  it('redirects parents without a family to /portal/register (D-CSC-3)', async () => {
    wireApi();
    me.data = { kind: 'user', family_id: null, email: 'parent@example.com' };
    renderPage();

    expect(await screen.findByText('REGISTER PAGE')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/class-seats/checkout', expect.anything());
  });

  it('polls the order on return and renders the Seat locked state', async () => {
    sessionStorage.setItem('class_seat:class-1', 'intent_9');
    sessionStorage.setItem('class_seat:class-1:kid', 'Mia');
    wireApi({
      '/class-seats/orders/intent_9': { status: 'succeeded', needs_refund: false, enrolled: true },
    });
    renderPage();

    expect(await screen.findByText(/Seat locked for Mia/)).toBeInTheDocument();
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/class-seats/orders/intent_9'),
    );
    // The pending-intent key is cleared so a fresh visit doesn't re-poll.
    expect(sessionStorage.getItem('class_seat:class-1')).toBeNull();
  });

  it('re-offers Pay after a failed payment and clears the stored intent first', async () => {
    sessionStorage.setItem('class_seat:class-1', 'intent_9');
    wireApi({
      '/class-seats/orders/intent_9': { status: 'failed', needs_refund: false, enrolled: false },
    });
    renderPage();

    expect(await screen.findByText(/didn't go through/)).toBeInTheDocument();
    // 'failed' is the ONLY poll outcome allowed to re-offer the live Pay form.
    expect(screen.getByRole('button', { name: /lock the seat/ })).toBeInTheDocument();
    // Stored intent key cleared before Pay is re-offered (no stale intent).
    expect(sessionStorage.getItem('class_seat:class-1')).toBeNull();
  });

  it('poll timeout hides Pay (double-charge guard) and Check again resumes the SAME intent', async () => {
    vi.useFakeTimers();
    try {
      sessionStorage.setItem('class_seat:class-1', 'intent_9');
      sessionStorage.setItem('class_seat:class-1:kid', 'Mia');
      wireApi({
        '/class-seats/orders/intent_9': { status: 'pending', needs_refund: false, enrolled: false },
      });
      renderPage();

      // Burn the whole poll budget (40 attempts × 3 s) with the order still
      // pending — the page must land on the timeout screen.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000 * 40);
      });

      expect(
        screen.getByText(/haven't received your payment confirmation yet/),
      ).toBeInTheDocument();
      // CRITICAL: the payment may still succeed server-side — the live Pay
      // form must NOT render, or a second intent could double-charge.
      expect(screen.queryByRole('button', { name: /lock the seat/ })).not.toBeInTheDocument();
      // The stored intent survives the timeout so Check again can resume it.
      expect(sessionStorage.getItem('class_seat:class-1')).toBe('intent_9');

      const orderCalls = () =>
        api.mock.calls.filter(([path]) => path === '/class-seats/orders/intent_9').length;
      const callsBefore = orderCalls();
      wireApi({
        '/class-seats/orders/intent_9': { status: 'succeeded', needs_refund: false, enrolled: true },
      });
      fireEvent.click(screen.getByRole('button', { name: /Check again/ }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Check again re-polled the SAME stored intent (no new checkout POST)…
      expect(orderCalls()).toBe(callsBefore + 1);
      expect(api).not.toHaveBeenCalledWith('/class-seats/checkout', expect.anything());
      // …and the webhook having landed, the seat is now locked.
      expect(screen.getByText(/Seat locked for Mia/)).toBeInTheDocument();
      expect(sessionStorage.getItem('class_seat:class-1')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the reserve-only explainer when the class is not purchasable', async () => {
    wireApi({
      '/class-seats/classes/class-1': { ...CLASS, purchasable: false, seats_remaining: 0 },
    });
    renderPage();

    expect(
      await screen.findByText(/can't be purchased online right now/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Request a seat from Courses/ })).toHaveAttribute(
      'href',
      '/portal/courses',
    );
    expect(screen.queryByRole('button', { name: /lock the seat/ })).not.toBeInTheDocument();
  });
});
