// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getAcademyCatalog, getAcademyProduct, listFamilyAcademyEntitlements } = vi.hoisted(() => ({
  getAcademyCatalog: vi.fn(),
  getAcademyProduct: vi.fn(),
  listFamilyAcademyEntitlements: vi.fn(),
}));

vi.mock('@/pages/learn/academy/academyApi', () => ({
  getAcademyCatalog,
  getAcademyProduct,
  listFamilyAcademyEntitlements,
}));

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: {
      kind: 'user',
      family_id: 'family-1',
      email: 'parent@example.test',
    },
  }),
}));

import { AcademyPage } from './AcademyPage';

const NAPLAN_CATALOG = [
  {
    slug: 'naplan',
    title: 'NAPLAN',
    provider: 'ACARA',
    brand_config: {},
    products: [
      {
        id: 'product-y3',
        sku: 'naplan-y3-numeracy',
        slug: 'naplan-y3-numeracy',
        title: 'NAPLAN Year 3 Numeracy Prep',
        level_key: 'Year 3',
        subject_key: 'Numeracy',
        edition: 'current',
        price_aud_cents: 4900,
        access_days: 365,
        sales_config: {},
      },
      {
        id: 'product-y5',
        sku: 'naplan-y5-numeracy',
        slug: 'naplan-y5-numeracy',
        title: 'NAPLAN Year 5 Numeracy Prep',
        level_key: 'Year 5',
        subject_key: 'Numeracy',
        edition: 'current',
        price_aud_cents: 5900,
        access_days: 180,
        sales_config: {},
      },
    ],
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AcademyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function wireProductDetails() {
  getAcademyProduct.mockImplementation((slug: string) => {
    const product = NAPLAN_CATALOG[0].products.find((item) => item.slug === slug);
    return Promise.resolve({
      ...product,
      exam: { slug: 'naplan', title: 'NAPLAN', provider: 'ACARA' },
      _count: { question_links: slug === 'naplan-y3-numeracy' ? 130 : 126 },
    });
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AcademyPage parent sales experience', () => {
  it('explains the product before asking a parent to choose a Year', async () => {
    wireProductDetails();
    getAcademyCatalog.mockResolvedValue(NAPLAN_CATALOG);
    listFamilyAcademyEntitlements.mockResolvedValue([]);

    renderPage();

    expect(
      screen.getByRole('heading', {
        name: 'Help your child practise with the questions that match their Year.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('What you are buying')).toBeInTheDocument();
    expect(screen.getByText('The right Year, every time')).toBeInTheDocument();
    expect(screen.getByText('Clear feedback after each answer')).toBeInTheDocument();
    expect(screen.getByText('Progress that stays visible')).toBeInTheDocument();
    expect(screen.getByTestId('academy-hero-cta')).toHaveAttribute('href', '#choose-naplan-year');

    expect(
      await screen.findByRole('heading', {
        name: 'Which Year is your child preparing for?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('$49.00')).toBeInTheDocument();
    expect(await screen.findByText(/130 practice questions available now/)).toBeInTheDocument();
    expect(screen.getByText('365 days · one child')).toBeInTheDocument();
    expect(screen.getByText('$59.00')).toBeInTheDocument();
    expect(screen.getByText('180 days · one child')).toBeInTheDocument();
    expect(screen.getByTestId('academy-buy-naplan-y3-numeracy')).toHaveAttribute(
      'href',
      '/portal/academy/checkout/naplan-y3-numeracy',
    );
  });

  it('shows which child already owns a product without hiding purchase for another child', async () => {
    wireProductDetails();
    getAcademyCatalog.mockResolvedValue(NAPLAN_CATALOG);
    listFamilyAcademyEntitlements.mockResolvedValue([
      {
        id: 'entitlement-1',
        status: 'active',
        starts_at: '2026-07-25T00:00:00.000Z',
        ends_at: '2027-07-25T00:00:00.000Z',
        product: {
          id: 'product-y3',
          sku: 'naplan-y3-numeracy',
          slug: 'naplan-y3-numeracy',
          title: 'NAPLAN Year 3 Numeracy Prep',
          level_key: 'Year 3',
          subject_key: 'Numeracy',
          exam: { slug: 'naplan', title: 'NAPLAN' },
        },
        kid: { id: 'kid-1', nickname: 'Mia' },
      },
    ]);

    renderPage();

    expect(await screen.findByText('Already unlocked for Mia')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Choose NAPLAN Year 3 Numeracy Prep for a child' }),
    ).toHaveTextContent('Choose another child');
  });

  it('does not sell unfinished mock tests or wrong-question review as current benefits', async () => {
    wireProductDetails();
    getAcademyCatalog.mockResolvedValue(NAPLAN_CATALOG);
    listFamilyAcademyEntitlements.mockResolvedValue([]);

    renderPage();

    await screen.findByText('$49.00');
    expect(screen.queryByText(/mock tests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/wrong questions/i)).not.toBeInTheDocument();
  });
});
