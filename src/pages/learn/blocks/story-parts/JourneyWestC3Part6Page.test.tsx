// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlocksProject } from '../blocksModel';
import { JourneyWestC3Part6Page } from './JourneyWestC3Part6Page';
import {
  JTW_C3_P6_SCRIPT_IDS,
  JTW_C3_P6_TARGET_START_CELL,
  JTW_C3_P6_WRONG_START_CELL,
  jtwC3JumpProject,
} from '../jtwC3JumpFix';
import { JTW_C3_MONKEY_KING_ID, JTW_C3_RAFT_ID } from '../jtwC3Stage';
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

/** C1 P1–P8 + C2 P1–P8 + C3 P1–P4 complete, all without C3-P6's own row. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  'jtw-s1-c3-p1',
  'jtw-s1-c3-p2',
  'jtw-s1-c3-p3',
  'jtw-s1-c3-p4',
];

/** Progress with C3-P5 finished on `version` — the sea C3-P6 carries forward. */
function progressAfterC3P5(version: JtwC3Weather | null): StoryLineProgress {
  return {
    story_line_id: 'journey-to-the-west-s1',
    completed: [
      ...PRIOR_PART_IDS.map((partId) => ({
        part_id: partId,
        completed_at: '2026-07-27T04:00:00.000Z',
        evidence: {},
      })),
      {
        part_id: 'jtw-s1-c3-p5',
        completed_at: '2026-07-27T05:00:00.000Z',
        evidence: {
          schema_version: 1,
          selections: version ? { weather_version: [version] } : {},
        },
      },
    ],
    unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p5', 'jtw-s1-c3-p6'],
  };
}

/** No project yet, or a saved C3-P6 project with Page 2 on `cell`. */
function mockBuild(
  version: JtwC3Weather | null,
  cell: { gx: number; gy: number },
  runCompleted: boolean,
  mutate?: (project: BlocksProject) => void,
) {
  if (!version) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    {
      id: 'proj_jtw_jump',
      title: 'Journey to the West · Raft jumped position',
      kind: 'blocks',
      status: 'active',
    },
  ] as never);
  const project = JSON.parse(JSON.stringify(jtwC3JumpProject(version, cell))) as BlocksProject;
  mutate?.(project);
  loadProject.mockResolvedValue({
    project,
    version: 4,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c3-p6': { completedAt: '2026-07-27T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p6']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part6Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          <Route path="/learn/blocks/:projectId" element={<div data-testid="studio-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Read both screens, state the expectation, run the bug, name the break+fix. */
async function throughTheDebugLoop() {
  fireEvent.click(screen.getByTestId('jtw-c3p6-story-next'));
  fireEvent.click(
    screen.getByRole('button', {
      name: /After leaving the right side of the previous page, he should enter from the left side of the next page - he kept walking to the right until the road connected\./i,
    }),
  );
  fireEvent.click(screen.getByTestId('jtw-c3p6-bug-run-button'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c3p6-bug-run')).toHaveAttribute('data-ran', '1'),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /Page 1 → Page 2: He left on the right side of the coast of Flower-Fruit Mountain, but appeared again on the right side of the middle of the sea/i,
    }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /Change the starting point \(Home\): Drag the raft back with the Monkey King /i,
    }),
  );
}

function pickPeer(rowId: string, label: RegExp) {
  const row = screen.getByTestId(`jtw-c3p6-peer-${rowId}`);
  const button = Array.from(row.querySelectorAll('button')).find((candidate) =>
    label.test(candidate.textContent ?? ''),
  );
  if (!button) throw new Error(`peer option ${String(label)} is not rendered in ${rowId}`);
  fireEvent.click(button);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchProgress.mockResolvedValue(progressAfterC3P5('starry'));
  completePart.mockResolvedValue({ ok: true } as never);
  createProject.mockResolvedValue({ id: 'proj_new' } as never);
  mockBuild('starry', JTW_C3_P6_TARGET_START_CELL, true);
});
afterEach(cleanup);

