// @vitest-environment jsdom
// Academy — NAPLAN Maths practice page. Covers the three behaviours the feature
// hinges on: it renders a real TEXT question with option-TEXT buttons, submitting
// an answer shows feedback + reveals the official answer, and a question with no
// stem_text falls back to the scanned question image.

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
  q_image_key: 'q/naplan-y5-2016-std-q1.png',
  page_image_key: 'pages/naplan-y5-2016-std-p1.png',
  stem_text: 'A pencil costs 19 cents. How much do 10 pencils cost?',
  options: ['19 cents', '$1.90', '$19.00', '$190'],
  figure_keys: ['figures/naplan-y5-2016-std-q1-fig0.png'],
  ac9_code: 'AC9M5N01',
  difficulty: 'easy',
};

const IMAGE_ONLY_Q = {
  ...TEXT_CHOICE_Q,
  id: 'q2',
  stem_text: null,
  options: null,
  figure_keys: null,
  q_image_key: 'figures/naplan-y5-2016-std-q2.png',
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
    // Inline figure renders as an <img> pointing at the public asset endpoint.
    expect(screen.getByTestId('academy-figure')).toHaveAttribute(
      'src',
      'http://api.test/academy/assets/figures/naplan-y5-2016-std-q1-fig0.png',
    );
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

  it('falls back to the question image when stem_text is null', async () => {
    wireApi([IMAGE_ONLY_Q]);
    renderPage();

    const img = await screen.findByTestId('academy-question-image');
    expect(img).toHaveAttribute(
      'src',
      'http://api.test/academy/assets/figures/naplan-y5-2016-std-q2.png',
    );
    expect(screen.queryByTestId('academy-stem')).not.toBeInTheDocument();
  });
});
