// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block, BlocksProject, Page } from '../blocksModel';
import {
  JTW_C2_P7_EVIDENCE_LINES,
  JTW_C2_P7_SIDES,
  type JtwEntrySide,
} from '../jtwPersonalEntry';
import {
  JTW_C2_ACTOR_FREE_BACKGROUND,
  JTW_C2_CAVE_SPRITE,
  JTW_C2_CURTAIN_SPRITE,
  JTW_STONE_MONKEY_SPRITE,
} from '../jtwC2Stage';
import { JourneyWestC2Part8Page } from './JourneyWestC2Part8Page';
import { C2_P8_CAUSE_CARD_ORDER, C2_P8_SEAL_ID } from './journeyWestC2Part8Program';
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
const [LEFT, RIGHT] = JTW_C2_P7_SIDES;
const SAVED_VERSION = 9;
const PROJECT_ID = 'proj_jtw_entry';

const PRIOR_PART_IDS = [
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
  'jtw-s1-c2-p7',
];

const P7_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p8'],
  chapter_seals: [
    {
      seal_id: C2_P8_SEAL_ID,
      chapter_code: 'C2',
      lit: false,
      missing: ['part:jtw-s1-c2-p8'],
    },
  ],
};

/** The C2-P7 page the child really saved — this Part never builds its own. */
function entryPage(side: JtwEntrySide, options: { route?: readonly Block[] } = {}): Page {
  return {
    id: 'jtw-c2-p7-page',
    background: JTW_C2_ACTOR_FREE_BACKGROUND,
    characters: [
      {
        id: 'stone-monkey',
        name: 'Stone Monkey',
        emoji: '🐵',
        asset: JTW_STONE_MONKEY_SPRITE,
        start: { ...side.start, size: 3, rot: 0 },
        scripts: [
          {
            id: 'stone-monkey-personal-entry',
            blocks: [
              { op: 'when_flag' },
              ...(options.route ?? side.route),
              { op: 'wait', n: 2 },
              { op: 'end' },
            ],
          },
        ],
      },
      {
        id: 'water-curtain-trigger',
        name: 'Water Curtain',
        emoji: '🌊',
        asset: JTW_C2_CURTAIN_SPRITE,
        start: { gx: 7, gy: 7, size: 5, reach: 1, rot: 0, visible: true },
        scripts: [
          {
            id: 'water-curtain-open',
            blocks: [
              { op: 'when_bump' },
              { op: 'hide' },
              { op: 'play_sound', n: 2 },
              { op: 'end' },
            ],
          },
        ],
      },
      {
        id: 'cave-entrance',
        name: 'Cave Entrance',
        emoji: '🕳️',
        asset: JTW_C2_CAVE_SPRITE,
        start: { gx: 7, gy: 7, size: 4, reach: 1, rot: 0, visible: false },
        scripts: [
          {
            id: 'cave-entrance-reveal',
            blocks: [
              { op: 'when_bump' },
              { op: 'show' },
              { op: 'say', text: JTW_C2_P7_EVIDENCE_LINES[0] },
              { op: 'end' },
            ],
          },
        ],
      },
    ],
  };
}

function entryProject(page: Page): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C2 — Find the Water Curtain Cave',
    lessonId: 'jtw-s1-c2-p7',
    pages: [page],
  };
}

function mockSavedWork(page: Page | null) {
  if (!page) {
    listProjects.mockResolvedValue([]);
    return;
  }
  listProjects.mockResolvedValue([
    { id: PROJECT_ID, title: '西游记 · Find the Water Curtain Cave', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    project: entryProject(page),
    version: SAVED_VERSION,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c2-p7': { completedAt: '2026-07-27T06:00:00.000Z' } },
    },
    otherFiles: [],
  } as never);
}

