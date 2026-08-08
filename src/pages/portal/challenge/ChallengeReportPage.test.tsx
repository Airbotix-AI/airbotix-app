// @vitest-environment jsdom
// Creative Code Challenge parent private report (/portal/challenge/:slug/report,
// creative-code-challenge-prd.md §5 flow 10, §7).
//
// What these tests defend, in order of how much damage the failure would do:
//   1. before the results lock there is NO report — not a preview, not a
//      partial, not one band and not one judge mark;
//   2. a failed request is never rendered as "there is no report";
//   3. nothing on the page ranks or compares the child — no placing, no
//      percentile, no percentage, no cohort, and no other entrant's data;
//   4. the framing that stops this reading as a grade/IQ/qualification/label is
//      on screen, verbatim from the server;
//   5. once locked, the six bands, each judge's six marks and their written
//      comments actually render.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, me, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(
      public status: number,
      public code = 'ERR',
      message = 'err',
      public details?: unknown,
    ) {
      super(message);
    }
  }
  return {
    api: vi.fn(),
    me: {
      data: { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' } as {
        kind: string;
        family_id: string | null;
        email: string;
      },
    },
    MockApiError,
  };
});

vi.mock('@/lib/api', () => ({ api, ApiError: MockApiError }));
vi.mock('@/auth/useAuth', () => ({ useMe: () => me }));

import { ChallengeReportPage } from './ChallengeReportPage';

const SLUG = 'creative-code-challenge-2026-junior';
const REPORT_PATH = `/challenges/by-slug/${SLUG}/report?kid_id=kid-1`;
const KIDS = [{ id: 'kid-1', nickname: 'Mia', age: 9 }];

const DIMENSIONS = [
  {
    key: 'original_idea',
    label: 'Original idea and creative decisions',
    max_points: 25,
    description: 'How original the concept is.',
    constraints: [],
  },
  {
    key: 'playable_result',
    label: 'Playable result and user experience',
    max_points: 20,
    description: 'Whether it works.',
    constraints: [],
  },
  {
    key: 'testing_improvement',
    label: 'Testing and improvement',
    max_points: 20,
    description: 'Evidence of iteration.',
    constraints: [],
  },
  {
    key: 'code_understanding',
    label: 'Code/AI understanding',
    max_points: 15,
    description: 'Explaining the code.',
    constraints: [],
  },
  {
    key: 'pitch',
    label: 'English Project Pitch',
    max_points: 15,
    description: 'Clarity of explanation.',
    constraints: ['Score clarity of explanation ONLY.'],
  },
  {
    key: 'responsible_creation',
    label: 'Responsible creation',
    max_points: 5,
    description: 'Respect for other people’s work.',
    constraints: [],
  },
];

const CAPABILITY_TITLES: Record<string, string> = {
  original_idea: 'Designing something of their own',
  playable_result: 'Making it actually work for someone else',
  testing_improvement: 'Testing, then changing something because of what they found',
  code_understanding: 'Explaining what the code (or the AI) is doing',
  pitch: 'Explaining the work in English',
  responsible_creation: 'Respecting other people and their work',
};

const BAND_BY_DIMENSION: Record<string, { id: string; label: string }> = {
  original_idea: { id: 'extending', label: 'Extending' },
  playable_result: { id: 'capable', label: 'Capable' },
  testing_improvement: { id: 'developing', label: 'Developing' },
  code_understanding: { id: 'starting', label: 'Starting' },
  pitch: { id: 'extending', label: 'Extending' },
  responsible_creation: { id: 'starting', label: 'Starting' },
};

const MARKS: Record<string, number> = {
  original_idea: 20,
  playable_result: 10,
  testing_improvement: 6,
  code_understanding: 2,
  pitch: 15,
  responsible_creation: 0,
};

const JUDGE_ONE_COMMENT = 'The jump tuning after playtesting is real evidence of iteration.';

