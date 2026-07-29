// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject } from '../blocksModel';
import { JourneyWestC3Part8Page } from './JourneyWestC3Part8Page';
import { JTW_C3_P7_SCRIPT_IDS, jtwC3RouteStarterProject } from '../jtwC3PersonalRoute';
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
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_a', role: 'kid', nickname: 'Mia' } }),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);
const listProjects = vi.mocked(blocksApi.listBlocksProjects);
const loadProject = vi.mocked(blocksApi.loadBlocksProject);

const instantSleep = () => Promise.resolve();
const SAVED_VERSION = 11;
const ARRIVAL_LINE = '山林里有歌声，我顺着它走。';
const SEAL_ID = 'jtw-s1-c3-long-journey-seal';

/** C1 P1–P8, C2 P1–P8 and C3 P1–P7 complete — C3-P8 is open, not done. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  ...Array.from({ length: 7 }, (_, index) => `jtw-s1-c3-p${index + 1}`),
];

function openProgress(): StoryLineProgress {
  return {
    story_line_id: 'journey-to-the-west-s1',
    completed: PRIOR_PART_IDS.map((partId) => ({
      part_id: partId,
      completed_at: '2026-07-27T04:00:00.000Z',
      evidence: {},
    })),
    unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p8'],
    chapter_seals: [
      { seal_id: SEAL_ID, chapter_code: 'C3', lit: false, missing: ['part:jtw-s1-c3-p8'] },
    ],
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

/** The finished C3-P7 Personal Ship this Part reopens — the child's own route. */
function builtRoute(weather: JtwC3Weather, seaLeg?: Block[]): BlocksProject {
  const project = jtwC3RouteStarterProject(weather);
  scriptOf(project, 0, JTW_C3_P7_SCRIPT_IDS.depart).blocks = [
    { op: 'when_flag' },
    { op: 'play_sound', n: 4 },
    { op: 'move_right', n: 4 },
    { op: 'goto_page', n: 2 },
  ];
  scriptOf(project, 1, JTW_C3_P7_SCRIPT_IDS.seaLeg).blocks = [
    { op: 'when_flag' },
    ...(seaLeg ?? [
      { op: 'set_speed', n: 1 },
      { op: 'wait', n: 2 },
      { op: 'move_right', n: 4 },
    ]),
    { op: 'goto_page', n: 3 },
  ];
  scriptOf(project, 2, JTW_C3_P7_SCRIPT_IDS.arrival).blocks = [
    { op: 'when_flag' },
    { op: 'move_right', n: 2 },
    { op: 'say', text: ARRIVAL_LINE },
    { op: 'end' },
  ];
  return project;
}