function renderPart() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p8']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC2Part8Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<p>map</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Tap the seven cause cards in the story's own order. */
function orderCauseCards() {
  const cards = screen.getByTestId('jtw-c2p8-cause-cards');
  for (const cardId of C2_P8_CAUSE_CARD_ORDER) {
    const label = CARD_LABELS[cardId];
    fireEvent.click(within(cards).getByRole('button', { name: new RegExp(label) }));
  }
}

const CARD_LABELS: Record<string, string> = {
  'water-clue': '水声线索',
  'falls-agreement': '瀑布约定',
  'exact-route': '精确路线',
  'curtain-response': '水帘回应',
  'fixed-return': '修好回程',
  'friends-enter': '带伙伴进入',
  'monkey-king': '成为猴王',
};

/** Drive the Part to the point where 点亮水帘洞印 is armed. */
async function walkToResolved() {
  await screen.findByTestId('jtw-c2p8-saved-chain');
  orderCauseCards();
  fireEvent.click(screen.getByTestId('jtw-c2p8-rerun'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c2p8-run-result')).toHaveAttribute('data-consistent', 'true'),
  );
  fireEvent.click(screen.getByRole('button', { name: /因为大家在瀑布前约好/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchProgress.mockResolvedValue(P7_DONE);
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c2-p8', completed_at: 'now' });
});
afterEach(cleanup);

describe('C2-P8 · story, cards and the saved-work gate', () => {
  it('locks the part until C2-P7 is complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c1-p1'],
    });
    mockSavedWork(null);
    renderPart();
    expect(await screen.findByTestId('jtw-c2p8-locked')).toBeInTheDocument();
  });

  it('reads 故事卡D, the classic card and the waterfall promise in full', async () => {
    mockSavedWork(entryPage(LEFT));
    renderPart();
    const story = await screen.findByTestId('jtw-c2p8-story');
    expect(story).toHaveTextContent('勇敢不是只往前跳，也包括回来、说明和带伙伴走对路');
    expect(story).toHaveTextContent('称号来自守约与带路，不是随机奖励');
    expect(story).toHaveTextContent('我先看清楚，再回来告诉你们');
  });

  it('points back at Part 7 when no saved entry route exists, and keeps the seal shut', async () => {
    mockSavedWork(null);
    renderPart();
    expect(await screen.findByTestId('jtw-c2p8-work-missing')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c2p8-rerun')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p8-light-seal')).toBeDisabled();
  });

  it('refuses to run the saved work until all seven cause cards are ordered', async () => {
    mockSavedWork(entryPage(LEFT));
    renderPart();
    expect(await screen.findByTestId('jtw-c2p8-rerun')).toBeDisabled();
    // Six of seven is still not the chapter's order.
    const cards = screen.getByTestId('jtw-c2p8-cause-cards');
    for (const cardId of C2_P8_CAUSE_CARD_ORDER.slice(0, 6)) {
      fireEvent.click(within(cards).getByRole('button', { name: new RegExp(CARD_LABELS[cardId]) }));
    }
    expect(screen.getByTestId('jtw-c2p8-rerun')).toBeDisabled();
    fireEvent.click(
      within(cards).getByRole('button', { name: new RegExp(CARD_LABELS['monkey-king']) }),
    );
    await waitFor(() => expect(screen.getByTestId('jtw-c2p8-rerun')).toBeEnabled());
  });

  it('rejects a wrong card order — the run stays shut', async () => {
    mockSavedWork(entryPage(LEFT));
    renderPart();
    await screen.findByTestId('jtw-c2p8-cause-cards');
    const cards = screen.getByTestId('jtw-c2p8-cause-cards');
    // 成为猴王 before 带伙伴进入 breaks the chapter's causality.
    const wrongOrder = [
      'water-clue',
      'falls-agreement',
      'exact-route',
      'curtain-response',
      'fixed-return',
      'monkey-king',
      'friends-enter',
    ];
    for (const cardId of wrongOrder) {
      fireEvent.click(within(cards).getByRole('button', { name: new RegExp(CARD_LABELS[cardId]) }));
    }
    expect(screen.getByTestId('jtw-c2p8-rerun')).toBeDisabled();
  });
});

