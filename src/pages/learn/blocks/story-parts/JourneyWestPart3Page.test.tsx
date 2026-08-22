// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestPart3Page } from './JourneyWestPart3Page';
import {
  C1_P3_CARD_ORDER,
  C1_P3_PRESET_CHAIN,
  C1_P3_STORY_BEFORE,
  C1_P3_STORY_CARDS,
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

const P2_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [
    { part_id: 'jtw-s1-c1-p1', completed_at: '2026-07-24T04:00:00.000Z', evidence: {} },
    { part_id: 'jtw-s1-c1-p2', completed_at: '2026-07-25T04:00:00.000Z', evidence: {} },
  ],
  unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2', 'jtw-s1-c1-p3'],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p3']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestPart3Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function completeThroughSwap() {
  const cards = within(screen.getByTestId('jtw-p3-cards'));
  fireEvent.click(
    screen.getByRole('button', {
      name: /He wants to make the first meeting clear and put his partner at ease/i,
    }),
  );
  fireEvent.click(cards.getByRole('button', { name: /🔔 Chime/i }));
  fireEvent.click(cards.getByRole('button', { name: /👀 Let everyone see me \(Show\)/i }));
  fireEvent.click(cards.getByRole('button', { name: /🦘 Make a move \(Hop\)/i }));
  fireEvent.click(cards.getByRole('button', { name: /💬 Say hello \(Say\)/i }));
  fireEvent.click(screen.getByTestId('jtw-p3-swap-toggle'));
  fireEvent.click(
    screen.getByRole('button', {
      name: /Yes - because the stone monkey has already appeared first, it makes sense to say hello first and then jump\./i,
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: /Put Say in front of Show/i }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P2_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p3',
    completed_at: '2026-07-25T05:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPart3Page · C1-P3 Sequence rehearsal after leaves', () => {
  it('maps the four cards uniquely and shows the read-only preset chain', async () => {
    // Card ids map 1:1 onto the contracted ops — unique, complete.
    expect(new Set(C1_P3_CARD_ORDER).size).toBe(4);
    expect(C1_P3_STORY_CARDS.map((card) => card.id).sort()).toEqual([...C1_P3_CARD_ORDER].sort());
    expect(C1_P3_PRESET_CHAIN.map((block) => block.op)).toEqual([
      'when_flag',
      'hide',
      'play_sound',
      'wait',
      'show',
      'hop',
      'say',
      'end',
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p3')).toBeInTheDocument());
    expect(screen.getByText(C1_P3_STORY_BEFORE)).toBeInTheDocument();
    expect(screen.getByTestId('jtw-p3-preset-chain').querySelectorAll('.bsx-block')).toHaveLength(
      8,
    );
  });

  it('blocks kids who have not finished P2', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [
        { part_id: 'jtw-s1-c1-p1', completed_at: '2026-07-24T04:00:00.000Z', evidence: {} },
      ],
      unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2'],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p3-locked')).toBeInTheDocument());
  });

  it('the swap experiment is replayable: toggle swaps Hop/Say and toggles back', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p3')).toBeInTheDocument());
    // Swap lab appears only after the target order is built.
    expect(screen.queryByTestId('jtw-p3-swap-lab')).not.toBeInTheDocument();
    const cards = within(screen.getByTestId('jtw-p3-cards'));
    fireEvent.click(cards.getByRole('button', { name: /🔔 Chime/i }));
    fireEvent.click(cards.getByRole('button', { name: /👀 Let everyone see me \(Show\)/i }));
    fireEvent.click(cards.getByRole('button', { name: /🦘 Make a move \(Hop\)/i }));
    fireEvent.click(cards.getByRole('button', { name: /💬 Say hello \(Say\)/i }));

    const line = () =>
      Array.from(screen.getByTestId('jtw-p3-rehearsal-line').querySelectorAll('li')).map(
        (li) => li.textContent ?? '',
      );
    expect(line()[2]).toContain('🦘 Make a move (Hop)');
    expect(line()[3]).toContain('💬 Say hello (Say)');

    fireEvent.click(screen.getByTestId('jtw-p3-swap-toggle'));
    expect(screen.getByTestId('jtw-p3-rehearsal-line').dataset.swapped).toBe('true');
    expect(line()[2]).toContain('💬 Say hello (Say)');
    expect(line()[3]).toContain('🦘 Make a move (Hop)');

    // Replayable — toggling back restores the original rehearsal order.
    fireEvent.click(screen.getByTestId('jtw-p3-swap-toggle'));
    expect(screen.getByTestId('jtw-p3-rehearsal-line').dataset.swapped).toBe('false');
    expect(line()[2]).toContain('🦘 Make a move (Hop)');
  });

  it('keeps continue locked until motive + order + swap comparison + prediction are done', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p3-continue')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p3-continue')).toBeDisabled();

    completeThroughSwap();
    expect(screen.getByTestId('jtw-p3-continue')).toBeDisabled(); // prediction pending

    fireEvent.click(
      screen.getByRole('button', {
        name: /The stone monkey is already standing on the stone platform waving/i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Think about the agreement during rehearsal: There is no show yet, who can everyone see?',
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Empty stone platform - only sound, no stone monkey in sight/i,
      }),
    );

    expect(screen.getByTestId('jtw-p3-resolved')).toHaveTextContent(
      'The monkeys can say "what happens now" to each card. They handed four sequence cards to Stone Monkey, preparing to put the rehearsal into the real story stage.',
    );
    expect(screen.getByTestId('jtw-p3-continue')).toBeEnabled();
  });

  it('persists ordering + explanation evidence on continue and returns to the map', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p3-continue')).toBeInTheDocument());
    completeThroughSwap();
    fireEvent.click(
      screen.getByRole('button', {
        name: /Empty stone platform - only sound, no stone monkey in sight/i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-p3-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p3', {
      schema_version: 1,
      selections: {
        motive: ['clear-first-meeting'],
        story_card_order: ['card-chime', 'card-show', 'card-hop', 'card-say'],
        swap_comparison: ['still-works-show-first'],
        air_voice_version: ['say-before-show'],
      },
      prediction: 'empty-stage-voice',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores saved ordering and explanations after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...P2_DONE,
      completed: [
        ...P2_DONE.completed,
        {
          part_id: 'jtw-s1-c1-p3',
          completed_at: '2026-07-25T05:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              motive: ['clear-first-meeting'],
              story_card_order: ['card-chime', 'card-show', 'card-hop', 'card-say'],
              swap_comparison: ['still-works-show-first'],
              air_voice_version: ['say-before-show'],
            },
            prediction: 'empty-stage-voice',
          },
        },
      ],
      unlocked_part_ids: [...P2_DONE.unlocked_part_ids, 'jtw-s1-c1-p4'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-p3-resolved')).toBeInTheDocument());
    expect(
      screen.getByRole('button', {
        name: /He wants to make the first meeting clear and put his partner at ease/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByTestId('jtw-p3-cards')).getByRole('button', { name: /🔔 Chime/i }),
    ).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('jtw-p3-continue')).toBeEnabled();
  });
});
