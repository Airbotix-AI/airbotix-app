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
const PRIOR_PART_IDS = Array.from({ length: 24 }, (_, index) => {
  const chapter = Math.floor(index / 8) + 1;
  return `jtw-s1-c${chapter}-p${(index % 8) + 1}`;
});

const OPEN_PROGRESS: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-08-03T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1'],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function pickCorrectEvidence() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-read'));
  const route = within(screen.getByTestId('jtw-c4p1-route'));
  fireEvent.click(route.getByRole('button', { name: 'Flower-Fruit Mountain' }));
  fireEvent.click(route.getByRole('button', { name: 'sea ​​route' }));
  fireEvent.click(route.getByRole('button', { name: "master's gate" }));
  const motives = within(screen.getByTestId('jtw-c4p1-motives'));
  fireEvent.click(motives.getByRole('button', { name: 'willing to study seriously' }));
  fireEvent.click(
    motives.getByRole('button', { name: 'Want to take what I learned home with me' }),
  );
  fireEvent.click(
    within(screen.getByTestId('jtw-c4p1-prediction')).getByRole('button', {
      name: /"Being willing to study hard" and "bringing experiences home" are contradictory\./i,
    }),
  );
  fireEvent.click(
    within(screen.getByTestId('jtw-c4p1-why')).getByRole('button', {
      name: /Because there are still many things I don’t understand, I am willing to study hard and take the experience home\./i,
    }),
  );
}

describe('JourneyWestC4Part1Page', () => {
  beforeEach(() => {
    fetchProgress.mockResolvedValue(OPEN_PROGRESS);
    completePart.mockResolvedValue({ ok: true } as never);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('gates route cards behind reading and rejects distractor evidence', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p1');
    expect(screen.getByTestId('jtw-c4p1-stone-monkey')).toHaveAttribute(
      'alt',
      'The stone monkey still wearing an old cloth belt stands in front of the mountain gate',
    );
    expect(screen.queryByTestId('jtw-c4p1-route')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('jtw-c4p1-read'));
    const motives = within(screen.getByTestId('jtw-c4p1-motives'));
    fireEvent.click(motives.getByRole('button', { name: 'Looking for shiny treasures' }));
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c4p1-resolved')).not.toBeInTheDocument();
  });

  it('persists Read/Why evidence and creates no project before unlocking only P2', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p1');
    pickCorrectEvidence();
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent(
      'empty name plate',
    );
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p1', {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-a'],
        route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
        motive_evidence: ['willing-to-learn', 'bring-learning-home'],
        why_retell: ['learn-and-return'],
      },
      prediction: 'learning-and-return-conflict',
    });
    const evidence = completePart.mock.calls[0][2];
    expect(evidence.selections.build_project).toBeUndefined();
    expect(evidence.selections.saved_version).toBeUndefined();
    await screen.findByTestId('map');
  });

  it('restores completed evidence after refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...OPEN_PROGRESS,
      completed: [
        ...OPEN_PROGRESS.completed,
        {
          part_id: 'jtw-s1-c4-p1',
          completed_at: '2026-08-03T01:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-a'],
              route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
              motive_evidence: ['willing-to-learn', 'bring-learning-home'],
              why_retell: ['learn-and-return'],
            },
            prediction: 'learning-and-return-conflict',
          },
        },
      ],
      unlocked_part_ids: [...OPEN_PROGRESS.unlocked_part_ids, 'jtw-s1-c4-p2'],
    });
    renderPage();
    expect(await screen.findByTestId('jtw-c4p1-resolved')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled();
  });
});