describe('JourneyWestC3Part6Page — Raft jumped location', () => {
  it('shows the locked screen when C3-P5 is not complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c3-p1'],
    });
    renderPage();
    expect(await screen.findByTestId('jtw-c3p6-locked')).toBeInTheDocument();
  });

  it('reads the whole teaching text across two screens', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    expect(screen.getByTestId('jtw-c3p6-story-count')).toHaveTextContent(/1\s*\/\s*2\s*part/i);
    expect(screen.getByTestId('jtw-c3p6-story')).toHaveTextContent(/appeared on the right again/i);
    fireEvent.click(screen.getByTestId('jtw-c3p6-story-next'));
    expect(screen.getByTestId('jtw-c3p6-story-count')).toHaveTextContent(/2\s*\/\s*2\s*parts?/i);
    expect(screen.getByTestId('jtw-c3p6-story')).toHaveTextContent(
      /not the building blocks.*starting grid/i,
    );
  });

  it('will not run the bug until the expectation has been stated', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    expect(screen.getByTestId('jtw-c3p6-bug-run-button')).toBeDisabled();
    // The wrong expectation is refused with a hint, and still keeps Go shut.
    fireEvent.click(
      screen.getByRole('button', {
        name: /If you leave on the right, continue on the right on the next page - the position should be the same/i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      "Think again of the invisible line: He's been walking to the right this entire time. If the next page placed him on the right, he would have to go back to continue—the audience would think he had been moved over.",
    );
    expect(screen.getByTestId('jtw-c3p6-bug-run-button')).toBeDisabled();

    fireEvent.click(
      screen.getByRole('button', {
        name: /After leaving the right side of the previous page, he should enter from the left side of the next page - he kept walking to the right until the road connected\./i,
      }),
    );
    expect(screen.getByTestId('jtw-c3p6-bug-run-button')).toBeEnabled();
  });

  it('refuses the first-deviation pick before the bug has really been run', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    expect(screen.getByTestId('jtw-c3p6-break-locked')).toHaveTextContent(
      /run through the wrong page first/i,
    );
  });

  it('measures the discontinuity from a REAL run of the shipped bug', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    fireEvent.click(
      screen.getByRole('button', {
        name: /After leaving the right side of the previous page, he should enter from the left side of the next page - he kept walking to the right until the road connected\./i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-c3p6-bug-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-bug-run')).toHaveAttribute('data-ran', '1'),
    );
    const rows = screen.getByTestId('jtw-c3p6-bug-boundaries').querySelectorAll('li');
    expect(rows).toHaveLength(2);
    // Page 1 → Page 2 is the break: he left on 7-9 and turned up on 16-8.
    expect(rows[0]).toHaveAttribute('data-exit', '7-9');
    expect(rows[0]).toHaveAttribute('data-enter', '16-8');
    expect(rows[0]).toHaveAttribute('data-continuous', '0');
    // Page 2 → Page 3 is fine, so the route reaching Page 3 proves nothing.
    expect(rows[1]).toHaveAttribute('data-continuous', '1');
    expect(screen.getByTestId('jtw-c3p6-bug-break')).toHaveAttribute('data-boundary', '1-2');
  });

  it('refuses the wrong deviation and the wrong minimal fix with hints', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    fireEvent.click(
      screen.getByRole('button', {
        name: /After leaving the right side of the previous page, he should enter from the left side of the next page - he kept walking to the right until the road connected\./i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-c3p6-bug-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-bug-run')).toHaveAttribute('data-ran', '1'),
    );
    fireEvent.click(screen.getByRole('button', { name: /Page 2 → Page 3/ }));
    expect(screen.getByTestId('jtw-c3p6-break')).toHaveTextContent(
      'Look at each frame: Page 1 He walked from 3-9 to 7-9 without jumping on this page; Page 2 → Page 3 That time, he also left from the right and entered from the left. What was the first time something went wrong?',
    );
    // The fix question does not exist until the deviation is right.
    expect(screen.queryByTestId('jtw-c3p6-fix')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Page 1 → Page 2: He left on the right side of the coast of Flower-Fruit Mountain, but appeared again on the right side of the middle of the sea/i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Change the exit position of Page 1: let him not go so far, stop on the left and then leave\./i,
      }),
    );
    expect(screen.getByTestId('jtw-c3p6-fix')).toHaveTextContent(
      "Changing Page 1's exit position changes two things: how far he walked on the first page, and the story itself on the first page (he had to walk to the shore to get on the raft). And the starting point of the next page is still wrong - he still appears on the right. Just change the starting point of Page 2, one place is enough.",
    );
    expect(screen.getByTestId('jtw-c3p6-open-studio')).toBeDisabled();
  });

  it.each([
    ['starry', 'blocks_jtw_c3_p6_starry'],
    ['morning', 'blocks_jtw_c3_p6_morning'],
  ])('seeds the %s branch carried forward from C3-P5', async (version, template) => {
    fetchProgress.mockResolvedValue(progressAfterC3P5(version as JtwC3Weather));
    mockBuild(null, JTW_C3_P6_WRONG_START_CELL, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute('data-build-state', 'none'),
    );
    await throughTheDebugLoop();
    fireEvent.click(screen.getByTestId('jtw-c3p6-open-studio'));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        title: 'Journey to the West · Raft jumped position',
        template,
      }),
    );
    expect(await screen.findByTestId('studio-stub')).toBeInTheDocument();
  });

  it('never guesses a sea when C3-P5 stored no version', async () => {
    fetchProgress.mockResolvedValue(progressAfterC3P5(null));
    mockBuild(null, JTW_C3_P6_WRONG_START_CELL, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    expect(screen.getByTestId('jtw-c3p6-no-version')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute('data-version', '');
    expect(screen.getByTestId('jtw-c3p6-bug-run-button')).toBeDisabled();
  });

  it('keeps the rerun locked while the saved project is still the bug', async () => {
    mockBuild('starry', JTW_C3_P6_WRONG_START_CELL, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p6-run-button')).toBeDisabled();
    expect(screen.getByTestId('jtw-c3p6-diff')).toHaveTextContent(
      'No positions have been changed yet.',
    );
    await throughTheDebugLoop();
    expect(screen.getByTestId('jtw-c3p6-continue')).toBeDisabled();
  });

  it('keeps the rerun locked when the start is right but the studio never ran it', async () => {
    mockBuild('starry', JTW_C3_P6_TARGET_START_CELL, false);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p6-run-button')).toBeDisabled();
  });

  it('keeps the repair open when a SECOND thing was changed as well', async () => {
    mockBuild('starry', JTW_C3_P6_TARGET_START_CELL, true, (project) => {
      const depart = project.pages[0].characters
        .find((actor) => actor.id === JTW_C3_MONKEY_KING_ID)!
        .scripts.find((script) => script.id === JTW_C3_P6_SCRIPT_IDS.depart)!;
      depart.blocks = depart.blocks.map((block) =>
        block.op === 'move_right' ? { op: 'move_right', n: 2 } : block,
      );
    });
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p6-run-button')).toBeDisabled();
  });

  it('keeps the repair open when only the monkey king was dragged off the raft', async () => {
    mockBuild('starry', JTW_C3_P6_WRONG_START_CELL, true, (project) => {
      const monkey = project.pages[1].characters.find(
        (actor) => actor.id === JTW_C3_MONKEY_KING_ID,
      )!;
      monkey.start.gx = JTW_C3_P6_TARGET_START_CELL.gx;
      monkey.start.gy = JTW_C3_P6_TARGET_START_CELL.gy;
    });
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute(
        'data-build-state',
        'in_progress',
      ),
    );
    expect(screen.getByTestId('jtw-c3p6-diff')).toHaveTextContent(
      'No positions have been changed yet.',
    );
    expect(screen.getByTestId('jtw-c3p6-run-button')).toBeDisabled();
  });

  it('reads ONE position row back off the saved document', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute('data-build-state', 'done'),
    );
    const rows = screen.getByTestId('jtw-c3p6-diff').querySelectorAll('li');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute('data-row', 'page2-start:16-8->2-8');
  });

  it('measures the repaired run, opens the peer questions and completes', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-build')).toHaveAttribute('data-build-state', 'done'),
    );
    await throughTheDebugLoop();

    // 同伴 questions cannot exist before the repaired run is measured.
    expect(screen.queryByTestId('jtw-c3p6-peer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('jtw-c3p6-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-run')).toHaveAttribute('data-reached', '1'),
    );
    const rows = screen.getByTestId('jtw-c3p6-fix-boundaries').querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-enter', '2-8');
    expect(rows[0]).toHaveAttribute('data-continuous', '1');
    expect(rows[1]).toHaveAttribute('data-continuous', '1');
    expect(screen.getByTestId('jtw-c3p6-fix-boundaries-panel')).toHaveAttribute(
      'data-trace',
      '1-2-3',
    );

    // The peer answers are judged; a wrong one keeps continue shut.
    pickPeer('from', /Coming out from the right, you can’t tell where the previous page is\./i);
    pickPeer('to', /Continue to the right and go to the forest on the other side/i);
    expect(screen.getByTestId('jtw-c3p6-continue')).toBeDisabled();
    pickPeer(
      'from',
      /Coming in from the left - the shore with the peach trees on the previous page/i,
    );
    expect(screen.getByTestId('jtw-c3p6-peer')).toHaveAttribute('data-correct', '1');

    // 远行印 is C3-P8's aggregation — this page draws no seal, and says so.
    expect(screen.getByTestId('jtw-c3p6-seal-note')).toHaveTextContent(
      /travel seal has not been lit yet/i,
    );

    fireEvent.click(screen.getByTestId('jtw-c3p6-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const [, partId, evidence] = completePart.mock.calls[0];
    expect(partId).toBe('jtw-s1-c3-p6');
    const selections = evidence.selections as Record<string, string[]>;
    expect(selections.expectation).toEqual(['expect-left-entry']);
    expect(selections.bug_boundaries[0]).toBe('page1->page2:7-9:16-8:break');
    expect(selections.bug_footprints[1]).toBe('page2:16-8->19-8:page3');
    expect(selections.first_break).toEqual(['break-page1-to-page2']);
    expect(selections.fix_choice).toEqual(['fix-page2-start']);
    expect(selections.position_diff).toEqual(['page2-start:16-8->2-8']);
    expect(selections.build_project).toEqual(['proj_jtw_jump']);
    expect(selections.weather_version).toEqual(['starry']);
    expect(selections.run_boundaries).toEqual([
      'page1->page2:7-9:2-8:ok',
      'page2->page3:6-8:2-9:ok',
    ]);
    expect(selections.page_trace).toEqual(['1', '2', '3']);
    expect(selections.run_stop).toEqual(['end']);
    expect(selections.exit_page).toEqual(['3']);
    expect(selections.peer_continuity).toEqual(['from:from-left-shore', 'to:to-right-far-shore']);
    expect(selections.saved_version).toBeUndefined();
    expect(await screen.findByTestId('jtw-map-stub')).toBeInTheDocument();
  });

  it('restores the saved evidence after a refresh, dropping malformed rows', async () => {
    const saved = progressAfterC3P5('starry');
    saved.completed.push({
      part_id: 'jtw-s1-c3-p6',
      completed_at: '2026-07-27T07:00:00.000Z',
      evidence: {
        schema_version: 1,
        selections: {
          story_screens: ['part-6-the-raft-jumped', 'part-6-the-invisible-line'],
          expectation: ['expect-left-entry'],
          bug_boundaries: ['page1->page2:7-9:16-8:break', 'garbage'],
          first_break: ['break-page1-to-page2'],
          fix_choice: ['fix-page2-start'],
          position_diff: ['page2-start:16-8->2-8'],
          run_boundaries: ['page1->page2:7-9:2-8:ok', 'page2->page3:6-8:2-9:ok'],
          page_trace: ['1', '2', '3'],
          peer_continuity: ['from:from-left-shore', 'to:to-right-far-shore', 'nonsense'],
        },
      },
    } as never);
    fetchProgress.mockResolvedValue(saved);
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-run')).toHaveAttribute('data-reached', '1'),
    );
    // The malformed boundary row is dropped, never guessed.
    expect(screen.getByTestId('jtw-c3p6-bug-boundaries').querySelectorAll('li')).toHaveLength(1);
    expect(screen.getByTestId('jtw-c3p6-peer')).toHaveAttribute('data-correct', '1');
    expect(screen.getByTestId('jtw-c3p6-resolved')).toHaveTextContent(
      'The borders of the three pages are connected into an unbroken direction line.',
    );
    expect(screen.getByTestId('jtw-c3p6-continue')).toBeEnabled();
  });

  it('paints the chosen sea on the middle page of both stages', async () => {
    fetchProgress.mockResolvedValue(progressAfterC3P5('starry'));
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    fireEvent.click(
      screen.getByRole('button', {
        name: /After leaving the right side of the previous page, he should enter from the left side of the next page - he kept walking to the right until the road connected\./i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-c3p6-bug-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-bug-run')).toHaveAttribute('data-ran', '1'),
    );
    // The raft is a real stage actor on the last page the run left open.
    expect(screen.getByTestId('jtw-c3p6-bug-raft')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p6-bug-monkey-king')).toHaveAttribute('data-size', '3');
  });

  it('keeps the raft and the monkey king on the same Page 2 cell while running', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c3-p6');
    fireEvent.click(
      screen.getByRole('button', {
        name: /After leaving the right side of the previous page, he should enter from the left side of the next page - he kept walking to the right until the road connected\./i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-c3p6-bug-run-button'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c3p6-bug-run')).toHaveAttribute('data-ran', '1'),
    );
    const monkey = screen.getByTestId('jtw-c3p6-bug-monkey-king');
    const raft = screen.getByTestId('jtw-c3p6-bug-raft');
    expect(monkey.getAttribute('data-gx')).toBe(raft.getAttribute('data-gx'));
    expect(monkey.getAttribute('data-gy')).toBe(raft.getAttribute('data-gy'));
    expect(screen.getByTestId(`jtw-c3p6-bug-${JTW_C3_RAFT_ID}`)).toBe(raft);
  });
});
