// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject } from '../blocksModel';
import { JourneyWestC3Part7Page } from './JourneyWestC3Part7Page';
import {
  JTW_C3_P7_SCRIPT_IDS,
  jtwC3RouteStarterProject,
} from '../jtwC3PersonalRoute';
import { JTW_C3_MONKEY_KING_ID } from '../jtwC3Stage';
import type { JtwC3Weather } from '../jtwC3WeatherBuild';
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
const SAVED_VERSION = 7;
const ARRIVAL_LINE = '山林里有歌声，我顺着它走。';

/** C1 P1–P8, C2 P1–P8 and C3 P1–P6 complete — C3-P7 is open, not done. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  ...Array.from({ length: 6 }, (_, index) => `jtw-s1-c3-p${index + 1}`),
];

function openProgress(): StoryLineProgress {
  return {
    story_line_id: 'journey-to-the-west-s1',
    completed: PRIOR_PART_IDS.map((partId) => ({
      part_id: partId,
      completed_at: '2026-07-27T04:00:00.000Z',
      evidence: {},
    })),
    unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p7'],
  };
}

function scriptOf(project: BlocksProject, pageIndex: number, scriptId: string) {
  const character = project.pages[pageIndex].characters.find(
    (actor) => actor.id === JTW_C3_MONKEY_KING_ID,
  );
  const script = character?.scripts.find((candidate) => candidate.id === scriptId);
  if (!script) throw new Error(`missing script ${scriptId}`);
  return script;
}

/** A finished personal route on `weather` — the child's own three pages. */
function builtRoute(weather: JtwC3Weather, shore?: Block[]): BlocksProject {
  const project = jtwC3RouteStarterProject(weather);
  scriptOf(project, 0, JTW_C3_P7_SCRIPT_IDS.depart).blocks = [
    { op: 'when_flag' },
    { op: 'play_sound', n: 4 },
    { op: 'move_right', n: 4 },
    { op: 'goto_page', n: 2 },
  ];
  scriptOf(project, 1, JTW_C3_P7_SCRIPT_IDS.seaLeg).blocks = [
    { op: 'when_flag' },
    { op: 'set_speed', n: 1 },
    { op: 'wait', n: 2 },
    { op: 'move_right', n: 4 },
    { op: 'goto_page', n: 3 },
  ];
  scriptOf(project, 2, JTW_C3_P7_SCRIPT_IDS.arrival).blocks = [
    { op: 'when_flag' },
    ...(shore ?? [{ op: 'move_right', n: 2 }, { op: 'say', text: ARRIVAL_LINE }]),
    { op: 'end' },
  ];
  return project;
}

/**
 * Wire the VFS. `reopenAs` lets a test hand the SECOND load a different
 * document, which is exactly the case "重开以后和保存的那一份对不上".
 */
