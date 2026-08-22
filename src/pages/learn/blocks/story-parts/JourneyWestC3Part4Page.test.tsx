// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject } from '../blocksModel';
import { JourneyWestC3Part4Page } from './JourneyWestC3Part4Page';
import {
  JTW_C3_ARRIVAL_CHAIN,
  JTW_C3_DEPART_CHAIN,
  JTW_C3_P4_PAGE1_RAFT_CELL,
  JTW_C3_P4_PAGE_IDS,
  JTW_C3_P4_SCRIPT_IDS,
  JTW_C3_RAFT_CHAIN,
  JTW_C3_SEA_TARGET,
} from '../jtwC3SeaBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_SCENE,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_SCENE,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
} from '../jtwC3Stage';
import { C3_P4_ROLE_SLOTS } from './journeyWestC3Part4Program';
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

/** C1 P1–P8 + C2 P1–P8 + C3 P1–P3 complete. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  'jtw-s1-c3-p1',
  'jtw-s1-c3-p2',
  'jtw-s1-c3-p3',
];

const C3_P3_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p4'],
};

function monkey(start: { gx: number; gy: number }, scriptId: string, blocks: readonly Block[]) {
  return {
    id: JTW_C3_MONKEY_KING_ID,
    name: 'Monkey King',
    emoji: '🐵',
    asset: JTW_C3_MONKEY_KING_SPRITE,
    start: { ...start, size: JTW_C3_MONKEY_KING_SIZE, rot: 0 },
    scripts: [{ id: scriptId, blocks: [...blocks] }],
  };
}

function raft(start: { gx: number; gy: number }, blocks: readonly Block[] | null) {
  return {
    id: JTW_C3_RAFT_ID,
    name: 'Raft',
    emoji: '🛶',
    asset: JTW_C3_RAFT_SPRITE,
    start: { ...start, size: JTW_C3_RAFT_SIZE, rot: 0 },
    scripts: blocks ? [{ id: JTW_C3_P4_SCRIPT_IDS.raftCarry, blocks: [...blocks] }] : [],
  };
}

function seaProject(seaChain: readonly Block[]): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C3 — A Story and an Exit in the Open Sea',
    lessonId: 'jtw-s1-c3-p4',
    pages: [
      {
        id: JTW_C3_P4_PAGE_IDS[0],
        background: JTW_C3_PAGE1_SCENE,
        characters: [
          monkey(JTW_C3_PAGE1_START_CELL, JTW_C3_P4_SCRIPT_IDS.depart, JTW_C3_DEPART_CHAIN),
          raft(JTW_C3_P4_PAGE1_RAFT_CELL, null),
        ],
      },
      {
        id: JTW_C3_P4_PAGE_IDS[1],
        background: JTW_C3_PAGE2_SCENE,
        characters: [
          monkey(JTW_C3_PAGE2_START_CELL, JTW_C3_P4_SCRIPT_IDS.seaLeg, seaChain),
          raft(JTW_C3_PAGE2_START_CELL, JTW_C3_RAFT_CHAIN),
        ],
      },
      {
        id: JTW_C3_P4_PAGE_IDS[2],
        background: JTW_C3_PAGE3_SCENE,
        characters: [
          monkey(JTW_C3_PAGE3_START_CELL, JTW_C3_P4_SCRIPT_IDS.arrival, JTW_C3_ARRIVAL_CHAIN),
          raft(JTW_C3_PAGE3_START_CELL, null),
        ],
      },
    ],
  };
}

const BUILT_CHAIN = JTW_C3_SEA_TARGET;
const EMPTY_SLOT: readonly Block[] = [{ op: 'when_flag' }];
const WRONG_EXIT: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'play_sound', n: 4 },
  { op: 'move_right', n: 4 },
  { op: 'wait', n: 2 },
  { op: 'goto_page', n: 1 },
];

function mockBuild(seaChain: readonly Block[] | null, runCompleted: boolean) {
  if (!seaChain) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    {
      id: 'proj_jtw_sea',
      title: 'Journey to the West · Let the middle of the sea have both a story and an outlet',
      kind: 'blocks',
      status: 'active',
    },
  ] as never);
  loadProject.mockResolvedValue({
    project: seaProject(seaChain),
    version: 4,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c3-p4': { completedAt: '2026-07-27T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p4']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part4Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          <Route path="/learn/blocks/:projectId" element={<div data-testid="studio-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const pick = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));

/** Read both story screens. */
function readStory() {
  fireEvent.click(screen.getByTestId('jtw-c3p4-story-next'));
}

