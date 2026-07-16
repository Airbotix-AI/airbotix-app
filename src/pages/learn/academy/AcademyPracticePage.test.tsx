// @vitest-environment jsdom
// Academy — NAPLAN Maths practice page. Covers the three behaviours the feature
// hinges on: it renders native text/options/visuals without PDF screenshots,
// submitting an answer shows feedback, and the official answer stays server-side
// until that submission.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api,
  BASE_URL: 'http://api.test',
  ApiError: class ApiError extends Error {},
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-1', nickname: 'Pip' } }),
}));

import { AcademyPracticePage } from './AcademyPracticePage';

const TEXT_CHOICE_Q = {
  id: 'q1',
  source_ref: 'naplan-y5-2016-std-q1',
  exam: 'NAPLAN',
  subject: 'Numeracy',
  year_level: 'Year 5',
  variant: 'std',
  paper_year: 2016,
  q_no: 1,
  answer_type: 'choice' as const,
  stem_text: 'A pencil costs 19 cents. How much do 10 pencils cost?',
  options: ['19 cents', '$1.90', '$19.00', '$190'],
  render_ready: true,
  render_spec: { kind: 'none' as const },
  ac9_code: 'AC9M5N01',
  difficulty: 'easy',
};

const TALLY_Q = {
  ...TEXT_CHOICE_Q,
  id: 'q2',
  answer_type: 'value' as const,
  stem_text:
    'Some children were asked to name their favourite sport. How many children were asked altogether?',
  options: null,
  render_spec: {
    kind: 'tally_table' as const,
    title: 'Favourite sport',
    value_label: 'Number of students',
    rows: [
      { label: 'Basketball', count: 22 },
      { label: 'Tennis', count: 10 },
      { label: 'Hockey', count: 15 },
    ],
  },
};

function wireApi(questions: unknown[], attempt = { is_correct: true, correct_answer: 'A' }) {
  api.mockImplementation((path: string) => {
    if (path.startsWith('/academy/questions')) return Promise.resolve(questions);
    if (path === '/academy/attempts') return Promise.resolve(attempt);
    if (path.startsWith('/academy/kids/')) {
      return Promise.resolve({ attempts: 3, correct: 2, accuracy: 0.67 });
    }
    return Promise.resolve(undefined);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/learn/academy']}>
        <Routes>
          <Route path="/learn/academy" element={<AcademyPracticePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AcademyPracticePage', () => {
  it('renders a text question with option-text buttons', async () => {
    wireApi([TEXT_CHOICE_Q]);
    renderPage();

    expect(await screen.findByTestId('academy-stem')).toHaveTextContent(
      'A pencil costs 19 cents',
    );
    // Real option TEXT is shown (not generic A/B/C/D).
    expect(screen.getByTestId('academy-option-A')).toHaveTextContent('19 cents');
    expect(screen.getByTestId('academy-option-B')).toHaveTextContent('$1.90');
    expect(screen.queryByRole('img', { name: 'Question' })).not.toBeInTheDocument();
  });

  it('submits the chosen LETTER and shows feedback with the correct answer', async () => {
    wireApi([TEXT_CHOICE_Q], { is_correct: true, correct_answer: 'A' });
    renderPage();

    fireEvent.click(await screen.findByTestId('academy-option-A'));

    const feedback = await screen.findByTestId('academy-feedback');
    expect(feedback).toHaveTextContent('Correct!');
    expect(feedback).toHaveTextContent('The answer is A');
    // The attempt POST carried the LETTER, not the option text.
    expect(api).toHaveBeenCalledWith(
      '/academy/attempts',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ question_id: 'q1', submitted: 'A' }),
      }),
    );
  });

  it('renders a tally table as native HTML/SVG and never shows a PDF crop', async () => {
    wireApi([TALLY_Q]);
    renderPage();

    expect(await screen.findByTestId('academy-native-visual')).toHaveTextContent('Basketball');
    expect(screen.getByLabelText('22 tally marks')).toBeInTheDocument();
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('renders a balance scale as native SVG', async () => {
    const BALANCE_Q = {
      ...TEXT_CHOICE_Q,
      id: 'q3',
      answer_type: 'value' as const,
      stem_text: 'This scale is balanced. What is the weight of the cube?',
      options: null,
      render_spec: {
        kind: 'balance_scale' as const,
        left: [
          { label: '13 g', tone: 'mint' as const },
          { label: '?', tone: 'sky' as const },
        ],
        right: [{ label: '28 g', tone: 'sun' as const }],
      },
    };
    wireApi([BALANCE_Q]);
    renderPage();

    expect(await screen.findByRole('img', { name: /balanced scale/i })).toBeInTheDocument();
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });
});
