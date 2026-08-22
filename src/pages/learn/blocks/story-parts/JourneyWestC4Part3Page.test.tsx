// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC4Part3Page } from './JourneyWestC4Part3Page';
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
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p3']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part3Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('JourneyWestC4Part3Page', () => {
  beforeEach(() => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [
        { part_id: 'jtw-s1-c4-p2', completed_at: '2026-08-03T00:00:00.000Z', evidence: {} },
      ],
      unlocked_part_ids: ['jtw-s1-c4-p3'],
    });
    completePart.mockResolvedValue({ ok: true } as never);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('requires both trigger evidence and the corrected card circles', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p3');
    fireEvent.click(screen.getByTestId('jtw-c4p3-read'));
    fireEvent.click(screen.getByRole('button', { name: 'Start Wait for the scene to start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap and other audience invitations' }));
    fireEvent.click(screen.getByRole('button', { name: /Name card: I am Sun Wukong/i }));
    fireEvent.click(screen.getByRole('button', { name: /Action Card: Turn/i }));
    fireEvent.click(screen.getByRole('button', { name: /Action Card: Turn/i }));
    fireEvent.click(screen.getByRole('button', { name: /Action card: Hop step/i }));
    fireEvent.click(screen.getByRole('button', { name: /Action card: Hop step/i }));
    fireEvent.click(screen.getByRole('button', { name: /Action card: Hide → Show/i }));
    fireEvent.click(screen.getByRole('button', { name: /Action card: Hide → Show/i }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Turning around will lead to a false start when the flag is raised, and the two entrances are mixed together.',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '🚩 Flag raising drill' }));
    fireEvent.click(screen.getByRole('button', { name: '👆 Paper Card Tap Walkthrough' }));
    expect(screen.getByTestId('jtw-c4p3-resolved')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('jtw-c4p3-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s1',
        'jtw-s1-c4-p3',
        expect.objectContaining({
          prediction: 'cross',
          selections: expect.objectContaining({
            trigger_evidence: ['start-waits-scene', 'tap-waits-invite'],
            rehearsals: ['start', 'tap'],
          }),
        }),
      ),
    );
  });
});