describe('C2-P8 · the saved P7 work really runs', () => {
  it('runs the reopened LEFT-bank project: curtain hides, cave shows, monkey knocks', async () => {
    mockSavedWork(entryPage(LEFT));
    renderPart();
    await screen.findByTestId('jtw-c2p8-saved-chain');
    expect(screen.getByTestId('jtw-c2p8-side')).toHaveTextContent('左岸');
    expect(screen.getByTestId('jtw-c2p8-saved-version')).toHaveTextContent(`#${SAVED_VERSION}`);
    expect(screen.getByTestId('jtw-c2p8-stage')).toHaveAttribute(
      'data-world-state',
      'curtain-closed',
    );

    orderCauseCards();
    fireEvent.click(screen.getByTestId('jtw-c2p8-rerun'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c2p8-stage')).toHaveAttribute(
        'data-world-state',
        'cave-revealed',
      ),
    );
    expect(screen.getByTestId('jtw-c2p8-stone-monkey')).toHaveAttribute('data-gx', '6');
    expect(screen.getByTestId('jtw-c2p8-stone-monkey')).toHaveAttribute('data-gy', '7');
    expect(screen.queryByTestId('jtw-c2p8-curtain')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p8-said-line')).toHaveTextContent(
      JTW_C2_P7_EVIDENCE_LINES[0],
    );
    expect(screen.getByTestId('jtw-c2p8-run-result')).toHaveAttribute('data-consistent', 'true');
  });

  it('runs the RIGHT bank the child actually saved — its own knock cell', async () => {
    mockSavedWork(entryPage(RIGHT));
    renderPart();
    await screen.findByTestId('jtw-c2p8-saved-chain');
    expect(screen.getByTestId('jtw-c2p8-side')).toHaveTextContent('右岸');
    expect(screen.getByTestId('jtw-c2p8-knock')).toHaveTextContent(RIGHT.knockCell);
    orderCauseCards();
    fireEvent.click(screen.getByTestId('jtw-c2p8-rerun'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c2p8-run-result')).toHaveAttribute('data-consistent', 'true'),
    );
    expect(screen.getByTestId('jtw-c2p8-stone-monkey')).toHaveAttribute('data-gx', '8');
  });

  it('keeps the retell shut when the saved route no longer reaches the curtain', async () => {
    // A saved page one step short is not a valid P7 design at all: the Part
    // refuses it rather than retelling a chapter whose program never ran.
    mockSavedWork(entryPage(LEFT, { route: LEFT.route.slice(0, -1) }));
    renderPart();
    expect(await screen.findByTestId('jtw-c2p8-work-missing')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c2p8-retell')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p8-light-seal')).toBeDisabled();
  });
});

