// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject, Page } from '../blocksModel';
import { BlocksRunner, startState, type SpriteState } from '../interpreter';
import {
  JTW_C2_P7_EVIDENCE_LINES,
  JTW_C2_P7_SIDES,
  type JtwEntrySide,
} from '../jtwPersonalEntry';
import {
  JTW_C2_ACTOR_FREE_BACKGROUND,
  JTW_C2_CAVE_SPRITE,
  JTW_C2_CURTAIN_SPRITE,
  JTW_STONE_MONKEY_SPRITE,
} from '../jtwC2Stage';
import { JourneyWestC2Part7Page } from './JourneyWestC2Part7Page';
import { c2EntryRunMatches, c2EntryRunResult } from './journeyWestC2EntryRun';
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

const instantSleep = () => Promise.resolve();
const [LEFT, RIGHT] = JTW_C2_P7_SIDES;
const SAVED_VERSION = 7;

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
  'jtw-s1-c2-p6',
];

const P6_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-26T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p7'],
};

function entryPage(
  side: JtwEntrySide,
  options: { route?: readonly Block[]; waitN?: number; line?: string } = {},
): Page {
  return {
    id: 'jtw-c2-p7-page',
    background: JTW_C2_ACTOR_FREE_BACKGROUND,
    characters: [
      {
        id: 'stone-monkey',
        name: 'Stone Monkey',
        emoji: '🐵',
        asset: JTW_STONE_MONKEY_SPRITE,
        start: { ...side.start, size: 3, rot: 0 },
        scripts: [
          {
            id: 'stone-monkey-personal-entry',
            blocks: [
              { op: 'when_flag' },
              ...(options.route ?? side.route),
              { op: 'wait', n: options.waitN ?? 2 },
              { op: 'end' },
            ],
          },
        ],
      },
      {
        id: 'water-curtain-trigger',
        name: 'Water Curtain',
        emoji: '🌊',
        asset: JTW_C2_CURTAIN_SPRITE,
        start: { gx: 7, gy: 7, size: 5, reach: 1, rot: 0, visible: true },
        scripts: [
          {
            id: 'water-curtain-open',
            blocks: [
              { op: 'when_bump' },
              { op: 'hide' },
              { op: 'play_sound', n: 2 },
              { op: 'end' },
            ],
          },
        ],
      },
      {
        id: 'cave-entrance',
        name: 'Cave Entrance',
        emoji: '🕳️',
        asset: JTW_C2_CAVE_SPRITE,
        start: { gx: 7, gy: 7, size: 4, reach: 1, rot: 0, visible: false },
        scripts: [
          {
            id: 'cave-entrance-reveal',
            blocks: [
              { op: 'when_bump' },
              { op: 'show' },
              { op: 'say', text: options.line ?? JTW_C2_P7_EVIDENCE_LINES[0] },
              { op: 'end' },
            ],
          },
        ],
      },
    ],
  };
}

function entryProject(page: Page): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C2 — Find the Water Curtain Cave',
    lessonId: 'jtw-s1-c2-p7',
    pages: [page],
  };
}

