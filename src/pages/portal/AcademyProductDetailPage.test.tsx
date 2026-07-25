// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getAcademyProduct } = vi.hoisted(() => ({ getAcademyProduct: vi.fn() }));

vi.mock('@/pages/learn/academy/academyApi', () => ({ getAcademyProduct }));

import { AcademyProductDetailPage } from './AcademyProductDetailPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/portal/academy/products/naplan-y3-numeracy']}>
        <Routes>
          <Route path="/portal/academy/products/:slug" element={<AcademyProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AcademyProductDetailPage', () => {
  it('shows four original samples with answer-specific Tutor explanations', async () => {
    getAcademyProduct.mockResolvedValue({
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
      exam: { slug: 'naplan', title: 'NAPLAN', provider: 'ACARA' },
      _count: { question_links: 130 },
    });

    renderPage();

    expect(
      await screen.findByRole('heading', {
        name: 'Year 3 Numeracy practice with help when they get stuck.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('130 questions available')).toBeInTheDocument();
    expect(screen.getByText('Airo Tutor is included')).toBeInTheDocument();
    expect(screen.getByTestId('academy-detail-buy')).toHaveAttribute(
      'href',
      '/portal/academy/checkout/naplan-y3-numeracy',
    );
    expect(screen.getByRole('img', { name: '6 cars with 3 people in each' })).toBeInTheDocument();
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'How many groups can you see',
    );
    expect(screen.getByRole('button', { name: '1 Equal groups' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 Money' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 Data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 Time' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '18' }));

    expect(screen.getByTestId('academy-demo-feedback')).toHaveTextContent(
      'Correct — 18 is the answer.',
    );
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent('6 × 3 = 18 people');

    fireEvent.click(screen.getByTestId('academy-demo-question-money'));
    expect(screen.getByRole('img', { name: /one 2 dollar coin/i })).toBeInTheDocument();
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'Put the dollars and cents into the same unit',
    );
    fireEvent.click(screen.getByRole('button', { name: '$2.70' }));
    expect(screen.getByTestId('academy-demo-feedback')).toHaveTextContent(
      '$2.70 isn’t the answer yet',
    );
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'What is the question asking?',
    );
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent('Step 1 · How to think');
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent('Step 2 · Work it out');
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'Why this answer is correct',
    );
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'Where your thinking may have slipped',
    );
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'counted only one 20c coin',
    );
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'Mia adds another 10c coin',
    );

    fireEvent.click(screen.getByTestId('academy-demo-question-data'));
    expect(screen.getByRole('img', { name: /bar chart showing dogs 8/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'What you understood',
    );
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'compare by subtraction',
    );

    fireEvent.click(screen.getByTestId('academy-demo-question-time'));
    expect(
      screen.getByRole('img', { name: 'Clock showing quarter past four' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '4:15' }));
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'The time is quarter past 4, or 4:15',
    );
    expect(screen.getByText(/try four original samples/i)).toBeInTheDocument();
  });
});