function report(overrides: Record<string, unknown> = {}) {
  return {
    edition: {
      id: 'ed_1',
      slug: SLUG,
      name: 'Creative Code Challenge — Junior',
      results_at: '2026-09-14T00:00:00.000Z',
    },
    results_locked_at: '2026-09-12T04:00:00.000Z',
    kid_id: 'kid-1',
    submission: {
      id: 'sub_1',
      display_name: 'Pixel Fox',
      project_type: 'game',
      one_change_note: 'I made the jump smaller after my sister kept missing it.',
    },
    rubric: {
      current_version: '1.0',
      scored_under_version: '1.0',
      total_points: 100,
      dimensions: DIMENSIONS,
    },
    judges: [
      { label: 'Judge 1', scores: MARKS, total: 53, comments: JUDGE_ONE_COMMENT },
      { label: 'Judge 2', scores: MARKS, total: 53, comments: null },
    ],
    aggregate: {
      judge_count: 2,
      minimum_independent_scores: 2,
      below_minimum_independent_scores: false,
      mean_total: 53,
      total_points: 100,
      dimensions: DIMENSIONS.map((d) => ({
        key: d.key,
        label: d.label,
        max_points: d.max_points,
        mean: MARKS[d.key],
      })),
    },
    capability_picture: DIMENSIONS.map((d) => ({
      rubric_dimension: d.key,
      capability_id: 'innovative-designer',
      title: CAPABILITY_TITLES[d.key],
      evidence_of: `What the marks for ${d.label} are evidence of.`,
      max_points: d.max_points,
      mean: MARKS[d.key],
      band: BAND_BY_DIMENSION[d.key].id,
      band_label: BAND_BY_DIMENSION[d.key].label,
      band_description: `In this entry, the ${BAND_BY_DIMENSION[d.key].label} description.`,
    })),
    bands: [
      { id: 'starting', label: 'Starting', from_ratio: 0, to_ratio: 0.25, description: 'In this entry, just getting going.' },
      { id: 'developing', label: 'Developing', from_ratio: 0.25, to_ratio: 0.5, description: 'In this entry, happening in places.' },
      { id: 'capable', label: 'Capable', from_ratio: 0.5, to_ratio: 0.75, description: 'In this entry, done independently.' },
      { id: 'extending', label: 'Extending', from_ratio: 0.75, to_ratio: 1, description: 'In this entry, pushed further.' },
    ],
    next_steps: [
      {
        kind: 'course',
        rubric_dimension: 'responsible_creation',
        capability_id: 'digital-citizen',
        focus_title: CAPABILITY_TITLES.responsible_creation,
        course: {
          slug: 'creative-code-studio-l1',
          title: 'Creative Code Studio L1',
          target_age_min: 8,
          target_age_max: 12,
          why: 'Kids credit every borrowed asset from day one of the build.',
        },
        practice: [],
      },
      {
        kind: 'practice',
        rubric_dimension: 'code_understanding',
        capability_id: 'knowledge-constructor',
        focus_title: CAPABILITY_TITLES.code_understanding,
        course: null,
        practice: ['Ask them to talk you through one part of their project line by line.'],
      },
    ],
    // Copied VERBATIM from the backend's `CHALLENGE_REPORT_FRAMING`
    // (`platform-backend/src/challenges/challenge-parent-report.ts`), because
    // this fixture reads as if it pins the contract — a paraphrase here would
    // let a server-side copy change to the one paragraph that stops this
    // reading as a grade pass unnoticed on the surface that renders it.
    // `challenge-parent-report.spec.ts` holds the server side of the same text.
    framing: {
      scope:
        'Everything below describes what this one competition entry showed the judges who read ' +
        'it. It is a description of one project, made on one deadline, by a child who was ' +
        'learning while they built it.',
      not_a: [
        'This is not a measure of intelligence or ability.',
        'This is not a school grade, a school report, or a record of school achievement.',
        'This is not a formal qualification, certificate or accreditation.',
        'This is not a permanent label — it describes this project, not this child.',
        'This is not a comparison with any other entrant: no other child’s marks, comments, ' +
          'bands or placing appear anywhere in this report.',
      ],
      rubric_note:
        'The marks were given by Airbotix judges against the published six-part rubric, which ' +
        'is included here so you can see exactly what was being looked at. The English pitch is ' +
        'scored on clarity of explanation only — never on accent, never on the language spoken ' +
        'at home, never on how advanced the vocabulary is.',
      privacy_note:
        'This report is private to your family. Competition placings are published on the ' +
        'public results page; nothing on this page ranks your child against anyone.',
    },
    ...overrides,
  };
}

