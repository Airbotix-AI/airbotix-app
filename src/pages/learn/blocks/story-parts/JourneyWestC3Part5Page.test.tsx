// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject } from '../blocksModel';
import { JourneyWestC3Part5Page } from './JourneyWestC3Part5Page';
import { JTW_C3_ARRIVAL_CHAIN, JTW_C3_DEPART_CHAIN, JTW_C3_RAFT_CHAIN } from '../jtwC3SeaBuild';
import {
  JTW_C3_P5_PAGE1_RAFT_CELL,
  JTW_C3_P5_PAGE_IDS,
  JTW_C3_P5_ROUTE_TAIL,
  JTW_C3_P5_SCRIPT_IDS,
  JTW_C3_P5_STARTER_CHAIN,
  jtwC3WeatherVersion,
  type JtwC3Weather,
} from '../jtwC3WeatherBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_MORNING_SCENE,
  JTW_C3_PAGE2_STARRY_SCENE,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_SCENE,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
} from '../jtwC3Stage';
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

/** C1 P1–P8 + C2 P1–P8 + C3 P1–P4 complete. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  'jtw-s1-c3-p1',
  'jtw-s1-c3-p2',
  'jtw-s1-c3-p3',
  'jtw-s1-c3-p4',
];

const C3_P4_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p5'],
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
    scripts: blocks ? [{ id: JTW_C3_P5_SCRIPT_IDS.raftCarry, blocks: [...blocks] }] : [],
  };
}

function weatherProject(scene: string, seaChain: readonly Block[]): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C3 — The Middle Sea',
    lessonId: 'jtw-s1-c3-p5',
    pages: [
      {
        id: JTW_C3_P5_PAGE_IDS[0],
        background: JTW_C3_PAGE1_SCENE,
        characters: [
          monkey(JTW_C3_PAGE1_START_CELL, JTW_C3_P5_SCRIPT_IDS.depart, JTW_C3_DEPART_CHAIN),
          raft(JTW_C3_P5_PAGE1_RAFT_CELL, null),
        ],
      },
      {
        id: JTW_C3_P5_PAGE_IDS[1],
        background: scene,
        characters: [
          monkey(JTW_C3_PAGE2_START_CELL, JTW_C3_P5_SCRIPT_IDS.seaLeg, seaChain),
          raft(JTW_C3_PAGE2_START_CELL, JTW_C3_RAFT_CHAIN),
        ],
      },
      {
        id: JTW_C3_P5_PAGE_IDS[2],
        background: JTW_C3_PAGE3_SCENE,
        characters: [
          monkey(JTW_C3_PAGE3_START_CELL, JTW_C3_P5_SCRIPT_IDS.arrival, JTW_C3_ARRIVAL_CHAIN),
          raft(JTW_C3_PAGE3_START_CELL, null),
        ],
      },
    ],
  };
}

/** No project yet, or a saved project on `scene` carrying `seaChain`. */
function mockBuild(scene: string | null, seaChain: readonly Block[], runCompleted: boolean) {
  if (!scene) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    {
      id: 'proj_jtw_weather',
      title: 'Journey to the West · Both starry night and morning fog need to be observed',
      kind: 'blocks',
      status: 'active',
    },
  ] as never);
  loadProject.mockResolvedValue({
    project: weatherProject(scene, seaChain),
    version: 3,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c3-p5': { completedAt: '2026-07-27T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

/** A finished build of one version. */
function mockFinished(id: JtwC3Weather, runCompleted = true) {
  const version = jtwC3WeatherVersion(id);
  mockBuild(version.scene, version.chain, runCompleted);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p5']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part5Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          <Route path="/learn/blocks/:projectId" element={<div data-testid="studio-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Pick one option inside one prediction row by its visible label. */
function predict(rowId: string, label: string | RegExp) {
  const row = screen.getByTestId(`jtw-c3p5-predict-${rowId}`);
  const button = Array.from(row.querySelectorAll('button')).find((candidate) =>
    typeof label === 'string'
      ? candidate.textContent === label
      : label.test(candidate.textContent ?? ''),
  );
  if (!button) throw new Error(`prediction option ${String(label)} is not rendered in ${rowId}`);
  fireEvent.click(button);
}

const SOUND_LABEL: Record<JtwC3Weather, RegExp> = {
  starry: /Sparkle/,
  morning: /Whoosh/,
};

/** Everything the Part asks for outside the studio, for one version. */
function answerEverything(id: JtwC3Weather) {
  fireEvent.click(screen.getByTestId('jtw-c3p5-story-next'));
  fireEvent.click(
    screen.getByRole('button', {
      name: /If you can't see clearly, see clearly first: wait or slow down a little before you know which way to go; walking fast will just make you go wrong faster\./i,
    }),
  );
  predict('hear', SOUND_LABEL[id]);
  predict('move', /After observing first, then go 4 blocks to the right\./i);
  predict('page', /Page 3 · The mountains and forests on the other side/i);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchProgress.mockResolvedValue(C3_P4_DONE);
  completePart.mockResolvedValue({ ok: true } as never);
  createProject.mockResolvedValue({ id: 'proj_new' } as never);
  mockFinished('starry');
});
afterEach(cleanup);

describe('JourneyWestC3Part5Page — Both starry night and morning fog require observation', () => {
  it('shows the locked screen when C3-P4 is not complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c3-p1'],
    });
    renderPage();
    expect(await screen.findByTestId('jtw-c3p5-locked')).toBeInTheDocument();
  });

  it('reads the whole teaching text across two screens, compression included', async () => {
    mockBuild(null, [], false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    expect(screen.getByTestId('jtw-c3p5-story-count')).toHaveTextContent(/1\s*\/\s*2\s*part/i);
    expect(screen.getByTestId('jtw-c3p5-story')).toHaveTextContent('Both versions are correct');
    fireEvent.click(screen.getByTestId('jtw-c3p5-story-next'));
    expect(screen.getByTestId('jtw-c3p5-story-count')).toHaveTextContent(/2\s*\/\s*2\s*parts?/i);
    expect(screen.getByTestId('jtw-c3p5-story')).toHaveTextContent(/lasted for many years/i);
  });

  it('offers both seas with their real artwork, and no prediction until one is picked', async () => {
    mockBuild(null, [], false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    // 真实选择: two cards, each showing the sea it really is.
    const starry = screen.getByTestId('jtw-c3p5-version-starry');
    const morning = screen.getByTestId('jtw-c3p5-version-morning');
    expect(starry.querySelector('img')).toHaveAttribute(
      'src',
      '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-starry-before-v01.webp',
    );
    expect(morning.querySelector('img')).toHaveAttribute(
      'src',
      '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page2-morning-before-v01.webp',
    );
    // The peer prediction is about a weather card, so it cannot exist yet.
    expect(screen.queryByTestId('jtw-c3p5-prediction')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p5-open-studio')).toBeDisabled();

    fireEvent.click(starry);
    expect(screen.getByTestId('jtw-c3p5-versions')).toHaveAttribute('data-chosen', 'starry');
    expect(await screen.findByTestId('jtw-c3p5-prediction')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p5-muted')).toHaveTextContent(
      'You can read it even if you turn off the sound',
    );
  });

  it('shows the chosen version target chain with the shared route intact', async () => {
    mockBuild(null, [], false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    fireEvent.click(screen.getByTestId('jtw-c3p5-version-starry'));
    expect(screen.getByTestId('jtw-c3p5-target-chain')).toHaveAttribute(
      'data-ops',
      'when_flag,play_sound,wait,move_right,goto_page',
    );
    fireEvent.click(screen.getByTestId('jtw-c3p5-version-morning'));
    expect(screen.getByTestId('jtw-c3p5-target-chain')).toHaveAttribute(
      'data-ops',
      'when_flag,set_speed,play_sound,say,move_right,goto_page',
    );
    // Both versions keep it, so it is shown as its own untouchable strip.
    expect(screen.getByTestId('jtw-c3p5-shared-tail')).toHaveAttribute(
      'data-ops',
      'move_right,goto_page',
    );
  });

  it('refuses the "faster is better" explanation with a text-grounded hint', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    fireEvent.click(
      screen.getByRole('button', {
        name: /The sooner the better, just get to the shore as early as possible\./i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Use acceleration to cover up the problem/i);
  });

  it('refuses a prediction that belongs to the OTHER weather card', async () => {
    mockFinished('morning');
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-versions')).toHaveAttribute('data-chosen', 'morning'),
    );
    // The mist version's sound is Whoosh, so Sparkle is refused for it.
    predict('hear', /Sparkle/);
    expect(screen.getByTestId('jtw-c3p5-predict-hear')).toHaveTextContent(
      'Take a look at the blocks written on the weather card you chose: ✨ Sparkle for starry night, 💨 Whoosh for morning fog.',
    );
  });

  it.each([
    ['starry', 'blocks_jtw_c3_p5_starry'],
    ['morning', 'blocks_jtw_c3_p5_morning'],
  ])('creates the %s branch starter from the weather card', async (id, template) => {
    mockBuild(null, [], false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute('data-build-state', 'none'),
    );
    fireEvent.click(screen.getByTestId(`jtw-c3p5-version-${id}`));
    fireEvent.click(screen.getByTestId('jtw-c3p5-open-studio'));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        title: 'Journey to the West · Both starry night and morning fog need to be observed',
        template,
      }),
    );
    expect(await screen.findByTestId('studio-stub')).toBeInTheDocument();
  });

  it('keeps the run locked while only the shared route is saved', async () => {
    mockBuild(JTW_C3_PAGE2_STARRY_SCENE, JTW_C3_P5_STARTER_CHAIN, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p5-run-button')).toBeDisabled();
    answerEverything('starry');
    expect(screen.getByTestId('jtw-c3p5-continue')).toBeDisabled();
  });

  it('does not accept a version that was built but never run in the studio', async () => {
    mockFinished('starry', false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    answerEverything('starry');
    expect(screen.getByTestId('jtw-c3p5-run-button')).toBeDisabled();
    expect(screen.getByTestId('jtw-c3p5-continue')).toBeDisabled();
  });

  it('does not accept a repainted sea with no expression blocks ("Just changing the background will not pass")', async () => {
    // The starry sea saved over the bare shipped route: the sea changed, the
    // program did not, so this is neither version.
    mockBuild(JTW_C3_PAGE2_STARRY_SCENE, JTW_C3_P5_STARTER_CHAIN, true);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    answerEverything('starry');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.queryByTestId('jtw-c3p5-resolved')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p5-continue')).toBeDisabled();
  });

  it('does not accept a version whose exit was pointed back at Page 1', async () => {
    const homeAgain = [
      ...jtwC3WeatherVersion('morning').chain.slice(0, -1),
      { op: 'goto_page', n: 1 } as Block,
    ];
    mockBuild(JTW_C3_PAGE2_MORNING_SCENE, homeAgain, true);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    answerEverything('morning');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p5-run-button')).toBeDisabled();
    expect(screen.getByTestId('jtw-c3p5-continue')).toBeDisabled();
  });

  it.each(['starry', 'morning'] as const)(
    'measures a real 1 → 2 → 3 run of the saved %s version and resolves',
    async (id) => {
      mockFinished(id);
      renderPage();
      await screen.findByTestId('jtw-part-c3-p5');
      await waitFor(() =>
        expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute('data-build-state', 'done'),
      );
      // The version on screen was read back off the SAVED document.
      expect(screen.getByTestId('jtw-c3p5-versions')).toHaveAttribute('data-chosen', id);
      expect(screen.getByTestId('jtw-c3p5-version-locked')).toBeInTheDocument();
      expect(screen.getByTestId('jtw-c3p5-saved-chain')).toHaveAttribute('data-exit', '3');

      answerEverything(id);
      expect(screen.getByTestId('jtw-c3p5-continue')).toBeDisabled();

      fireEvent.click(screen.getByTestId('jtw-c3p5-run-button'));
      const actual = await screen.findByTestId('jtw-c3p5-actual-trace');
      expect(actual).toHaveAttribute('data-trace', '1-2-3');
      // 出口仍为 3 — the scene's completion evidence.
      expect(actual).toHaveAttribute('data-exit-page', '3');

      const rows = Array.from(screen.getByTestId('jtw-c3p5-run-footprints').querySelectorAll('li'));
      expect(rows.map((row) => row.getAttribute('data-enter'))).toEqual(['3-9', '2-8', '2-9']);
      expect(rows.map((row) => row.getAttribute('data-exit-to'))).toEqual(['2', '3', '']);
      expect(screen.getByTestId('jtw-c3p5-stage')).toHaveAttribute('data-page', '3');

      const resolved = await screen.findByTestId('jtw-c3p5-resolved');
      expect(resolved).toHaveAttribute('data-version', id);
      expect(resolved).toHaveTextContent(
        /audience (?:can|could) read.*observed, and then continued/i,
      );
      expect(screen.getByTestId('jtw-c3p5-page2-resolved')).toHaveAttribute(
        'src',
        jtwC3WeatherVersion(id).resolvedBackground,
      );
      // story_after already points at the C3-P6 bug.
      expect(resolved).toHaveTextContent(
        /raft.*wrong side/i,
      );
    },
  );

  it('paints the starry middle sea on the stage while that version runs', async () => {
    mockFinished('starry');
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute('data-build-state', 'done'),
    );
    // Page 1 is the shared home shore for both versions...
    expect(screen.getByTestId('jtw-c3p5-stage-bg')).toHaveAttribute(
      'src',
      '/story-blocks/journey-to-the-west/backgrounds/s1/c3/page1-before-v01.webp',
    );
    // ...and the middle sea is the one the child chose, not the default mist.
    fireEvent.click(screen.getByTestId('jtw-c3p5-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-stage')).toHaveAttribute('data-page', '3'),
    );
  });

  it('stores the version, explanation, predictions and run, and unlocks ONLY C3-P6', async () => {
    mockFinished('morning');
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p5-build')).toHaveAttribute('data-build-state', 'done'),
    );
    answerEverything('morning');
    fireEvent.click(screen.getByTestId('jtw-c3p5-run-button'));
    await screen.findByTestId('jtw-c3p5-resolved');

    fireEvent.click(screen.getByTestId('jtw-c3p5-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const [lineId, partId, evidence] = completePart.mock.calls[0];
    expect(lineId).toBe('journey-to-the-west-s1');
    expect(partId).toBe('jtw-s1-c3-p5');
    expect(evidence.selections?.story_screens).toEqual([
      'part-5-two-valid-versions',
      'part-5-compression-and-task',
    ]);
    expect(evidence.selections?.weather_version).toEqual(['morning']);
    expect(evidence.selections?.why_not_faster).toEqual(['why-observe-first']);
    expect(evidence.selections?.peer_predictions).toEqual([
      'hear:hear-whoosh',
      'move:move-after-observe',
      'page:page-3',
    ]);
    expect(evidence.selections?.build_project).toEqual(['proj_jtw_weather']);
    expect(evidence.selections?.target_chain).toEqual([
      'set_speed:1',
      'play_sound:4',
      'say',
      'move_right:4',
      'goto_page:3',
    ]);
    expect(evidence.selections?.page_target).toEqual(['3']);
    expect(evidence.selections?.page_trace).toEqual(['1', '2', '3']);
    expect(evidence.selections?.run_stop).toEqual(['end']);
    expect(evidence.selections?.exit_page).toEqual(['3']);
    expect(evidence.selections?.run_footprints).toEqual([
      'page1:3-9->7-9:page2',
      'page2:2-8->6-8:page3',
      'page3:2-9->2-9:stop',
    ]);
    expect(evidence.prediction).toBe('page-3');
    expect(await screen.findByTestId('jtw-map-stub')).toBeInTheDocument();
  });

  it('restores the saved evidence after a refresh', async () => {
    mockFinished('starry');
    fetchProgress.mockResolvedValue({
      ...C3_P4_DONE,
      completed: [
        ...C3_P4_DONE.completed,
        {
          part_id: 'jtw-s1-c3-p5',
          completed_at: '2026-07-27T07:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['part-5-two-valid-versions', 'part-5-compression-and-task'],
              weather_version: ['starry'],
              why_not_faster: ['why-observe-first'],
              peer_predictions: [
                'hear:hear-sparkle',
                'move:move-after-observe',
                'page:page-3',
                'garbage row',
              ],
              page_trace: ['1', '2', '3'],
            },
            prediction: 'page-3',
          },
        },
      ],
      unlocked_part_ids: [...C3_P4_DONE.unlocked_part_ids, 'jtw-s1-c3-p6'],
    });
    renderPage();
    await screen.findByTestId('jtw-part-c3-p5');
    expect(screen.getByTestId('jtw-c3p5-story-count')).toHaveTextContent(/2\s*\/\s*2\s*parts?/i);
    // Malformed rows are dropped, not guessed — the three real ones survive.
    expect(screen.getByTestId('jtw-c3p5-predict-hear')).toHaveAttribute(
      'data-picked',
      'hear-sparkle',
    );
    expect(await screen.findByTestId('jtw-c3p5-resolved')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p5-continue')).toBeEnabled();
  });

  it('keeps the shared route the same two blocks for both versions', () => {
    expect(JTW_C3_P5_ROUTE_TAIL).toEqual([
      { op: 'move_right', n: 4 },
      { op: 'goto_page', n: 3 },
    ]);
  });
});
