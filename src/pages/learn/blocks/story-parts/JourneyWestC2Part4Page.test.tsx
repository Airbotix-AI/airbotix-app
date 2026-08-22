// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlocksProject } from '../blocksModel';
import { JourneyWestC2Part4Page } from './JourneyWestC2Part4Page';
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
];

const P3_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-25T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p4'],
};

/** A saved route project. `middle` is what the child placed between Start and End. */
function routeProject(middle: Array<{ op: string; n?: number; text?: string }>): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · Just arrived, no more, no less',
    lessonId: 'jtw-s1-c2-p4',
    pages: [
      {
        id: 'jtw-c2-p4-page',
        background: 'jtw-s1-c1-flower-fruit-stone',
        characters: [
          {
            id: 'stone-monkey',
            name: 'Stone Monkey',
            emoji: '🐵',
            asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
            start: { gx: 2, gy: 8, size: 3, rot: 0 },
            scripts: [
              {
                id: 'stone-monkey-route-to-curtain',
                blocks: [
                  { op: 'when_flag' },
                  ...middle,
                  { op: 'end' },
                ] as unknown as BlocksProject['pages'][0]['characters'][0]['scripts'][0]['blocks'],
              },
            ],
          },
        ],
      },
    ],
  };
}

const TARGET_MIDDLE = [
  { op: 'move_right', n: 1 },
  { op: 'move_right', n: 1 },
  { op: 'move_up', n: 1 },
  { op: 'move_right', n: 1 },
  { op: 'move_right', n: 1 },
];

