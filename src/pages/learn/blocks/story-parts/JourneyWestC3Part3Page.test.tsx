// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC3Part3Page } from './JourneyWestC3Part3Page';
import { C3_P2_SCRIPT_IDS, C3_P2_STARTER_PROJECT } from './journeyWestC3Part2Program';
import {
  C3_P3_CANDIDATES,
  C3_P3_LOOP_PAGE,
  c3p3CandidateProject,
  c3p3DecodePredictions,
  c3p3EncodePredictions,
} from './journeyWestC3Part3Program';
import { runPageFlow } from '../pageFlowRun';
import { JTW_C3_MONKEY_KING_ID } from '../jtwC3Stage';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

const instantSleep = () => Promise.resolve();

/** C1 P1–P8 + C2 P1–P8 + C3-P1 complete — C3-P2 carries the real footprints. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  'jtw-s1-c3-p1',
];

/** Exactly what C3-P2 stores when its run reproduces the stable loop. */
const PART2_FOOTPRINTS = ['page1:3-9->7-9:page2', 'page2:2-8->6-8:page1', 'page1:3-9:stop'];

/** What a real 1 → 2 → 3 rehearsal measures off the runner. */
const REHEARSAL_FOOTPRINTS = [
  'page1:3-9->7-9:page2',
  'page2:2-8->6-8:page3',
  'page3:2-9->2-9:stop',
];

const PART2_ROW = {
  part_id: 'jtw-s1-c3-p2',
  completed_at: '2026-07-27T05:00:00.000Z',
  evidence: {
    schema_version: 1 as const,
    selections: {
      story_screens: ['story-card-c', 'part-2-hook'],
      page_trace: ['1', '2', '1'],
      run_footprints: PART2_FOOTPRINTS,
      first_deviation: ['page-2-open-sea'],
    },
    prediction: 'predict-back-to-page-1',
  },
};

const C3_P2_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [
    ...PRIOR_PART_IDS.map((partId) => ({
      part_id: partId,
      completed_at: '2026-07-27T04:00:00.000Z',
      evidence: {},
    })),
    PART2_ROW,
  ],
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p2', 'jtw-s1-c3-p3'],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p3']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part3Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const pick = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));

/** Read both story screens. */
function readStory() {
  fireEvent.click(screen.getByTestId('jtw-c3p3-story-next'));
}

/** The model half: why it looped, which single card changes, the walk, the password. */
function explainTheModel() {
  pick(/1 就是花果山海岸/);
  pick('只换 Page 2 的出口卡');
  const walk = screen.getByTestId('jtw-c3p3-walk');
  const step = (label: string) => {
    const button = Array.from(walk.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === label,
    );
    if (!button) throw new Error(`floor card ${label} is not rendered`);
    fireEvent.click(button);
  };
  step('Page 1 花果山海岸');
  step('Page 2 海上中段');
  step('Page 1 花果山海岸');
  pick('出口数字决定下一页。');
}

/** Predict all three candidate cards correctly. */
function predictAllThree() {
  for (const candidate of C3_P3_CANDIDATES) {
    const card = screen.getByTestId(`jtw-c3p3-candidate-${candidate.exit}`);
    const button = Array.from(card.querySelectorAll('button')).find((entry) =>
      entry.getAttribute('aria-pressed') !== null && entry.textContent === outcomeLabel(candidate.outcomeId),
    );
    if (!button) throw new Error(`outcome ${candidate.outcomeId} is not rendered`);
    fireEvent.click(button);
  }
}

function outcomeLabel(outcomeId: string): string {
  const labels: Record<string, string> = {
    'outcome-loop-home': '又被送回花果山海岸，木筏还在打转',
    'outcome-stay-open-sea': '再进一次海中央，就停在那里走不动了',
    'outcome-reach-far-forest': '一路走到彼岸山林，稳稳地结束',
  };
  return labels[outcomeId];
}

