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
  { op: 'say', text: 'Hello, can I come over?' },
  { op: 'end' },
];

function personalProject(blocks: Block[]): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · My Stone Monkey Appears',
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
    {
      id: 'proj_p7',
      title: 'Journey to the West · My Stone Monkey Appears',
      kind: 'blocks',
      status: 'active',
    },
  ]);
  loadProject.mockResolvedValue({
    project: personalProject(blocks),
    version: savedVersion,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c1-p7': { completedAt: '2026-07-25T08:00:00.000Z' } }
        : {},
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
  fireEvent.click(
    screen.getByRole('button', {
      name: /Want to express your curiosity, friendliness or energy clearly so that your partner can truly understand/i,
    }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /Because these two actions can help my partners see the character I want to express\./i,
    }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /I saved and closed the work, and when I reopened it, the building blocks were the same, and the appearance was still the same when I re-ran it\./i,
    }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /Fairy Stone Tips → Stone Monkey Appears → Two Actions → Greeting → End/i,
    }),
  );
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

describe('JourneyWestPart7Page · C1-P7 My Stone Monkey Appears', () => {
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
      'The group of monkeys formed a wide semicircle, leaving the center of the stone platform for their new companions.',
    );
    expect(screen.getByTestId('jtw-p7-story')).toHaveTextContent(
      'Shi Hou was not happy about getting the ribbon, but that his first story was not lost',
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
    expect(design).toHaveTextContent(/jump 2/i);
    expect(design).toHaveTextContent(/Wait 2/i);
    expect(design).toHaveTextContent(/Get bigger 2/i);
    expect(design).toHaveTextContent('Hello, can I come over?');
    expect(screen.getByTestId('jtw-p7-build').dataset.savedVersion).toBe('6');
    answerAll();
    expect(screen.getByTestId('jtw-p7-resolved')).toHaveTextContent(
      'The stone monkey made his own appearance, and the group of monkeys responded enthusiastically and invited him to explore Flower-Fruit Mountain together.',
    );
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
      { op: 'say', text: 'Hello, I just came here.' },
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
    fireEvent.click(
      screen.getByRole('button', {
        name: /Want to express your curiosity, friendliness or energy clearly so that your partner can truly understand/i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Because these two actions can help my partners see the character I want to express\./i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /I didn't close it and reopen it\. I came here directly after finishing the ride\./i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Fairy Stone Tips → Stone Monkey Appears → Two Actions → Greeting → End/i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Go back to the workspace and save, close the work, reopen it, and run it again - the first time the work is not lost, it is truly completed.',
    );
    expect(screen.getByTestId('jtw-p7-continue')).toBeDisabled();
  });

  it('a wrong peer retell gets the stage-grounded retry hint', async () => {
    mockBuild(MY_DESIGN);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p7-build-done')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', {
        name: /First I heard the greeting, then saw the stone monkey appear/i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ask your partner to look at the stage again: What comes first? How many actions did the stone monkey make after it appeared? Greetings at what time?',
    );
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
        greeting: ['Hello, can I come over?'],
        build_project: ['proj_p7'],
        saved_version: ['v6'],
      },
      prediction: 'retell-full-order',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });
});
