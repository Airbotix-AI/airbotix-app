// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC2Part2Page } from './JourneyWestC2Part2Page';
import {
  C2_P2_AGREEMENT_ORDER,
  C2_P2_DIALOGUE,
  C2_P2_MOTIVE_OPTIONS,
  C2_P2_STORY_BEFORE,
} from './journeyWestSeason1';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

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
];

/** C1 + C2-P1 complete — C2-P2 is the unlock frontier. */
const P1_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-25T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p2'],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p2']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC2Part2Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The two motives that hold together (from the dialogue). */
function pickBothMotives() {
  fireEvent.click(
    screen.getByRole('button', {
      name: /He wanted to see what was behind the clear water curtain \("I'll see clearly first"\)/i,
    }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: /He promised to come back and tell everyone and find a safe way for his companions \("Come back and tell you"\)/i,
    }),
  );
}

/** Tap the agreement cards into the exact 进去→看清→回来→分享 order. */
function orderAgreementCards() {
  fireEvent.click(screen.getByRole('button', { name: 'go in' }));
  fireEvent.click(screen.getByRole('button', { name: 'see clearly' }));
  fireEvent.click(screen.getByRole('button', { name: 'return' }));
  fireEvent.click(screen.getByRole('button', { name: 'share' }));
}

/** Motives + card order + the enter-not-enough explanation. */
function completeEvidence() {
  pickBothMotives();
  orderAgreementCards();
  fireEvent.click(screen.getByRole('button', { name: /"Going in" is just the first step/i }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P1_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c2-p2',
    completed_at: '2026-07-25T05:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC2Part2Page · C2-P2 The Promise Before the Waterfall', () => {
  it('ships the full story card B text, the dialogue, the closed-curtain stage and the unsorted cards', async () => {
    // Contract: exactly two motives hold together; 被夸奖/最快 are distractors.
    expect(C2_P2_MOTIVE_OPTIONS.filter((option) => option.correct).map((o) => o.id)).toEqual([
      'curious-see-inside',
      'promise-return-share',
    ]);
    expect(C2_P2_MOTIVE_OPTIONS.filter((option) => !option.correct).map((o) => o.id)).toEqual([
      'want-praise',
      'be-fastest',
    ]);
    // The agreement order is exactly 进去→看清→回来→分享.
    expect(C2_P2_AGREEMENT_ORDER).toEqual([
      'card-enter',
      'card-see-clear',
      'card-return',
      'card-share',
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p2')).toBeInTheDocument());
    expect(screen.getByText(C2_P2_STORY_BEFORE)).toBeInTheDocument();
    for (const line of C2_P2_DIALOGUE) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByTestId('jtw-c2p2-story')).toHaveTextContent('Sun Wukong');
    expect(screen.getByTestId('jtw-c2p2-story')).toHaveTextContent('On Bump');
    // Curtain still closed: cave mouth hidden, monkey facing the curtain.
    expect(screen.getByTestId('jtw-c2p2-cave-mouth')).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('jtw-c2p2-stone-monkey')).toHaveAttribute('data-facing', 'curtain');
    // The four agreement cards start unsorted (nothing pressed) and no track shows.
    for (const label of ['go in', 'see clearly', 'return', 'share']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.queryByTestId('jtw-c2p2-agreement-track')).not.toBeInTheDocument();
  });

  it('blocks kids who have not finished C2-P1 (server unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...P1_DONE,
      completed: P1_DONE.completed.slice(0, 8),
      unlocked_part_ids: PRIOR_PART_IDS,
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p2-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c2-p2')).not.toBeInTheDocument();
  });

  it('rejects be praised as motive evidence with the dialogue hint and keeps continue locked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p2')).toBeInTheDocument());
    completeEvidence();
    fireEvent.click(
      screen.getByRole('button', {
        name: /No - no one has come back to clarify the route and the conditions inside\. My friends don’t know how to walk safely\./i,
      }),
    );
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeEnabled();

    // Adding 被夸奖 breaks the motive evidence even with everything else done.
    fireEvent.click(
      screen.getByRole('button', { name: 'He just wants to be praised by everyone' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Read the dialogue again: Stone Monkey said "see clearly first" and "come back and tell you" - "being praised" and "fastest" were not in his words.',
    );
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'He just wants to be praised by everyone' }),
    );
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeEnabled();

    // 最快 is rejected the same way.
    fireEvent.click(
      screen.getByRole('button', { name: 'He wants to be the fastest one to rush in.' }),
    );
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeDisabled();
  });

  it('passes ONLY the go in→see clearly→come back→share order', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p2')).toBeInTheDocument());
    pickBothMotives();

    // Wrong order: 回来 first — the explanation stays hidden, continue locked.
    fireEvent.click(screen.getByRole('button', { name: 'return' }));
    fireEvent.click(screen.getByRole('button', { name: 'go in' }));
    fireEvent.click(screen.getByRole('button', { name: 'see clearly' }));
    fireEvent.click(screen.getByRole('button', { name: 'share' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: /No - no one has come back to clarify the route and the conditions inside\. My friends don’t know how to walk safely\./i,
      }),
    );
    expect(screen.queryByTestId('jtw-c2p2-enter')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c2p2-resolved')).not.toBeInTheDocument();

    // Re-order into the exact agreement — replayable tap-to-order.
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    orderAgreementCards();
    fireEvent.click(screen.getByRole('button', { name: /"Going in" is just the first step/i }));
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeEnabled();
  });

  it('hints on the wrong prediction and pins the agreement track only when everything is done', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p2-continue')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeDisabled();

    completeEvidence();
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeDisabled(); // prediction pending

    fireEvent.click(screen.getByRole('button', { name: /Yes - everyone just jumps in\./i }));
    expect(screen.getByRole('status')).toHaveTextContent(/without .come back. and .share./i);
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c2p2-resolved')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /No - no one has come back to clarify the route and the conditions inside\. My friends don’t know how to walk safely\./i,
      }),
    );
    // 四格约定固定在舞台侧边作为后续证据轨。
    expect(screen.getByTestId('jtw-c2p2-resolved')).toHaveTextContent('evidence track');
    const cells = screen.getByTestId('jtw-c2p2-agreement-track').querySelectorAll('[data-card]');
    expect(Array.from(cells).map((cell) => cell.getAttribute('data-card'))).toEqual([
      'card-enter',
      'card-see-clear',
      'card-return',
      'card-share',
    ]);
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeEnabled();
  });

  it('persists the two motives + order + explanation on continue and unlocks only C2-P3', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p2-continue')).toBeInTheDocument());
    completeEvidence();
    fireEvent.click(
      screen.getByRole('button', {
        name: /No - no one has come back to clarify the route and the conditions inside\. My friends don’t know how to walk safely\./i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-c2p2-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    // The evidence is Why-only: no project save, no chapter completion field.
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c2-p2', {
      schema_version: 1,
      selections: {
        motive: ['curious-see-inside', 'promise-return-share'],
        agreement_card_order: ['card-enter', 'card-see-clear', 'card-return', 'card-share'],
        enter_not_enough: ['enter-only-first-cell'],
      },
      prediction: 'cannot-follow-safely',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved Why/agreement evidence after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...P1_DONE,
      completed: [
        ...P1_DONE.completed,
        {
          part_id: 'jtw-s1-c2-p2',
          completed_at: '2026-07-25T05:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              motive: ['curious-see-inside', 'promise-return-share'],
              agreement_card_order: ['card-enter', 'card-see-clear', 'card-return', 'card-share'],
              enter_not_enough: ['enter-only-first-cell'],
            },
            prediction: 'cannot-follow-safely',
          },
        },
      ],
      unlocked_part_ids: [...P1_DONE.unlocked_part_ids, 'jtw-s1-c2-p3'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-c2p2-resolved')).toBeInTheDocument());
    expect(
      screen.getByRole('button', {
        name: /He wanted to see what was behind the clear water curtain \("I'll see clearly first"\)/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'He just wants to be praised by everyone' }),
    ).toHaveAttribute('aria-pressed', 'false');
    // The saved order re-renders with its position badges.
    expect(screen.getByRole('button', { name: /1 go in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /4 share/i })).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p2-agreement-track')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p2-continue')).toBeEnabled();
  });
});
