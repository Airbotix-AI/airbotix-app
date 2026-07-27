// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject } from '../blocksModel';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import { jtwOrderBugObserved } from '../jtwOrderDebug';
import { JourneyWestC2Part6Page } from './JourneyWestC2Part6Page';
import {
  C2_P6_BUG_MOVES,
  C2_P6_BUG_TRACE,
  C2_P6_TARGET_MOVES,
  C2_P6_TARGET_TRACE,
  c2p6ProjectDiff,
} from './journeyWestC2Part6Program';
import * as blocksApi from '../blocksApi';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
  createBlocksProject: vi.fn(),
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_a', role: 'kid', nickname: 'Mia' } }),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);
const listProjects = vi.mocked(blocksApi.listBlocksProjects);
const loadProject = vi.mocked(blocksApi.loadBlocksProject);
const createProject = vi.mocked(blocksApi.createBlocksProject);

const instantSleep = () => Promise.resolve();

const PRIOR_PART_IDS = [
  'jtw-s1-c1-p1',
  'jtw-s1-c1-p2',
  'jtw-s1-c1-p3',
  'jtw-s1-c1-p4',
  'jtw-s1-c1-p5',
  'jtw-s1-c1-p6',
  'jtw-s1-c1-p7',
  'jtw-s1-c1-p8',
  'jtw-s1-c2-p1',
  'jtw-s1-c2-p2',
  'jtw-s1-c2-p3',
  'jtw-s1-c2-p4',
  'jtw-s1-c2-p5',
];

const P5_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-26T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p6'],
};

/** A saved return project whose child-owned middle is `middle`. */
function returnProject(middle: readonly Block[]): BlocksProject {
  return {
    version: 1,
    name: '西游记 · 回去的第一处偏离',
    lessonId: 'jtw-s1-c2-p6',
    pages: [
      {
        id: 'jtw-c2-p6-page',
        background: 'jtw-s1-c2-water-curtain-actor-free',
        characters: [
          {
            id: 'stone-monkey',
            name: 'Stone Monkey',
            emoji: '🐵',
            asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
            start: { gx: 6, gy: 7, size: 3, rot: 0 },
            scripts: [
              {
                id: 'stone-monkey-return-bug',
                blocks: [{ op: 'when_flag' }, ...middle, { op: 'end' }],
              },
            ],
          },
          {
            id: 'cave-entrance',
            name: 'Cave Entrance',
            emoji: '🕳️',
            asset: '/story-blocks/journey-to-the-west/characters/cave-entrance/revealed-v01.png',
            start: { gx: 7, gy: 7, size: 4, reach: 1, rot: 0, visible: true },
            scripts: [],
          },
        ],
      },
    ],
  };
}

