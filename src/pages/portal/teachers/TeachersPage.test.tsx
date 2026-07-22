// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { TeachersPage } from './TeachersPage';

const AMY = {
  slug: 'amy-chen',
  display_name: 'Amy Chen',
  headline: 'Creative coding teacher',
  bio: 'Amy helps children build creative confidence.',
  avatar_url: 'https://example.com/amy.jpg',
  hero_image_url: null,
  spoken_languages: ['English', 'Mandarin'],
  expertise_topics: ['Creative coding'],
  age_range: { min: 7, max: 12 },
  service_areas: [
    { city: 'Brisbane', state: 'QLD', area_label: 'Southside', suburbs: [], is_primary: true },
  ],
  courses: [
    { slug: 'rhythm-game', title: 'Rhythm Game', cover_image_url: null, format: 'workshop' },
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TeachersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeachersPage', () => {
  it('renders reviewed profiles and sends combined filters to the shared public API', async () => {
    api.mockResolvedValue([AMY]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Amy Chen' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Brisbane' } });
    fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'rhythm-game' } });
    fireEvent.change(screen.getByLabelText('Child age'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'Mandarin' } });

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        '/teachers?city=Brisbane&course=rhythm-game&age=9&language=Mandarin',
      );
    });
    expect(await screen.findByRole('link', { name: 'View profile' })).toHaveAttribute(
      'href',
      expect.stringContaining('/portal/teachers/amy-chen'),
    );
  });

  it('shows an honest error state without fabricated teacher identities', async () => {
    api.mockRejectedValue(new Error('offline'));
    renderPage();

    expect(await screen.findByText('Teacher profiles are unavailable right now.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Amy Chen' })).toBeNull();
  });
});
