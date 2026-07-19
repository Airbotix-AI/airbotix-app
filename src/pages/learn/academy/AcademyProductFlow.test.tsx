// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {},
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: {
      kind: 'user',
      sub: 'parent-1',
      family_id: 'fam-1',
      email: 'parent@example.test',
    },
  }),
}));

import { MyExamPrepPage } from './MyExamPrepPage';
import { AcademyCheckoutPage } from '@/pages/portal/AcademyCheckoutPage';

const ENTITLEMENT = {
  id: 'ent-1',
  starts_at: '2026-07-17T00:00:00Z',
  ends_at: '2027-07-17T00:00:00Z',
  product: {
    id: 'prod-1',
    sku: 'naplan-y5-numeracy',
    slug: 'naplan-y5-numeracy',
    title: 'NAPLAN Year 5 Numeracy Prep',
    level_key: 'Year 5',
    subject_key: 'Numeracy',
    exam: { slug: 'naplan', title: 'NAPLAN' },
  },
};

function renderAt(path: string, element: React.ReactNode, route: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="/portal/register" element={<div>REGISTER</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('Academy sellable product flow', () => {
  it('shows a kid only the products returned by their entitlement endpoint', async () => {
    api.mockResolvedValue([ENTITLEMENT]);
    renderAt('/learn/exams', <MyExamPrepPage />, '/learn/exams');

    expect(await screen.findByText('NAPLAN Year 5 Numeracy Prep')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NAPLAN Year 5 Numeracy Prep/ })).toHaveAttribute(
      'href',
      '/learn/exams/naplan-y5-numeracy',
    );
    expect(api).toHaveBeenCalledWith('/academy/me/products');
  });

  it('uses the published server price and selected family kid for checkout', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/academy/products/naplan-y5-numeracy')
        return Promise.resolve({
          ...ENTITLEMENT.product,
          price_aud_cents: 4900,
          access_days: 365,
          edition: 'current',
          sales_config: {},
          _count: { question_links: 120 },
          exam: { slug: 'naplan', title: 'NAPLAN', provider: 'ACARA' },
        });
      if (path === '/families/fam-1/kids')
        return Promise.resolve([{ id: 'kid-1', nickname: 'Mia', age: 9 }]);
      if (path === '/families/fam-1/academy-entitlements') return Promise.resolve([]);
      if (path === '/academy/checkouts')
        return Promise.resolve({
          payment_intent_id: 'intent-1',
          checkout_url: 'https://checkout.example/intent-1',
        });
      return Promise.resolve(undefined);
    });
    const original = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...original, href: 'http://localhost/' },
      configurable: true,
    });
    try {
      renderAt(
        '/portal/academy/checkout/naplan-y5-numeracy',
        <AcademyCheckoutPage />,
        '/portal/academy/checkout/:sku',
      );

      expect(await screen.findByText('$49.00')).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('academy-checkout-kid'), {
        target: { value: 'kid-1' },
      });
      fireEvent.click(screen.getByTestId('academy-checkout-pay'));

      await waitFor(() =>
        expect(api).toHaveBeenCalledWith('/academy/checkouts', {
          method: 'POST',
          body: { product_id: 'prod-1', kid_id: 'kid-1' },
        }),
      );
      expect(window.location.href).toBe('https://checkout.example/intent-1');
    } finally {
      Object.defineProperty(window, 'location', { value: original, configurable: true });
    }
  });
});
