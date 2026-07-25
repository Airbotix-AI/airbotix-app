// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { getAcademyProduct } = vi.hoisted(() => ({ getAcademyProduct: vi.fn() }))

vi.mock('@/pages/learn/academy/academyApi', () => ({ getAcademyProduct }))

import { AcademyProductDetailPage } from './AcademyProductDetailPage'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/portal/academy/products/naplan-y3-numeracy']}>
        <Routes>
          <Route
            path="/portal/academy/products/:slug"
            element={<AcademyProductDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AcademyProductDetailPage', () => {
  it('shows concrete product value, a safe interactive demo and checkout path', async () => {
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
    })

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Year 3 Numeracy practice with help when they get stuck.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('130 questions available')).toBeInTheDocument()
    expect(screen.getByText('Airo Tutor is included')).toBeInTheDocument()
    expect(screen.getByTestId('academy-detail-buy')).toHaveAttribute(
      'href',
      '/portal/academy/checkout/naplan-y3-numeracy',
    )
    expect(screen.getByRole('img', { name: '6 cars with 3 people in each' })).toBeInTheDocument()
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent(
      'Six cars means 6 equal groups',
    )

    fireEvent.click(screen.getByRole('button', { name: '18' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))

    expect(screen.getByText('Correct — 6 × 3 = 18.')).toBeInTheDocument()
    expect(screen.getByTestId('academy-demo-tutor')).toHaveTextContent('6 × 3 = 18 people')
    expect(screen.getByText(/does not expose a paid question/i)).toBeInTheDocument()
  })
})