function mount(initialPath = `/portal/challenge/${SLUG}/report`) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/portal/challenge/:slug/report" element={<ChallengeReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** `api` routed by path so a kids read and a report read cannot be confused. */
function routeApi(handlers: { kids?: () => unknown; report: () => unknown }) {
  api.mockImplementation((path: string) => {
    if (path.startsWith('/families/')) {
      return Promise.resolve(handlers.kids ? handlers.kids() : KIDS);
    }
    if (path.startsWith('/challenges/by-slug/')) {
      const result = handlers.report();
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    }
    throw new Error(`unexpected path ${path}`);
  });
}

beforeEach(() => {
  api.mockReset();
  me.data = { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' };
});

afterEach(() => cleanup());

describe('ChallengeReportPage — before the results lock', () => {
  it('shows a plain "not published yet" state with no preview of any kind', async () => {
    routeApi({
      report: () =>
        new MockApiError(
          409,
          'RESULTS_NOT_LOCKED',
          'Results for this challenge have not been locked yet.',
          { results_at: '2026-09-14T00:00:00.000Z' },
        ),
    });

    mount();

    expect(await screen.findByTestId('report-not-published')).toBeInTheDocument();
    expect(
      screen.getByText(/Results for this challenge have not been locked yet\./),
    ).toBeInTheDocument();

    // Not one band, not one judge card, not one mark.
    expect(screen.queryByTestId('report-capability')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-judges')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-aggregate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-band-scale')).not.toBeInTheDocument();
    for (const band of ['Starting', 'Developing', 'Capable', 'Extending']) {
      expect(screen.queryByText(band)).not.toBeInTheDocument();
    }
  });
});

