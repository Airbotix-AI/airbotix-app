// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC3Part2Page } from './JourneyWestC3Part2Page';
import {
  C3_P2_ACTUAL_TRACE,
  C3_P2_EXPECTED_TRACE,
  C3_P2_PAGE1_RAFT_CELL,
  C3_P2_SCRIPT_IDS,
  C3_P2_STARTER_PROJECT,
  c3p2DecodeFootprints,
  c3p2EncodeFootprints,
} from './journeyWestC3Part2Program';
import {
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE2_BACKGROUND,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_BACKGROUND,
  JTW_C3_RAFT_SPRITE,
} from '../jtwC3Stage';
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

/** C1 P1–P8 + C2 P1–P8 + C3-P1 complete — C3-P2 is the unlock frontier. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  'jtw-s1-c3-p1',
];

const C3_P1_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p2'],
};

const SAVED_FOOTPRINTS = ['page1:3-9->7-9:page2', 'page2:2-8->6-8:page1', 'page1:3-9:stop'];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p2']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part2Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** 三张页面卡按 1 → 2 → 3 排好。 */
function orderPageCards() {
  const cards = screen.getByTestId('jtw-c3p2-page-cards');
  for (const label of ['花果山海岸', '海上中段', '彼岸山林']) {
    const button = Array.from(cards.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === label,
    );
    if (!button) throw new Error(`page card ${label} is not rendered`);
    fireEvent.click(button);
  }
}

function exitButton(label: string): HTMLElement {
  const button = Array.from(
    screen.getByTestId('jtw-c3p2-exit-cards').querySelectorAll('button'),
  ).find((candidate) => candidate.textContent?.includes(label));
  if (!button) throw new Error(`exit card ${label} is not rendered`);
  return button;
}

/** 两张出口箭头：Page 1 → 2，Page 2 → 3。 */
function orderExitCards() {
  fireEvent.click(exitButton('Page 1 的出口 → 2'));
  fireEvent.click(exitButton('Page 2 的出口 → 3'));
}

function predictCorrectly() {
  fireEvent.click(screen.getByRole('button', { name: /那块出口写着 1/ }));
}

