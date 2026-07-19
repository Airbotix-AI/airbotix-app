// @vitest-environment jsdom
// /portal/guides catalogue page (parent-portal-family-guides-prd §5.1): renders
// the proxied manifest as cards, filters via URL query, attributes every
// outbound link with ?src=portal, and degrades to a friendly empty state
// pointing at the public resources hub when the endpoint is down (503 / error).

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

import { GuidesPage } from './GuidesPage';
import type { ResourceGuideItem } from './resourceGuides';

const ITEMS: ResourceGuideItem[] = [
  {
    slug: 'sydney-kindy',
    title: 'Sydney kindy enrolment timeline',
    summary: 'When to apply for kindergarten in Sydney.',
    language: 'zh-CN',
    categories: ['school-education', 'family-guides'],
    locations: ['NSW / Sydney'],
    ageStages: ['3-5'],
    formats: ['html', 'pdf'],
    edition: '',
    lastVerified: '2026-07-16',
    sourceStatus: 'verified',
    featured: true,
    htmlPath: 'https://airbotix.ai/resources/sydney-kindy/',
    pdfPath: 'https://airbotix.ai/resources/sydney-kindy/guide.pdf',
    coverImagePath: 'https://airbotix.ai/resources/sydney-kindy/assets/cover.jpg',
  },
  {
    slug: 'melbourne-childcare',
    title: 'Melbourne childcare subsidies',
    summary: 'CCS explained for Melbourne families.',
    language: 'en-AU',
    categories: ['childcare-early-years'],
    locations: ['Victoria / Melbourne'],
    ageStages: ['0-3'],
    formats: ['html', 'pdf'],
    edition: '',
    lastVerified: '2026-07-01',
    sourceStatus: 'verified',
    featured: false,
    htmlPath: 'https://airbotix.ai/resources/melbourne-childcare/',
    pdfPath: 'https://airbotix.ai/resources/melbourne-childcare/guide.pdf',
    coverImagePath: 'https://airbotix.ai/resources/melbourne-childcare/assets/cover.jpg',
  },
];

function renderPage(initialEntry = '/portal/guides') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <GuidesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GuidesPage', () => {
  it('renders a card per guide with ?src=portal on read + PDF links', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage();

    expect(await screen.findByText('Sydney kindy enrolment timeline')).toBeInTheDocument();
    expect(screen.getByText('Melbourne childcare subsidies')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/portal/resource-guides');

    const readLinks = screen.getAllByRole('link', { name: 'Read guide →' });
    expect(readLinks[0]).toHaveAttribute(
      'href',
      'https://airbotix.ai/resources/sydney-kindy/?src=portal',
    );
    expect(readLinks[0]).toHaveAttribute('target', '_blank');

    const pdfLinks = screen.getAllByRole('link', { name: 'Download PDF' });
    expect(pdfLinks[0]).toHaveAttribute(
      'href',
      'https://airbotix.ai/resources/sydney-kindy/guide.pdf?src=portal',
    );

    // The card body itself is a new-tab link with attribution too.
    const cardLink = screen.getByRole('link', { name: /Sydney kindy enrolment timeline/ });
    expect(cardLink).toHaveAttribute(
      'href',
      'https://airbotix.ai/resources/sydney-kindy/?src=portal',
    );
    expect(cardLink).toHaveAttribute('target', '_blank');

    // Chips + featured badge + verified date render. Location / age / language
    // values also appear as filter <option>s, so assert via getAllByText.
    expect(screen.getByText('★ Featured')).toBeInTheDocument();
    expect(screen.getAllByText('NSW / Sydney').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('3-5').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('中文').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Checked 16 Jul 2026')).toBeInTheDocument();
  });

  it('filters the grid via the selects', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage();
    await screen.findByText('Sydney kindy enrolment timeline');

    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Victoria / Melbourne' },
    });

    expect(screen.queryByText('Sydney kindy enrolment timeline')).not.toBeInTheDocument();
    expect(screen.getByText('Melbourne childcare subsidies')).toBeInTheDocument();
  });

  it('honours filters arriving in the URL query', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage('/portal/guides?category=childcare-early-years');

    expect(await screen.findByText('Melbourne childcare subsidies')).toBeInTheDocument();
    expect(screen.queryByText('Sydney kindy enrolment timeline')).not.toBeInTheDocument();
  });

  it('shows a no-match state with a clear-filters reset', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage('/portal/guides?language=en-AU&age=3-5');

    expect(await screen.findByText(/No guides match these filters/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Sydney kindy enrolment timeline')).toBeInTheDocument();
  });

  it('falls back to the public resources hub when the endpoint fails (503)', async () => {
    api.mockRejectedValue(new Error('Service Unavailable'));
    renderPage();

    expect(await screen.findByText(/couldn.t load the guide library/i)).toBeInTheDocument();
    const hubLink = screen.getByRole('link', { name: /Visit the resources hub/ });
    expect(hubLink).toHaveAttribute('href', 'https://airbotix.ai/resources');
    expect(hubLink).toHaveAttribute('target', '_blank');
  });
});
