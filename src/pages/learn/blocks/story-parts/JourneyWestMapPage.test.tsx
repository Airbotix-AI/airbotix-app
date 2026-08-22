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
  it('opens each season entry for a fresh kid and renders the shipped S2 frontier', async () => {
    fetchProgress.mockImplementation(async (storyLineId) => ({
      story_line_id: storyLineId,
      completed: [],
      unlocked_part_ids: [
        storyLineId === 'journey-to-the-west-s2' ? 'jtw-s2-c1-p1' : 'jtw-s1-c1-p1',
      ],
    }));
    renderMap();

    await waitFor(() =>
      expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p1').dataset.state).toBe('open'),
    );
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p2').dataset.state).toBe('locked');
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c6-p10').dataset.state).toBe('locked');
    expect(document.querySelectorAll('[data-testid^="jtw-map-part-"]')).toHaveLength(98);
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c1-p1').dataset.state).toBe('open');
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c1-p2').dataset.state).toBe('locked');
  });

  it('after P1 completes, exactly P2 unlocks (open — its build has shipped)', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s2-c1-p1'] }
        : {
            story_line_id: storyLineId,
            completed: [
              { part_id: 'jtw-s1-c1-p1', completed_at: '2026-07-24T04:00:00.000Z', evidence: {} },
            ],
            unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2'],
          },
    );
    renderMap();

    await waitFor(() =>
      expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p1').dataset.state).toBe('completed'),
    );
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p2').dataset.state).toBe('open');
    // Unlock is adjacent-only — P3 and every later part stay locked.
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c1-p3').dataset.state).toBe('locked');
    expect(screen.getByTestId('jtw-map-part-jtw-s1-c2-p1').dataset.state).toBe('locked');
  });

  it('shows S2 P2 as playable after S2 P1 completes', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? {
            story_line_id: storyLineId,
            completed: [{ part_id: 'jtw-s2-c1-p1', completed_at: 'now', evidence: {} }],
            unlocked_part_ids: ['jtw-s2-c1-p1', 'jtw-s2-c1-p2'],
          }
        : { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s1-c1-p1'] },
    );
    renderMap();
    await waitFor(() => expect(screen.getByTestId('jtw-map-part-jtw-s2-c1-p1').dataset.state).toBe('completed'));
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c1-p2').dataset.state).toBe('open');
    expect(screen.getByRole('link', { name: /为什么先写三步/ })).toBeInTheDocument();
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c1-p3').dataset.state).toBe('locked');
  });

  it('shows the implemented S2 P3 as playable after S2 P2 completes', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? {
            story_line_id: storyLineId,
            completed: [
              { part_id: 'jtw-s2-c1-p1', completed_at: 'now', evidence: {} },
              { part_id: 'jtw-s2-c1-p2', completed_at: 'now', evidence: {} },
            ],
            unlocked_part_ids: ['jtw-s2-c1-p1', 'jtw-s2-c1-p2', 'jtw-s2-c1-p3'],
          }
        : { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s1-c1-p1'] },
    );
    renderMap();
    await waitFor(() => expect(screen.getByTestId('jtw-map-part-jtw-s2-c1-p2').dataset.state).toBe('completed'));
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c1-p3').dataset.state).toBe('open');
    expect(screen.getByRole('link', { name: /先在桌面上走一遍/ })).toBeInTheDocument();
  });

  it('shows implemented C2-P6 and C2-P7 in the playable chain, with C4-P1 as the frontier', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? {
            story_line_id: storyLineId,
            completed: [{ part_id: 'jtw-s2-c2-p5', completed_at: 'now', evidence: {} }],
            unlocked_part_ids: ['jtw-s2-c2-p5', 'jtw-s2-c2-p6'],
          }
        : { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s1-c1-p1'] },
    );
    renderMap();
    await waitFor(() => expect(screen.getByTestId('jtw-map-part-jtw-s2-c2-p5').dataset.state).toBe('completed'));
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c2-p6').dataset.state).toBe('open');
    expect(screen.getByRole('link', { name: /谁回答得太早/ })).toBeInTheDocument();
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c2-p7').dataset.state).toBe('locked');
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p1').dataset.state).toBe('locked');
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p2').dataset.state).toBe('locked');
  });

  it('opens implemented C4-P1 and keeps C4-P2 locked until its predecessor completes', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s2-c4-p1'] }
        : { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s1-c1-p1'] },
    );
    renderMap();
    await waitFor(() => expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p1').dataset.state).toBe('open'));
    expect(screen.getByRole('link', { name: /蓝边路线卡送错了谁/ })).toBeInTheDocument();
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p2').dataset.state).toBe('locked');
  });

  it('opens implemented C4-P2 and keeps C4-P3 locked until its predecessor completes', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s2-c4-p2'] }
        : { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s1-c1-p1'] },
    );
    renderMap();
    await waitFor(() => expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p2').dataset.state).toBe('open'));
    expect(screen.getByRole('link', { name: /为什么先认同一种信号/ })).toBeInTheDocument();
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p3').dataset.state).toBe('locked');
  });

  it('opens implemented C4-P3 and keeps C4-P4 as the honest frontier', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s2-c4-p3'] }
        : { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s1-c1-p1'] },
    );
    renderMap();
    await waitFor(() => expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p3').dataset.state).toBe('open'));
    expect(screen.getByRole('link', { name: /哪一对颜色能把消息接通/ })).toBeInTheDocument();
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c4-p4').dataset.state).toBe('locked');
  });

  it('opens implemented C5-P5 and keeps adjacent C5-P6 locked', async () => {
    fetchProgress.mockImplementation(async (storyLineId) =>
      storyLineId === 'journey-to-the-west-s2'
        ? { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s2-c5-p5'] }
        : { story_line_id: storyLineId, completed: [], unlocked_part_ids: ['jtw-s1-c1-p1'] },
    );
    renderMap();
    await waitFor(() => expect(screen.getByTestId('jtw-map-part-jtw-s2-c5-p5').dataset.state).toBe('open'));
    expect(screen.getByRole('link', { name: /紫色回执回到悟空/ })).toBeInTheDocument();
    expect(screen.getByTestId('jtw-map-part-jtw-s2-c5-p6').dataset.state).toBe('locked');
  });
});