/** Everything up to (but not including) trying a candidate card. */
function walkThroughTheModel() {
  readStory();
  explainTheModel();
  predictAllThree();
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C3_P2_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c3-p3',
    completed_at: '2026-07-27T06:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('journeyWestC3Part3Program · candidate exit cards', () => {
  it('swaps ONLY the Page 2 exit number and never mutates the shipped starter', () => {
    const shippedExit = () =>
      C3_P2_STARTER_PROJECT.pages[C3_P3_LOOP_PAGE - 1].characters
        .flatMap((character) => character.scripts)
        .find((script) => script.id === C3_P2_SCRIPT_IDS.wrongExit)
        ?.blocks.find((block) => block.op === 'goto_page')?.n;

    expect(shippedExit()).toBe(1);
    const candidate = c3p3CandidateProject(3);
    const swapped = candidate.pages[C3_P3_LOOP_PAGE - 1].characters
      .flatMap((character) => character.scripts)
      .find((script) => script.id === C3_P2_SCRIPT_IDS.wrongExit)
      ?.blocks.find((block) => block.op === 'goto_page')?.n;
    expect(swapped).toBe(3);
    // The starter is untouched: this Part never saves a repaired program.
    expect(shippedExit()).toBe(1);
    // Pages 1 and 3 are the very same objects — nothing else was rewritten.
    expect(candidate.pages[0]).toBe(C3_P2_STARTER_PROJECT.pages[0]);
    expect(candidate.pages[2]).toBe(C3_P2_STARTER_PROJECT.pages[2]);
  });

  it('measures each candidate on the REAL runner: 1 loops, 2 re-enters, only 3 arrives', async () => {
    const runCandidate = (exit: number) =>
      runPageFlow(c3p3CandidateProject(exit), {
        trackCharacterId: JTW_C3_MONKEY_KING_ID,
        sleep: instantSleep,
      });

    const one = await runCandidate(1);
    expect(one.trace).toEqual([1, 2, 1]);
    expect(one.stoppedBy).toBe('loop');

    const two = await runCandidate(2);
    expect(two.trace).toEqual([1, 2, 2]);
    expect(two.stoppedBy).toBe('loop');
    // "停留/重入而非到达": 彼岸山林 never opens.
    expect(two.trace).not.toContain(3);

    const three = await runCandidate(3);
    expect(three.trace).toEqual([1, 2, 3]);
    expect(three.stoppedBy).toBe('end');
    expect(three.visits[2].exitTo).toBeNull();
  });

  it('round-trips candidate predictions and drops malformed rows', () => {
    const predictions = {
      'exit-card-1': 'outcome-loop-home',
      'exit-card-2': 'outcome-stay-open-sea',
      'exit-card-3': 'outcome-reach-far-forest',
    };
    const rows = c3p3EncodePredictions(predictions);
    expect(rows).toEqual([
      'exit-card-1:outcome-loop-home',
      'exit-card-2:outcome-stay-open-sea',
      'exit-card-3:outcome-reach-far-forest',
    ]);
    expect(c3p3DecodePredictions(rows)).toEqual(predictions);
    expect(c3p3DecodePredictions(['nonsense', 'not-a-card:outcome-loop-home'])).toEqual({});
  });
});

