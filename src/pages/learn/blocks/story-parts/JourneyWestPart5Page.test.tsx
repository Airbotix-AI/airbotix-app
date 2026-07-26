// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlocksProject } from '../blocksModel';
import { JourneyWestPart5Page } from './JourneyWestPart5Page';
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

const P4_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2', 'jtw-s1-c1-p3', 'jtw-s1-c1-p4'].map((partId) => ({
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
  ],
};

function greetingProject(order: 'hop-first' | 'say-first'): BlocksProject {
  const hop = { op: 'hop', n: 1 };
  const say = { op: 'say', text: '你们好，我可以过来吗？' };
  const middle = order === 'hop-first' ? [hop, say] : [say, hop];
  return {
    version: 1,
    name: '西游记 · 我的第一次问候',
    lessonId: 'jtw-s1-c1-p5',
    pages: [
      {
        id: 'jtw-c1-p5-page',
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
                id: 'stone-monkey-first-greeting',
                blocks: [
                  { op: 'when_flag' },
                  { op: 'hide' },
                  { op: 'play_sound', n: 2 },
                  { op: 'show' },
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

function mockBuild(order: 'hop-first' | 'say-first', runCompleted = true) {
  listProjects.mockResolvedValue([
    { id: 'proj_p5', title: '西游记 · 我的第一次问候', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    project: greetingProject(order),
    version: 4,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted ? { 'jtw-s1-c1-p5': { completedAt: '2026-07-25T08:00:00.000Z' } } : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p5']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestPart5Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P4_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p5',
    completed_at: '2026-07-25T08:30:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPart5Page · C1-P5 两种真诚的问候', () => {
  it('blocks kids who have not finished P4', async () => {
    fetchProgress.mockResolvedValue({
      ...P4_DONE,
      completed: P4_DONE.completed.slice(0, 3),
      unlocked_part_ids: P4_DONE.unlocked_part_ids.slice(0, 4),
    });
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p5-locked')).toBeInTheDocument());
  });

  it('detects the kept HOP-FIRST version and matches sentence + response to it', async () => {
    mockBuild('hop-first');
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p5-build-done')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p5-build').dataset.keptVersion).toBe('hop-first');
    expect(screen.getByText(/「先跳再问好」/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /选择让伙伴先感到他的活力/ }));
    fireEvent.click(screen.getByRole('button', { name: /我把两种顺序都运行过/ }));
    fireEvent.click(screen.getByRole('button', { name: /先跳一下，所以伙伴先觉得他充满活力/ }));

    // The monkeys' response follows the kept version.
    expect(screen.getByTestId('jtw-p5-resolved')).toHaveTextContent('先被石猴的活力吸引');
    expect(screen.getByTestId('jtw-p5-continue')).toBeEnabled();
  });

  it('detects the kept SAY-FIRST version with its own sentence set and response', async () => {
    mockBuild('say-first');
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p5-build-done')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p5-build').dataset.keptVersion).toBe('say-first');

    fireEvent.click(screen.getByRole('button', { name: /选择让伙伴先感到他的活力/ }));
    fireEvent.click(screen.getByRole('button', { name: /我把两种顺序都运行过/ }));
    // The hop-first sentence is NOT offered; the say-first one is.
    expect(
      screen.queryByRole('button', { name: /先跳一下，所以伙伴先觉得他充满活力/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /先轻声问好，所以伙伴先觉得他尊重大家/ }));

    expect(screen.getByTestId('jtw-p5-resolved')).toHaveTextContent('先感到被尊重');
    expect(screen.getByTestId('jtw-p5-continue')).toBeEnabled();
  });

  it('"only ran one version" keeps continue locked with a nudge to compare', async () => {
    mockBuild('hop-first');
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p5-build-done')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /选择让伙伴先感到他的活力/ }));
    fireEvent.click(screen.getByRole('button', { name: /我只运行了一版就直接选了/ }));
    fireEvent.click(screen.getByRole('button', { name: /先跳一下，所以伙伴先觉得他充满活力/ }));

    expect(screen.getByRole('status')).toHaveTextContent('比较过才算真的选择');
    expect(screen.getByTestId('jtw-p5-continue')).toBeDisabled();
  });

  it('a valid chain without the run marker stays incomplete', async () => {
    mockBuild('hop-first', false);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p5-build').dataset.buildState).toBe('in_progress'),
    );
    expect(screen.queryByTestId('jtw-p5-build-done')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-p5-continue')).toBeDisabled();
  });

  it('persists the kept version, greeting and reasons on continue', async () => {
    mockBuild('say-first');
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p5-build-done')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /选择让伙伴先感到他的活力/ }));
    fireEvent.click(screen.getByRole('button', { name: /我把两种顺序都运行过/ }));
    fireEvent.click(screen.getByRole('button', { name: /先轻声问好，所以伙伴先觉得他尊重大家/ }));
    fireEvent.click(screen.getByTestId('jtw-p5-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p5', {
      schema_version: 1,
      selections: {
        motive: ['energy-or-respect'],
        sentence: ['say-respect'],
        compared_both: ['ran-both'],
        kept_version: ['say-first'],
        greeting: ['你们好，我可以过来吗？'],
        build_project: ['proj_p5'],
      },
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });
});
