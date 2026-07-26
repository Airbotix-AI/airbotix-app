// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlocksProject } from '../blocksModel';
import * as blocksApi from '../blocksApi';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';
import { JourneyWestC2Part6Page } from './JourneyWestC2Part6Page';

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

const P5_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [
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
  ].map((partId) => ({ part_id: partId, completed_at: '2026-07-26T10:00:00Z', evidence: {} })),
  unlocked_part_ids: [
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
  ],
};

const FIXED_PROJECT: BlocksProject = {
  version: 1,
  name: 'P6 fixed',
  lessonId: 'jtw-s1-c2-p6',
  pages: [
    {
      id: 'jtw-c2-p6-return-page',
      background: 'jtw-s1-c2-actor-free-base',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          start: { gx: 6, gy: 7, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-return-debug',
              blocks: [
                { op: 'when_flag' },
                { op: 'move_left', n: 2 },
                { op: 'move_down', n: 1 },
                { op: 'move_left', n: 2 },
                { op: 'end' },
              ],
            },
          ],
        },
        {
          id: 'waiting-monkeys',
          name: 'Waiting friends',
          emoji: '🐒🐒',
          start: { gx: 2, gy: 8, size: 2, rot: 0 },
          scripts: [],
        },
      ],
    },
    {
      id: 'jtw-c2-p6-outbound-proof',
      background: 'jtw-s1-c2-actor-free-base',
      characters: [
        {
          id: 'stone-monkey-outbound-proof',
          name: 'Outbound proof',
          emoji: '🐵',
          start: { gx: 2, gy: 8, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-route-to-curtain',
              blocks: [
                { op: 'when_flag' },
                { op: 'move_right', n: 1 },
                { op: 'move_right', n: 1 },
                { op: 'move_up', n: 1 },
                { op: 'move_right', n: 1 },
                { op: 'move_right', n: 1 },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function renderPage(progress = P5_DONE) {
  fetchProgress.mockResolvedValue(progress);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p6']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC2Part6Page previewSleep={() => Promise.resolve()} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  listProjects.mockResolvedValue([
    { id: 'p6-project', title: 'P6', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    project: FIXED_PROJECT,
    version: 3,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c2-p6': { completedAt: '2026-07-26T10:30:00Z' } },
    },
    otherFiles: [],
  } as never);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c2-p6',
    completed_at: '2026-07-26T11:00:00Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC2Part6Page', () => {
  it('keeps P6 locked until server progress unlocks it', async () => {
    renderPage({ ...P5_DONE, unlocked_part_ids: P5_DONE.unlocked_part_ids.slice(0, -1) });
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-locked')).toBeInTheDocument());
  });

  it('requires bug run, first deviation, exact saved fix, evidence, and persists all five segments', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p6')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /先向下到 4-8/ }));
    fireEvent.click(screen.getByRole('button', { name: '运行错误路线' }));
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-bug-trace')).toHaveTextContent('2-7'));
    fireEvent.click(screen.getByRole('button', { name: /第二段停在 2-7/ }));
    fireEvent.click(screen.getByRole('button', { name: /只交换第二个 Left 2/ }));
    await waitFor(() => expect(screen.getByTestId('jtw-c2p6-build-done')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /石桥让伙伴/ }));
    fireEvent.click(screen.getByRole('button', { name: /干爽地面/ }));
    fireEvent.click(screen.getByRole('button', { name: /清水是适合/ }));
    expect(screen.getByTestId('jtw-c2p6-story-after')).toHaveTextContent('6-7 → 4-7 → 4-8 → 2-8');
    fireEvent.click(screen.getByRole('button', { name: '把路线变成大家的路' }));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c2-p6',
      expect.objectContaining({
        prediction: 'down-after-first-left',
        selections: expect.objectContaining({
          actual_stop: ['second-stop-2-7'],
          first_deviation: ['swap-middle-targets'],
          project_diff: ['move_down:4->3', 'move_left:3->4'],
          fixed_run: ['return-6-7-to-2-8-via-4-7-and-4-8'],
          build_project: ['p6-project'],
        }),
      }),
    );
    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument());
  });
});
