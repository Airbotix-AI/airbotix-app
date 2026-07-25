// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  fireEvent.click(screen.getByRole('button', { name: /他想让第一次见面清清楚楚/ }));
  fireEvent.click(screen.getByRole('button', { name: /石头的提示/ }));
  fireEvent.click(screen.getByRole('button', { name: /让大家看见我/ }));
  fireEvent.click(screen.getByRole('button', { name: /做一个动作/ }));
  fireEvent.click(screen.getByRole('button', { name: /说出问候/ }));
  fireEvent.click(screen.getByTestId('jtw-p3-swap-toggle'));
  fireEvent.click(screen.getByRole('button', { name: /能——因为石猴已经先出现了/ }));
  fireEvent.click(screen.getByRole('button', { name: /把 Say 放到 Show 前面/ }));
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

describe('JourneyWestPart3Page · C1-P3 树叶后的顺序排练', () => {
  it('maps the four cards uniquely and shows the read-only preset chain', async () => {
    // Card ids map 1:1 onto the contracted ops — unique, complete.
    expect(new Set(C1_P3_CARD_ORDER).size).toBe(4);
    expect(C1_P3_STORY_CARDS.map((card) => card.id).sort()).toEqual(
      [...C1_P3_CARD_ORDER].sort(),
    );
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
    expect(
      screen.getByTestId('jtw-p3-preset-chain').querySelectorAll('.bsx-block'),
    ).toHaveLength(8);
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
    fireEvent.click(screen.getByRole('button', { name: /石头的提示/ }));
    fireEvent.click(screen.getByRole('button', { name: /让大家看见我/ }));
    fireEvent.click(screen.getByRole('button', { name: /做一个动作/ }));
    fireEvent.click(screen.getByRole('button', { name: /说出问候/ }));

    const line = () =>
      Array.from(
        screen.getByTestId('jtw-p3-rehearsal-line').querySelectorAll('li'),
      ).map((li) => li.textContent ?? '');
    expect(line()[2]).toContain('做一个动作');
    expect(line()[3]).toContain('说出问候');

    fireEvent.click(screen.getByTestId('jtw-p3-swap-toggle'));
    expect(screen.getByTestId('jtw-p3-rehearsal-line').dataset.swapped).toBe('true');
    expect(line()[2]).toContain('说出问候');
    expect(line()[3]).toContain('做一个动作');

    // Replayable — toggling back restores the original rehearsal order.
    fireEvent.click(screen.getByTestId('jtw-p3-swap-toggle'));
    expect(screen.getByTestId('jtw-p3-rehearsal-line').dataset.swapped).toBe('false');
    expect(line()[2]).toContain('做一个动作');
  });

  it('keeps continue locked until motive + order + swap comparison + prediction are done', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p3-continue')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p3-continue')).toBeDisabled();

    completeThroughSwap();
    expect(screen.getByTestId('jtw-p3-continue')).toBeDisabled(); // prediction pending

    fireEvent.click(screen.getByRole('button', { name: /石猴已经站在石台上挥手/ }));
    expect(screen.getByRole('status')).toHaveTextContent('还没有 Show，大家能看见谁？');
    fireEvent.click(screen.getByRole('button', { name: /空空的石台/ }));

    expect(screen.getByTestId('jtw-p3-resolved')).toHaveTextContent('把四张顺序卡交给石猴');
    expect(screen.getByTestId('jtw-p3-continue')).toBeEnabled();
  });

  it('persists ordering + explanation evidence on continue and returns to the map', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p3-continue')).toBeInTheDocument());
    completeThroughSwap();
    fireEvent.click(screen.getByRole('button', { name: /空空的石台/ }));
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
    expect(screen.getByRole('button', { name: /他想让第一次见面清清楚楚/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /石头的提示/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('jtw-p3-continue')).toBeEnabled();
  });
});
