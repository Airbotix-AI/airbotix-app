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
  completed: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2', 'jtw-s1-c1-p3', 'jtw-s1-c1-p4', 'jtw-s1-c1-p5'].map(
    (partId) => ({
      part_id: partId,
      completed_at: '2026-07-25T04:00:00.000Z',
      evidence: {},
    }),
  ),
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
      ? [{ op: 'show' }, { op: 'hop', n: 1 }, { op: 'say', text: 'Hello, I just came here.' }]
      : [{ op: 'say', text: 'Hello, I just came here.' }, { op: 'hop', n: 1 }, { op: 'show' }];
  return {
    version: 1,
    name: 'Journey to the West · Fix out-of-order appearances',
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
    {
      id: 'proj_p6',
      title: 'Journey to the West · Fix out-of-order appearances',
      kind: 'blocks',
      status: 'active',
    },
  ]);
  loadProject.mockResolvedValue({
    project: debugProject(order),
    version: 5,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c1-p6': { completedAt: '2026-07-25T08:00:00.000Z' } }
        : {},
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
  fireEvent.click(
    screen.getByRole('button', {
      name: /Before actions and greetings - see the stone monkey first, jump and say hello before anyone understands/i,
    }),
  );
  fireEvent.click(screen.getByTestId('jtw-p6-run'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-p6-run')).toHaveTextContent('▶ Repeat it again'),
  );
  fireEvent.click(screen.getByRole('button', { name: /I heard "Hello" first/i }));
  fireEvent.click(
    screen.getByRole('button', { name: /💬 Say——The voice rang, but no one showed up yet/i }),
  );
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

describe('JourneyWestPart6Page · C1-P6 Why does the sound come from the sky?', () => {
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
    expect(C1_P6_BUG_CHAIN[3].text).toBe('Hello, I just came here.');
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
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p6-run')).toHaveTextContent('▶ Repeat it again'),
    );
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

    fireEvent.click(
      screen.getByRole('button', { name: /🦘 Hop——the moment when the blades of grass shake/i }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      "Follow the trajectory from left to right to find the earliest one: when Say sounds, Show has not happened yet - which part is the first one that you can't understand?",
    );
    fireEvent.click(
      screen.getByRole('button', { name: /💬 Say——The voice rang, but no one showed up yet/i }),
    );
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
    fireEvent.click(
      screen.getByRole('button', {
        name: /Just move Show before Hop and Say - let the Stone Monkey show up first/i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /The group of monkeys first saw the stone monkey, then saw him jumping, and finally heard the greeting clearly/i,
      }),
    );
    expect(screen.getByTestId('jtw-p6-resolved')).toHaveTextContent(
      'After the restoration, a group of monkeys fully emerged from behind the tree.',
    );
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
    expect(
      screen.getByRole('button', {
        name: /Before actions and greetings - see the stone monkey first, jump and say hello before anyone understands/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /💬 Say——The voice rang, but no one showed up yet/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('jtw-p6-continue')).toBeEnabled();
  });
});
