// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlocksProject } from '../blocksModel';
import { JourneyWestPart6Page } from './JourneyWestPart6Page';
import { C1_P6_BUG_CHAIN, C1_P6_STORY_BEFORE } from './journeyWestSeason1';
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

const P5_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [
    'jtw-s1-c1-p1',
    'jtw-s1-c1-p2',
    'jtw-s1-c1-p3',
    'jtw-s1-c1-p4',
    'jtw-s1-c1-p5',
  ].map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-25T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [
    'jtw-s1-c1-p1',
    'jtw-s1-c1-p2',
    'jtw-s1-c1-p3',
    'jtw-s1-c1-p4',
    'jtw-s1-c1-p5',
    'jtw-s1-c1-p6',
  ],
};

function debugProject(order: 'fixed' | 'bug'): BlocksProject {
  const middle =
    order === 'fixed'
      ? [{ op: 'show' }, { op: 'hop', n: 1 }, { op: 'say', text: '你好，我刚刚来到这里。' }]
      : [{ op: 'say', text: '你好，我刚刚来到这里。' }, { op: 'hop', n: 1 }, { op: 'show' }];
  return {
    version: 1,
    name: '西游记 · 修好乱序的亮相',
    lessonId: 'jtw-s1-c1-p6',
    pages: [
      {
        id: 'jtw-c1-p6-page',
        background: 'jtw-s1-c1-flower-fruit-stone',
        characters: [
          {
            id: 'stone-monkey',
            name: 'Stone Monkey',
            emoji: '🐵',
            asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
            start: { gx: 8, gy: 9, size: 3, rot: 0 },
            scripts: [
              {
                id: 'stone-monkey-arrival-debug',
                blocks: [
                  { op: 'when_flag' },
                  { op: 'hide' },
                  { op: 'play_sound', n: 2 },
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

function mockBuild(order: 'fixed' | 'bug', runCompleted = true) {
  listProjects.mockResolvedValue([
    { id: 'proj_p6', title: '西游记 · 修好乱序的亮相', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    project: debugProject(order),
    version: 5,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted ? { 'jtw-s1-c1-p6': { completedAt: '2026-07-25T08:00:00.000Z' } } : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p6']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestPart6Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** expectation → bug run → actual → first deviation (the shared front half). */
async function walkToDeviation() {
  await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p6')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /在动作和问候之前/ }));
  fireEvent.click(screen.getByTestId('jtw-p6-run'));
  await waitFor(() => expect(screen.getByTestId('jtw-p6-run')).toHaveTextContent('再复现一次'));
  fireEvent.click(screen.getByRole('button', { name: /先听见「你好」/ }));
  fireEvent.click(screen.getByRole('button', { name: /Say——声音响了/ }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P5_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p6',
    completed_at: '2026-07-25T09:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPart6Page · C1-P6 声音怎么从空中来了', () => {
  it('defines the shipped bug as EXACTLY the contracted Say→Hop→Show chain', () => {
    expect(C1_P6_BUG_CHAIN.map((block) => block.op)).toEqual([
      'when_flag',
      'hide',
      'play_sound',
      'say',
      'hop',
      'show',
      'end',
    ]);
    expect(C1_P6_BUG_CHAIN[2].n).toBe(2); // 🔔 Chime — never swapped for another sound
    expect(C1_P6_BUG_CHAIN[3].text).toBe('你好，我刚刚来到这里。');
  });

  it('blocks kids who have not finished P5 (server-side unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...P5_DONE,
      completed: P5_DONE.completed.slice(0, 4),
      unlocked_part_ids: P5_DONE.unlocked_part_ids.slice(0, 5),
    });
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p6-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c1-p6')).not.toBeInTheDocument();
  });

  it('REALLY reproduces the bug: the greeting fires while the monkey is hidden', async () => {
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p6')).toBeInTheDocument());
    expect(screen.getByText(C1_P6_STORY_BEFORE)).toBeInTheDocument();
    expect(screen.getByTestId('jtw-p6-stage').dataset.voiceFromAir).toBe('false');

    fireEvent.click(screen.getByTestId('jtw-p6-run'));
    await waitFor(() => expect(screen.getByTestId('jtw-p6-run')).toHaveTextContent('再复现一次'));
    // The say happened before Show — the "voice from thin air" was observed.
    expect(screen.getByTestId('jtw-p6-stage').dataset.voiceFromAir).toBe('true');
    // Show still runs last, so the monkey ends visible.
    expect(screen.getByTestId('jtw-p6-stone-monkey').dataset.visible).toBe('true');
    expect(screen.getByTestId('jtw-p6-bug-chain').querySelectorAll('.bsx-block')).toHaveLength(7);
  });

  it('a wrong first-deviation pick gets the trace-grounded retry hint', async () => {
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p6')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('jtw-p6-run'));
    await waitFor(() => expect(screen.getByTestId('jtw-p6-deviation')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Hop——草叶摇动的那一下/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Say 响起时，Show 还没有发生');
    fireEvent.click(screen.getByRole('button', { name: /Say——声音响了/ }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('the shipped bug order saved as-is stays in_progress — only the repair passes', async () => {
    mockBuild('bug', false);
    renderPage();
    await walkToDeviation();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p6-build').dataset.buildState).toBe('in_progress'),
    );
    expect(screen.queryByTestId('jtw-p6-build-done')).not.toBeInTheDocument();
    // The fix/rerun explanation stays hidden and continue stays locked.
    expect(screen.queryByTestId('jtw-p6-fix')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-p6-continue')).toBeDisabled();
  });

  it('a repaired chain WITHOUT the studio run marker stays incomplete', async () => {
    mockBuild('fixed', false);
    renderPage();
    await walkToDeviation();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p6-build').dataset.buildState).toBe('in_progress'),
    );
    expect(screen.queryByTestId('jtw-p6-build-done')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-p6-continue')).toBeDisabled();
  });

  it('completes the five-segment explanation and persists the REAL project diff', async () => {
    mockBuild('fixed');
    renderPage();
    await walkToDeviation();
    await waitFor(() => expect(screen.getByTestId('jtw-p6-build-done')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p6-diff')).toHaveTextContent('show:6->4 · say:4->6');

    expect(screen.getByTestId('jtw-p6-continue')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /只把 Show 移到 Hop 和 Say 之前/ }));
    fireEvent.click(screen.getByRole('button', { name: /群猴先看见石猴，再看见他跳/ }));
    expect(screen.getByTestId('jtw-p6-resolved')).toHaveTextContent('一只群猴从树后完全走出来');
    fireEvent.click(screen.getByTestId('jtw-p6-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p6', {
      schema_version: 1,
      selections: {
        expectation: ['expect-show-first'],
        actual: ['actual-voice-from-air'],
        first_deviation: ['trace-say'],
        fix_move: ['move-show-front'],
        rerun_result: ['rerun-see-act-hear'],
        project_diff: ['show:6->4', 'say:4->6'],
        build_project: ['proj_p6'],
      },
      prediction: 'trace-say',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved five-segment explanation after a refresh (completed part)', async () => {
    mockBuild('fixed');
    fetchProgress.mockResolvedValue({
      ...P5_DONE,
      completed: [
        ...P5_DONE.completed,
        {
          part_id: 'jtw-s1-c1-p6',
          completed_at: '2026-07-25T09:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              expectation: ['expect-show-first'],
              actual: ['actual-voice-from-air'],
              first_deviation: ['trace-say'],
              fix_move: ['move-show-front'],
              rerun_result: ['rerun-see-act-hear'],
              project_diff: ['show:6->4', 'say:4->6'],
              build_project: ['proj_p6'],
            },
            prediction: 'trace-say',
          },
        },
      ],
      unlocked_part_ids: [...P5_DONE.unlocked_part_ids, 'jtw-s1-c1-p7'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-p6-resolved')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /在动作和问候之前/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Say——声音响了/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('jtw-p6-continue')).toBeEnabled();
  });
});