function mockBuild(middle: readonly Block[] | null, runCompleted: boolean) {
  if (!middle) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    { id: 'proj_jtw_return', title: '西游记 · 回去的第一处偏离', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    project: returnProject(middle),
    version: 4,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c2-p6': { completedAt: '2026-07-26T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p6']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC2Part6Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          <Route path="/learn/blocks/:projectId" element={<div data-testid="studio-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function runTheBug() {
  fireEvent.click(screen.getByRole('button', { name: /运行这个 bug/ }));
  await waitFor(() => expect(screen.getByTestId('jtw-c2p6-actual')).toBeInTheDocument());
}

function answerBeforeStudio() {
  fireEvent.click(screen.getByRole('button', { name: /4-7 高台 → 4-8 低石 → 2-8 起点/ }));
  fireEvent.click(screen.getByRole('button', { name: /第二段冲出高台/ }));
  fireEvent.click(screen.getByRole('button', { name: /第二段——应该先 Down 1/ }));
  fireEvent.click(screen.getByRole('button', { name: /先向下——踩上 4-8 的低石/ }));
}

function answerAfterStudio() {
  fireEvent.click(screen.getByRole('button', { name: /只把第二个 Left 2 和 Down 1 交换位置/ }));
  fireEvent.click(screen.getByRole('button', { name: /终点一样，路却不一样了/ }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P5_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c2-p6',
    completed_at: '2026-07-26T07:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('C2-P6 return-route contract', () => {
  it('the bug and the repair use the SAME blocks and numbers — only the order differs', () => {
    const key = (blocks: readonly Block[]) =>
      [...blocks].map((b) => `${b.op}:${b.n}`).sort().join(',');
    expect(key(C2_P6_BUG_MOVES)).toBe(key(C2_P6_TARGET_MOVES));
    expect(C2_P6_BUG_MOVES.map((b) => b.op)).not.toEqual(C2_P6_TARGET_MOVES.map((b) => b.op));
  });

  it('the bug leaves the wet-stone route and skips the 4-8 low stone', () => {
    expect(C2_P6_BUG_TRACE).toEqual(['4-7', '2-7', '2-8']);
    expect(C2_P6_TARGET_TRACE).toEqual(['4-7', '4-8', '2-8']);
    // Same endpoint, different path — the footprints are the evidence.
    expect(C2_P6_BUG_TRACE.at(-1)).toBe(C2_P6_TARGET_TRACE.at(-1));
    expect(C2_P6_BUG_TRACE).not.toContain('4-8');
  });

  it('only the exact two-block swap is accepted as a saved program', () => {
    expect(storyMissionProgramMatches(returnProject(C2_P6_TARGET_MOVES), 'jtw-s1-c2-p6')).toBe(true);
    // The shipped bug order.
    expect(storyMissionProgramMatches(returnProject(C2_P6_BUG_MOVES), 'jtw-s1-c2-p6')).toBe(false);
    // A bigger number instead of the swap.
    expect(
      storyMissionProgramMatches(
        returnProject([{ op: 'move_left', n: 4 }, { op: 'move_down', n: 1 }]),
        'jtw-s1-c2-p6',
      ),
    ).toBe(false);
    // A set_speed "fix".
    expect(
      storyMissionProgramMatches(
        returnProject([{ op: 'set_speed', n: 3 }, ...C2_P6_BUG_MOVES]),
        'jtw-s1-c2-p6',
      ),
    ).toBe(false);
    // Go Home instead of a route.
    expect(
      storyMissionProgramMatches(returnProject([{ op: 'go_home' }]), 'jtw-s1-c2-p6'),
    ).toBe(false);
  });

  it('a moved start is rejected — the outbound route may not be edited here', () => {
    const moved = returnProject(C2_P6_TARGET_MOVES);
    moved.pages[0].characters[0].start = { gx: 2, gy: 8, size: 3, rot: 0 };
    expect(storyMissionProgramMatches(moved, 'jtw-s1-c2-p6')).toBe(false);
  });

  it('the shipped order counts as the bug run, the repaired order never does', () => {
    expect(jtwOrderBugObserved('jtw-s1-c2-p6', [{ op: 'when_flag' }, ...C2_P6_BUG_MOVES])).toBe(
      true,
    );
    expect(jtwOrderBugObserved('jtw-s1-c2-p6', [{ op: 'when_flag' }, ...C2_P6_TARGET_MOVES])).toBe(
      false,
    );
  });

  it('reports the minimal two-block swap as the project diff', () => {
    expect(c2p6ProjectDiff(C2_P6_TARGET_MOVES)).toEqual([
      'move_down:1:3->2',
      'move_left:2:2->3',
    ]);
    expect(c2p6ProjectDiff(C2_P6_BUG_MOVES)).toEqual([]);
  });
});

describe('JourneyWestC2Part6Page · C2-P6 回去的第一处偏离', () => {
  it('blocks kids who have not finished C2-P5 (server truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...P5_DONE,
      completed: P5_DONE.completed.slice(0, 12),
      unlocked_part_ids: PRIOR_PART_IDS,
    });
    mockBuild(null, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-locked')).toBeInTheDocument());
  });

  it('ships the full teaching-script text, the motive and the open cave at the 6/7 start', async () => {
    mockBuild(null, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-story')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c2p6-story')).toHaveTextContent(
      '返回脚本为Left 2 → Left 2 → Down 1；积木和参数都有用，只有中间顺序错误',
    );
    expect(screen.getByTestId('jtw-c2p6-story')).toHaveTextContent('Debug Checkpoint 2');
    expect(screen.getByTestId('jtw-c2p6-story')).toHaveTextContent('跑得再快也修不好方向顺序');
    const monkey = screen.getByTestId('jtw-c2p6-stone-monkey');
    expect(monkey.dataset.gx).toBe('6');
    expect(monkey.dataset.gy).toBe('7');
    // P5 already opened the cave — it is scenery here, never a second bump.
    expect(screen.getByTestId('jtw-c2p6-cave').dataset.visible).toBe('true');
    // Nothing past the expectation is offered before the bug has been run.
    expect(screen.queryByTestId('jtw-c2p6-actual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c2p6-build')).not.toBeInTheDocument();
  });

  it('reproduces the bug through the REAL runner: the monkey leaves the route at 2-7', async () => {
    mockBuild(null, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-stage')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c2p6-stage').dataset.leftRoute).toBe('false');

    await runTheBug();
    expect(screen.getByTestId('jtw-c2p6-stage').dataset.leftRoute).toBe('true');
    const monkey = screen.getByTestId('jtw-c2p6-stone-monkey');
    expect(`${monkey.dataset.gx}-${monkey.dataset.gy}`).toBe('2-8');
    const bugStops = Array.from(
      screen.getByTestId('jtw-c2p6-bug-trace').querySelectorAll('[data-stop]'),
    ).map((node) => node.getAttribute('data-stop'));
    expect(bugStops).toEqual(['4-7', '2-7', '2-8']);
  });

  it('starts a REAL blocks project from the C2-P6 template when none exists', async () => {
    mockBuild(null, false);
    createProject.mockResolvedValue({ id: 'proj_new' });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-stage')).toBeInTheDocument());
    await runTheBug();
    expect(screen.getByTestId('jtw-c2p6-build').dataset.buildState).toBe('none');

    fireEvent.click(screen.getByTestId('jtw-c2p6-open-studio'));
    await waitFor(() => expect(screen.getByTestId('studio-stub')).toBeInTheDocument());
    expect(createProject).toHaveBeenCalledWith({
      title: '西游记 · 回去的第一处偏离',
      template: 'blocks_jtw_c2_p6',
    });
  });

  it('the saved bug order is not a fix, even with a run marker', async () => {
    mockBuild(C2_P6_BUG_MOVES, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-stage')).toBeInTheDocument());
    await runTheBug();
    expect(screen.getByTestId('jtw-c2p6-build').dataset.buildState).toBe('in_progress');
    expect(screen.queryByTestId('jtw-c2p6-fix')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p6-continue')).toBeDisabled();
  });

  it('a repaired order without the studio run marker is not done either', async () => {
    mockBuild(C2_P6_TARGET_MOVES, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-stage')).toBeInTheDocument());
    await runTheBug();
    expect(screen.getByTestId('jtw-c2p6-build').dataset.buildState).toBe('in_progress');
    expect(screen.queryByTestId('jtw-c2p6-build-done')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p6-continue')).toBeDisabled();
  });

  it('a wrong first-deviation pick shows the hint and keeps continue locked', async () => {
    mockBuild(C2_P6_TARGET_MOVES, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-stage')).toBeInTheDocument());
    await runTheBug();
    fireEvent.click(screen.getByRole('button', { name: /第一段——两版从第一步就不一样/ }));
    expect(screen.getByText(/最早不一样的是哪一段/)).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p6-continue')).toBeDisabled();
  });

  it('reads the repaired footprints back from the SAVED project and persists real evidence', async () => {
    mockBuild(C2_P6_TARGET_MOVES, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-stage')).toBeInTheDocument());
    await runTheBug();
    answerBeforeStudio();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-build-done')).toBeInTheDocument());

    const fixedStops = Array.from(
      screen.getByTestId('jtw-c2p6-fixed-trace').querySelectorAll('[data-stop]'),
    ).map((node) => node.getAttribute('data-stop'));
    expect(fixedStops).toEqual(['4-7', '4-8', '2-8']);
    expect(screen.getByTestId('jtw-c2p6-diff')).toHaveTextContent('move_down:1:3->2');

    expect(screen.getByTestId('jtw-c2p6-continue')).toBeDisabled();
    answerAfterStudio();
    expect(screen.getByTestId('jtw-c2p6-resolved')).toHaveTextContent('石猴沿来路退回');
    fireEvent.click(screen.getByTestId('jtw-c2p6-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c2-p6', {
      schema_version: 1,
      selections: {
        expectation: ['expect-4-7-4-8-2-8'],
        actual: ['actual-off-route'],
        first_deviation: ['deviation-second-segment'],
        fix_move: ['fix-swap-two-blocks'],
        rerun_result: ['rerun-stone-path'],
        bug_trace: ['4-7', '2-7', '2-8'],
        fixed_trace: ['4-7', '4-8', '2-8'],
        project_diff: ['move_down:1:3->2', 'move_left:2:2->3'],
        build_project: ['proj_jtw_return'],
      },
      prediction: 'predict-down-first',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved five-segment explanation after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...P5_DONE,
      completed: [
        ...P5_DONE.completed,
        {
          part_id: 'jtw-s1-c2-p6',
          completed_at: '2026-07-26T07:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              expectation: ['expect-4-7-4-8-2-8'],
              actual: ['actual-off-route'],
              first_deviation: ['deviation-second-segment'],
              fix_move: ['fix-swap-two-blocks'],
              rerun_result: ['rerun-stone-path'],
            },
            prediction: 'predict-down-first',
          },
        },
      ],
      unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p6', 'jtw-s1-c2-p7'],
    });
    mockBuild(C2_P6_TARGET_MOVES, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-resolved')).toBeInTheDocument());
    expect(
      screen.getByRole('button', { name: /第二段——应该先 Down 1/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /先向下——踩上 4-8 的低石/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('jtw-c2p6-continue')).toBeEnabled();
  });
});
