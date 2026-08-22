// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject } from '../blocksModel';
import { JourneyWestPart8Page } from './JourneyWestPart8Page';
import { C1_P8_STORY_BEFORE } from './journeyWestSeason1';
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
const GREETING = 'Hello, can I come over?';
const CARD_LABELS = [
  '🔔 Immortal Stone Movement',
  'Stone monkey appears',
  '👀 Partner sees',
  '💬 Hello for the first time',
  '🌊 Hear the sound of water',
];

const P7_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [
    'jtw-s1-c1-p1',
    'jtw-s1-c1-p2',
    'jtw-s1-c1-p3',
    'jtw-s1-c1-p4',
    'jtw-s1-c1-p5',
    'jtw-s1-c1-p6',
    'jtw-s1-c1-p7',
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
    'jtw-s1-c1-p8',
  ],
  chapter_seals: [
    {
      seal_id: 'jtw-s1-c1-birth-seal',
      chapter_code: 'C1',
      lit: false,
      missing: ['part:jtw-s1-c1-p8', 'evidence:jtw-s1-c1-p8.retell_links'],
    },
  ],
};

/** The server state AFTER the retell persists: P8 complete + seal lit. */
const P8_DONE_LIT: StoryLineProgress = {
  ...P7_DONE,
  completed: [
    ...P7_DONE.completed,
    {
      part_id: 'jtw-s1-c1-p8',
      completed_at: '2026-07-25T09:00:00.000Z',
      evidence: {
        schema_version: 1,
        selections: {
          motive: ['accepted-then-observe'],
          cause_card_order: [
            'stone-stir',
            'monkey-appears',
            'partners-see',
            'first-hello',
            'hear-water',
          ],
          retell_links: ['linked-four-nodes'],
        },
      },
    },
  ],
  unlocked_part_ids: [...P7_DONE.unlocked_part_ids, 'jtw-s1-c2-p1'],
  chapter_seals: [{ seal_id: 'jtw-s1-c1-birth-seal', chapter_code: 'C1', lit: true, missing: [] }],
};

const SAVED_P7_CHAIN: Block[] = [
  { op: 'when_flag' },
  { op: 'hide' },
  { op: 'play_sound', n: 2 },
  { op: 'show' },
  { op: 'hop', n: 2 },
  { op: 'grow', n: 2 },
  { op: 'say', text: GREETING },
  { op: 'end' },
];

