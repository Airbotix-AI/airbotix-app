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
  it('defaults to English guides (D-PFG-04) with ?src=portal on read + PDF links', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage();

    // English catalogue by default: the zh-CN guide is hidden until toggled.
    expect(await screen.findByText('Melbourne childcare subsidies')).toBeInTheDocument();
    expect(screen.queryByText('Sydney kindy enrolment timeline')).not.toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/portal/resource-guides');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'false');

    const readLink = screen.getByRole('link', { name: 'Read guide →' });
    expect(readLink).toHaveAttribute(
      'href',
      'https://airbotix.ai/resources/melbourne-childcare/?src=portal',
    );
    expect(readLink).toHaveAttribute('target', '_blank');

    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'href',
      'https://airbotix.ai/resources/melbourne-childcare/guide.pdf?src=portal',
    );

    // The card body itself is a new-tab link with attribution too.
    const cardLink = screen.getByRole('link', { name: /Melbourne childcare subsidies/ });
    expect(cardLink).toHaveAttribute(
      'href',
      'https://airbotix.ai/resources/melbourne-childcare/?src=portal',
    );
    expect(cardLink).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Checked 1 Jul 2026')).toBeInTheDocument();
  });

  it('switches to 中文 via the language toggle', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage();
    await screen.findByText('Melbourne childcare subsidies');

    fireEvent.click(screen.getByRole('button', { name: '中文' }));

    expect(screen.getByText('Sydney kindy enrolment timeline')).toBeInTheDocument();
    expect(screen.queryByText('Melbourne childcare subsidies')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'true');
    // Chips + featured badge render on the zh card ('中文' also labels the
    // toggle button, hence getAllByText).
    expect(screen.getByText('★ Featured')).toBeInTheDocument();
    expect(screen.getAllByText('NSW / Sydney').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('中文').length).toBeGreaterThanOrEqual(2);

    // Toggling back to the default language returns the English catalogue.
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByText('Melbourne childcare subsidies')).toBeInTheDocument();
  });

  it('filters the grid via the selects, options scoped to the active language', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage();
    await screen.findByText('Melbourne childcare subsidies');

    // zh-only locations are not offered while the English catalogue is shown.
    expect(screen.queryByText('NSW / Sydney')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Victoria / Melbourne' },
    });

    expect(screen.getByText('Melbourne childcare subsidies')).toBeInTheDocument();
  });

  it('honours filters arriving in the URL query, including ?language=', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage('/portal/guides?language=zh-CN');

    expect(await screen.findByText('Sydney kindy enrolment timeline')).toBeInTheDocument();
    expect(screen.queryByText('Melbourne childcare subsidies')).not.toBeInTheDocument();
  });

  it('shows a no-match state with a clear-filters reset back to English', async () => {
    api.mockResolvedValue({ fetchedAt: '2026-07-19T00:00:00Z', items: ITEMS });
    renderPage('/portal/guides?age=3-5');

    // The only 3-5 guide is zh-CN, so the default English view has no match.
    expect(await screen.findByText(/No guides match these filters/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Melbourne childcare subsidies')).toBeInTheDocument();
    expect(screen.queryByText('Sydney kindy enrolment timeline')).not.toBeInTheDocument();
  });

  it('falls back to the public resources hub when the endpoint fails (503)', async () => {
    api.mockRejectedValue(new Error('Service Unavailable'));
    renderPage();

    expect(await screen.findByText(/couldn.t load the guide library/i)).toBeInTheDocument();
    // §3.1: even the fallback outbound link carries the ?src=portal attribution.
    const hubLink = screen.getByRole('link', { name: /Visit the resources hub/ });
    expect(hubLink).toHaveAttribute('href', 'https://airbotix.ai/resources?src=portal');
    expect(hubLink).toHaveAttribute('target', '_blank');
  });
});
