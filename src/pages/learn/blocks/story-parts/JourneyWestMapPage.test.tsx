// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestMapPage } from './JourneyWestMapPage';
import * as storyPartsApi from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);

function renderMap() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <JourneyWestMapPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestMapPage', () => {
  it('opens only the chapter-entry part for a fresh kid; all 50 parts render', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c1-p1'],
    });
    renderMap();

    await waitFor(() =>
      expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p1').dataset.state).toBe('open'),
    );
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p2').dataset.state).toBe('locked');
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c6-p10').dataset.state).toBe('locked');
    expect(document.querySelectorAll('[data-testid^="jtw-map-part-"]')).toHaveLength(50);
  });

  it('after P1 completes, exactly P2 unlocks (open — its build has shipped)', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [
        { part_id: 'jtw-s1-c1-p1', completed_at: '2026-07-24T04:00:00.000Z', evidence: {} },
      ],
      unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2'],
    });
    renderMap();

    await waitFor(() =>
      expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p1').dataset.state).toBe('completed'),
    );
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p2').dataset.state).toBe('open');
    // Unlock is adjacent-only — P3 and every later part stay locked.
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p3').dataset.state).toBe('locked');
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c2-p1').dataset.state).toBe('locked');
  });
});
