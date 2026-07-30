// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC4Part1Page } from './JourneyWestC4Part1Page';
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
const READY: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-30T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1'],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function readStory() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'));
}

function completeRoute() {
  const route = within(screen.getByTestId('jtw-c4p1-route'));
  fireEvent.click(route.getByRole('button', { name: '花果山' }));
  fireEvent.click(route.getByRole('button', { name: '海路' }));
  fireEvent.click(route.getByRole('button', { name: '师门' }));
}

function completeEvidence() {
  readStory();
  completeRoute();
  fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }));
  fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }));
  fireEvent.click(screen.getByRole('button', { name: /因为他想认真学习/ }));
  fireEvent.click(screen.getByRole('button', { name: /都会和寻宝说法矛盾/ }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(READY);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p1',
    completed_at: '2026-07-30T00:30:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC4Part1Page', () => {
  it('gates motive evidence behind the full story and refuses distractors', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c4p1-unread')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c4p1-motives')).not.toBeInTheDocument();
    readStory();
    expect(screen.getByTestId('jtw-c4p1-story-count')).toHaveTextContent('2 / 2');
    fireEvent.click(screen.getByRole('button', { name: '来找闪亮宝物' }));
    expect(screen.getByRole('status')).toHaveTextContent('没有说寻宝');
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled();
  });

  it('requires the exact route, two motives, Why and prediction before opening the gate', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    readStory();
    const route = within(screen.getByTestId('jtw-c4p1-route'));
    fireEvent.click(route.getByRole('button', { name: '师门' }));
    fireEvent.click(route.getByRole('button', { name: '海路' }));
    fireEvent.click(route.getByRole('button', { name: '花果山' }));
    fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }));
    fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }));
    fireEvent.click(screen.getByRole('button', { name: /因为他想认真学习/ }));
    fireEvent.click(screen.getByRole('button', { name: /都会和寻宝说法矛盾/ }));
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled();

    fireEvent.click(route.getByRole('button', { name: '重新排' }));
    completeRoute();
    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute(
      'data-world-state',
      'courtyard-open',
    );
    expect(screen.getByTestId('jtw-c4p1-warm-light')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent('空名字牌进入视野');
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled();
  });

  it('persists Read/Why evidence without a project and unlocks only P2', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    completeEvidence();
    fireEvent.click(screen.getByTestId('jtw-c4p1-audio'));
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p1', {
        schema_version: 1,
        selections: {
          story_screens: ['story-card-a', 'story-card-a-dialogue'],
          audio_replay: ['story-card-a'],
          route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
          motive_evidence: ['willing-to-learn', 'bring-learning-home'],
          why_sentence: ['learn-and-return'],
        },
        prediction: 'learn-and-home-conflict',
      }),
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('uses server unlock truth and restores saved evidence after refresh', async () => {
    fetchProgress.mockResolvedValue({ ...READY, unlocked_part_ids: PRIOR_PART_IDS });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-locked')).toBeInTheDocument());
    cleanup();

    fetchProgress.mockResolvedValue({
      ...READY,
      completed: [
        ...READY.completed,
        {
          part_id: 'jtw-s1-c4-p1',
          completed_at: '2026-07-30T00:30:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-a', 'story-card-a-dialogue'],
              route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
              motive_evidence: ['willing-to-learn', 'bring-learning-home'],
              why_sentence: ['learn-and-return'],
            },
            prediction: 'learn-and-home-conflict',
          },
        },
      ],
      unlocked_part_ids: [...READY.unlocked_part_ids, 'jtw-s1-c4-p2'],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-resolved')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled();
  });
});
