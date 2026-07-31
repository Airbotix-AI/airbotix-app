// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC4Part2Page } from './JourneyWestC4Part2Page';
import { C4_P2_START_TRACE, C4_P2_TAP_TRACE } from './journeyWestC4Part2Program';
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
  'jtw-s1-c4-p1',
];
const P1_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-30T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p2'],
  chapter_seals: [],
};
const instantSleep = async () => undefined;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p2']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC4Part2Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function reachObservation() {
  await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'));
  fireEvent.click(screen.getByRole('button', { name: '不会；他应该等观众点他' }));
}

async function runBothEvents() {
  fireEvent.click(screen.getByTestId('jtw-c4p2-run-go'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-start-trace')).toHaveTextContent(
      C4_P2_START_TRACE.join(' → '),
    ),
  );
  expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveTextContent('Go中没有Tap轨迹');
  fireEvent.click(screen.getByTestId('jtw-c4p2-reset'));
  fireEvent.click(screen.getByTestId('jtw-c4p2-tap-wukong'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveTextContent(
      C4_P2_TAP_TRACE.join(' → '),
    ),
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P1_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p2',
    completed_at: '2026-07-31T02:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC4Part2Page · 一个名字，两个开始', () => {
  it('is locked unless the server says P2 is adjacent-unlocked', async () => {
    fetchProgress.mockResolvedValue({ ...P1_DONE, unlocked_part_ids: PRIOR_PART_IDS });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c4-p2')).not.toBeInTheDocument();
  });

  it('requires both story cards and the correct prediction before Go', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '会；按Go就应该马上Hop' }));
    expect(screen.getByTestId('jtw-c4p2-run-go')).toBeDisabled();
    fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'));
    expect(screen.getByTestId('jtw-c4p2-run-go')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '不会；他应该等观众点他' }));
    expect(screen.getByTestId('jtw-c4p2-run-go')).toBeEnabled();
  });

  it('measures a Start-only run, reset, and a real Tap run before resolving', async () => {
    renderPage();
    await reachObservation();
    await runBothEvents();
    expect(screen.getByTestId('jtw-c4p2-resolved')).toHaveTextContent(
      '“会做什么”和“什么时候做”是两个问题',
    );
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled();
  });

  it('persists separate event traces and unlocks only the adjacent Part', async () => {
    renderPage();
    await reachObservation();
    await runBothEvents();
    fireEvent.click(screen.getByTestId('jtw-c4p2-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p2', {
        schema_version: 1,
        selections: {
          story_screens: ['name-links-time', 'learning-takes-time'],
          start_event_trace: [...C4_P2_START_TRACE],
          tap_event_trace: [...C4_P2_TAP_TRACE],
          teaching_reset: ['completed'],
          event_comparison: ['go-ran-start-only', 'tap-ran-tap-only', 'hop-ran-too-early'],
        },
        prediction: 'wait-for-tap',
      }),
    );
    await waitFor(() => expect(screen.getByTestId('map-stub')).toBeInTheDocument());
  });

  it('restores persisted event evidence without rerunning or completing Chapter 4', async () => {
    fetchProgress.mockResolvedValue({
      ...P1_DONE,
      completed: [
        ...P1_DONE.completed,
        {
          part_id: 'jtw-s1-c4-p2',
          completed_at: '2026-07-31T02:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['name-links-time', 'learning-takes-time'],
              start_event_trace: [...C4_P2_START_TRACE],
              tap_event_trace: [...C4_P2_TAP_TRACE],
              teaching_reset: ['completed'],
              event_comparison: [
                'go-ran-start-only',
                'tap-ran-tap-only',
                'hop-ran-too-early',
              ],
            },
            prediction: 'wait-for-tap',
          },
        },
      ],
      unlocked_part_ids: [...P1_DONE.unlocked_part_ids, 'jtw-s1-c4-p3'],
      chapter_seals: [{ seal_id: 'jtw-s1-c4-naming-seal', chapter_code: 'C4', lit: false, missing: ['p3'] }],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled());
    expect(screen.getByTestId('jtw-c4p2-start-trace')).toHaveTextContent('hop');
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveTextContent('turn_right');
  });
});
