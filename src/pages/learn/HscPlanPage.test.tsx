// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getMyHscPlan } = vi.hoisted(() => ({ getMyHscPlan: vi.fn() }));
vi.mock('@/pages/hsc/hscApi', () => ({ getMyHscPlan }));

import { HscPlanPage } from './HscPlanPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><HscPlanPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HscPlanPage', () => {
  it('shows the authenticated kid their next family-confirmed assessment', async () => {
    getMyHscPlan.mockResolvedValue({
      id: 'plan-1',
      kid: { id: 'kid-session', nickname: 'Mia' },
      subjects: [{
        id: 'subject-1',
        display_name: 'Biology',
        units: 2,
        progress: { completed_weight: 20, remaining_weight: 80, running_result_over_completed_work: 80 },
        tasks: [{ id: 'task-1', label: 'Trial exam', due_date: '2099-09-01', weight: 30, status: 'planned' }],
      }],
    });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Trial exam' })).toBeInTheDocument();
    expect(screen.getAllByText('Biology')).toHaveLength(2);
    expect(screen.getByText(/family-confirmed deadline/i)).toBeInTheDocument();
    expect(getMyHscPlan).toHaveBeenCalledTimes(1);
  });

  it('shows a safe empty state when the session kid has no plan', async () => {
    getMyHscPlan.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByTestId('hsc-kid-empty')).toBeInTheDocument();
    expect(screen.queryByText(/another child/i)).not.toBeInTheDocument();
  });

  // §6.2 HSC-DATA-04 — the kid owns nothing here; saying who can remove it stops
  // a student assuming their marks are permanent.
  it('tells the kid a parent can delete this data', async () => {
    getMyHscPlan.mockResolvedValue({
      id: 'plan-1',
      school_year: 2026,
      kid: { id: 'kid-1', nickname: 'Mia' },
      subjects: [],
    });
    renderPage();

    expect(await screen.findByTestId('hsc-kid-deletion-notice')).toHaveTextContent(
      /parent can change or delete anything on this page/i,
    );
  });
});
