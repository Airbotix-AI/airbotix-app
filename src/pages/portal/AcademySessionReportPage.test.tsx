// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const { getAcademySessionReport } = vi.hoisted(() => ({
  getAcademySessionReport: vi.fn(),
}));
vi.mock('@/pages/learn/academy/academyApi', () => ({ getAcademySessionReport }));

import { AcademySessionReportPage } from './AcademySessionReportPage';

describe('AcademySessionReportPage', () => {
  it('labels self-awarded marks separately from measured objective accuracy', async () => {
    getAcademySessionReport.mockResolvedValue({
      session_id: 'session-1',
      status: 'self_graded',
      objective: {
        marks_awarded: 8,
        marks_total: 10,
        correct: 8,
        attempts: 10,
        accuracy: 0.8,
      },
      self_assessed: {
        marks_awarded: 12,
        marks_total: 20,
        completed: 4,
        attempts: 4,
        notice: 'Self-assessed against the official marking guide.',
      },
      total: { marks_awarded: 20, marks_total: 30 },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/portal/academy/reports/session-1']}>
          <Routes>
            <Route
              path="/portal/academy/reports/:sessionId"
              element={<AcademySessionReportPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('12/20')).toBeInTheDocument();
    expect(screen.getByText('20/30')).toBeInTheDocument();
    expect(screen.getByText('80% objective accuracy')).toBeInTheDocument();
    expect(
      screen.getByText('A mark total, not a combined accuracy percentage'),
    ).toBeInTheDocument();
  });
});