function mockBuild(page: Page | null, runCompleted: boolean) {
  if (!page) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    { id: 'proj_jtw_entry', title: '西游记 · Find the Water Curtain Cave', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    project: entryProject(page),
    version: SAVED_VERSION,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c2-p7': { completedAt: '2026-07-26T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

function renderPart() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p7']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC2Part7Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<p>map</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Drive the whole Part to the point where continue is armed. */
async function walkToResolved() {
  await screen.findByTestId('jtw-c2p7-build-done');
  fireEvent.click(screen.getByRole('button', { name: /停在离水帘只有一格的那块石头上/ }));
  fireEvent.click(await screen.findByTestId('jtw-c2p7-rerun'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c2p7-rerun-result')).toHaveAttribute('data-consistent', 'true'),
  );
  fireEvent.click(screen.getByRole('button', { name: /等待才是“把门留给伙伴”/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchProgress.mockResolvedValue(P6_DONE);
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c2-p7', completed_at: 'now' });
});
afterEach(cleanup);

describe('C2-P7 · the saved design drives the page', () => {
  it('locks the part until C2-P6 is complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c1-p1'],
    });
    mockBuild(null, false);
    renderPart();
    expect(await screen.findByTestId('jtw-c2p7-locked')).toBeInTheDocument();
  });

  it('shows the teaching-script story in full and keeps continue shut with no build', async () => {
    mockBuild(null, false);
    renderPart();
    const story = await screen.findByTestId('jtw-c2p7-story');
    expect(story).toHaveTextContent('“我走过一次”不等于“大家都能走”');
    expect(story).toHaveTextContent('保存、关闭、重开以后再跑一次，结果还要一样');
    expect(screen.getByTestId('jtw-c2p7-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c2p7-design')).not.toBeInTheDocument();
  });

  it('refuses the build while the studio has not recorded a real run', async () => {
    mockBuild(entryPage(LEFT), false);
    renderPart();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c2p7-build')).toHaveAttribute('data-build-state', 'in_progress'),
    );
    expect(screen.queryByTestId('jtw-c2p7-build-done')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p7-continue')).toBeDisabled();
  });

  it('reads the LEFT bank design back out of the saved project', async () => {
    mockBuild(entryPage(LEFT, { waitN: 1 }), true);
    renderPart();
    expect(await screen.findByTestId('jtw-c2p7-side')).toHaveTextContent('左岸');
    expect(screen.getByTestId('jtw-c2p7-wait')).toHaveTextContent('等待 1 拍');
    expect(screen.getByTestId('jtw-c2p7-saved-version')).toHaveTextContent(`#${SAVED_VERSION}`);
    const stops = screen.getByTestId('jtw-c2p7-stops');
    expect(stops.querySelectorAll('li')).toHaveLength(LEFT.route.length);
    expect(stops.querySelector(`[data-stop="${LEFT.knockCell}"]`)).toHaveAttribute(
      'data-knock',
      'true',
    );
  });

  it('reads the RIGHT bank design back — a different route and one more stop', async () => {
    mockBuild(entryPage(RIGHT, { line: JTW_C2_P7_EVIDENCE_LINES[2] }), true);
    renderPart();
    expect(await screen.findByTestId('jtw-c2p7-side')).toHaveTextContent('右岸');
    expect(screen.getByTestId('jtw-c2p7-line')).toHaveTextContent(JTW_C2_P7_EVIDENCE_LINES[2]);
    const stops = screen.getByTestId('jtw-c2p7-stops');
    expect(stops.querySelectorAll('li')).toHaveLength(RIGHT.route.length);
    expect(stops.querySelector(`[data-stop="${RIGHT.knockCell}"]`)).toBeTruthy();
  });
});

describe('C2-P7 · prediction, reopen-and-rerun, completion', () => {
  it('keeps the rerun shut until the partner prediction is right', async () => {
    mockBuild(entryPage(LEFT), true);
    renderPart();
    await screen.findByTestId('jtw-c2p7-prediction');
    expect(screen.queryByTestId('jtw-c2p7-rerun')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /直接走进洞里/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('少一格就碰不到');
    expect(screen.queryByTestId('jtw-c2p7-rerun')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /停在离水帘只有一格的那块石头上/ }));
    expect(await screen.findByTestId('jtw-c2p7-rerun')).toBeInTheDocument();
  });

  it('reruns the REOPENED project for real: curtain hides, cave shows, line matches', async () => {
    mockBuild(entryPage(LEFT), true);
    renderPart();
    await screen.findByTestId('jtw-c2p7-build-done');
    fireEvent.click(screen.getByRole('button', { name: /停在离水帘只有一格的那块石头上/ }));
    expect(screen.getByTestId('jtw-c2p7-stage')).toHaveAttribute(
      'data-world-state',
      'curtain-closed',
    );
    fireEvent.click(await screen.findByTestId('jtw-c2p7-rerun'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c2p7-stage')).toHaveAttribute(
        'data-world-state',
        'cave-revealed',
      ),
    );
    expect(screen.getByTestId('jtw-c2p7-stone-monkey')).toHaveAttribute('data-gx', '6');
    expect(screen.getByTestId('jtw-c2p7-stone-monkey')).toHaveAttribute('data-gy', '7');
    expect(screen.queryByTestId('jtw-c2p7-curtain')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p7-said-line')).toHaveTextContent(
      JTW_C2_P7_EVIDENCE_LINES[0],
    );
    expect(screen.getByTestId('jtw-c2p7-rerun-result')).toHaveAttribute('data-consistent', 'true');
  });

  it('completes with the real design, saved version and rerun in the evidence', async () => {
    mockBuild(entryPage(RIGHT, { waitN: 2 }), true);
    renderPart();
    await walkToResolved();
    expect(await screen.findByTestId('jtw-c2p7-resolved')).toBeInTheDocument();
    const continueButton = screen.getByTestId('jtw-c2p7-continue');
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const [storyLineId, partId, evidence] = completePart.mock.calls[0];
    expect(storyLineId).toBe('journey-to-the-west-s1');
    expect(partId).toBe('jtw-s1-c2-p7');
    expect(evidence.selections.entry_side).toEqual(['right']);
    expect(evidence.selections.route_stops).toEqual([...RIGHT.stops]);
    expect(evidence.selections.wait_beats).toEqual(['2']);
    expect(evidence.selections.evidence_line).toEqual([JTW_C2_P7_EVIDENCE_LINES[0]]);
    expect(evidence.selections.saved_version).toEqual([String(SAVED_VERSION)]);
    expect(evidence.selections.build_project).toEqual(['proj_jtw_entry']);
    expect(evidence.selections.reopen_rerun).toEqual([
      RIGHT.knockCell,
      'curtain-hidden',
      'cave-shown',
    ]);
    expect(evidence.prediction).toBe('predict-knock-then-open');
  });

  it('restores the saved explanation after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...P6_DONE,
      completed: [
        ...P6_DONE.completed,
        {
          part_id: 'jtw-s1-c2-p7',
          completed_at: '2026-07-26T08:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: { wait_reason: ['wait-holds-door'] },
            prediction: 'predict-knock-then-open',
          },
        },
      ],
    });
    mockBuild(entryPage(LEFT), true);
    renderPart();
    expect(await screen.findByTestId('jtw-c2p7-resolved')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p7-continue')).toBeEnabled();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /停在离水帘只有一格的那块石头上/ }),
      ).toHaveAttribute('aria-pressed', 'true'),
    );
  });
});

