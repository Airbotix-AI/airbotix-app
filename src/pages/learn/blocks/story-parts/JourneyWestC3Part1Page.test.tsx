// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC3Part1Page } from './JourneyWestC3Part1Page';
import {
  C3_P1_DIALOGUE,
  C3_P1_MAP_PLACES,
  C3_P1_MOTIVE_CARD_ORDER,
  C3_P1_MOTIVE_CARDS,
  C3_P1_STORY_SCREENS,
} from './journeyWestC3Part1Program';
import {
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE1_RESOLVED_BACKGROUND,
  JTW_C3_PAGE1_START_CELL,
} from '../jtwC3Stage';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

/** C1 P1–P8 + C2 P1–P8 complete — C3-P1 is the unlock frontier. */
const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
];

const C2_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c3-p1'],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c3-p1']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC3Part1Page />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Read BOTH story screens — the 正文浏览 evidence the scene requires. */
function readBothScreens() {
  fireEvent.click(screen.getByTestId('jtw-c3p1-story-next'));
}

/** The map's own place button (place names also appear in answer options). */
function mapButton(placeId: string): HTMLElement {
  const button = screen
    .getByTestId('jtw-c3p1-map')
    .querySelector<HTMLElement>(`[data-place="${placeId}"]`);
  if (!button) throw new Error(`map place ${placeId} is not rendered`);
  return button;
}

/** Point at 花果山 / 水帘洞 / 海面 on the same-screen map. */
function pointAtAllPlaces() {
  for (const place of C3_P1_MAP_PLACES) {
    fireEvent.click(mapButton(place.id));
  }
}

/** 珍惜现在的家 → 仍愿意远行学习, in that order. */
function orderMotiveCards() {
  fireEvent.click(screen.getByRole('button', { name: '珍惜现在的家' }));
  fireEvent.click(screen.getByRole('button', { name: '仍愿意远行学习' }));
}

/** 虽然这里很快乐，但是他想到…，所以决定… */
function completeWhySentence() {
  fireEvent.click(screen.getByRole('button', { name: /生命和时间都会改变/ }));
  fireEvent.click(screen.getByRole('button', { name: /去找能教他学习和思考的师父/ }));
}

