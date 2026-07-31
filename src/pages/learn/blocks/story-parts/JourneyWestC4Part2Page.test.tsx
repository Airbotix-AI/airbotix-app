// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC4Part2Page } from './JourneyWestC4Part2Page';
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
const instant = async () => undefined;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p2']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC4Part2Page previewSleep={instant} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function readAndPredict() {
  fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'));
  fireEvent.click(
    screen.getByRole('button', {
      name: '名字会出现；如果不点悟空，本领应该保持安静',
    }),
  );
}

async function runBothEvents() {
  readAndPredict();
  fireEvent.click(screen.getByTestId('jtw-c4p2-go'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-flag-trace')).toHaveTextContent(
      'when_flag → show → say → hop → end',
    ),
  );
  expect(screen.queryByTestId('jtw-c4p2-tap-trace')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('jtw-c4p2-sprite'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveTextContent(
      'when_tap → turn_right → end',
    ),
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P1_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p2',
    completed_at: '2026-07-30T00:10:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC4Part2Page · 一个名字，两个开始', () => {
  it('is locked until the server unlocks C4-P2', async () => {
    fetchProgress.mockResolvedValue({ ...P1_DONE, unlocked_part_ids: PRIOR_PART_IDS });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-locked')).toBeInTheDocument());
  });

  it('requires both story screens and the correct prediction before Go', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c4p2-name-board')).toHaveTextContent('孙悟空');
    expect(screen.getByTestId('jtw-c4p2-go')).toBeDisabled();
    fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'));
    fireEvent.click(screen.getByRole('button', { name: '名字和本领都应该在 Go 后一起开始' }));
    expect(screen.getByTestId('jtw-c4p2-go')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', {
        name: '名字会出现；如果不点悟空，本领应该保持安静',
      }),
    );
    expect(screen.getByTestId('jtw-c4p2-go')).toBeEnabled();
  });

  it('measures the faulty flag run without inventing a tap trace', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument());
    readAndPredict();
    fireEvent.click(screen.getByTestId('jtw-c4p2-go'));
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-flag-trace')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c4p2-flag-trace')).toHaveTextContent(
      'Hop 却在小旗链里抢跑了',
    );
    expect(screen.queryByTestId('jtw-c4p2-tap-trace')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeDisabled();
  });

  it('requires a real tap run and the correct event comparison', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument());
    await runBothEvents();
    fireEvent.click(screen.getByRole('button', { name: '两个入口其实都在等 Go' }));
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Go 走小旗链；点悟空才走指尖链' }));
    expect(screen.getByTestId('jtw-c4p2-resolved')).toHaveTextContent(
      '会做什么，和什么时候做，是两个问题',
    );
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled();
  });

  it('persists the two measured traces and unlocks only C4-P3', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument());
    await runBothEvents();
    fireEvent.click(screen.getByRole('button', { name: 'Go 走小旗链；点悟空才走指尖链' }));
    fireEvent.click(screen.getByTestId('jtw-c4p2-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s1',
        'jtw-s1-c4-p2',
        {
          schema_version: 1,
          selections: {
            story_screens: ['name-story', 'two-starts'],
            flag_trace: ['when_flag', 'show', 'say', 'hop', 'end'],
            tap_trace: ['when_tap', 'turn_right', 'end'],
            event_comparison: ['flag-and-tap-differ'],
            observed_bug: ['hop-ran-on-flag'],
          },
          prediction: 'name-only-before-tap',
        },
      ),
    );
    await waitFor(() => expect(screen.getByTestId('map-stub')).toBeInTheDocument());
  });

  it('restores completed evidence without creating a project or replaying a fake event', async () => {
    fetchProgress.mockResolvedValue({
      ...P1_DONE,
      completed: [
        ...P1_DONE.completed,
        {
          part_id: 'jtw-s1-c4-p2',
          completed_at: '2026-07-30T00:10:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['name-story', 'two-starts'],
              flag_trace: ['when_flag', 'show', 'say', 'hop', 'end'],
              tap_trace: ['when_tap', 'turn_right', 'end'],
              event_comparison: ['flag-and-tap-differ'],
              observed_bug: ['hop-ran-on-flag'],
            },
            prediction: 'name-only-before-tap',
          },
        },
      ],
      unlocked_part_ids: [...P1_DONE.unlocked_part_ids, 'jtw-s1-c4-p3'],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled());
    expect(screen.getByTestId('jtw-c4p2-flag-trace')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toBeInTheDocument();
  });
});