/** Arrange the expected route, predict, and run the unmodified starter once. */
async function planAndRun() {
  orderPageCards();
  orderExitCards();
  predictCorrectly();
  fireEvent.click(screen.getByTestId('jtw-c3p2-run'));
  await waitFor(() => expect(screen.getByTestId('jtw-c3p2-traces')).toBeInTheDocument());
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C3_P1_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c3-p2',
    completed_at: '2026-07-27T05:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC3Part2Page · C3-P2 把出发和到达排成一条路', () => {
  it('ships the three-page starter exactly as the scene prints it', () => {
    const [page1, page2, page3] = C3_P2_STARTER_PROJECT.pages;
    const chainOf = (page: (typeof C3_P2_STARTER_PROJECT)['pages'][number], scriptId: string) =>
      page.characters
        .flatMap((character) => character.scripts)
        .find((script) => script.id === scriptId)?.blocks;

    expect(chainOf(page1, C3_P2_SCRIPT_IDS.depart)).toEqual([
      { op: 'when_flag' },
      { op: 'move_right', n: 4 },
      { op: 'goto_page', n: 2 },
    ]);
    // Page 2's exit deliberately says 1 — this Part never repairs it.
    expect(chainOf(page2, C3_P2_SCRIPT_IDS.wrongExit)).toEqual([
      { op: 'when_flag' },
      { op: 'play_sound', n: 4 },
      { op: 'move_right', n: 4 },
      { op: 'goto_page', n: 1 },
    ]);
    expect(chainOf(page3, C3_P2_SCRIPT_IDS.arrival)?.map((block) => block.op)).toEqual([
      'when_flag',
      'say',
      'end',
    ]);

    // Contract start cells (C3共享实现合同) and the raft as a real stage actor.
    expect(page1.characters[0].start).toMatchObject({ gx: 3, gy: 9, size: 3 });
    expect(page2.characters[0].start).toMatchObject({ gx: 2, gy: 8, size: 3 });
    expect(page3.characters[0].start).toMatchObject({ gx: 2, gy: 9, size: 3 });
    expect(page1.characters[1].start).toMatchObject(C3_P2_PAGE1_RAFT_CELL);
    expect(page2.characters[1].start).toMatchObject(JTW_C3_PAGE2_START_CELL);
    // Only ops the C3 contract declares.
    const ops = new Set(
      C3_P2_STARTER_PROJECT.pages.flatMap((page) =>
        page.characters.flatMap((character) =>
          character.scripts.flatMap((script) => script.blocks.map((block) => block.op)),
        ),
      ),
    );
    expect([...ops].sort()).toEqual(
      ['end', 'goto_page', 'move_right', 'play_sound', 'say', 'when_flag'].sort(),
    );
  });

  it('blocks kids who have not finished C3-P1 (server unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_P1_DONE,
      completed: C3_P1_DONE.completed.slice(0, 16),
      unlocked_part_ids: PRIOR_PART_IDS,
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c3p2-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c3-p2')).not.toBeInTheDocument();
  });

  it('keeps Go shut until the expected route and the prediction are in place', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p2')).toBeInTheDocument());

    expect(screen.getByTestId('jtw-c3p2-run')).toBeDisabled();
    orderPageCards();
    expect(screen.getByTestId('jtw-c3p2-run')).toBeDisabled();
    orderExitCards();
    expect(screen.getByTestId('jtw-c3p2-run')).toBeDisabled(); // prediction pending
    predictCorrectly();
    expect(screen.getByTestId('jtw-c3p2-run')).toBeEnabled();

    // The 1 exit belongs to the bug, not to the plan: picking it closes Go again.
    fireEvent.click(screen.getAllByRole('button', { name: '重新排' })[1]);
    fireEvent.click(exitButton('Page 2 的出口 → 1'));
    expect(screen.getByRole('status')).toHaveTextContent('把木筏送回 1 的出口正是我们要找的问题');
    expect(screen.getByTestId('jtw-c3p2-run')).toBeDisabled();
  });

  it('hints when the prediction ignores the exit number on the Page 2 block', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p2')).toBeInTheDocument());
    orderPageCards();
    orderExitCards();

    fireEvent.click(screen.getByRole('button', { name: /故事总会自己往下一页走/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Page 2 那一块写的是 1');
    expect(screen.getByTestId('jtw-c3p2-run')).toBeDisabled();

    predictCorrectly();
    expect(screen.getByTestId('jtw-c3p2-run')).toBeEnabled();
  });

  it('runs the unmodified starter and reproduces a stable 1 → 2 → 1', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p2')).toBeInTheDocument());

    // Before the run: Page 1's shore, the raft waiting where the walk ends.
    const stage = screen.getByTestId('jtw-c3p2-stage');
    expect(stage).toHaveAttribute('data-page', '1');
    expect(stage.querySelector('img')).toHaveAttribute('src', JTW_C3_PAGE1_BACKGROUND);
    expect(screen.getByTestId('jtw-c3p2-raft')).toHaveAttribute('src', JTW_C3_RAFT_SPRITE);
    expect(screen.getByTestId('jtw-c3p2-raft')).toHaveAttribute(
      'data-gx',
      String(C3_P2_PAGE1_RAFT_CELL.gx),
    );

    await planAndRun();

    // The run stopped on the re-entry to Page 1 — the stage is back on Page 1.
    expect(screen.getByTestId('jtw-c3p2-stage')).toHaveAttribute('data-page', '1');

    const actual = screen.getByTestId('jtw-c3p2-actual-trace');
    expect(
      Array.from(actual.querySelectorAll('li')).map((item) => item.getAttribute('data-page')),
    ).toEqual(C3_P2_ACTUAL_TRACE.map(String));
    const expected = screen.getByTestId('jtw-c3p2-expected-trace');
    expect(
      Array.from(expected.querySelectorAll('li')).map((item) => item.getAttribute('data-page')),
    ).toEqual(C3_P2_EXPECTED_TRACE.map(String));

    // Page 2 is the one circled on the actual row.
    const circled = Array.from(actual.querySelectorAll('li')).filter(
      (item) => item.getAttribute('data-deviation') === 'true',
    );
    expect(circled).toHaveLength(1);
    expect(circled[0]).toHaveAttribute('data-page', '2');

    // Real footprints, measured off the runner, not narrated.
    const rows = Array.from(screen.getByTestId('jtw-c3p2-footprints').querySelectorAll('li'));
    expect(
      rows.map((row) => [
        row.getAttribute('data-page'),
        row.getAttribute('data-enter'),
        row.getAttribute('data-exit'),
        row.getAttribute('data-exit-to'),
      ]),
    ).toEqual([
      ['1', '3-9', '7-9', '2'],
      ['2', '2-8', '6-8', '1'],
      ['1', '3-9', '', ''],
    ]);

    // 彼岸山林 never opened.
    expect(screen.getByTestId('jtw-c3p2-missed')).toBeInTheDocument();
  });

  it('will not take a first-deviation pick before the starter has really run', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p2')).toBeInTheDocument());

    // Structural: the picker is not on screen until footprints exist.
    expect(screen.getByTestId('jtw-c3p2-run-first')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c3p2-deviation')).not.toBeInTheDocument();
    orderPageCards();
    orderExitCards();
    predictCorrectly();
    expect(screen.queryByTestId('jtw-c3p2-deviation')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p2-continue')).toBeDisabled();

    fireEvent.click(screen.getByTestId('jtw-c3p2-run'));
    await waitFor(() => expect(screen.getByTestId('jtw-c3p2-deviation')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-c3p2-run-first')).not.toBeInTheDocument();
  });

  it('accepts only Page 2 as the first deviation and then resolves', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p2')).toBeInTheDocument());
    await planAndRun();

    fireEvent.click(screen.getByRole('button', { name: 'Page 1 花果山海岸' }));
    expect(screen.getByRole('status')).toHaveTextContent('最早不一样的是哪一页的出口');
    expect(screen.getByTestId('jtw-c3p2-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c3p2-resolved')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Page 3 彼岸山林' }));
    expect(screen.getByTestId('jtw-c3p2-continue')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Page 2 海上中段' }));
    expect(screen.getByTestId('jtw-c3p2-resolved')).toHaveTextContent('它的出口写着 1');
    expect(screen.getByTestId('jtw-c3p2-continue')).toBeEnabled();
  });

  it('persists the plan, the real run and the deviation; writes no project', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('jtw-c3p2-story-next'));
    await planAndRun();
    fireEvent.click(screen.getByRole('button', { name: 'Page 2 海上中段' }));
    fireEvent.click(screen.getByTestId('jtw-c3p2-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    // No build_project, no saved_version, no "fixed" flag of any kind.
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c3-p2', {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-c', 'part-2-hook'],
        expected_page_order: ['page-1-home-shore', 'page-2-open-sea', 'page-3-far-forest'],
        expected_exits: ['exit-1-to-2', 'exit-2-to-3'],
        page_trace: ['1', '2', '1'],
        run_footprints: SAVED_FOOTPRINTS,
        first_deviation: ['page-2-open-sea'],
      },
      prediction: 'predict-back-to-page-1',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved plan, footprints and deviation after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_P1_DONE,
      completed: [
        ...C3_P1_DONE.completed,
        {
          part_id: 'jtw-s1-c3-p2',
          completed_at: '2026-07-27T05:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-c', 'part-2-hook'],
              expected_page_order: ['page-1-home-shore', 'page-2-open-sea', 'page-3-far-forest'],
              expected_exits: ['exit-1-to-2', 'exit-2-to-3'],
              page_trace: ['1', '2', '1'],
              run_footprints: SAVED_FOOTPRINTS,
              first_deviation: ['page-2-open-sea'],
            },
            prediction: 'predict-back-to-page-1',
          },
        },
      ],
      unlocked_part_ids: [...C3_P1_DONE.unlocked_part_ids, 'jtw-s1-c3-p3'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-c3p2-resolved')).toBeInTheDocument());
    const rows = Array.from(screen.getByTestId('jtw-c3p2-footprints').querySelectorAll('li'));
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveAttribute('data-exit-to', '1');
    expect(screen.getByRole('button', { name: 'Page 2 海上中段' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('jtw-c3p2-continue')).toBeEnabled();
  });

  it('round-trips footprints through the stored evidence strings', () => {
    const decoded = c3p2DecodeFootprints(SAVED_FOOTPRINTS);
    expect(decoded).toEqual([
      { page: 1, enterCell: '3-9', exitCell: '7-9', exitTo: 2 },
      { page: 2, enterCell: '2-8', exitCell: '6-8', exitTo: 1 },
      { page: 1, enterCell: '3-9', exitCell: null, exitTo: null },
    ]);
    expect(c3p2EncodeFootprints(decoded)).toEqual(SAVED_FOOTPRINTS);
    // Malformed rows are dropped, never guessed into evidence.
    expect(c3p2DecodeFootprints(['nonsense', 'page2:2-8->6-8:page1'])).toHaveLength(1);
  });

  it('shows each page with its own real artwork as the run walks through them', async () => {
    const seen: string[] = [];
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p2')).toBeInTheDocument());
    const observer = new MutationObserver(() => {
      const src = screen.getByTestId('jtw-c3p2-stage').querySelector('img')?.getAttribute('src');
      if (src && seen[seen.length - 1] !== src) seen.push(src);
    });
    observer.observe(screen.getByTestId('jtw-c3p2-stage'), { subtree: true, attributes: true });
    await planAndRun();
    observer.disconnect();

    // Page 1 and Page 2 are real, distinct artwork; Page 3's is integrated but
    // never opened by this run — the starter's exit sends the raft home instead.
    expect(seen).toContain(JTW_C3_PAGE2_BACKGROUND);
    expect(JTW_C3_PAGE3_BACKGROUND).not.toEqual(JTW_C3_PAGE2_BACKGROUND);
    expect(new Set([JTW_C3_PAGE1_BACKGROUND, JTW_C3_PAGE2_BACKGROUND, JTW_C3_PAGE3_BACKGROUND]).size)
      .toBe(3);
  });
});
