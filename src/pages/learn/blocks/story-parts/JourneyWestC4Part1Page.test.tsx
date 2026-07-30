// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC4Part1Page } from './JourneyWestC4Part1Page';
import {
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_ROUTE_CARDS,
  C4_P1_STORY_SCREENS,
} from './journeyWestC4Part1Program';
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
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c3-p${index + 1}`),
];
const C3_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-30T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1'],
  chapter_seals: [],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p1']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC4Part1Page />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function readStory() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'));
}

function completeEvidence() {
  readStory();
  for (const card of C4_P1_ROUTE_CARDS) {
    fireEvent.click(screen.getByRole('button', { name: card.label }));
  }
  fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }));
  fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }));
  fireEvent.click(
    screen.getByRole('button', { name: '“想认真学习”和“想把所学带回家”' }),
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: '因为他珍惜伙伴，也愿意认真学习，所以远行不是为了丢下过去。',
    }),
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C3_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p1',
    completed_at: '2026-07-30T00:10:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC4Part1Page · 山门前，把来路讲清楚', () => {
  it('shows the same traveller before the closed gate and requires both story screens', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    expect(screen.getByText(C4_P1_STORY_SCREENS[0])).toBeInTheDocument();
    expect(screen.queryByText(C4_P1_STORY_SCREENS[1])).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute(
      'data-world-state',
      'gate-closed',
    );
    expect(screen.getByTestId('jtw-c4p1-name-board')).toHaveTextContent('空名字牌');
    expect(screen.getByTestId('jtw-c4p1-unread')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled();
  });

  it('is locked unless the server says C4-P1 is unlocked', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_DONE,
      unlocked_part_ids: PRIOR_PART_IDS,
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c4-p1')).not.toBeInTheDocument();
  });

  it('refuses distractor motives and an incorrect route', async () => {
    expect(C4_P1_MOTIVE_OPTIONS.filter((option) => !option.correct).map((option) => option.id)).toEqual([
      'find-shiny-treasure',
      'dislike-friends',
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    readStory();
    fireEvent.click(screen.getByRole('button', { name: '海路' }));
    fireEvent.click(screen.getByRole('button', { name: '花果山' }));
    fireEvent.click(screen.getByRole('button', { name: '师门' }));
    fireEvent.click(screen.getByRole('button', { name: '来找闪亮宝物' }));
    fireEvent.click(screen.getByRole('button', { name: '不喜欢伙伴' }));
    fireEvent.click(screen.getByRole('button', { name: '“想认真学习”和“想把所学带回家”' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: '因为他珍惜伙伴，也愿意认真学习，所以远行不是为了丢下过去。',
      }),
    );
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled();
  });

  it('opens only after Read, route, two motives, prediction and Why are complete', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    completeEvidence();
    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute('data-world-state', 'gate-open');
    expect(screen.getByTestId('jtw-c4p1-warm-lamp')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent('下一步要理解为什么一个名字');
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled();
  });

  it('persists measured evidence and unlocks only the adjacent Part', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    completeEvidence();
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s1',
        'jtw-s1-c4-p1',
        expect.objectContaining({
          selections: {
            story_screens: ['gate-story-a', 'gate-dialogue'],
            route_card_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
            motive_evidence: ['learn-carefully', 'bring-learning-home'],
            why_evidence: ['learning-links-home'],
          },
          prediction: 'learn-and-return',
        }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('map-stub')).toBeInTheDocument());
  });

  it('restores saved evidence after refresh without creating any project', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_DONE,
      completed: [
        ...C3_DONE.completed,
        {
          part_id: 'jtw-s1-c4-p1',
          completed_at: '2026-07-30T00:10:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['gate-story-a', 'gate-dialogue'],
              route_card_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
              motive_evidence: ['learn-carefully', 'bring-learning-home'],
              why_evidence: ['learning-links-home'],
            },
            prediction: 'learn-and-return',
          },
        },
      ],
      unlocked_part_ids: [...C3_DONE.unlocked_part_ids, 'jtw-s1-c4-p2'],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled());
    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute('data-world-state', 'gate-open');
  });
});