describe('JourneyWestC3Part3Page · C3-P3 页面出口不是门牌装饰', () => {
  it('blocks kids who have not finished C3-P2 (server unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_P2_DONE,
      completed: C3_P2_DONE.completed.slice(0, PRIOR_PART_IDS.length),
      unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p2'],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c3p3-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c3-p3')).not.toBeInTheDocument();
  });

  it("shows Part 2's own saved footprints and the untouched starter exit card", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p3')).toBeInTheDocument());

    const rows = Array.from(
      screen.getByTestId('jtw-c3p3-part2-footprints').querySelectorAll('li'),
    );
    expect(
      rows.map((row) => [row.getAttribute('data-page'), row.getAttribute('data-exit-to')]),
    ).toEqual([
      ['1', '2'],
      ['2', '1'],
      ['1', ''],
    ]);
    // The shipped starter still says 1 — no editor, no repair on this page.
    expect(screen.getByTestId('jtw-c3p3-starter-exit')).toHaveAttribute('data-exit', '1');
    expect(screen.queryByTestId('jtw-c3p3-no-part2')).not.toBeInTheDocument();
  });

  it('says so instead of guessing when Part 2 stored no footprints', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_P2_DONE,
      completed: [
        ...C3_P2_DONE.completed.slice(0, PRIOR_PART_IDS.length),
        { ...PART2_ROW, evidence: { schema_version: 1 as const, selections: {} } },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c3p3-no-part2')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-c3p3-part2-footprints')).not.toBeInTheDocument();
  });

  it('refuses to let a card be tried before all three predictions are in', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p3')).toBeInTheDocument());

    expect(screen.getByTestId('jtw-c3p3-try-1')).toBeDisabled();
    expect(screen.getByTestId('jtw-c3p3-try-3')).toBeDisabled();
    expect(screen.getByTestId('jtw-c3p3-try-note')).toHaveTextContent('不先说出你以为会发生什么');

    predictAllThree();
    expect(screen.getByTestId('jtw-c3p3-try-3')).toBeEnabled();
    expect(screen.getByTestId('jtw-c3p3-try-note')).toHaveTextContent('点一张卡');
  });

  it('hints the wrong explanation, the wrong card and the speed password', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p3')).toBeInTheDocument());

    pick(/木筏走得太快/);
    expect(screen.getByRole('status')).toHaveTextContent('一格没多走');
    pick(/1 就是花果山海岸/);

    pick('换 Page 1 的出口卡');
    expect(screen.getByRole('status')).toHaveTextContent('那张卡没有错');
    pick('三张页面全部重做一遍');
    expect(screen.getByRole('status')).toHaveTextContent('脚印只指着一张卡');
    pick('只换 Page 2 的出口卡');

    pick('走得越快，就越先到下一页。');
    expect(screen.getByRole('status')).toHaveTextContent('用加速把循环遮起来');
    expect(screen.getByTestId('jtw-c3p3-continue')).toBeDisabled();
  });

  it("only accepts the floor walk Part 2's saved trace really measured", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p3')).toBeInTheDocument());

    const walk = screen.getByTestId('jtw-c3p3-walk');
    const step = (label: string) => {
      const button = Array.from(walk.querySelectorAll('button')).find(
        (candidate) => candidate.textContent === label,
      );
      fireEvent.click(button!);
    };
    // The tempting 1 → 2 → 3 is the plan, not what the raft really walked.
    step('Page 1 花果山海岸');
    step('Page 2 海上中段');
    step('Page 3 彼岸山林');
    expect(screen.getByTestId('jtw-c3p3-walk-steps').querySelectorAll('li')).toHaveLength(3);
    expect(walk.querySelector('h2')?.textContent).not.toContain('✓');

    fireEvent.click(screen.getByRole('button', { name: '重走' }));
    step('Page 1 花果山海岸');
    step('Page 2 海上中段');
    step('Page 1 花果山海岸');
    expect(walk.querySelector('h2')?.textContent).toContain('✓');
  });

  it('runs card 1 for real, shows the loop, and refuses to resolve on it', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p3')).toBeInTheDocument());
    walkThroughTheModel();

    fireEvent.click(screen.getByTestId('jtw-c3p3-try-1'));
    await waitFor(() => expect(screen.getByTestId('jtw-c3p3-result-1')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c3p3-candidate-1')).toHaveAttribute('data-trace', '1-2-1');
    expect(screen.getByTestId('jtw-c3p3-result-1')).toHaveTextContent('打住了');
    expect(screen.queryByTestId('jtw-c3p3-resolved')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p3-continue')).toBeDisabled();

    // Card 2 re-enters the open sea instead of arriving.
    fireEvent.click(screen.getByTestId('jtw-c3p3-try-2'));
    await waitFor(() => expect(screen.getByTestId('jtw-c3p3-result-2')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c3p3-candidate-2')).toHaveAttribute('data-trace', '1-2-2');
    expect(screen.getByTestId('jtw-c3p3-continue')).toBeDisabled();
  });

  it('resolves only on a real 1 → 2 → 3 rehearsal with card 3', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p3')).toBeInTheDocument());
    walkThroughTheModel();

    fireEvent.click(screen.getByTestId('jtw-c3p3-try-3'));
    await waitFor(() => expect(screen.getByTestId('jtw-c3p3-resolved')).toBeInTheDocument());

    expect(screen.getByTestId('jtw-c3p3-candidate-3')).toHaveAttribute('data-trace', '1-2-3');
    // The rehearsal really ended on the far forest.
    expect(screen.getByTestId('jtw-c3p3-stage')).toHaveAttribute('data-page', '3');
    // 出口卡 3 连上彼岸山林，返乡箭头淡出。
    expect(screen.getByTestId('jtw-c3p3-connected-arrow')).toHaveTextContent('通向彼岸山林');
    expect(screen.getByTestId('jtw-c3p3-faded-arrow')).toHaveClass('opacity-50');
    // The rehearsal card is a copy: the starter's own exit still says 1.
    expect(screen.getByTestId('jtw-c3p3-rehearsal-exit')).toHaveAttribute('data-exit', '3');
    expect(screen.getByTestId('jtw-c3p3-starter-exit')).toHaveAttribute('data-exit', '1');
    expect(screen.getByTestId('jtw-c3p3-continue')).toBeEnabled();
  });

  it('persists the model evidence and the rehearsal; writes no project', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p3')).toBeInTheDocument());
    walkThroughTheModel();
    fireEvent.click(screen.getByTestId('jtw-c3p3-try-3'));
    await waitFor(() => expect(screen.getByTestId('jtw-c3p3-resolved')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('jtw-c3p3-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c3-p3', {
      schema_version: 1,
      selections: {
        story_screens: ['part-3-floor-cards', 'part-3-password'],
        deviation_reason: ['reason-exit-number-says-1'],
        card_to_swap: ['swap-page-2-card'],
        floor_walk: ['floor-page-1', 'floor-page-2', 'floor-page-1'],
        password: ['password-exit-number'],
        candidate_predictions: [
          'exit-card-1:outcome-loop-home',
          'exit-card-2:outcome-stay-open-sea',
          'exit-card-3:outcome-reach-far-forest',
        ],
        chosen_exit_card: ['exit-card-3'],
        rehearsal_trace: ['1', '2', '3'],
        rehearsal_footprints: REHEARSAL_FOOTPRINTS,
      },
      prediction: 'outcome-reach-far-forest',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the model answers and the rehearsal after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_P2_DONE,
      completed: [
        ...C3_P2_DONE.completed,
        {
          part_id: 'jtw-s1-c3-p3',
          completed_at: '2026-07-27T06:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['part-3-floor-cards', 'part-3-password'],
              deviation_reason: ['reason-exit-number-says-1'],
              card_to_swap: ['swap-page-2-card'],
              floor_walk: ['floor-page-1', 'floor-page-2', 'floor-page-1'],
              password: ['password-exit-number'],
              candidate_predictions: [
                'exit-card-1:outcome-loop-home',
                'exit-card-2:outcome-stay-open-sea',
                'exit-card-3:outcome-reach-far-forest',
              ],
              chosen_exit_card: ['exit-card-3'],
              rehearsal_trace: ['1', '2', '3'],
              rehearsal_footprints: REHEARSAL_FOOTPRINTS,
            },
            prediction: 'outcome-reach-far-forest',
          },
        },
      ],
      unlocked_part_ids: [...C3_P2_DONE.unlocked_part_ids, 'jtw-s1-c3-p4'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-c3p3-resolved')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c3p3-candidate-3')).toHaveAttribute('data-chosen', 'true');
    expect(screen.getByRole('button', { name: '只换 Page 2 的出口卡' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('jtw-c3p3-walk-steps').querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByTestId('jtw-c3p3-continue')).toBeEnabled();
  });
});