function mockBuild(project: BlocksProject | null, runCompleted = true) {
  if (!project) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    {
      id: 'proj_jtw_route',
      title: '西游记 · Across the Sea to Learn',
      kind: 'blocks',
      status: 'active',
    },
  ] as never);
  loadProject.mockResolvedValue({
    project,
    version: SAVED_VERSION,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c3-p7': { completedAt: '2026-07-27T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p8']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part8Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Tap the five cause cards in the story's own order. */
function orderCards(ids?: string[]) {
  const labels =
    ids ??
    ['为什么离开', '伙伴造筏', 'Page 2 出口错误', '修复顺序与位置', '到达师门'];
  const group = screen.getByTestId('jtw-c3p8-cause-cards');
  for (const label of labels) {
    const button = Array.from(group.querySelectorAll('button')).find((candidate) =>
      (candidate.textContent ?? '').includes(label),
    );
    if (!button) throw new Error(`cause card ${label} is not rendered`);
    fireEvent.click(button);
  }
}

function pick(testId: string, label: RegExp) {
  const section = screen.getByTestId(testId);
  const button = Array.from(section.querySelectorAll('button')).find((candidate) =>
    label.test(candidate.textContent ?? ''),
  );
  if (!button) throw new Error(`option ${String(label)} is not rendered in ${testId}`);
  fireEvent.click(button);
}

/** Order the cards, run the saved work and answer the whole retell. */
async function throughTheRetell() {
  await screen.findByTestId('jtw-c3p8-design');
  orderCards();
  fireEvent.click(screen.getByTestId('jtw-c3p8-run-button'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c3p8-saved-run')).toHaveAttribute('data-reached', '1'),
  );
  pick('jtw-c3p8-retell', /因为花果山很快乐/);
  pick('jtw-c3p8-text-evidence', /能教他学习、思考和修行的师父/);
  pick('jtw-c3p8-program-evidence', /真的从 Page 1 走到 Page 2/);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchProgress.mockResolvedValue(openProgress());
  completePart.mockResolvedValue({ ok: true } as never);
  mockBuild(builtRoute('starry'));
});
afterEach(cleanup);

describe('JourneyWestC3Part8Page — 到达不是学会，而是准备开始', () => {
  it('shows the locked screen when C3-P7 is not complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c3-p1'],
    });
    renderPage();
    expect(await screen.findByTestId('jtw-c3p8-locked')).toBeInTheDocument();
  });

  it('reads 故事卡D, the classic card and the two shore lines', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p8');
    const story = screen.getByTestId('jtw-c3p8-story');
    expect(story).toHaveTextContent('终于从 Page 1 走到 2，再从 2 走到 3');
    // 到达 ≠ 学会 is stated where the child reads it, not only in code.
    expect(story).toHaveTextContent('到达不等于学会');
    expect(story).toHaveTextContent('不能把动机改成寻宝或取经');
    expect(story).toHaveTextContent('我先去学会更多，再把经历讲给你们听');
  });

  it('points back at Part 7 when there is no saved route to reopen', async () => {
    mockBuild(null);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p8');
    expect(await screen.findByTestId('jtw-c3p8-work-missing')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c3p8-run-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p8-light-seal')).toBeDisabled();
  });

  it('refuses a saved route the studio never really ran and saved', async () => {
    mockBuild(builtRoute('starry'), false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p8');
    expect(await screen.findByTestId('jtw-c3p8-work-missing')).toBeInTheDocument();
  });

  it('will not run the saved work until the five cause cards are in order', async () => {
    renderPage();
    await screen.findByTestId('jtw-c3p8-design');
    expect(screen.getByTestId('jtw-c3p8-run-button')).toBeDisabled();
    // 到达师门 in front of 修复顺序与位置 is still the wrong story.
    orderCards(['为什么离开', '伙伴造筏', 'Page 2 出口错误', '到达师门', '修复顺序与位置']);
    expect(screen.getByTestId('jtw-c3p8-run-button')).toBeDisabled();
  });

  it('reads the saved three pages back off the document and runs 1 → 2 → 3', async () => {
    renderPage();
    await screen.findByTestId('jtw-c3p8-design');
    expect(screen.getByTestId('jtw-c3p8-design-page-1')).toHaveAttribute('data-exit', '2');
    expect(screen.getByTestId('jtw-c3p8-design-page-2')).toHaveAttribute('data-exit', '3');
    expect(screen.getByTestId('jtw-c3p8-design-page-3')).toHaveAttribute('data-exit', 'end');
    expect(screen.getByTestId('jtw-c3p8-saved-version')).toHaveTextContent(String(SAVED_VERSION));

    orderCards();
    fireEvent.click(screen.getByTestId('jtw-c3p8-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p8-saved-run')).toHaveAttribute('data-reached', '1'),
    );
    expect(screen.getByTestId('jtw-c3p8-trace')).toHaveAttribute('data-trace', '1-2-3');
    const boundaries = screen.getByTestId('jtw-c3p8-boundaries').querySelectorAll('li');
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0]).toHaveAttribute('data-exit', '7-9');
    expect(boundaries[0]).toHaveAttribute('data-enter', '2-8');
    expect(boundaries[0]).toHaveAttribute('data-continuous', '1');
    expect(boundaries[1]).toHaveAttribute('data-continuous', '1');
    // The stage really ended on the far shore.
    expect(screen.getByTestId('jtw-c3p8-stage')).toHaveAttribute('data-page', '3');
  });

  it('refuses a retell that is only block names, and one that skips the cause', async () => {
    renderPage();
    await screen.findByTestId('jtw-c3p8-design');
    orderCards();
    fireEvent.click(screen.getByTestId('jtw-c3p8-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p8-saved-run')).toHaveAttribute('data-reached', '1'),
    );

    pick('jtw-c3p8-retell', /把积木的名字按顺序念一遍/);
    expect(screen.getByTestId('jtw-c3p8-retell')).toHaveAttribute('data-done', '0');
    expect(screen.getByTestId('jtw-c3p8-light-seal')).toBeDisabled();
    pick('jtw-c3p8-retell', /后来他就学会本领了/);
    expect(screen.getByTestId('jtw-c3p8-retell')).toHaveAttribute('data-done', '0');
    pick('jtw-c3p8-retell', /因为花果山很快乐/);
    expect(screen.getByTestId('jtw-c3p8-retell')).toHaveAttribute('data-done', '1');
  });

  it('refuses 寻宝 as a motive and a program fact as a TEXT evidence', async () => {
    renderPage();
    await throughTheRetell();
    pick('jtw-c3p8-text-evidence', /取一件宝物回来/);
    expect(screen.getByTestId('jtw-c3p8-text-evidence')).toHaveAttribute('data-done', '0');
    pick('jtw-c3p8-text-evidence', /出口积木上写着数字 2/);
    expect(screen.getByTestId('jtw-c3p8-text-evidence')).toHaveAttribute('data-done', '0');
    expect(screen.getByTestId('jtw-c3p8-light-seal')).toBeDisabled();
    pick('jtw-c3p8-text-evidence', /我先去学会更多/);
    expect(screen.getByTestId('jtw-c3p8-text-evidence')).toHaveAttribute('data-done', '1');
  });

  it('accepts ONLY program evidence the run really measured', async () => {
    renderPage();
    await throughTheRetell();
    const section = screen.getByTestId('jtw-c3p8-program-evidence');
    expect(section.getAttribute('data-measured')?.split(',')).toEqual([
      'trace-1-2-3',
      'exit-page2-is-3',
      'page3-ends',
      'boundaries-continuous',
    ]);
    // A line of story text is not a program measurement.
    pick('jtw-c3p8-program-evidence', /先从认识自己开始/);
    expect(section).toHaveAttribute('data-done', '0');
    expect(screen.getByTestId('jtw-c3p8-light-seal')).toBeDisabled();
    // Nor is "the raft knows the way" — the exit number is something you write.
    pick('jtw-c3p8-program-evidence', /木筏自己知道该去哪一页/);
    expect(section).toHaveAttribute('data-done', '0');
    pick('jtw-c3p8-program-evidence', /每一次跨页/);
    expect(section).toHaveAttribute('data-done', '1');
    expect(screen.getByTestId('jtw-c3p8-light-seal')).toBeEnabled();
  });

  it('persists the retell bundle and lights 远行印 only from the SERVER', async () => {
    renderPage();
    await throughTheRetell();
    expect(screen.getByTestId('jtw-c3p8-resolved')).toBeInTheDocument();

    // The server has NOT reported the seal lit yet, so the page must not claim it.
    const lit = openProgress();
    lit.completed.push({
      part_id: 'jtw-s1-c3-p8',
      completed_at: '2026-07-27T08:00:00.000Z',
      evidence: {},
    });
    lit.unlocked_part_ids.push('jtw-s1-c4-p1');
    lit.chapter_seals = [{ seal_id: SEAL_ID, chapter_code: 'C3', lit: true, missing: [] }];
    fetchProgress.mockResolvedValue(lit);

    fireEvent.click(screen.getByTestId('jtw-c3p8-light-seal'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const [storyLineId, partId, evidence] = completePart.mock.calls[0];
    expect(storyLineId).toBe('journey-to-the-west-s1');
    expect(partId).toBe('jtw-s1-c3-p8');
    const selections = evidence.selections;
    expect(selections.cause_card_order).toEqual([
      'why-leave',
      'friends-build-raft',
      'page2-exit-wrong',
      'fix-order-and-position',
      'arrive-at-gate',
    ]);
    expect(selections.retell_links).toEqual(['linked-motive-and-program']);
    expect(selections.text_evidence).toEqual(['wants-a-teacher']);
    expect(selections.program_evidence).toEqual(['trace-1-2-3']);
    expect(selections.run_project).toEqual(['proj_jtw_route']);
    expect(selections.run_saved_version).toEqual([String(SAVED_VERSION)]);
    expect(selections.route_exits).toEqual(['page1:2', 'page2:3', 'page3:end']);
    expect(selections.page_trace).toEqual(['1', '2', '3']);
    expect(selections.run_stop).toEqual(['end']);
    expect(selections.exit_page).toEqual(['3']);
    expect(selections.run_footprints).toEqual([
      'page1:3-9->7-9:page2',
      'page2:2-8->6-8:page3',
      'page3:2-9->4-9:stop',
    ]);
    expect(selections.run_boundaries.every((row) => row.endsWith(':ok'))).toBe(true);
    expect(selections.rerun_result).toEqual(['trace:1-2-3', 'stop:end']);
    expect(selections.continue_choice).toEqual([]);

    const sealPanel = await screen.findByTestId('jtw-c3p8-seal');
    await waitFor(() => expect(sealPanel).toHaveAttribute('data-lit', 'true'));
    expect(sealPanel).toHaveTextContent('远行印');
  });

  it('leaves 远行印 dark and names the gap when the server still reports one', async () => {
    const done = openProgress();
    done.completed.push({
      part_id: 'jtw-s1-c3-p8',
      completed_at: '2026-07-27T08:00:00.000Z',
      evidence: {
        schema_version: 1,
        selections: {
          cause_card_order: [
            'why-leave',
            'friends-build-raft',
            'page2-exit-wrong',
            'fix-order-and-position',
            'arrive-at-gate',
          ],
          retell_links: ['linked-motive-and-program'],
          text_evidence: ['wants-a-teacher'],
          program_evidence: ['trace-1-2-3'],
          page_trace: ['1', '2', '3'],
          run_boundaries: ['page1->page2:7-9:2-8:ok', 'page2->page3:6-8:2-9:ok', 'garbage'],
        },
      },
    });
    done.chapter_seals = [
      {
        seal_id: SEAL_ID,
        chapter_code: 'C3',
        lit: false,
        missing: ['evidence:jtw-s1-c3-p5.weather_version', 'evidence:jtw-s1-c3-p6.fix_choice'],
      },
    ];
    fetchProgress.mockResolvedValue(done);
    renderPage();

    const sealPanel = await screen.findByTestId('jtw-c3p8-seal');
    expect(sealPanel).toHaveAttribute('data-lit', 'false');
    expect(sealPanel).toHaveTextContent('还缺 2 项证据');
    // The restored evidence still shows the chapter ending, malformed row dropped.
    expect(screen.getByTestId('jtw-c3p8-resolved')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p8-trace')).toHaveAttribute('data-trace', '1-2-3');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p8-boundaries').querySelectorAll('li')).toHaveLength(2),
    );
  });

  it('records 以后继续 on the row and stays on the chapter-three ending', async () => {
    const savedRunEvidence = {
      page_trace: ['1', '2', '3'],
      run_footprints: [
        'page1:3-9->7-9:page2',
        'page2:2-8->6-8:page3',
        'page3:2-9->4-9:stop',
      ],
      run_boundaries: [
        'page1->page2:7-9:2-8:ok',
        'page2->page3:6-8:2-9:ok',
      ],
      run_stop: ['end'],
      rerun_result: ['trace:1-2-3', 'stop:end'],
    };
    const done = openProgress();
    done.completed.push({
      part_id: 'jtw-s1-c3-p8',
      completed_at: '2026-07-27T08:00:00.000Z',
      evidence: { schema_version: 1, selections: savedRunEvidence },
    });
    fetchProgress.mockResolvedValue(done);
    renderPage();

    fireEvent.click(await screen.findByTestId('jtw-c3p8-continue-later'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const savedSelections = completePart.mock.calls[0][2].selections;
    expect(savedSelections.continue_choice).toEqual(['later']);
    expect(savedSelections.run_footprints).toEqual(savedRunEvidence.run_footprints);
    expect(savedSelections.run_stop).toEqual(savedRunEvidence.run_stop);
    expect(savedSelections.rerun_result).toEqual(savedRunEvidence.rerun_result);
    // No navigation: 以后继续 never auto-advances into chapter four.
    expect(screen.queryByTestId('jtw-map-stub')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-part-c3-p8')).toBeInTheDocument();
  });

  it('goes to the map with ONLY C4-P1 unlocked when 现在去敲门 is tapped', async () => {
    const done = openProgress();
    done.completed.push({
      part_id: 'jtw-s1-c3-p8',
      completed_at: '2026-07-27T08:00:00.000Z',
      evidence: { schema_version: 1, selections: { page_trace: ['1', '2', '3'] } },
    });
    fetchProgress.mockResolvedValue(done);
    renderPage();

    fireEvent.click(await screen.findByTestId('jtw-c3p8-continue-now'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    expect(completePart.mock.calls[0][2].selections.continue_choice).toEqual(['now']);
    await screen.findByTestId('jtw-map-stub');
  });

  it('does not accept a run whose route never reaches the far shore', async () => {
    // A sea page that ends instead of handing over — the route dies at Page 2.
    const project = builtRoute('starry');
    scriptOf(project, 1, JTW_C3_P7_SCRIPT_IDS.seaLeg).blocks = [
      { op: 'when_flag' },
      { op: 'wait', n: 2 },
      { op: 'move_right', n: 4 },
      { op: 'end' },
    ];
    mockBuild(project);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p8');
    // The saved document no longer satisfies the C3-P7 structure at all.
    expect(await screen.findByTestId('jtw-c3p8-work-missing')).toBeInTheDocument();
  });
});