describe('ChallengeReportPage — after the lock', () => {
  it('renders the six capability bands, the aggregate and each judge’s marks + comment', async () => {
    routeApi({ report: () => report() });

    mount();

    expect(await screen.findByTestId('report-capability')).toBeInTheDocument();

    // Six parts, each with its band and its own-maximum mark.
    for (const dimension of DIMENSIONS) {
      const card = screen.getByTestId(`report-band-${dimension.key}`);
      expect(card).toHaveTextContent(CAPABILITY_TITLES[dimension.key]);
      expect(card).toHaveTextContent(BAND_BY_DIMENSION[dimension.key].label);
      expect(card).toHaveTextContent(`${MARKS[dimension.key]} / ${dimension.max_points}`);
    }

    // The four-band scale is served, not invented locally.
    expect(screen.getByTestId('report-band-scale')).toHaveTextContent(
      'In this entry, pushed further.',
    );

    // The aggregate.
    const aggregate = screen.getByTestId('report-aggregate');
    expect(aggregate).toHaveTextContent('2 independent judges’ marks stand behind this report.');
    expect(aggregate).toHaveTextContent('53 / 100');

    // Every valid judge, with their six marks and their evidence-based comment.
    const judges = screen.getByTestId('report-judges');
    expect(judges).toHaveTextContent('Judge 1');
    expect(judges).toHaveTextContent('Judge 2');
    expect(judges).toHaveTextContent(JUDGE_ONE_COMMENT);
    for (const dimension of DIMENSIONS) {
      expect(screen.getByTestId('report-judge-judge-1')).toHaveTextContent(dimension.label);
    }
    // A judge who wrote nothing is SAID to have written nothing — an empty gap
    // reads as a comment the page withheld.
    expect(screen.getByTestId('report-judge-judge-2')).toHaveTextContent(
      'This judge recorded marks without a written comment.',
    );
  });

  it('renders the served framing that stops this reading as a grade or a label', async () => {
    routeApi({ report: () => report() });

    mount();

    const framing = await screen.findByTestId('report-framing');
    expect(framing).toHaveTextContent('This is not a measure of intelligence or ability.');
    expect(framing).toHaveTextContent('This is not a school grade');
    expect(framing).toHaveTextContent('This is not a formal qualification');
    expect(framing).toHaveTextContent('This is not a permanent label');
    expect(framing).toHaveTextContent(
      'This is not a comparison with any other entrant: no other child’s marks, comments, bands ' +
        'or placing appear anywhere in this report.',
    );
    // The English-pitch fairness rule travels with the rubric note, verbatim.
    expect(framing).toHaveTextContent('never on the language spoken at home');
  });

  it('renders no ranking, no percentage and no other child anywhere on the page', async () => {
    routeApi({ report: () => report() });

    mount();
    await screen.findByTestId('report-capability');

    // The served framing card is the ONE place rank vocabulary may legitimately
    // appear, because every use there is a NEGATION ("not a comparison…",
    // "nothing on this page ranks your child against anyone"). So it is excised
    // before the denylist runs, and held to that negation separately below —
    // asserting over the whole body would either pass by paraphrasing the
    // server's copy in the fixture or fail on the server's real words.
    const framingText = screen.getByTestId('report-framing').textContent ?? '';
    const rendered = (document.body.textContent ?? '').replace(framingText, '');
    expect(rendered).not.toMatch(/percentile|\brank(ed|ing|s)?\b|\bplacing\b|cohort|top \d/i);
    expect(rendered).not.toMatch(/\d\s?%/);
    expect(rendered).not.toMatch(/out of \d+ (children|entrants|kids)/i);
    // …and the framing's own uses only ever say there is no such thing.
    expect(framingText).toMatch(/not a comparison with any other entrant/i);
    expect(framingText).toMatch(/nothing on this page ranks your child against anyone/i);
    // Only this child's report was ever requested.
    const reportCalls = api.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .filter((path: string) => path.includes('/report'));
    expect(reportCalls).toEqual([REPORT_PATH]);
  });

  it('names a real course for a next step and links to its Portal page', async () => {
    routeApi({ report: () => report() });

    mount();

    const steps = await screen.findByTestId('report-next-steps');
    expect(steps).toHaveTextContent('Creative Code Studio L1');
    expect(steps).toHaveTextContent('Kids credit every borrowed asset from day one of the build.');
    expect(screen.getByRole('link', { name: /See this course/ })).toHaveAttribute(
      'href',
      '/portal/courses/creative-code-studio-l1',
    );
    // Where the catalogue matched nothing, practice ideas — never an invented course.
    const practice = screen.getByTestId('report-next-step-code_understanding');
    expect(practice).toHaveTextContent('talk you through one part of their project');
    expect(practice.querySelector('a')).toBeNull();
  });

  it('says so when fewer than the minimum independent judges stand behind the report', async () => {
    routeApi({
      report: () =>
        report({
          judges: [{ label: 'Judge 1', scores: MARKS, total: 53, comments: null }],
          aggregate: {
            ...report().aggregate,
            judge_count: 1,
            below_minimum_independent_scores: true,
          },
        }),
    });

    mount();

    expect(await screen.findByTestId('report-below-minimum')).toHaveTextContent(
      'Fewer than 2 judges’ marks stand behind this report.',
    );
  });

  it('prints each judge’s total against the rubric’s own published maximum', async () => {
    // Not a sum recomputed from the dimension list: a response carrying fewer
    // dimensions than the rubric would silently shrink the denominator a child
    // is judged on.
    routeApi({
      report: () =>
        report({
          rubric: { ...report().rubric, total_points: 100, dimensions: DIMENSIONS.slice(0, 2) },
        }),
    });

    mount();

    expect(await screen.findByTestId('report-judge-judge-1')).toHaveTextContent('Total 53 / 100');
  });
});

