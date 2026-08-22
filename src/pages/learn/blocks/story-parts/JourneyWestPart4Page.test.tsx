// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlocksProject } from '../blocksModel';
import { JourneyWestPart4Page } from './JourneyWestPart4Page';
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

const P3_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [
    { part_id: 'jtw-s1-c1-p1', completed_at: '2026-07-24T04:00:00.000Z', evidence: {} },
    { part_id: 'jtw-s1-c1-p2', completed_at: '2026-07-25T04:00:00.000Z', evidence: {} },
    { part_id: 'jtw-s1-c1-p3', completed_at: '2026-07-25T05:00:00.000Z', evidence: {} },
  ],
  unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2', 'jtw-s1-c1-p3', 'jtw-s1-c1-p4'],
};

/** A saved build project. `middle` is what the child placed between hide and end. */
function buildProject(middle: Array<{ op: string; n?: number; text?: string }>): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · Create a complete birth chain',
    lessonId: 'jtw-s1-c1-p4',
    pages: [
      {
        id: 'jtw-c1-p4-page',
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
                id: 'stone-monkey-arrival-build',
                blocks: [
                  { op: 'when_flag' },
                  { op: 'hide' },
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

const TARGET_MIDDLE = [
  { op: 'play_sound', n: 2 },
  { op: 'show' },
  { op: 'hop', n: 1 },
  { op: 'say', text: 'Hello, I just came here.' },
];

function mockBuild(
  middle: Array<{ op: string; n?: number; text?: string }> | null,
  runCompleted: boolean,
) {
  if (!middle) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    {
      id: 'proj_jtw_1',
      title: 'Journey to the West · Create a complete birth chain',
      kind: 'blocks',
      status: 'active',
    },
  ]);
  loadProject.mockResolvedValue({
    project: buildProject(middle),
    version: 3,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: runCompleted
        ? { 'jtw-s1-c1-p4': { completedAt: '2026-07-25T06:00:00.000Z' } }
        : {},
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p4']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestPart4Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          <Route path="/learn/blocks/:projectId" element={<div data-testid="studio-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function answerQuestions() {
  for (const [blockId, meaning] of [
    ['chime', 'A reminder that there is movement in the fairy stone'],
    ['show', 'The protagonist appears and is seen by everyone'],
    ['hop', 'first action'],
    ['say', 'Contacting a partner for the first time'],
  ] as const) {
    const row = within(screen.getByTestId(`jtw-p4-meaning-${blockId}`));
    fireEvent.click(row.getByRole('button', { name: meaning }));
  }
  fireEvent.click(
    screen.getByRole('button', {
      name: /👀 Show - appear first, actions and greetings will be seen later/i,
    }),
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P3_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p4',
    completed_at: '2026-07-25T07:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPart4Page · C1-P4 creates a complete birth chain', () => {
  it('blocks kids who have not finished P3', async () => {
    fetchProgress.mockResolvedValue({
      ...P3_DONE,
      completed: P3_DONE.completed.slice(0, 2),
      unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2', 'jtw-s1-c1-p3'],
    });
    mockBuild(null, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p4-locked')).toBeInTheDocument());
  });

  it('starts a REAL blocks project from the template when none exists', async () => {
    mockBuild(null, false);
    createProject.mockResolvedValue({ id: 'proj_new' });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p4-open-studio')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p4-build').dataset.buildState).toBe('none');

    fireEvent.click(screen.getByTestId('jtw-p4-open-studio'));
    await waitFor(() => expect(screen.getByTestId('studio-stub')).toBeInTheDocument());
    expect(createProject).toHaveBeenCalledWith({
      title: 'Journey to the West · Create a complete birth chain',
      template: 'blocks_jtw_c1_p4',
    });
  });

  it('a distractor chain (Grow instead of Show) is NOT accepted as done', async () => {
    mockBuild(
      [
        { op: 'play_sound', n: 2 },
        { op: 'grow', n: 2 },
        { op: 'hop', n: 1 },
        { op: 'say', text: 'Hello, I just came here.' },
      ],
      true, // even with a recorded run, the saved program itself must match
    );
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p4-build')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p4-build').dataset.buildState).toBe('in_progress'),
    );

    answerQuestions();
    expect(screen.getByTestId('jtw-p4-continue')).toBeDisabled();
  });

  it('a matching build without a finished run+save is not done either', async () => {
    mockBuild(TARGET_MIDDLE, false);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p4-build')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p4-build').dataset.buildState).toBe('in_progress'),
    );
    answerQuestions();
    expect(screen.getByTestId('jtw-p4-continue')).toBeDisabled();
  });

  it('exact target build + finished run unlocks continue and persists the evidence', async () => {
    mockBuild(TARGET_MIDDLE, true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p4-build-done')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p4-continue')).toBeDisabled(); // Q&A pending

    answerQuestions();
    expect(screen.getByTestId('jtw-p4-resolved')).toHaveTextContent('fairy stone lights up');
    fireEvent.click(screen.getByTestId('jtw-p4-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p4', {
      schema_version: 1,
      selections: {
        meaning_chime: ['stone-stir'],
        meaning_show: ['hero-appears'],
        meaning_hop: ['first-action'],
        meaning_say: ['first-contact'],
        build_project: ['proj_jtw_1'],
      },
      prediction: 'show-first',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });
});
