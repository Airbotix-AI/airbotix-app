// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject } from '../blocksModel';
import { JourneyWestPart7Page } from './JourneyWestPart7Page';
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

const P6_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [
    'jtw-s1-c1-p1',
    'jtw-s1-c1-p2',
    'jtw-s1-c1-p3',
    'jtw-s1-c1-p4',
    'jtw-s1-c1-p5',
    'jtw-s1-c1-p6',
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
    'jtw-s1-c1-p7',
  ],
};

const MY_DESIGN: Block[] = [
  { op: 'when_flag' },
  { op: 'hide' },
  { op: 'play_sound', n: 5 }, // 🦘 Boing — the child changed the sound
  { op: 'show' },
  { op: 'hop', n: 2 },
  { op: 'wait', n: 2 },
  { op: 'grow', n: 2 },
  { op: 'say', text: '你们好，我可以过来吗？' },
  { op: 'end' },
];

function personalProject(blocks: Block[]): BlocksProject {
  return {
    version: 1,
    name: '西游记 · 我的石猴亮相',
    lessonId: 'jtw-s1-c1-p7',
    pages: [
      {
        id: 'jtw-c1-p7-page',
        background: 'jtw-s1-c1-flower-fruit-stone',
        characters: [
          {
            id: 'stone-monkey',
            name: 'Stone Monkey',
            emoji: '🐵',
            asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
            start: { gx: 8, gy: 9, size: 3, rot: 0 },
            scripts: [{ id: 'stone-monkey-personal-arrival', blocks }],
          },
        ],
      },
    ],
  };
}

function mockBuild(blocks: Block[], runCompleted = true, savedVersion = 6) {
  listProjects.mockResolvedValue([
    { id: 'proj_p7', title: '西游记 · 我的石猴亮相', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    project: personalProject(blocks),
    version: savedVersion,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted ? { 'jtw-s1-c1-p7': { completedAt: '2026-07-25T08:00:00.000Z' } } : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p7']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestPart7Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Answer motive + reason + reopen + retell correctly. */
function answerAll() {
  fireEvent.click(screen.getByRole('button', { name: /想清楚表达自己的好奇、友善或活力/ }));
  fireEvent.click(screen.getByRole('button', { name: /能让伙伴看出我想表达的性格/ }));
  fireEvent.click(screen.getByRole('button', { name: /重新打开后积木一样/ }));
  fireEvent.click(screen.getByRole('button', { name: /仙石提示 → 石猴出现 → 两个动作/ }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P6_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p7',
    completed_at: '2026-07-25T08:30:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPart7Page · C1-P7 我的石猴亮相', () => {
  it('blocks kids who have not finished P6', async () => {
    fetchProgress.mockResolvedValue({
      ...P6_DONE,
      completed: P6_DONE.completed.slice(0, 5),
      unlocked_part_ids: P6_DONE.unlocked_part_ids.slice(0, 6),
    });
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p7-locked')).toBeInTheDocument());
  });

  it('ships the full story text and keeps continue locked before any build exists', async () => {
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p7')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p7-story')).toHaveTextContent(
      '群猴围成一个宽宽的半圆，把石台中央留给新伙伴',
    );
    expect(screen.getByTestId('jtw-p7-story')).toHaveTextContent(
      '石猴高兴的不是得到彩带，而是自己的第一次故事没有丢失',
    );
    await waitFor(() => expect(screen.getByTestId('jtw-p7-build').dataset.buildState).toBe('none'));
    // The evidence questions stay hidden until the real build is verified.
    expect(screen.queryByTestId('jtw-p7-reason')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-p7-continue')).toBeDisabled();
  });

  it('detects the SAVED personal design (sound, actions, wait, greeting) from the real project', async () => {
    mockBuild(MY_DESIGN);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p7-build-done')).toBeInTheDocument());
    const design = screen.getByTestId('jtw-p7-design');
    expect(design).toHaveTextContent('Boing');
    expect(design).toHaveTextContent('跳 2');
    expect(design).toHaveTextContent('等 2');
    expect(design).toHaveTextContent('变大 2');
    expect(design).toHaveTextContent('你们好，我可以过来吗？');
    expect(screen.getByTestId('jtw-p7-build').dataset.savedVersion).toBe('6');
    answerAll();
    expect(screen.getByTestId('jtw-p7-resolved')).toHaveTextContent('群猴热烈回应');
    expect(screen.getByTestId('jtw-p7-continue')).toBeEnabled();
  });

  it('a valid chain WITHOUT the studio run marker stays incomplete', async () => {
    mockBuild(MY_DESIGN, false);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p7-build').dataset.buildState).toBe('in_progress'),
    );
    expect(screen.queryByTestId('jtw-p7-build-done')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-p7-continue')).toBeDisabled();
  });

  it('a saved chain breaking the contract (one action only) is not accepted', async () => {
    mockBuild([
      { op: 'when_flag' },
      { op: 'hide' },
      { op: 'play_sound', n: 2 },
      { op: 'show' },
      { op: 'hop', n: 1 },
      { op: 'say', text: '你好，我刚刚来到这里。' },
      { op: 'end' },
    ]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p7-build').dataset.buildState).toBe('in_progress'),
    );
    expect(screen.getByTestId('jtw-p7-continue')).toBeDisabled();
  });

  it('"skipped the reopen" keeps continue locked with the save-reopen nudge', async () => {
    mockBuild(MY_DESIGN);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p7-build-done')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /想清楚表达自己的好奇、友善或活力/ }));
    fireEvent.click(screen.getByRole('button', { name: /能让伙伴看出我想表达的性格/ }));
    fireEvent.click(screen.getByRole('button', { name: /我没有关闭重开/ }));
    fireEvent.click(screen.getByRole('button', { name: /仙石提示 → 石猴出现 → 两个动作/ }));
    expect(screen.getByRole('status')).toHaveTextContent('关闭作品再重新打开');
    expect(screen.getByTestId('jtw-p7-continue')).toBeDisabled();
  });

  it('a wrong peer retell gets the stage-grounded retry hint', async () => {
    mockBuild(MY_DESIGN);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p7-build-done')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /先听见问候，再看见石猴出现/ }));
    expect(screen.getByRole('status')).toHaveTextContent('请同伴再只看一遍舞台');
    expect(screen.getByTestId('jtw-p7-continue')).toBeDisabled();
  });

  it('persists the REAL design, saved version id and answers on continue', async () => {
    mockBuild(MY_DESIGN);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p7-build-done')).toBeInTheDocument());
    answerAll();
    fireEvent.click(screen.getByTestId('jtw-p7-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p7', {
      schema_version: 1,
      selections: {
        motive: ['express-clearly'],
        choice_reason: ['reason-personality'],
        reopen_check: ['reopen-same'],
        peer_retell: ['retell-full-order'],
        design_sound: ['sound:5'],
        design_actions: ['hop:2', 'grow:2'],
        design_wait: ['wait:2'],
        greeting: ['你们好，我可以过来吗？'],
        build_project: ['proj_p7'],
        saved_version: ['v6'],
      },
      prediction: 'retell-full-order',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });
});