describe('ChallengeReportPage — a mark is never invented', () => {
  it('says "Not marked" for a dimension a judge did not score, never 0', async () => {
    // The failure: `judge.scores[key] ?? 0` printed `0 / 15` for a dimension
    // absent from the frozen marks — a mark this child never received.
    const partial = { ...MARKS };
    delete partial.code_understanding;
    routeApi({
      report: () =>
        report({
          judges: [{ label: 'Judge 1', scores: partial, total: 51, comments: null }],
        }),
    });

    mount();

    const card = await screen.findByTestId('report-judge-judge-1');
    expect(card).toHaveTextContent('Code/AI understanding');
    expect(card).toHaveTextContent('Not marked');
    expect(card).not.toHaveTextContent('0 / 15');
    // A genuine 0 is still a mark and still prints as one.
    expect(card).toHaveTextContent('0 / 5');
  });

  it('holds back every mark when the rubric served is not the one they were scored under', async () => {
    routeApi({
      report: () => report({ rubric: { ...report().rubric, scored_under_version: '0.9' } }),
    });

    mount();

    const card = await screen.findByTestId('report-version-mismatch');
    // Both versions named, so a family ringing up can say which two disagreed.
    expect(card).toHaveTextContent('version 0.9');
    expect(card).toHaveTextContent('version 1.0');
    expect(card).toHaveTextContent(/will not print a mark against a maximum/i);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    // Nothing derived from the marks is on screen at all.
    expect(screen.queryByTestId('report-judges')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-aggregate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-capability')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-next-steps')).not.toBeInTheDocument();
    // What this IS is still stated: the framing card and the entry never depend
    // on a mark, and hiding them would read as "there is no report".
    expect(screen.getByTestId('report-framing')).toBeInTheDocument();
    expect(screen.getByTestId('report-entry')).toHaveTextContent('Pixel Fox');
  });

  it('holds them back just the same when no version was recorded for the marks', async () => {
    routeApi({
      report: () => report({ rubric: { ...report().rubric, scored_under_version: null } }),
    });

    mount();

    expect(await screen.findByTestId('report-version-mismatch')).toHaveTextContent(
      /was not recorded/i,
    );
    expect(screen.queryByTestId('report-judges')).not.toBeInTheDocument();
  });
});

describe('ChallengeReportPage — failures are never an absent report', () => {
  it('renders a 500 as a FAILED request with a retry, not as "no report"', async () => {
    routeApi({ report: () => new MockApiError(500, 'INTERNAL', 'Something broke.') });

    mount();

    const failed = await screen.findByTestId('report-failed');
    expect(failed).toHaveTextContent('This is a failed request, not a missing report');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByTestId('report-not-published')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-unavailable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-not-found')).not.toBeInTheDocument();
  });

  it('renders the backend’s own sentence for a locked-but-no-report entry', async () => {
    routeApi({
      report: () =>
        new MockApiError(
          409,
          'REPORT_NOT_AVAILABLE',
          'This child registered but no entry was sent in.',
          { reason: 'no_submission' },
        ),
    });

    mount();

    expect(await screen.findByTestId('report-unavailable')).toHaveTextContent(
      'This child registered but no entry was sent in.',
    );
    expect(screen.queryByTestId('report-failed')).not.toBeInTheDocument();
  });

  it('shows an explicit loading state rather than an empty page', async () => {
    const deferred: { resolve: (value: unknown) => void } = { resolve: () => {} };
    api.mockImplementation((path: string) => {
      if (path.startsWith('/families/')) return Promise.resolve(KIDS);
      return new Promise((resolve) => {
        deferred.resolve = resolve;
      });
    });

    mount();

    expect(await screen.findByTestId('report-loading')).toBeInTheDocument();
    deferred.resolve(report());
    await waitFor(() => expect(screen.getByTestId('report-capability')).toBeInTheDocument());
  });
});

describe('ChallengeReportPage — choosing a child', () => {
  it('reads only the child in the link, and offers a picker when there are several', async () => {
    routeApi({
      kids: () => [...KIDS, { id: 'kid-2', nickname: 'Leo', age: 11 }],
      report: () => report(),
    });

    mount(`/portal/challenge/${SLUG}/report?kid_id=kid-1`);

    await screen.findByTestId('report-capability');
    expect(screen.getByTestId('report-kid')).toHaveValue('kid-1');
    const reportCalls = api.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .filter((path: string) => path.includes('/report'));
    expect(reportCalls).toEqual([REPORT_PATH]);
  });

  it('asks which child before reading anything when the link names none', async () => {
    routeApi({
      kids: () => [...KIDS, { id: 'kid-2', nickname: 'Leo', age: 11 }],
      report: () => report(),
    });

    mount();

    expect(await screen.findByTestId('report-choose-child')).toBeInTheDocument();
    expect(
      api.mock.calls.filter((call: unknown[]) => String(call[0]).includes('/report')),
    ).toHaveLength(0);
  });
});