describe('C2-P8 · retell, server seal and continue', () => {
  it('rejects a block-name recital and keeps the seal button shut', async () => {
    mockSavedWork(entryPage(LEFT));
    renderPart();
    await screen.findByTestId('jtw-c2p8-saved-chain');
    orderCauseCards();
    fireEvent.click(screen.getByTestId('jtw-c2p8-rerun'));
    await screen.findByTestId('jtw-c2p8-retell');
    fireEvent.click(screen.getByRole('button', { name: /把积木的名字按顺序念一遍/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('只念积木名');
    expect(screen.getByTestId('jtw-c2p8-light-seal')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /石猴进了水帘洞，后来他就成了美猴王/ }));
    expect(screen.getByTestId('jtw-c2p8-light-seal')).toBeDisabled();
  });

  it('records the cards, retell, saved version and real run as the evidence', async () => {
    mockSavedWork(entryPage(RIGHT));
    renderPart();
    await walkToResolved();
    const sealButton = screen.getByTestId('jtw-c2p8-light-seal');
    await waitFor(() => expect(sealButton).toBeEnabled());
    fireEvent.click(sealButton);
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    const [storyLineId, partId, evidence] = completePart.mock.calls[0];
    expect(storyLineId).toBe('journey-to-the-west-s1');
    expect(partId).toBe('jtw-s1-c2-p8');
    expect(evidence.selections.cause_card_order).toEqual([...C2_P8_CAUSE_CARD_ORDER]);
    expect(evidence.selections.retell_links).toEqual(['linked-promise-and-program']);
    expect(evidence.selections.run_project).toEqual([PROJECT_ID]);
    expect(evidence.selections.run_saved_version).toEqual([String(SAVED_VERSION)]);
    expect(evidence.selections.rerun_result).toEqual([
      RIGHT.knockCell,
      'curtain-hidden',
      'cave-shown',
    ]);
    // The seal-lighting save carries no continue choice yet.
    expect(evidence.selections.continue_choice).toEqual([]);
  });

  it('leaves the seal dark when the SERVER aggregation still reports gaps', async () => {
    fetchProgress.mockResolvedValue({
      ...P7_DONE,
      completed: [
        ...P7_DONE.completed,
        { part_id: 'jtw-s1-c2-p8', completed_at: 'now', evidence: {} },
      ],
      chapter_seals: [
        {
          seal_id: C2_P8_SEAL_ID,
          chapter_code: 'C2',
          lit: false,
          missing: ['evidence:jtw-s1-c2-p7.saved_version'],
        },
      ],
    });
    mockSavedWork(entryPage(LEFT));
    renderPart();
    const seal = await screen.findByTestId('jtw-c2p8-seal');
    expect(seal).toHaveAttribute('data-lit', 'false');
    expect(seal).toHaveTextContent('还缺 1 项证据');
    expect(screen.queryByTestId('jtw-c2p8-continue-now')).toBeInTheDocument();
  });

  it('lights 水帘洞印 only from the server, then offers both continue buttons', async () => {
    fetchProgress.mockResolvedValue({
      ...P7_DONE,
      completed: [
        ...P7_DONE.completed,
        {
          part_id: 'jtw-s1-c2-p8',
          completed_at: 'now',
          evidence: {
            schema_version: 1,
            selections: {
              cause_card_order: [...C2_P8_CAUSE_CARD_ORDER],
              retell_links: ['linked-promise-and-program'],
            },
          },
        },
      ],
      chapter_seals: [
        { seal_id: C2_P8_SEAL_ID, chapter_code: 'C2', lit: true, missing: [] },
      ],
    });
    mockSavedWork(entryPage(LEFT));
    renderPart();
    const seal = await screen.findByTestId('jtw-c2p8-seal');
    expect(seal).toHaveAttribute('data-lit', 'true');
    expect(seal).toHaveTextContent('水帘洞印');
    expect(seal).toHaveTextContent('美猴王');
    expect(seal).toHaveTextContent('我会规划多段路线');
    // The C2 ending is restored after a refresh — no auto-advance into C3.
    expect(screen.getByTestId('jtw-c2p8-resolved')).toHaveTextContent('望向海边');
    expect(screen.getByTestId('jtw-c2p8-continue-now')).toBeInTheDocument();

    // 以后继续 saves the resume position server-side and stays on the ending.
    fireEvent.click(screen.getByTestId('jtw-c2p8-continue-later'));
    await waitFor(() => expect(completePart).toHaveBeenCalled());
    expect(completePart.mock.calls[0][2].selections.continue_choice).toEqual(['later']);
    expect(screen.getByTestId('jtw-c2p8-seal')).toBeInTheDocument();
    expect(screen.queryByText('map')).not.toBeInTheDocument();

    // 现在看海边 is the only button that leaves, and it goes to the map.
    fireEvent.click(screen.getByTestId('jtw-c2p8-continue-now'));
    await waitFor(() => expect(screen.getByText('map')).toBeInTheDocument());
    expect(completePart.mock.calls[1][2].selections.continue_choice).toEqual(['now']);
  });
});
