// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestPart2Page } from './JourneyWestPart2Page';
import { C1_P2_DEMO_PROJECT, C1_P2_SAY_TEXT, C1_P2_STORY_BEFORE } from './journeyWestSeason1';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

const P1_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [{ part_id: 'jtw-s1-c1-p1', completed_at: '2026-07-24T04:00:00.000Z', evidence: {} }],
  unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2'],
};

const instantSleep = () => Promise.resolve();

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p2']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestPart2Page demoSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function orderCardsCorrectly() {
  const cards = within(screen.getByTestId('jtw-p2-cards'));
  fireEvent.click(
    cards.getByRole('button', { name: /🔔 There is movement in the stone \(Chime\)/i }),
  );
  fireEvent.click(cards.getByRole('button', { name: /Stone monkey appears/i }));
  fireEvent.click(cards.getByRole('button', { name: /Hop/i }));
  fireEvent.click(cards.getByRole('button', { name: /Say hello/i }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P1_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p2',
    completed_at: '2026-07-25T04:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPart2Page · C1-P2 Stone Monkey Born Operation Demonstration', () => {
  it('defines the demo chain as EXACTLY the contracted arrival script', () => {
    const ops = C1_P2_DEMO_PROJECT.pages[0].characters[0].scripts[0].blocks.map((b) => b.op);
    expect(ops).toEqual(['when_flag', 'hide', 'play_sound', 'wait', 'show', 'hop', 'say', 'end']);
  });

  it('blocks kids who have not finished P1 (server-side unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c1-p1'],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p2-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c1-p2')).not.toBeInTheDocument();
  });

  it('shows the story hook and runs the REAL demo: hidden → chime → show → hop → hello', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p2')).toBeInTheDocument());
    expect(screen.getByText(C1_P2_STORY_BEFORE)).toBeInTheDocument();

    const monkey = screen.getByTestId('jtw-p2-stone-monkey');
    expect(monkey.dataset.visible).toBe('true'); // start pose, before Go

    fireEvent.click(screen.getByTestId('jtw-p2-run'));
    // After the full run the monkey ends VISIBLE (Show happened) and said hello.
    await waitFor(() => expect(screen.getByTestId('jtw-p2-run')).toHaveTextContent(/run again/i));
    expect(screen.getByTestId('jtw-p2-stone-monkey').dataset.visible).toBe('true');
    expect(screen.getByTestId('jtw-p2-demo-chain').querySelectorAll('.bsx-block')).toHaveLength(8);
  });

  it('keeps continue locked until cards + first/last + prediction + a finished run', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p2-continue')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p2-continue')).toBeDisabled();

    orderCardsCorrectly();
    const firstLast = within(screen.getByTestId('jtw-p2-first-last'));
    fireEvent.click(firstLast.getByRole('button', { name: '🚩 Start' }));
    fireEvent.click(firstLast.getByRole('button', { name: '🛑 End' }));
    expect(screen.getByTestId('jtw-p2-continue')).toBeDisabled();

    // Wrong prediction → retry hint, still locked.
    fireEvent.click(screen.getByRole('button', { name: /Yes — they can see/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Show comes before Hop and Say');
    fireEvent.click(screen.getByRole('button', { name: /No — he must appear/ }));
    expect(screen.getByTestId('jtw-p2-continue')).toBeDisabled(); // run not yet finished

    fireEvent.click(screen.getByTestId('jtw-p2-run'));
    await waitFor(() => expect(screen.getByTestId('jtw-p2-continue')).toBeEnabled());
    expect(screen.getByTestId('jtw-p2-resolved')).toHaveTextContent(
      'Now the monkeys can see their new friend',
    );
  });

  it('persists the evidence on continue and returns to the map', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p2-continue')).toBeInTheDocument());
    orderCardsCorrectly();
    const firstLast = within(screen.getByTestId('jtw-p2-first-last'));
    fireEvent.click(firstLast.getByRole('button', { name: '🚩 Start' }));
    fireEvent.click(firstLast.getByRole('button', { name: '🛑 End' }));
    fireEvent.click(screen.getByRole('button', { name: /No — he must appear/ }));
    fireEvent.click(screen.getByTestId('jtw-p2-run'));
    await waitFor(() => expect(screen.getByTestId('jtw-p2-continue')).toBeEnabled());
    fireEvent.click(screen.getByTestId('jtw-p2-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p2', {
      schema_version: 1,
      selections: {
        story_card_order: ['stone-sound', 'monkey-appears', 'first-jump', 'say-hello'],
        first_block: ['first-start'],
        last_block: ['last-end'],
      },
      prediction: 'no-show-first',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
    expect(C1_P2_SAY_TEXT).toBe("Hello! I'm new here!");
  });

  it('restores saved evidence after a refresh (completed part)', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [
        ...P1_DONE.completed,
        {
          part_id: 'jtw-s1-c1-p2',
          completed_at: '2026-07-25T04:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_card_order: ['stone-sound', 'monkey-appears', 'first-jump', 'say-hello'],
              first_block: ['first-start'],
              last_block: ['last-end'],
            },
            prediction: 'no-show-first',
          },
        },
      ],
      unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2', 'jtw-s1-c1-p3'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-p2-resolved')).toBeInTheDocument());
    expect(
      screen.getByRole('button', { name: /🔔 There is movement in the stone \(Chime\)/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByTestId('jtw-p2-first-last')).getByRole('button', { name: '🚩 Start' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('jtw-p2-continue')).toBeEnabled();
  });
});