function mockBuild(
  middle: Array<{ op: string; n?: number; text?: string }> | null,
  runCompleted: boolean,
) {
  if (!middle) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    {
      id: 'proj_jtw_route',
      title: 'Journey to the West · Just arrived, no more, no less',
      kind: 'blocks',
      status: 'active',
    },
  ]);
  loadProject.mockResolvedValue({
    project: routeProject(middle),
    version: 3,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c2-p4': { completedAt: '2026-07-25T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p4']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC2Part4Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          <Route path="/learn/blocks/:projectId" element={<div data-testid="studio-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function answerComparisons() {
  fireEvent.click(
    screen.getByRole('button', {
      name: /Stopped at 5-7 - the edge of the high platform, one space away, the soles of your feet cannot touch the entrance to the water curtain\./i,
    }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /Cross the water curtain entrance grid at 6-7 and rush to 7-7 - you should stop when you hit it\./i,
    }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /No - the footprints only prove that the stone monkey has reached the entrance grid, the water curtain is still down, and there is no response yet/i,
    }),
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P3_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c2-p4',
    completed_at: '2026-07-25T07:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC2Part4Page · C2-P4 Just arrived, no more, no less', () => {
  it('blocks kids who have not finished C2-P3 (server truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...P3_DONE,
      completed: P3_DONE.completed.slice(0, 10),
      unlocked_part_ids: PRIOR_PART_IDS,
    });
    mockBuild(null, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p4-locked')).toBeInTheDocument());
  });

  it('ships the full Story Screen 4 text and the closed-curtain stage at 2/8', async () => {
    mockBuild(null, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p4-story')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c2p4-story')).toHaveTextContent(
      'The starter only pre-builds Start and End. The child selects from 6 candidate blocks and places them in Move Right 2 → Move Up 1 → Move Right 2, forming a 5-block main script; one wrong direction or order will end up on the wrong wet stone.',
    );
    expect(screen.getByTestId('jtw-c2p4-story')).toHaveTextContent(
      "The child's actual workload: select 3 blocks, arrange 3 blocks, predict 3 stopping points, run at least 1 time; not change a single number.",
    );
    expect(screen.getByTestId('jtw-c2p4-story')).toHaveTextContent(
      'Build successful: The running trajectory is consistent with the three endpoint stickers. The stone monkey reaches the water curtain accurately, but the water curtain is not opened yet.',
    );
    const monkey = screen.getByTestId('jtw-c2p4-stone-monkey');
    expect(monkey.dataset.gx).toBe('2');
    expect(monkey.dataset.gy).toBe('8');
    expect(screen.getByTestId('jtw-c2p4-cave-mouth').dataset.visible).toBe('false');
    expect(
      screen.getByTestId('jtw-c2p4-footprints').querySelectorAll('[data-lit="true"]'),
    ).toHaveLength(0);
  });

  it('starts a REAL blocks project from the C2-P4 template when none exists', async () => {
    mockBuild(null, false);
    createProject.mockResolvedValue({ id: 'proj_new' });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p4-open-studio')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c2p4-build').dataset.buildState).toBe('none');

    fireEvent.click(screen.getByTestId('jtw-c2p4-open-studio'));
    await waitFor(() => expect(screen.getByTestId('studio-stub')).toBeInTheDocument());
    expect(createProject).toHaveBeenCalledWith({
      title: 'Journey to the West · Just arrived, no more, no less',
      template: 'blocks_jtw_c2_p4',
    });
  });

  it('the parameter-merged right2/upper1/right2 shortcut is NOT accepted even with a run marker', async () => {
    mockBuild(
      [
        { op: 'move_right', n: 2 },
        { op: 'move_up', n: 1 },
        { op: 'move_right', n: 2 },
      ],
      true, // even with a recorded run, the saved program itself must match
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c2p4-build').dataset.buildState).toBe('in_progress'),
    );
    // The comparison evidence never opens and continue stays locked.
    expect(screen.queryByTestId('jtw-c2p4-compare')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p4-continue')).toBeDisabled();
  });

  it('a wrong five-block order (Up last) is NOT accepted', async () => {
    mockBuild(
      [
        { op: 'move_right', n: 1 },
        { op: 'move_right', n: 1 },
        { op: 'move_right', n: 1 },
        { op: 'move_right', n: 1 },
        { op: 'move_up', n: 1 },
      ],
      true,
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c2p4-build').dataset.buildState).toBe('in_progress'),
    );
    expect(screen.getByTestId('jtw-c2p4-continue')).toBeDisabled();
  });

  it('an exact route without a finished run+save is not done either', async () => {
    mockBuild(TARGET_MIDDLE, false);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c2p4-build').dataset.buildState).toBe('in_progress'),
    );
    expect(screen.queryByTestId('jtw-c2p4-build-done')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p4-continue')).toBeDisabled();
  });

  it('reads the five-block route + run trace back from the SAVED project and gates on the comparisons', async () => {
    mockBuild(TARGET_MIDDLE, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p4-build-done')).toBeInTheDocument());
    // The read-back comes from the saved BlocksProject: five stops, entrance last.
    const stops = Array.from(
      screen.getByTestId('jtw-c2p4-run-trace').querySelectorAll('[data-stop]'),
    ).map((node) => node.getAttribute('data-stop'));
    expect(stops).toEqual(['3-8', '4-8', '4-7', '5-7', '6-7']);
    expect(screen.getByTestId('jtw-c2p4-continue')).toBeDisabled(); // comparisons pending

    // A wrong arrival claim shows the picture-grounded hint and keeps continue locked.
    fireEvent.click(
      screen.getByRole('button', {
        name: /Stopped at 5-7 - the edge of the high platform, one space away, the soles of your feet cannot touch the entrance to the water curtain\./i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Cross the water curtain entrance grid at 6-7 and rush to 7-7 - you should stop when you hit it\./i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Yes - reaching the entrance is equivalent to discovering a cave\./i,
      }),
    );
    expect(
      screen.getByText(
        /Look at the stage again: has the water curtain separated\? Is the cave entrance visible\? Arrival only answers "how to arrive"; the collision response has not happened yet\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p4-continue')).toBeDisabled();
  });

  it('exact build + run + comparisons persists the real diff, trace and project id', async () => {
    mockBuild(TARGET_MIDDLE, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p4-build-done')).toBeInTheDocument());
    answerComparisons();
    expect(screen.getByTestId('jtw-c2p4-resolved')).toHaveTextContent(
      "Five footprints showed steadily along the wet stone path: 3-8, 4-8, 4-7, 5-7, 6-7, one step at a time. The soles of the stone monkey's feet just touched the entrance grid of the water curtain, no more and no less - but the response chain of the water curtain was not connected yet.",
    );
    expect(
      screen.getByTestId('jtw-c2p4-footprints').querySelectorAll('[data-lit="true"]'),
    ).toHaveLength(5);
    // The curtain never responds in P4 — the cave mouth stays hidden.
    expect(screen.getByTestId('jtw-c2p4-cave-mouth').dataset.visible).toBe('false');
    fireEvent.click(screen.getByTestId('jtw-c2p4-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c2-p4', {
      schema_version: 1,
      selections: {
        route_diff: ['right-1', 'right-1', 'up-1', 'right-1', 'right-1'],
        run_trace: ['3-8', '4-8', '4-7', '5-7', '6-7'],
        fewer_stop: ['fewer-stop-5-7'],
        extra_stop: ['extra-passes-entrance'],
        arrival_claim: ['arrival-only-reached'],
        build_project: ['proj_jtw_route'],
      },
      prediction: 'fewer-stop-5-7',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved comparison evidence after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...P3_DONE,
      completed: [
        ...P3_DONE.completed,
        {
          part_id: 'jtw-s1-c2-p4',
          completed_at: '2026-07-25T07:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              route_diff: ['right-1', 'right-1', 'up-1', 'right-1', 'right-1'],
              run_trace: ['3-8', '4-8', '4-7', '5-7', '6-7'],
              fewer_stop: ['fewer-stop-5-7'],
              extra_stop: ['extra-passes-entrance'],
              arrival_claim: ['arrival-only-reached'],
              build_project: ['proj_jtw_route'],
            },
            prediction: 'fewer-stop-5-7',
          },
        },
      ],
      unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p4', 'jtw-s1-c2-p5'],
    });
    mockBuild(TARGET_MIDDLE, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p4-resolved')).toBeInTheDocument());
    expect(
      screen.getByRole('button', {
        name: /Stopped at 5-7 - the edge of the high platform, one space away, the soles of your feet cannot touch the entrance to the water curtain\./i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', {
        name: /No - the footprints only prove that the stone monkey has reached the entrance grid, the water curtain is still down, and there is no response yet/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('jtw-c2p4-continue')).toBeEnabled();
  });
});