/** Everything except the prediction. */
function completeEvidence() {
  readBothScreens();
  pointAtAllPlaces();
  orderMotiveCards();
  completeWhySentence();
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C2_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c3-p1',
    completed_at: '2026-07-27T05:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC3Part1Page · C3-P1 快乐的家，也装不下所有问题', () => {
  it('ships 故事卡A first, the home-shore stage and the three-place map', async () => {
    // Contract: exactly two motive cards are real; 想拿宝物/不喜欢伙伴 are distractors.
    expect(C3_P1_MOTIVE_CARDS.filter((card) => card.correct).map((card) => card.id)).toEqual([
      'treasure-this-home',
      'still-willing-to-learn',
    ]);
    expect(C3_P1_MOTIVE_CARDS.filter((card) => !card.correct).map((card) => card.id)).toEqual([
      'want-treasure',
      'dislike-friends',
    ]);
    expect(C3_P1_MOTIVE_CARD_ORDER).toEqual(['treasure-this-home', 'still-willing-to-learn']);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p1')).toBeInTheDocument());

    // Screen 1 is 故事卡A in full; 故事卡B and the dialogue are NOT on screen yet.
    expect(screen.getByText(C3_P1_STORY_SCREENS[0])).toBeInTheDocument();
    expect(screen.queryByText(C3_P1_STORY_SCREENS[1])).not.toBeInTheDocument();
    expect(screen.queryByText(C3_P1_DIALOGUE[1])).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p1-story-count')).toHaveTextContent('1 / 2');
    // 原著卡: 求师, not 寻宝/取经.
    expect(screen.getByTestId('jtw-c3p1-story')).toHaveTextContent('远行求师');
    expect(screen.getByTestId('jtw-c3p1-story')).toHaveTextContent('不能改成寻宝或取经');

    // Before stage: the Page 1 home shore with the monkey king on the contract cell.
    const stage = screen.getByTestId('jtw-c3p1-stage');
    expect(stage).toHaveAttribute('data-world-state', 'home-shore');
    expect(stage.querySelector('img')).toHaveAttribute('src', JTW_C3_PAGE1_BACKGROUND);
    const monkey = screen.getByTestId('jtw-c3p1-monkey-king');
    expect(monkey).toHaveAttribute('src', JTW_C3_MONKEY_KING_SPRITE);
    expect(monkey).toHaveAttribute('data-gx', String(JTW_C3_PAGE1_START_CELL.gx));
    expect(monkey).toHaveAttribute('data-gy', String(JTW_C3_PAGE1_START_CELL.gy));
    expect(monkey).toHaveAttribute('data-size', '3');
    expect(monkey).toHaveAttribute('data-facing', 'sea');

    // The map shows all three places on ONE screen, each with its own artwork.
    const mapButtons = screen.getByTestId('jtw-c3p1-map').querySelectorAll('[data-place]');
    expect(Array.from(mapButtons).map((button) => button.getAttribute('data-place'))).toEqual([
      'flower-fruit-mountain',
      'water-curtain-cave',
      'open-sea',
    ]);
    const placeArt = Array.from(mapButtons).map((button) =>
      button.querySelector('img')?.getAttribute('src'),
    );
    expect(placeArt.filter(Boolean)).toHaveLength(3);
    expect(new Set(placeArt).size).toBe(3); // three real places, three real pictures

    // No wind lines and no route light before anything happened.
    expect(screen.queryByTestId('jtw-c3p1-wind-lines')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();
  });

  it('blocks kids who have not finished C2-P8 (server unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...C2_DONE,
      completed: C2_DONE.completed.slice(0, 15),
      unlocked_part_ids: PRIOR_PART_IDS,
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c3p1-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c3-p1')).not.toBeInTheDocument();
  });

  it('keeps the motive cards shut until BOTH story screens have been read', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p1')).toBeInTheDocument());

    // Guessing cards without reading the text is not possible: they are not rendered.
    expect(screen.getByTestId('jtw-c3p1-unread')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c3p1-motives')).not.toBeInTheDocument();
    pointAtAllPlaces();
    completeWhySentence();
    fireEvent.click(screen.getByRole('button', { name: /我会记得从哪里出发/ }));
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();

    // 故事卡B + the two dialogue lines arrive with the second screen.
    readBothScreens();
    expect(screen.getByText(C3_P1_STORY_SCREENS[1])).toBeInTheDocument();
    for (const line of C3_P1_DIALOGUE) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByTestId('jtw-c3p1-story-count')).toHaveTextContent('2 / 2');
    expect(screen.queryByTestId('jtw-c3p1-unread')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p1-motives')).toBeInTheDocument();
  });

  it('refuses 想拿宝物 / 不喜欢伙伴 with the story hint and only passes the right order', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p1')).toBeInTheDocument());
    completeEvidence();
    fireEvent.click(screen.getByRole('button', { name: /我会记得从哪里出发/ }));
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeEnabled();

    // A wrong motive card breaks the evidence even with everything else done.
    fireEvent.click(screen.getByRole('button', { name: '重新排' }));
    fireEvent.click(screen.getByRole('button', { name: '想拿宝物' }));
    fireEvent.click(screen.getByRole('button', { name: '不喜欢伙伴' }));
    expect(screen.getByRole('status')).toHaveTextContent('都不在正文里');
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();

    // The right cards in the WRONG order still fail.
    fireEvent.click(screen.getByRole('button', { name: '重新排' }));
    fireEvent.click(screen.getByRole('button', { name: '仍愿意远行学习' }));
    fireEvent.click(screen.getByRole('button', { name: '珍惜现在的家' }));
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c3p1-resolved')).not.toBeInTheDocument();

    // Replayable: reorder into the story's own order and it opens again.
    fireEvent.click(screen.getByRole('button', { name: '重新排' }));
    orderMotiveCards();
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeEnabled();
  });

  it('needs all three map places and both halves of the 虽然/但是/所以 sentence', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p1')).toBeInTheDocument());
    readBothScreens();
    orderMotiveCards();
    completeWhySentence();
    fireEvent.click(screen.getByRole('button', { name: /我会记得从哪里出发/ }));

    // Two of three places pointed at — not enough.
    fireEvent.click(mapButton('flower-fruit-mountain'));
    fireEvent.click(mapButton('water-curtain-cave'));
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();
    fireEvent.click(mapButton('open-sea'));
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeEnabled();

    // A wrong second half of the sentence closes it again.
    fireEvent.click(screen.getByRole('button', { name: /再也不回花果山了/ }));
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /去找能教他学习和思考的师父/ }));
    // A wrong first half likewise.
    fireEvent.click(screen.getByRole('button', { name: /海那边一定藏着宝物/ }));
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();
  });

  it('hints on the wrong prediction and only then lights the sea route', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c3-p1')).toBeInTheDocument());
    completeEvidence();
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled(); // prediction pending

    fireEvent.click(screen.getByRole('button', { name: '“自己还有许多不明白的事。”' }));
    expect(screen.getByRole('status')).toHaveTextContent('会记得从哪里出发');
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c3p1-resolved')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /我会记得从哪里出发/ }));
    // resolved_world_change: the same camera, the sea-route light lit.
    const stage = screen.getByTestId('jtw-c3p1-stage');
    expect(stage).toHaveAttribute('data-world-state', 'route-light');
    expect(stage.querySelector('img')).toHaveAttribute('src', JTW_C3_PAGE1_RESOLVED_BACKGROUND);
    expect(screen.getByTestId('jtw-c3p1-resolved')).toHaveTextContent('一直连到天边');
    expect(screen.getByTestId('jtw-c3p1-friends')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeEnabled();
  });

  it('replays the sea wind with three mute-readable wind lines', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c3p1-audio')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-c3p1-wind-lines')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('jtw-c3p1-audio'));
    const wind = screen.getByTestId('jtw-c3p1-wind-lines');
    expect(wind.querySelectorAll('span')).toHaveLength(3);
    expect(screen.getByTestId('jtw-c3p1-audio')).toHaveTextContent('再听一次海风');
  });

  it('persists Read/Why evidence on continue, writes no project and unlocks only C3-P2', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c3p1-continue')).toBeInTheDocument());
    completeEvidence();
    fireEvent.click(screen.getByTestId('jtw-c3p1-audio'));
    fireEvent.click(screen.getByRole('button', { name: /我会记得从哪里出发/ }));
    fireEvent.click(screen.getByTestId('jtw-c3p1-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    // Read/Why only: no build_project, no saved_version, no chapter field.
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c3-p1', {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-a', 'story-card-b'],
        map_places: ['flower-fruit-mountain', 'water-curtain-cave', 'open-sea'],
        audio_replay: ['sea-wind'],
        motive_card_order: ['treasure-this-home', 'still-willing-to-learn'],
        why_sentence: ['life-and-time-change', 'go-find-a-master'],
      },
      prediction: 'line-remember-where-i-started',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved Read/Why evidence after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...C2_DONE,
      completed: [
        ...C2_DONE.completed,
        {
          part_id: 'jtw-s1-c3-p1',
          completed_at: '2026-07-27T05:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-a', 'story-card-b'],
              map_places: ['flower-fruit-mountain', 'water-curtain-cave', 'open-sea'],
              audio_replay: ['sea-wind'],
              motive_card_order: ['treasure-this-home', 'still-willing-to-learn'],
              why_sentence: ['life-and-time-change', 'go-find-a-master'],
            },
            prediction: 'line-remember-where-i-started',
          },
        },
      ],
      unlocked_part_ids: [...C2_DONE.unlocked_part_ids, 'jtw-s1-c3-p2'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-c3p1-resolved')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /1.*珍惜现在的家/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2.*仍愿意远行学习/ })).toBeInTheDocument();
    expect(mapButton('flower-fruit-mountain')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /生命和时间都会改变/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('jtw-c3p1-wind-lines')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c3p1-continue')).toBeEnabled();
  });
});