function savedP7Project(blocks: Block[]): BlocksProject {
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

function mockSavedWork(blocks: Block[] = SAVED_P7_CHAIN, savedVersion = 6) {
  listProjects.mockResolvedValue([
    {
      id: 'proj_p7',
      title: 'Journey to the West · My Stone Monkey Appears',
      kind: 'blocks',
      status: 'active',
    },
  ]);
  loadProject.mockResolvedValue({
    project: savedP7Project(blocks),
    version: savedVersion,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c1-p7': { completedAt: '2026-07-25T08:00:00.000Z' } },
    },
    otherFiles: [],
  } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p8']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestPart8Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Tap the five cause cards into story order. */
function orderCards() {
  for (const label of CARD_LABELS) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
  }
}

async function runSavedWork() {
  fireEvent.click(screen.getByTestId('jtw-p8-run'));
  await waitFor(() => expect(screen.getByTestId('jtw-p8-stage').dataset.runState).toBe('done'));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P7_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p8',
    completed_at: '2026-07-25T09:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPart8Page · C1-P8 New partner heard the sound of water', () => {
  it('blocks kids who have not finished P7 (server unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...P7_DONE,
      completed: P7_DONE.completed.slice(0, 6),
      unlocked_part_ids: P7_DONE.unlocked_part_ids.slice(0, 7),
    });
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p8-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c1-p8')).not.toBeInTheDocument();
  });

  it('ships the full story text and gates the run behind the five ordered cause cards', async () => {
    mockSavedWork();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p8')).toBeInTheDocument());
    expect(screen.getByText(C1_P8_STORY_BEFORE)).toBeInTheDocument();
    expect(screen.getByTestId('jtw-p8-story')).toHaveTextContent(
      'The original work is still only up to the first chapter: the fairy stone gave birth to the stone monkey, and he just met Flower-Fruit Mountain. Water Curtain Cave is just a clue to the next chapter - no one has passed through the water curtain yet.',
    );
    await waitFor(() =>
      expect(screen.getByTestId('jtw-p8-saved-chain').querySelectorAll('.bsx-block')).toHaveLength(
        8,
      ),
    );
    // Cards not ordered yet → the run stays disabled; no retell, no seal button.
    expect(screen.getByTestId('jtw-p8-run')).toBeDisabled();
    expect(screen.queryByTestId('jtw-p8-retell')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-p8-light-seal')).toBeDisabled();

    // A wrong order (hello before appearing) does not unlock the run either.
    fireEvent.click(screen.getByRole('button', { name: /💬 Hello for the first time/i }));
    fireEvent.click(screen.getByRole('button', { name: /🔔 Immortal Stone Movement/i }));
    expect(screen.getByTestId('jtw-p8-run')).toBeDisabled();
  });

  it('with no saved P7 work the page points back to Part 7 and cannot complete', async () => {
    listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p8')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('jtw-p8-work-missing')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-p8-run')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-p8-light-seal')).toBeDisabled();
  });

  it('REALLY runs the saved P7 work Start → End (greeting bubble from the saved Say)', async () => {
    mockSavedWork();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p8')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('jtw-p8-run')).toBeInTheDocument());
    orderCards();
    expect(screen.getByTestId('jtw-p8-run')).toBeEnabled();
    await runSavedWork();
    // The saved chain executed for real: the child's own greeting was said and
    // the monkey ended visible.
    expect(screen.getByTestId('jtw-p8-heard')).toHaveTextContent(GREETING);
    expect(screen.getByTestId('jtw-p8-stone-monkey').dataset.visible).toBe('true');
    expect(screen.getByTestId('jtw-p8-retell')).toBeInTheDocument();
  });

  it('a block-name recital retell gets the four-node retry hint and never resolves', async () => {
    mockSavedWork();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p8')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('jtw-p8-run')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', {
        name: /Because his partner accepted him, they walked together; and because the sound of water kept making, he decided to observe the route first\./i,
      }),
    );
    orderCards();
    await runSavedWork();
    fireEvent.click(
      screen.getByRole('button', {
        name: /Chime, Show, Hop, Say, End - read the names of the building blocks in order/i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Just saying the name of the building block or even two things is not enough - use "because-so-result-later" to connect at least four nodes of the movement of the fairy stone, the appearance of the stone monkey, the sight of the partner, the first greeting, and the sound of the water.',
    );
    expect(screen.getByTestId('jtw-p8-light-seal')).toBeDisabled();
  });

  it('persists the retell evidence, then lights the seal ONLY from the server aggregation', async () => {
    mockSavedWork();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p8')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('jtw-p8-run')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', {
        name: /Because his partner accepted him, they walked together; and because the sound of water kept making, he decided to observe the route first\./i,
      }),
    );
    orderCards();
    await runSavedWork();
    fireEvent.click(
      screen.getByRole('button', {
        name: /Because the fairy stone made a noise, the stone monkey first let everyone see him\. As a result, his friends understood his movements, greeted him, and accepted him\. Later, everyone heard the sound of water\./i,
      }),
    );
    // Before the server confirms, no seal exists on the page at all.
    expect(screen.queryByTestId('jtw-p8-seal')).not.toBeInTheDocument();

    // The refetch after completion returns the SERVER-aggregated lit seal.
    fetchProgress.mockResolvedValue(P8_DONE_LIT);
    fireEvent.click(screen.getByTestId('jtw-p8-light-seal'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p8', {
      schema_version: 1,
      selections: {
        motive: ['accepted-then-observe'],
        cause_card_order: [
          'stone-stir',
          'monkey-appears',
          'partners-see',
          'first-hello',
          'hear-water',
        ],
        retell_links: ['linked-four-nodes'],
        full_run: ['start-to-end'],
        run_project: ['proj_p7'],
        run_saved_version: ['v6'],
      },
      prediction: 'linked-four-nodes',
    });

    // The lit seal + both continue choices appear; the page does NOT
    // auto-navigate into C2 (or anywhere else).
    await waitFor(() => expect(screen.getByTestId('jtw-p8-seal')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p8-seal').dataset.lit).toBe('true');
    expect(screen.getByTestId('jtw-p8-seal')).toHaveTextContent('birth seal');
    expect(screen.getByTestId('jtw-p8-seal')).toHaveTextContent(
      "I can put the story's actions in order.",
    );
    expect(screen.getByTestId('jtw-p8-resolved')).toHaveTextContent(
      'The perspective moves along the clear spring to the waterfall: the wet stones light up piece by piece, and tiny bright spots shine on the water curtain. No one automatically jumps to the next chapter.',
    );
    expect(screen.getByTestId('jtw-p8-continue-now')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-p8-continue-later')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-map-stub')).not.toBeInTheDocument();

    // 现在去看水帘 → the map (never straight into a C2 part page).
    fireEvent.click(screen.getByTestId('jtw-p8-continue-now'));
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('keeps the seal UNLIT when the server aggregation still reports missing evidence', async () => {
    mockSavedWork();
    fetchProgress.mockResolvedValue({
      ...P8_DONE_LIT,
      chapter_seals: [
        {
          seal_id: 'jtw-s1-c1-birth-seal',
          chapter_code: 'C1',
          lit: false,
          missing: ['evidence:jtw-s1-c1-p7.saved_version'],
        },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p8-seal')).toBeInTheDocument());
    // P8 itself is completed, but frontend state can never light the seal —
    // the server still reports a gap, so the celebration stays off.
    expect(screen.getByTestId('jtw-p8-seal').dataset.lit).toBe('false');
    expect(screen.getByTestId('jtw-p8-seal')).toHaveTextContent(
      'The Seal of Birth has not yet been revealed - this chapter is still missing in the server records',
    );
    expect(screen.getByTestId('jtw-p8-seal')).not.toHaveTextContent(
      "I can put the story's actions in order.",
    );
  });

  it('restores the saved retell evidence after a refresh', async () => {
    mockSavedWork();
    fetchProgress.mockResolvedValue(P8_DONE_LIT);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p8-seal')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p8-seal').dataset.lit).toBe('true');
    expect(
      screen.getByRole('button', {
        name: /Because the fairy stone made a noise, the stone monkey first let everyone see him\. As a result, his friends understood his movements, greeted him, and accepted him\. Later, everyone heard the sound of water\./i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('jtw-p8-continue-now')).toBeInTheDocument();
  });
});