/** Pick every role row correctly (or deliberately wrongly). */
function answerRoles(correct = true) {
  for (const slot of C3_P4_ROLE_SLOTS) {
    const row = screen.getByTestId(`jtw-c3p4-role-${slot.id}`);
    const wantedId = correct
      ? slot.roleId
      : C3_P4_ROLE_SLOTS.find((other) => other.id !== slot.id)!.roleId;
    const label = ROLE_LABELS[wantedId];
    const button = Array.from(row.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === label,
    );
    if (!button) throw new Error(`role option ${wantedId} is not rendered`);
    fireEvent.click(button);
  }
}

const ROLE_LABELS: Record<string, string> = {
  'role-sea-wind': 'Let the audience hear that this is a windy sea',
  'role-forward': 'Let the raft really move forward for a while',
  'role-pause': 'Ask him to stop and look at the direction',
  'role-exit': 'Pass this paragraph to the next page',
};

/** Everything the Part asks for outside the studio. */
function answerEverything() {
  readStory();
  answerRoles();
  pick(/6-8--from 2-8 Go right 4 spaces/i);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchProgress.mockResolvedValue(C3_P3_DONE);
  completePart.mockResolvedValue({ ok: true } as never);
  createProject.mockResolvedValue({ id: 'proj_new' } as never);
  mockBuild(BUILT_CHAIN, true);
});
afterEach(cleanup);

