// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { TeacherDetailPage } from './TeacherDetailPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/portal/teachers/amy-chen']}>
        <Routes>
          <Route path="/portal/teachers/:slug" element={<TeacherDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeacherDetailPage', () => {
  it('separates approved capabilities, actual assignments and preference-only booking', async () => {
    api.mockResolvedValue({
      slug: 'amy-chen',
      display_name: 'Amy Chen',
      headline: 'Creative coding teacher',
      bio: 'Reviewed public bio.',
      avatar_url: 'https://example.com/amy.jpg',
      hero_image_url: null,
      spoken_languages: ['English'],
      expertise_topics: ['Creative coding'],
      age_range: { min: 7, max: 12 },
      service_areas: [
        { city: 'Brisbane', state: 'QLD', area_label: 'Southside', suburbs: [], is_primary: true },
      ],
      courses: [
        { slug: 'rhythm-game', title: 'Rhythm Game', cover_image_url: null, format: 'workshop' },
      ],
      upcoming_classes: [
        {
          id: 'class-1',
          name: 'Saturday Lab',
          starts_at: '2026-08-01T00:00:00Z',
          ends_at: '2026-08-01T01:00:00Z',
          role: 'lead',
          venue: {
            name: 'Studio',
            city: 'Brisbane',
            state: 'QLD',
            suburb: 'CBD',
            postcode: '4000',
          },
          course: { slug: 'rhythm-game', title: 'Rhythm Game' },
        },
      ],
    });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Amy Chen' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Approved course capabilities' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Upcoming classes' })).toBeVisible();
    expect(screen.getByText('Lead teacher')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Request this teacher' })).toHaveAttribute(
      'href',
      '/portal/tutoring?teacher=amy-chen&city=Brisbane',
    );
    expect(screen.getByText(/records a preference only/i)).toBeVisible();
  });

  it('uses a safe unavailable state for an unpublished or unknown slug', async () => {
    api.mockRejectedValue(new Error('not found'));
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'This teacher profile is not available.' }),
    ).toBeVisible();
    expect(screen.queryByText(/email/i)).toBeNull();
  });
});
