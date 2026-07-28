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

import { AcademyMockExamPage, AcademyReport } from './AcademyMockExamPage';

const product = {
  id: 'entitlement-1',
  starts_at: '2026-07-27T00:00:00Z',
  ends_at: '2027-07-27T00:00:00Z',
  product: {
    id: 'product-1',
    sku: 'wace-methods',
    slug: 'wace-methods',
    title: 'WACE Mathematics Methods',
    level_key: 'Year 12',
    subject_key: 'Mathematics Methods',
    exam: { slug: 'wace', title: 'WACE' },
    papers: [
      {
        id: 'paper-1',
        title: '2025 Calculator-free',
        mode: 'fixed',
        time_limit_minutes: 50,
        _count: { questions: 2 },
      },
    ],
  },
};

const session = {
  id: 'session-1',
  entitlement_id: 'entitlement-1',
  paper_id: 'paper-1',
  mode: 'mock',
  status: 'in_progress',
  started_at: '2026-07-27T00:00:00Z',
  submitted_at: null,
  completed_at: null,
  state: {
    current_question_index: 0,
    remaining_seconds: 3000,
    answers: {},
  },
  paper: {
    id: 'paper-1',
    title: '2025 Calculator-free',
    time_limit_minutes: 50,
    questions: [
      {
        order_index: 0,
        marks: 1,
        section: 'Section I',
        question: {
          id: 'q1',
          source_ref: 'wace-2025-q1',
          exam: 'WACE',
          subject: 'Mathematics Methods',
          year_level: 'Year 12',
          variant: 'noncalc',
          paper_year: 2025,
          q_no: 1,
          answer_type: 'choice',
          marks: 1,
          section: 'Section I',
          stimulus_id: null,
          stem_text: 'Which graph is correct?',
          options: ['Graph one', 'Graph two'],
          render_ready: true,
          render_spec: { kind: 'none' },
          ac9_code: null,
          difficulty: null,
        },
      },
    ],
  },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/exams/wace-methods/mock/paper-1']}>
        <Routes>
          <Route
            path="/learn/exams/:productSlug/mock/:paperId"
            element={<AcademyMockExamPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AcademyMockExamPage', () => {
  it('starts an entitled paper and never requests solutions before submission', async () => {
    api.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/academy/me/products/wace-methods') return Promise.resolve(product);
      if (path === '/academy/sessions' && options?.method === 'POST')
        return Promise.resolve(session);
      if (path === '/academy/sessions/session-1') return Promise.resolve(session);
      if (path === '/academy/sessions/session-1/state') return Promise.resolve(session);
      return Promise.resolve(undefined);
    });

    renderPage();
    expect(await screen.findByTestId('academy-mock-start')).toHaveTextContent(
      '2025 Calculator-free',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start paper' }));

    expect(await screen.findByTestId('academy-mock-question')).toHaveTextContent(
      'Which graph is correct?',
    );
    expect(api).toHaveBeenCalledWith('/academy/sessions', {
      method: 'POST',
      body: {
        entitlement_id: 'entitlement-1',
        paper_id: 'paper-1',
        mode: 'mock',
      },
    });
    expect(api).not.toHaveBeenCalledWith('/academy/sessions/session-1/solutions');
  });

  it('renders objective, self-assessed and combined marks as separate result cards', () => {
    render(
      <MemoryRouter>
        <AcademyReport
          productSlug="wace-methods"
          report={{
            session_id: 'session-1',
            status: 'self_graded',
            objective: {
              marks_awarded: 18,
              marks_total: 20,
              correct: 18,
              attempts: 20,
              accuracy: 0.9,
            },
            self_assessed: {
              marks_awarded: 42,
              marks_total: 60,
              completed: 12,
              attempts: 12,
              notice: 'Self-assessed against the official guide.',
            },
            total: { marks_awarded: 60, marks_total: 80 },
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Objective score')).toBeInTheDocument();
    expect(screen.getByText('Self-assessed score')).toBeInTheDocument();
    expect(screen.getByText('Combined marks')).toBeInTheDocument();
    expect(screen.getByText('18/20')).toBeInTheDocument();
    expect(screen.getByText('42/60')).toBeInTheDocument();
    expect(screen.getByText('60/80')).toBeInTheDocument();
  });

  it('autosaves the selected answer into the server-owned session state', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/academy/me/products/wace-methods') return Promise.resolve(product);
      if (path === '/academy/sessions/session-1') return Promise.resolve(session);
      if (path === '/academy/sessions/session-1/state') return Promise.resolve(session);
      return Promise.resolve(undefined);
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={['/learn/exams/wace-methods/mock/paper-1?session=session-1']}
        >
          <Routes>
            <Route
              path="/learn/exams/:productSlug/mock/:paperId"
              element={<AcademyMockExamPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'A. Graph one' }));
    await waitFor(
      () =>
        expect(api).toHaveBeenCalledWith(
          '/academy/sessions/session-1/state',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.objectContaining({ answers: { q1: 'A' } }),
          }),
        ),
      { timeout: 2000 },
    );
  });

  it('loads a shared stimulus without exposing solution data in the question payload', async () => {
    const sessionWithStimulus = {
      ...session,
      paper: {
        ...session.paper,
        questions: [
          {
            ...session.paper.questions[0],
            question: {
              ...session.paper.questions[0].question,
              stimulus_id: 'stimulus-1',
            },
          },
        ],
      },
    };
    api.mockImplementation((path: string) => {
      if (path === '/academy/me/products/wace-methods') return Promise.resolve(product);
      if (path === '/academy/sessions/session-1') return Promise.resolve(sessionWithStimulus);
      if (path === '/academy/stimuli/stimulus-1')
        return Promise.resolve({
          id: 'stimulus-1',
          source_ref: 'synthetic-stimulus',
          exam: 'WACE',
          paper_year: '2025',
          body_text: 'Use this shared information for Questions 1–3.',
          figure_keys: null,
          render_spec: null,
        });
      return Promise.resolve(sessionWithStimulus);
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={['/learn/exams/wace-methods/mock/paper-1?session=session-1']}
        >
          <Routes>
            <Route
              path="/learn/exams/:productSlug/mock/:paperId"
              element={<AcademyMockExamPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Use this shared information for Questions 1–3.'),
    ).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/academy/stimuli/stimulus-1');
  });
});