function mockBuild(
  project: BlocksProject | null,
  runCompleted: boolean,
  reopenAs?: { project: BlocksProject; version: number },
) {
  if (!project) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    { id: 'proj_jtw_route', title: '西游记 · Across the Sea to Learn', kind: 'blocks', status: 'active' },
  ] as never);
  let loads = 0;
  loadProject.mockImplementation(async () => {
    loads += 1;
    const second = loads > 1 && reopenAs;
    return {
      project: second ? reopenAs.project : project,
      version: second ? reopenAs.version : SAVED_VERSION,
      history: { past: [], future: [] },
      storyProgress: {
        schemaVersion: 1,
        completed: runCompleted ? { 'jtw-s1-c3-p7': { completedAt: '2026-07-27T06:00:00.000Z' } } : {},
      },
      otherFiles: [],
    } as never;
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p7']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part7Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          <Route path="/learn/blocks/:projectId" element={<div data-testid="studio-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Answer the peer's three page questions. */
function pickPeer(page: number, label: RegExp) {
  const row = screen.getByTestId(`jtw-c3p7-peer-page-${page}`);
  const button = Array.from(row.querySelectorAll('button')).find((candidate) =>
    label.test(candidate.textContent ?? ''),
  );
  if (!button) throw new Error(`peer option ${String(label)} is not rendered for page ${page}`);
  fireEvent.click(button);
}

function answerPeerCorrectly() {
  pickPeer(1, /翻到 Page 2/);
  pickPeer(2, /翻到 Page 3/);
  pickPeer(3, /故事在这一页结束/);
}

/** Read both screens, answer the peer, reopen the work and rerun it. */
async function throughTheShip() {
  fireEvent.click(screen.getByTestId('jtw-c3p7-story-next'));
  await screen.findByTestId('jtw-c3p7-design');
  answerPeerCorrectly();
  fireEvent.click(screen.getByTestId('jtw-c3p7-reopen-button'));
  await waitFor(() => expect(screen.getByTestId('jtw-c3p7-reopen')).toHaveAttribute('data-match', '1'));
  fireEvent.click(screen.getByTestId('jtw-c3p7-run-button'));
  await waitFor(() => expect(screen.getByTestId('jtw-c3p7-run')).toHaveAttribute('data-reached', '1'));
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchProgress.mockResolvedValue(openProgress());
  completePart.mockResolvedValue({ ok: true } as never);
  createProject.mockResolvedValue({ id: 'proj_new' } as never);
  mockBuild(builtRoute('starry'), true);
});
afterEach(cleanup);

describe('JourneyWestC3Part7Page — 我的三页求师路', () => {
  it('shows the locked screen when C3-P6 is not complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c3-p1'],
    });
    renderPage();
    expect(await screen.findByTestId('jtw-c3p7-locked')).toBeInTheDocument();
  });

  it('reads the whole teaching text across two screens and names the work', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p7');
    expect(screen.getByTestId('jtw-c3p7-work-name')).toHaveTextContent('Across the Sea to Learn');
    expect(screen.getByTestId('jtw-c3p7-story-count')).toHaveTextContent('1 / 2 段');
    expect(screen.getByTestId('jtw-c3p7-story')).toHaveTextContent('三页都由你来写');
    fireEvent.click(screen.getByTestId('jtw-c3p7-story-next'));
    expect(screen.getByTestId('jtw-c3p7-story-count')).toHaveTextContent('2 / 2 段');
    expect(screen.getByTestId('jtw-c3p7-story')).toHaveTextContent('保存、关掉、重新打开');
    // The motive lock is stated where the child reads it, not only in code.
    expect(screen.getByText(/他是去求师学习的/)).toBeInTheDocument();
  });

  it('will not open the studio before a sea has been chosen', async () => {
    mockBuild(null, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p7');
    expect(screen.getByTestId('jtw-c3p7-open-studio')).toBeDisabled();

    fireEvent.click(screen.getByTestId('jtw-c3p7-weather-starry'));
    expect(screen.getByTestId('jtw-c3p7-open-studio')).toBeEnabled();
    fireEvent.click(screen.getByTestId('jtw-c3p7-open-studio'));
    await waitFor(() => expect(createProject).toHaveBeenCalled());
    // The card is a TEMPLATE BRANCH: the sea decides which starter is seeded.
    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'blocks_jtw_c3_p7_starry' }),
    );
  });

  it('locks the sea to the one the SAVED project was really seeded with', async () => {
    mockBuild(builtRoute('morning'), true);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p7');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-weather')).toHaveAttribute('data-chosen', 'morning'),
    );
    expect(screen.getByTestId('jtw-c3p7-weather-starry')).toBeDisabled();
  });

  it('keeps the ship shut while the saved route is still the empty starter', async () => {
    mockBuild(jtwC3RouteStarterProject('starry'), true);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p7');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-build')).toHaveAttribute('data-build-state', 'in_progress'),
    );
    expect(screen.queryByTestId('jtw-c3p7-design')).not.toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c3p7-peer')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p7-continue')).toBeDisabled();
  });

  it('will not count a finished route the studio never ran and saved', async () => {
    mockBuild(builtRoute('starry'), false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p7');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-build')).toHaveAttribute('data-build-state', 'in_progress'),
    );
    expect(screen.queryByTestId('jtw-c3p7-design')).not.toBeInTheDocument();
  });

  it('reads the three pages and the block ledger back off the SAVED document', async () => {
    renderPage();
    await screen.findByTestId('jtw-c3p7-design');
    const home = screen.getByTestId('jtw-c3p7-design-page-1');
    expect(home).toHaveAttribute('data-actions', '2');
    expect(home).toHaveAttribute('data-move-total', '4');
    expect(home).toHaveAttribute('data-exit', '2');
    expect(screen.getByTestId('jtw-c3p7-design-page-2')).toHaveAttribute('data-exit', '3');
    expect(screen.getByTestId('jtw-c3p7-design-page-3')).toHaveAttribute('data-exit', 'end');
    const ledger = screen.getByTestId('jtw-c3p7-ledger');
    expect(ledger).toHaveAttribute('data-blocks', '10');
    expect(ledger).toHaveAttribute('data-moves', '3');
    expect(ledger).toHaveAttribute('data-sounds', '1');
    expect(ledger).toHaveAttribute('data-pace', '2');
    expect(screen.getByTestId('jtw-c3p7-saved-version')).toHaveTextContent(String(SAVED_VERSION));
  });

  it('will not reopen the work until the peer has predicted every page', async () => {
    renderPage();
    await screen.findByTestId('jtw-c3p7-design');
    expect(screen.getByTestId('jtw-c3p7-reopen-button')).toBeDisabled();
    pickPeer(1, /翻到 Page 2/);
    pickPeer(2, /翻到 Page 3/);
    expect(screen.getByTestId('jtw-c3p7-reopen-button')).toBeDisabled();
    pickPeer(3, /故事在这一页结束/);
    expect(screen.getByTestId('jtw-c3p7-reopen-button')).toBeEnabled();
  });

  it('reopens the work from the server and compares the two loads byte for byte', async () => {
    renderPage();
    await screen.findByTestId('jtw-c3p7-design');
    answerPeerCorrectly();
    // Nothing can be rerun until the work has really been closed and reopened.
    expect(screen.getByTestId('jtw-c3p7-run-button')).toBeDisabled();

    fireEvent.click(screen.getByTestId('jtw-c3p7-reopen-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-reopen-result')).toHaveAttribute(
        'data-version',
        String(SAVED_VERSION),
      ),
    );
    expect(screen.getByTestId('jtw-c3p7-reopen')).toHaveAttribute('data-match', '1');
    expect(screen.getByTestId('jtw-c3p7-run-button')).toBeEnabled();
  });

  it('refuses a reopen whose document is not the one that was saved', async () => {
    mockBuild(builtRoute('starry'), true, {
      project: builtRoute('starry', [
        { op: 'move_right', n: 3 },
        { op: 'say', text: ARRIVAL_LINE },
      ]),
      version: SAVED_VERSION,
    });
    renderPage();
    await screen.findByTestId('jtw-c3p7-design');
    answerPeerCorrectly();
    fireEvent.click(screen.getByTestId('jtw-c3p7-reopen-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-reopen')).toHaveAttribute('data-match', '0'),
    );
    expect(screen.getByTestId('jtw-c3p7-reopen-result')).toHaveTextContent('对不上');
    expect(screen.getByTestId('jtw-c3p7-run-button')).toBeDisabled();
    expect(screen.getByTestId('jtw-c3p7-continue')).toBeDisabled();
  });

  it('MEASURES the reopened route: 1 → 2 → 3, every boundary continuous', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p7');
    await throughTheShip();

    expect(screen.getByTestId('jtw-c3p7-trace')).toHaveAttribute('data-trace', '1-2-3');
    const boundaries = screen.getByTestId('jtw-c3p7-boundaries').querySelectorAll('li');
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0]).toHaveAttribute('data-exit', '7-9');
    expect(boundaries[0]).toHaveAttribute('data-enter', '2-8');
    expect(boundaries[0]).toHaveAttribute('data-continuous', '1');
    expect(boundaries[1]).toHaveAttribute('data-exit', '6-8');
    expect(boundaries[1]).toHaveAttribute('data-enter', '2-9');
    expect(boundaries[1]).toHaveAttribute('data-continuous', '1');
    // The peer read the route right, so there is no first mismatch to fix.
    expect(screen.getByTestId('jtw-c3p7-mismatch')).toHaveAttribute('data-mismatch', 'none');
    expect(screen.getByTestId('jtw-c3p7-resolved')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p7-seal-note')).toHaveTextContent('远行印还没有亮');
  });

  it('names the FIRST page the peer and the real run disagree on', async () => {
    renderPage();
    await screen.findByTestId('jtw-c3p7-design');
    // The peer thinks Page 1 loops home, and Page 2 ends the story.
    pickPeer(1, /翻到 Page 1/);
    pickPeer(2, /故事在这一页结束/);
    pickPeer(3, /故事在这一页结束/);
    fireEvent.click(screen.getByTestId('jtw-c3p7-reopen-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-reopen')).toHaveAttribute('data-match', '1'),
    );
    fireEvent.click(screen.getByTestId('jtw-c3p7-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-run')).toHaveAttribute('data-reached', '1'),
    );

    // Page 1 is the FIRST disagreement, so Page 2 is not the one to fix.
    expect(screen.getByTestId('jtw-c3p7-mismatch')).toHaveAttribute('data-mismatch', 'page1');
    expect(screen.getByTestId('jtw-c3p7-mismatch')).toHaveTextContent('只修这一页');
    expect(screen.getByTestId('jtw-c3p7-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c3p7-resolved')).not.toBeInTheDocument();
  });

  it('persists the whole personal-ship evidence bundle and unlocks only C3-P8', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p7');
    await throughTheShip();

    fireEvent.click(screen.getByTestId('jtw-c3p7-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const [storyLineId, partId, evidence] = completePart.mock.calls[0];
    expect(storyLineId).toBe('journey-to-the-west-s1');
    expect(partId).toBe('jtw-s1-c3-p7');
    const selections = evidence.selections;
    expect(selections.story_screens).toEqual([
      'part-7-my-own-route',
      'part-7-what-three-pages-owe',
    ]);
    expect(selections.weather_version).toEqual(['starry']);
    expect(selections.build_project).toEqual(['proj_jtw_route']);
    // The structure, straight off the saved document.
    expect(selections.route_exits).toEqual(['page1:2', 'page2:3', 'page3:end']);
    expect(selections.block_ledger).toContain('blocks:10');
    expect(selections.route_ops).toContain('page2:wait:2');
    // Save · close · reopen — the server's own version ids, twice, and the match.
    expect(selections.saved_version).toEqual([String(SAVED_VERSION)]);
    expect(selections.reopen_version).toEqual([String(SAVED_VERSION)]);
    expect(selections.reopen_match).toEqual(['json-identical']);
    // The peer's reading, and the rerun of the reopened document.
    expect(selections.peer_predictions).toEqual([
      'page1:page-2',
      'page2:page-3',
      'page3:ends',
    ]);
    expect(selections.first_mismatch).toEqual(['none']);
    expect(selections.page_trace).toEqual(['1', '2', '3']);
    expect(selections.run_stop).toEqual(['end']);
    expect(selections.exit_page).toEqual(['3']);
    expect(selections.run_footprints).toEqual([
      'page1:3-9->7-9:page2',
      'page2:2-8->6-8:page3',
      'page3:2-9->4-9:stop',
    ]);
    expect(selections.run_boundaries.every((row) => row.endsWith(':ok'))).toBe(true);
    expect(selections.reopen_rerun).toEqual(['trace:1-2-3', 'stop:end']);
    await screen.findByTestId('jtw-map-stub');
  });

  it('restores the saved evidence and the resolved panel after a refresh', async () => {
    const progress = openProgress();
    progress.completed.push({
      part_id: 'jtw-s1-c3-p7',
      completed_at: '2026-07-27T07:00:00.000Z',
      evidence: {
        schema_version: 1,
        selections: {
          story_screens: ['part-7-my-own-route', 'part-7-what-three-pages-owe'],
          weather_version: ['starry'],
          peer_predictions: ['page1:page-2', 'page2:page-3', 'page3:ends', 'nonsense'],
          reopen_match: ['json-identical'],
          page_trace: ['1', '2', '3'],
          run_boundaries: ['page1->page2:7-9:2-8:ok', 'page2->page3:6-8:2-9:ok'],
        },
      },
    });
    fetchProgress.mockResolvedValue(progress);
    renderPage();
    await screen.findByTestId('jtw-c3p7-resolved');
    expect(screen.getByTestId('jtw-c3p7-story-count')).toHaveTextContent('2 / 2 段');
    expect(screen.getByTestId('jtw-c3p7-trace')).toHaveAttribute('data-trace', '1-2-3');
    // The malformed peer row was dropped rather than guessed at.
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p7-peer')).toHaveAttribute('data-answered', '1'),
    );
    expect(screen.getByTestId('jtw-c3p7-peer-page-1')).toHaveAttribute('data-picked', 'page-2');
    expect(screen.getByTestId('jtw-c3p7-continue')).toBeEnabled();
  });
});
