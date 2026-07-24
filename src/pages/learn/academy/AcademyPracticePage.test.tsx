// @vitest-environment jsdom
// Product-scoped Academy practice: native rendering, server-side grading, and
// no exam/year switching inside the player.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const DOUBLE_VALUE_Q = {
  ...TEXT_CHOICE_Q,
  id: 'naplan-y3-2008-std-q33',
  answer_type: 'multi_value' as const,
  stem_text:
    'Mario has this row of 15 cubes. He divides the row into two sections. One section is 3 cubes longer than the other section. How many cubes are in each section?',
  options: null,
  render_spec: {
    kind: 'none' as const,
    value_inputs: {
      count: 2,
      separator: 'and',
      suffixes: ['cubes', 'cubes'],
    },
  },
};

function wireApi(questions: unknown[], attempt = { is_correct: true, correct_answer: 'A' }) {
  api.mockImplementation((path: string) => {
    if (path === '/academy/me/products/naplan-y5-numeracy')
      return Promise.resolve({
        id: 'ent-1',
        product: {
          slug: 'naplan-y5-numeracy',
          title: 'NAPLAN Year 5 Numeracy Prep',
          level_key: 'Year 5',
          subject_key: 'Numeracy',
          exam: { title: 'NAPLAN' },
        },
      });
    if (path.startsWith('/academy/me/products/naplan-y5-numeracy/questions'))
      return Promise.resolve(questions);
    if (path === '/academy/me/products/naplan-y5-numeracy/attempts')
      return Promise.resolve(attempt);
    if (path === '/academy/me/products/naplan-y5-numeracy/progress')
      return Promise.resolve({ attempts: 3, correct: 2, accuracy: 0.67 });
    return Promise.resolve(undefined);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/learn/exams/naplan-y5-numeracy/practice']}>
        <Routes>
          <Route path="/learn/exams/:productSlug/practice" element={<AcademyPracticePage />} />
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

    expect(await screen.findByTestId('academy-stem')).toHaveTextContent('A pencil costs 19 cents');
    // Real option TEXT is shown (not generic A/B/C/D).
    expect(screen.getByTestId('academy-option-A')).toHaveTextContent('19 cents');
    expect(screen.getByTestId('academy-option-B')).toHaveTextContent('$1.90');
    expect(screen.queryByRole('img', { name: 'Question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Year level' })).not.toBeInTheDocument();
    expect(screen.getByText(/NAPLAN · Year 5 · Numeracy/)).toBeInTheDocument();
  });

  it('keeps side-view answer labels accessible without squeezing the mobile diagrams', async () => {
    const SIDE_VIEW_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2010-std-q9',
      stem_text: 'Which option shows the view from the marked side?',
      options: [
        'Separate square',
        'Square in front of hexagon',
        'Triangle above square',
        'Wide block with square in front',
      ],
      render_spec: { kind: 'side_view_model' as const },
    };
    wireApi([SIDE_VIEW_Q]);
    renderPage();

    const label = await screen.findByText('Square in front of hexagon');
    expect(label).toHaveClass('sr-only', 'sm:not-sr-only');
    expect(screen.getByTestId('academy-side-view-1')).toBeInTheDocument();
    expect(screen.getByTestId('academy-option-B')).toHaveAccessibleName(
      /B Square in front of hexagon/,
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
      '/academy/me/products/naplan-y5-numeracy/attempts',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ question_id: 'q1', submitted: 'A' }),
      }),
    );
  });

  it('scrolls the next question back to the top on mobile', async () => {
    const scrollIntoView = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      wireApi([
        TEXT_CHOICE_Q,
        { ...TEXT_CHOICE_Q, id: 'q-next', stem_text: 'The next question starts here.' },
      ]);
      renderPage();

      fireEvent.click(await screen.findByTestId('academy-option-A'));
      fireEvent.click(await screen.findByTestId('academy-next'));

      expect(await screen.findByTestId('academy-stem')).toHaveTextContent(
        'The next question starts here.',
      );
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' }));
    } finally {
      if (original) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
          configurable: true,
          value: original,
        });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
    }
  });

  it('renders a tally table as native HTML/SVG and never shows a PDF crop', async () => {
    wireApi([TALLY_Q]);
    renderPage();

    expect(await screen.findByTestId('academy-native-visual')).toHaveTextContent('Basketball');
    expect(screen.getByLabelText('22 tally marks')).toBeInTheDocument();
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('renders two answer boxes for reviewed multi-value questions and submits both values', async () => {
    wireApi([DOUBLE_VALUE_Q], { is_correct: true, correct_answer: '6 and 9' });
    renderPage();

    expect(await screen.findByTestId('academy-stem')).toHaveTextContent('Mario has this row of 15 cubes');
    expect(screen.getByTestId('academy-value-input-1')).toBeInTheDocument();
    expect(screen.getByTestId('academy-value-input-2')).toBeInTheDocument();
    expect(screen.getByText('and')).toBeInTheDocument();
    expect(screen.getAllByText('cubes')).toHaveLength(2);

    fireEvent.change(screen.getByTestId('academy-value-input-1'), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId('academy-value-input-2'), { target: { value: '9' } });
    fireEvent.click(screen.getByTestId('academy-value-submit'));

    const feedback = await screen.findByTestId('academy-feedback');
    expect(feedback).toHaveTextContent('Correct!');
    expect(feedback).toHaveTextContent('The answer is 6 and 9');
    expect(api).toHaveBeenCalledWith(
      '/academy/me/products/naplan-y5-numeracy/attempts',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          question_id: 'naplan-y3-2008-std-q33',
          submitted: '6|9',
        }),
      }),
    );
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

  it('renders equal groups as six native cars without a PDF screenshot', async () => {
    const GROUPS_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2016-std-q6',
      stem_text:
        'A roller-coaster has 6 cars. Each car has 3 people in it. How many people are on the roller-coaster altogether?',
      options: ['6', '9', '12', '18'],
      render_spec: {
        kind: 'equal_groups' as const,
        group_label: 'car',
        group_count: 6,
        items_per_group: 3,
        item_label: 'person',
      },
    };
    wireApi([GROUPS_Q]);
    renderPage();

    expect(
      await screen.findByRole('img', { name: '6 cars with 3 people in each' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('academy-group-count')).toHaveTextContent('6 cars');
    expect(screen.getByTestId('academy-items-per-group')).toHaveTextContent('3 people in each');
    expect(screen.getAllByTestId('academy-equal-group')).toHaveLength(6);
    expect(screen.getAllByTestId('academy-equal-group-item')).toHaveLength(18);
    expect(screen.getByTestId('academy-equal-groups-equation')).toHaveTextContent(
      '6 cars×3 people in each=?people altogether',
    );
    expect(screen.queryByText('car 6')).not.toBeInTheDocument();
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('renders an analogue clock with exact native hand geometry', async () => {
    const CLOCK_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2010-std-q15',
      stem_text: 'What time does this clock show?',
      options: ['3:08', '3:40', '8:03', '8:15'],
      render_spec: { kind: 'analog_clock' as const, hour: 8, minute: 15 },
    };
    wireApi([CLOCK_Q]);
    renderPage();

    expect(
      await screen.findByRole('img', {
        name: 'An analogue clock with the minute hand pointing to 3 and the hour hand just past 8',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('academy-clock-hour-hand')).toBeInTheDocument();
    expect(screen.getByTestId('academy-clock-minute-hand')).toBeInTheDocument();
    expect(screen.getByTestId('academy-option-D')).toHaveTextContent('8:15');
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('renders the chicken hutch as a native triangular-prism solid', async () => {
    const HUTCH_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2010-std-q18',
      stem_text:
        'Natalie made a hutch for her pet chicken. Her hutch is most like which solid shape?',
      options: [
        'Rectangular prism',
        'Rectangular pyramid',
        'Triangular pyramid',
        'Triangular prism',
      ],
      render_spec: { kind: 'solid_shape' as const, shape: 'triangular_prism' as const },
    };
    wireApi([HUTCH_Q]);
    renderPage();

    expect(
      await screen.findByRole('img', {
        name: 'A pet hutch with two triangular ends and rectangular side faces',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('academy-solid-shape-end')).toBeInTheDocument();
    expect(screen.getByTestId('academy-solid-shape-side')).toBeInTheDocument();
    expect(screen.getByTestId('academy-option-D')).toHaveTextContent('Triangular prism');
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('removes the decorative pizza photo after making the grouping fact explicit in text', async () => {
    const TRAYS_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2010-std-q24',
      stem_text:
        'James makes 12 pizzas. Each tray holds 4 pizzas. Which calculation shows how James could work out the number of trays he needs?',
      options: ['12 ÷ 4', '12 × 4', '12 − 4', '12 + 4'],
      render_spec: { kind: 'none' as const },
    };
    wireApi([TRAYS_Q]);
    renderPage();

    expect(await screen.findByTestId('academy-stem')).toHaveTextContent('Each tray holds 4 pizzas');
    expect(screen.getByTestId('academy-option-A')).toHaveTextContent('12 ÷ 4');
    expect(screen.queryByTestId('academy-native-visual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('renders a reviewed coin collection and its real money options', async () => {
    const COINS_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2010-std-q10',
      stem_text:
        'Gina has only these coins. She buys a magazine for $1.95. How much money does Gina have left?',
      options: ['$1.00', '$1.10', '$2.00', '$2.10'],
      render_spec: {
        kind: 'coin_collection' as const,
        coins_cents: [200, 50, 20, 20, 10, 5, 100],
      },
    };
    wireApi([COINS_Q]);
    renderPage();

    expect(
      await screen.findByRole('img', { name: 'Coins: $2, 50c, 20c, 20c, 10c, 5c, $1' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('academy-option-D')).toHaveTextContent('$2.10');
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('renders the shape matrix and visual answer choices natively', async () => {
    const MATRIX_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2015-std-q11',
      stem_text: 'Which shape is missing from the bottom right corner?',
      options: ['Dotted hexagon', 'Grid triangle', 'Dotted trapezoid', 'Solid diamond'],
      render_spec: {
        kind: 'shape_matrix' as const,
        cells: [
          [
            { shape: 'hexagon' as const, fill: 'outline' as const },
            { shape: 'hexagon' as const, fill: 'grid' as const },
            { shape: 'hexagon' as const, fill: 'solid' as const },
            { shape: 'hexagon' as const, fill: 'dots' as const },
          ],
          [
            { shape: 'diamond' as const, fill: 'outline' as const },
            { shape: 'diamond' as const, fill: 'grid' as const },
            null,
            null,
          ],
          [
            { shape: 'triangle' as const, fill: 'outline' as const },
            null,
            null,
            { shape: 'triangle' as const, fill: 'dots' as const },
          ],
          [
            null,
            { shape: 'trapezoid' as const, fill: 'grid' as const },
            { shape: 'trapezoid' as const, fill: 'solid' as const },
            { question: true as const },
          ],
        ],
        choices: [
          { shape: 'hexagon' as const, fill: 'dots' as const },
          { shape: 'triangle' as const, fill: 'grid' as const },
          { shape: 'trapezoid' as const, fill: 'dots' as const },
          { shape: 'diamond' as const, fill: 'solid' as const },
        ],
      },
    };
    wireApi([MATRIX_Q]);
    renderPage();

    expect(
      await screen.findByRole('img', {
        name: 'A four by four shape pattern with the bottom-right shape missing',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('academy-option-C')).toHaveTextContent('Dotted trapezoid');
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });

  it('renders the repeating light sequence with four visual options', async () => {
    const cycle = [
      'circle',
      'circle',
      'star',
      'oval',
      'oval',
      'oval',
      'star',
      'triangle',
      'triangle',
      'star',
    ] as const;
    const PATTERN_Q = {
      ...TEXT_CHOICE_Q,
      id: 'naplan-y3-2010-std-q14',
      stem_text: 'Which option shows the order of the next four lights?',
      options: [
        'Star, oval, oval, oval',
        'Circle, circle, star, oval',
        'Star, circle, circle, star',
        'Oval, oval, oval, star',
      ],
      render_spec: {
        kind: 'symbol_pattern' as const,
        sequence: [...cycle, ...cycle],
        choices: [
          ['star', 'oval', 'oval', 'oval'],
          ['circle', 'circle', 'star', 'oval'],
          ['star', 'circle', 'circle', 'star'],
          ['oval', 'oval', 'oval', 'star'],
        ] as const,
      },
    };
    wireApi([PATTERN_Q]);
    renderPage();

    expect(await screen.findByRole('img', { name: /Repeating lights:/ })).toBeInTheDocument();
    expect(screen.getByTestId('academy-option-B')).toHaveTextContent('Circle, circle, star, oval');
    expect(screen.queryByTestId('academy-question-image')).not.toBeInTheDocument();
  });
});
