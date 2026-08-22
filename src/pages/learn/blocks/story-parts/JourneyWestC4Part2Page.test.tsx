// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const OPEN_PROGRESS: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [{ part_id: 'jtw-s1-c4-p1', completed_at: '2026-08-03T00:00:00.000Z', evidence: {} }],
  unlocked_part_ids: ['jtw-s1-c4-p2'],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p2']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part2Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function runBothEvents() {
  fireEvent.click(screen.getByTestId('jtw-c4p2-read'));
  fireEvent.click(
    within(screen.getByTestId('jtw-c4p2-prediction')).getByRole('button', {
      name: 'When the name appears, the ability remains quiet',
    }),
  );
  fireEvent.click(screen.getByTestId('jtw-c4p2-go'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-flag-trace')).toHaveAttribute(
      'data-trace',
      'when_flag,show,say,hop,end',
    ),
  );
  expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveAttribute('data-trace', '');
  fireEvent.click(screen.getByTestId('jtw-c4p2-reset'));
  fireEvent.click(screen.getByTestId('jtw-c4p2-tap'));
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveAttribute(
      'data-trace',
      'when_tap,turn_right,end',
    ),
  );
}

describe('JourneyWestC4Part2Page', () => {
  beforeEach(() => {
    fetchProgress.mockResolvedValue(OPEN_PROGRESS);
    completePart.mockResolvedValue({ ok: true } as never);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('requires the story and correct no-tap prediction before the real Go run', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p2');
    expect(screen.getByTestId('jtw-c4p2-go')).toBeDisabled();
    fireEvent.click(screen.getByTestId('jtw-c4p2-read'));
    fireEvent.click(
      within(screen.getByTestId('jtw-c4p2-prediction')).getByRole('button', {
        name: 'He will hop first without waiting for tap',
      }),
    );
    expect(screen.getByTestId('jtw-c4p2-go')).toBeDisabled();
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeDisabled();
  });

  it('measures separate real flag and tap traces, with reset between them', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p2');
    await runBothEvents();
    expect(screen.getByTestId('jtw-c4p2-early-hop')).toHaveTextContent(/jumped the gun/i);
    expect(screen.getByTestId('jtw-c4p2-resolved')).toHaveTextContent('when will you do it');
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled();
  });

  it('persists both event traces and unlocks only P3', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p2');
    await runBothEvents();
    fireEvent.click(screen.getByTestId('jtw-c4p2-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p2', {
      schema_version: 1,
      selections: {
        story_screens: ['story-screen-2'],
        flag_trace: ['when_flag', 'show', 'say', 'hop', 'end'],
        tap_trace: ['when_tap', 'turn_right', 'end'],
        teaching_reset: ['between-events'],
        event_comparison: ['flag-name-plus-early-hop', 'tap-turn-only'],
      },
      prediction: 'name-only',
    });
    await screen.findByTestId('map');
  });
});
