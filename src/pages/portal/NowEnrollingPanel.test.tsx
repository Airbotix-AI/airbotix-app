// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AvailableClass } from './availableClasses';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { NowEnrollingPanel } from './NowEnrollingPanel';

function makeClass(overrides: Partial<AvailableClass> & { id: string }): AvailableClass {
  return {
    name: 'Build a Rhythm Game with AI',
    starts_at: '2026-07-26T04:00:00.000Z',
    ends_at: '2026-07-26T05:30:00.000Z',
    seats_remaining: 5,
    max_students: 6,
    delivery_mode: 'workshop',
    venue: {
      name: 'Office-Brisbane City',
      suburb: 'Brisbane City',
      city: 'Brisbane',
      state: 'QLD',
    } as AvailableClass['venue'],
    course_total_aud_cents: 900,
    session_count: 1,
    session_minutes: 90,
    course_pack: { id: 'cp1', slug: 'rhythm-game', title: 'Rhythm Game' },
    ...overrides,
  };
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NowEnrollingPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NowEnrollingPanel', () => {
  it('queries every city (no ?city=) so parents see classes opening anywhere', async () => {
    api.mockResolvedValue([]);
    renderPanel();

    await screen.findByText('No classes are open just yet.');
    expect(api).toHaveBeenCalledWith('/class-seats/classes');
  });

  it('shows open classes with a checkout link and caps the dashboard preview at three', async () => {
    api.mockResolvedValue([
      makeClass({ id: 'a', name: 'Class A' }),
      makeClass({ id: 'b', name: 'Class B' }),
      makeClass({ id: 'c', name: 'Class C' }),
      makeClass({ id: 'd', name: 'Class D' }),
    ]);
    renderPanel();

    await screen.findByText('Class A');
    expect(screen.getByText('Class B')).toBeInTheDocument();
    expect(screen.getByText('Class C')).toBeInTheDocument();
    // Only the first three are previewed on the dashboard; the rest live behind "See all".
    expect(screen.queryByText('Class D')).not.toBeInTheDocument();

    const panel = screen.getByTestId('now-enrolling');
    const payLinks = within(panel).getAllByRole('link', { name: 'Pay & lock a seat' });
    expect(payLinks[0]).toHaveAttribute('href', '/portal/checkout/class/a');
    expect(within(panel).getByRole('link', { name: 'See all classes' })).toHaveAttribute(
      'href',
      '/portal/classes',
    );
  });
});