describe('JourneyWestC3Part4Page — Let the center of the sea have both a story and an outlet', () => {
  it('shows the locked screen when C3-P3 is not complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c3-p1'],
    });
    renderPage();
    expect(await screen.findByTestId('jtw-c3p4-locked')).toBeInTheDocument();
  });

  it('reads the whole teaching brief across two screens', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    expect(screen.getByTestId('jtw-c3p4-story-count')).toHaveTextContent(/1\s*\/\s*2\s*part/i);
    expect(screen.getByTestId('jtw-c3p4-story')).toHaveTextContent('an empty script slot');
    readStory();
    expect(screen.getByTestId('jtw-c3p4-story-count')).toHaveTextContent(/2\s*\/\s*2\s*parts?/i);
    expect(screen.getByTestId('jtw-c3p4-story')).toHaveTextContent(
      /the actual trajectory is 1 → 2 → 3/i,
    );
  });

  it('shows the target chain and both read-only demo chains', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    expect(screen.getByTestId('jtw-c3p4-target-chain')).toHaveAttribute(
      'data-ops',
      'when_flag,play_sound,move_right,wait,goto_page',
    );
    expect(screen.getByTestId('jtw-c3p4-demo-page1')).toHaveAttribute(
      'data-ops',
      'when_flag,move_right,goto_page',
    );
    expect(screen.getByTestId('jtw-c3p4-demo-page3')).toHaveAttribute(
      'data-ops',
      'when_flag,say,end',
    );
  });

  it('refuses a wrong block-role mapping with a text-grounded hint', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    answerRoles(false);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Think about it again: the sound is only heard, the position is changed when moving, Wait does not change anything and only lets time pass, and the number on Page determines the next page.',
    );
  });

  it('refuses the "he waits in place" exit prediction', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    pick(/2-8——He waited for the wind to subside\./i);
    expect(screen.getByRole('status')).toHaveTextContent(/without moving a single grid/i);
  });

  it('creates the three-page starter the first time and reopens it afterwards', async () => {
    mockBuild(null, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p4-build')).toHaveAttribute('data-build-state', 'none'),
    );
    fireEvent.click(screen.getByTestId('jtw-c3p4-open-studio'));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        title: 'Journey to the West · Let the middle of the sea have both a story and an outlet',
        template: 'blocks_jtw_c3_p4',
      }),
    );
    expect(await screen.findByTestId('studio-stub')).toBeInTheDocument();
  });

  it('keeps the run locked while the slot is still empty', async () => {
    mockBuild(EMPTY_SLOT, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p4-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p4-run-button')).toBeDisabled();
    answerEverything();
    expect(screen.getByTestId('jtw-c3p4-continue')).toBeDisabled();
  });

  it('does not accept a chain that matches but was never run in the studio', async () => {
    mockBuild(BUILT_CHAIN, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p4-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p4-run-button')).toBeDisabled();
    answerEverything();
    expect(screen.getByTestId('jtw-c3p4-continue')).toBeDisabled();
  });

  it('measures a real 1 → 2 → 3 run of the SAVED project and resolves', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p4-build')).toHaveAttribute('data-build-state', 'done'),
    );
    // The chain shown is the one read back off the saved document.
    expect(screen.getByTestId('jtw-c3p4-saved-chain-strip')).toHaveAttribute(
      'data-ops',
      'when_flag,play_sound,move_right,wait,goto_page',
    );
    expect(screen.getByTestId('jtw-c3p4-saved-chain')).toHaveAttribute('data-exit', '3');

    answerEverything();
    expect(screen.getByTestId('jtw-c3p4-continue')).toBeDisabled();

    fireEvent.click(screen.getByTestId('jtw-c3p4-run-button'));
    const actual = await screen.findByTestId('jtw-c3p4-actual-trace');
    expect(actual).toHaveAttribute('data-trace', '1-2-3');

    const footprints = screen.getByTestId('jtw-c3p4-run-footprints');
    const rows = Array.from(footprints.querySelectorAll('li'));
    expect(rows.map((row) => row.getAttribute('data-enter'))).toEqual(['3-9', '2-8', '2-9']);
    expect(rows.map((row) => row.getAttribute('data-exit'))).toEqual(['7-9', '6-8', '2-9']);
    expect(rows.map((row) => row.getAttribute('data-exit-to'))).toEqual(['2', '3', '']);

    // The stage really finished on the far shore, not back home.
    expect(screen.getByTestId('jtw-c3p4-stage')).toHaveAttribute('data-page', '3');
    expect(screen.getByTestId('jtw-c3p4-exit-cell')).toHaveTextContent('6-8');

    const resolved = await screen.findByTestId('jtw-c3p4-resolved');
    expect(resolved).toHaveTextContent(/landed firmly on the shoal on the other side/i);
    expect(screen.getByTestId('jtw-c3p4-page2-resolved')).toHaveAttribute(
      'src',
      '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-morning-resolved-v01.webp',
    );
    expect(screen.getByTestId('jtw-c3p4-page3-resolved')).toHaveAttribute(
      'src',
      '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page3-resolved-v01.webp',
    );
    // 远行印 only lights half here — the seal itself is C3-P8's aggregation.
    expect(screen.getByTestId('jtw-c3p4-half-seal')).toHaveTextContent(/half brightened/i);
  });

  it('does not resolve when the saved exit still points home', async () => {
    mockBuild(WRONG_EXIT, true);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    answerEverything();
    // The contract already refuses it, so the studio never recorded a match.
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p4-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p4-run-button')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c3p4-resolved')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p4-continue')).toBeDisabled();
  });

  it('stores the code + run evidence and unlocks ONLY C3-P5', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p4-build')).toHaveAttribute('data-build-state', 'done'),
    );
    answerEverything();
    fireEvent.click(screen.getByTestId('jtw-c3p4-run-button'));
    await screen.findByTestId('jtw-c3p4-resolved');

    fireEvent.click(screen.getByTestId('jtw-c3p4-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const [lineId, partId, evidence] = completePart.mock.calls[0];
    expect(lineId).toBe('journey-to-the-west-s1');
    expect(partId).toBe('jtw-s1-c3-p4');
    expect(evidence.selections?.story_screens).toEqual(['part-4-build-brief', 'part-4-workload']);
    expect(evidence.selections?.build_project).toEqual(['proj_jtw_sea']);
    expect(evidence.selections?.target_chain).toEqual([
      'play_sound:4',
      'move_right:4',
      'wait:2',
      'goto_page:3',
    ]);
    expect(evidence.selections?.page_target).toEqual(['3']);
    expect(evidence.selections?.page_trace).toEqual(['1', '2', '3']);
    expect(evidence.selections?.run_footprints).toEqual([
      'page1:3-9->7-9:page2',
      'page2:2-8->6-8:page3',
      'page3:2-9->2-9:stop',
    ]);
    expect(evidence.selections?.run_stop).toEqual(['end']);
    expect(evidence.selections?.exit_cell).toEqual(['6-8']);
    expect(evidence.selections?.block_roles).toEqual([
      'slot-sound:role-sea-wind',
      'slot-move:role-forward',
      'slot-wait:role-pause',
      'slot-exit:role-exit',
    ]);
    expect(evidence.prediction).toBe('predict-exit-6-8');
    expect(await screen.findByTestId('jtw-map-stub')).toBeInTheDocument();
  });

  it('restores the saved evidence after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_P3_DONE,
      completed: [
        ...C3_P3_DONE.completed,
        {
          part_id: 'jtw-s1-c3-p4',
          completed_at: '2026-07-27T07:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['part-4-build-brief', 'part-4-workload'],
              block_roles: [
                'slot-sound:role-sea-wind',
                'slot-move:role-forward',
                'slot-wait:role-pause',
                'slot-exit:role-exit',
              ],
              page_trace: ['1', '2', '3'],
            },
            prediction: 'predict-exit-6-8',
          },
        },
      ],
      unlocked_part_ids: [...C3_P3_DONE.unlocked_part_ids, 'jtw-s1-c3-p5'],
    });
    renderPage();
    await screen.findByTestId('jtw-part-c3-p4');
    expect(screen.getByTestId('jtw-c3p4-story-count')).toHaveTextContent(/2\s*\/\s*2\s*parts?/i);
    expect(screen.getByTestId('jtw-c3p4-role-slot-exit')).toHaveAttribute(
      'data-picked',
      'role-exit',
    );
    expect(await screen.findByTestId('jtw-c3p4-resolved')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p4-continue')).toBeEnabled();
  });
});