describe('C2-P7 · the real interpreter answers both banks', () => {
  async function runBank(side: JtwEntrySide) {
    const page = entryPage(side);
    const sprites = new Map<string, SpriteState>();
    let line: string | null = null;
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (id, state) => sprites.set(id, state),
        onSay: (id, text) => {
          if (id === 'cave-entrance' && text !== null) line = text;
        },
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: () => undefined,
      },
      instantSleep,
    );
    for (const character of page.characters) sprites.set(character.id, startState(character));
    await runner.runFlag();
    return c2EntryRunResult((charId) => runner.state(charId), line);
  }

  it('opens the curtain from EITHER bank, and only on the knock cell', async () => {
    for (const side of JTW_C2_P7_SIDES) {
      const result = await runBank(side);
      expect(result).toEqual({
        endCell: side.knockCell,
        curtainHidden: true,
        caveShown: true,
        saidLine: JTW_C2_P7_EVIDENCE_LINES[0],
      });
    }
  });

  it('never opens it when the route stops one cell short — C2-P4’s 刚好到达 rule', async () => {
    const short = { ...LEFT, route: LEFT.route.slice(0, -1) };
    const result = await runBank(short);
    expect(result.endCell).toBe(LEFT.shortOfDoorCell);
    expect(result.curtainHidden).toBe(false);
    expect(result.caveShown).toBe(false);
    expect(c2EntryRunMatches({ side: LEFT, waitN: 2, evidenceLine: '' }, result)).toBe(false);
  });
});
