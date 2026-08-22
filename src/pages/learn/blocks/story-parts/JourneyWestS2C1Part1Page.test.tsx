// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestS2C1Part1Page } from './JourneyWestS2C1Part1Page';
import * as storyPartsApi from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s2-c1-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestS2C1Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s2',
    completed: [],
    unlocked_part_ids: ['jtw-s2-c1-p1'],
  });
  completePart.mockResolvedValue({ part_id: 'jtw-s2-c1-p1', completed_at: '2026-08-15T00:00:00Z' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestS2C1Part1Page', () => {
  it('requires the story, the today-sized goal and the correct three-step order', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1-p1')).toBeInTheDocument());
    const continueButton = screen.getByTestId('jtw-s2-c1p1-continue');
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByTestId('jtw-s2-c1p1-read'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Today I walked the entire westbound road in one go' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      /Look at the small piece of paper on the table/i,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Complete the three steps on the note today' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Walk through the city gate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pack your bags' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to the first mountain' }));
    expect(continueButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pack your bags' }));
    fireEvent.click(screen.getByRole('button', { name: 'Walk through the city gate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to the first mountain' }));
    expect(screen.getByTestId('jtw-s2-c1p1-resolved')).toBeInTheDocument();
    expect(continueButton).toBeEnabled();
  });

  it('persists evidence and unlocks only the next Part', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1-p1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('jtw-s2-c1p1-read'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Complete the three steps on the note today' }),
    );
    for (const label of [
      'Pack your bags',
      'Walk through the city gate',
      'Go to the first mountain',
    ])
      fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByTestId('jtw-s2-c1p1-continue'));

    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s2', 'jtw-s2-c1-p1', {
        schema_version: 1,
        selections: {
          story_screens: ['story-card-1'],
          scope_choice: ['three-steps'],
          route_order: ['pack-bag', 'pass-gate', 'reach-mountain'],
        },
      }),
    );
    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument());
  });

  it('restores saved evidence after refresh', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [
        {
          part_id: 'jtw-s2-c1-p1',
          completed_at: '2026-08-15T00:00:00Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-1'],
              scope_choice: ['three-steps'],
              route_order: ['pack-bag', 'pass-gate', 'reach-mountain'],
            },
          },
        },
      ],
      unlocked_part_ids: ['jtw-s2-c1-p1', 'jtw-s2-c1-p2'],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1p1-resolved')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-s2-c1p1-continue')).toBeEnabled();
  });
});
