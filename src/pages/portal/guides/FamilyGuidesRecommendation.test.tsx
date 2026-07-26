// @vitest-environment jsdom
// Dashboard "Family Guides" block (parent-portal-family-guides-prd §5.2):
// renders up to 3 recommended guides with a "View all" link — English guides
// first (D-PFG-05), then featured guides matching the family's known
// city/state and the kids' ages — and renders NOTHING when the guides
// endpoint fails so the Dashboard never breaks over the catalogue.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { FamilyGuidesRecommendation } from './FamilyGuidesRecommendation';
import type { ResourceGuideItem } from './resourceGuides';

const guide = (slug: string, overrides: Partial<ResourceGuideItem> = {}): ResourceGuideItem => ({
  slug,
  title: `Guide ${slug}`,
  summary: 'A guide.',
  language: 'zh-CN',
  categories: ['family-guides'],
  locations: ['Australia'],
  ageStages: ['5-8'],
  formats: ['html', 'pdf'],
  edition: '',
  lastVerified: '2026-07-01',
  sourceStatus: 'verified',
  featured: false,
  htmlPath: `https://airbotix.ai/resources/${slug}/`,
  pdfPath: `https://airbotix.ai/resources/${slug}/guide.pdf`,
  coverImagePath: `https://airbotix.ai/resources/${slug}/assets/cover.jpg`,
  ...overrides,
});

function renderBlock() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FamilyGuidesRecommendation familyId="fam-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FamilyGuidesRecommendation', () => {
  it('shows 3 recommendations preferring featured guides matching the family city then kid ages', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/portal/resource-guides') {
        return Promise.resolve({
          fetchedAt: '2026-07-19T00:00:00Z',
          items: [
            guide('plain', { lastVerified: '2026-07-18' }),
            guide('featured-baby', { featured: true, ageStages: ['0-3'], lastVerified: '2026-07-10' }),
            guide('featured-match', { featured: true, ageStages: ['5-8'], lastVerified: '2026-05-01' }),
            guide('featured-city', {
              featured: true,
              locations: ['NSW / Sydney'],
              ageStages: ['0-3'],
              lastVerified: '2026-02-01',
            }),
            guide('plain-old', { lastVerified: '2026-01-01' }),
          ],
        });
      }
      if (path === '/families/fam-1') {
        return Promise.resolve({ id: 'fam-1', city: 'Sydney', state: 'NSW' });
      }
      if (path === '/families/fam-1/kids') {
        return Promise.resolve([{ id: 'kid-1', nickname: 'Mia', age: 6 }]);
      }
      return Promise.resolve(undefined);
    });
    renderBlock();

    expect(await screen.findByText('Picked for your family')).toBeInTheDocument();
    // The block consults the family profile for the §5.2 city tier.
    await vi.waitFor(() => expect(api).toHaveBeenCalledWith('/families/fam-1'));
    const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    // city-matched featured first, then age-matched, then remaining featured.
    await vi.waitFor(() => expect(headings()).toContain('Guide featured-city'));
    expect(headings().indexOf('Guide featured-city')).toBeLessThan(
      headings().indexOf('Guide featured-match'),
    );
    expect(headings().indexOf('Guide featured-match')).toBeLessThan(
      headings().indexOf('Guide featured-baby'),
    );
    expect(headings()).not.toContain('Guide plain');
    expect(headings()).not.toContain('Guide plain-old');

    expect(screen.getByRole('link', { name: 'View all →' })).toHaveAttribute(
      'href',
      '/portal/guides',
    );
  });

  it('degrades to the age tier when the family profile has no city or state', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/portal/resource-guides') {
        return Promise.resolve({
          fetchedAt: '2026-07-19T00:00:00Z',
          items: [
            guide('featured-baby', { featured: true, ageStages: ['0-3'], lastVerified: '2026-07-10' }),
            guide('featured-match', {
              featured: true,
              locations: ['NSW / Sydney'],
              ageStages: ['5-8'],
              lastVerified: '2026-05-01',
            }),
          ],
        });
      }
      if (path === '/families/fam-1') {
        return Promise.resolve({ id: 'fam-1', city: null, state: null });
      }
      if (path === '/families/fam-1/kids') {
        return Promise.resolve([{ id: 'kid-1', nickname: 'Mia', age: 6 }]);
      }
      return Promise.resolve(undefined);
    });
    renderBlock();

    expect(await screen.findByText('Picked for your family')).toBeInTheDocument();
    const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    await vi.waitFor(() =>
      expect(headings().indexOf('Guide featured-match')).toBeLessThan(
        headings().indexOf('Guide featured-baby'),
      ),
    );
  });

  it('puts English guides above 中文 ones, even a featured city+age match (D-PFG-05)', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/portal/resource-guides') {
        return Promise.resolve({
          fetchedAt: '2026-07-19T00:00:00Z',
          items: [
            guide('zh-featured-city-age', {
              featured: true,
              locations: ['NSW / Sydney'],
              ageStages: ['5-8'],
              lastVerified: '2026-07-18',
            }),
            guide('en-guide', { language: 'en-AU', lastVerified: '2026-01-01' }),
          ],
        });
      }
      if (path === '/families/fam-1') {
        return Promise.resolve({ id: 'fam-1', city: 'Sydney', state: 'NSW' });
      }
      if (path === '/families/fam-1/kids') {
        return Promise.resolve([{ id: 'kid-1', nickname: 'Mia', age: 6 }]);
      }
      return Promise.resolve(undefined);
    });
    renderBlock();

    expect(await screen.findByText('Picked for your family')).toBeInTheDocument();
    const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    await vi.waitFor(() => expect(headings()).toContain('Guide en-guide'));
    expect(headings().indexOf('Guide en-guide')).toBeLessThan(
      headings().indexOf('Guide zh-featured-city-age'),
    );
  });

  it('renders nothing when the guides endpoint fails', async () => {
    api.mockImplementation((path: string) =>
      path === '/portal/resource-guides'
        ? Promise.reject(new Error('down'))
        : Promise.resolve([]),
    );
    const { container } = renderBlock();

    // Let the query settle, then assert the block stayed empty.
    await vi.waitFor(() => expect(api).toHaveBeenCalledWith('/portal/resource-guides'));
    expect(screen.queryByText('Picked for your family')).not.toBeInTheDocument();
    expect(container.querySelector('section')).toBeNull();
  });
});
