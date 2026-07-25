// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC2Part5Page } from './JourneyWestC2Part5Page';
import * as blocksApi from '../blocksApi';
import * as storyPartsApi from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
  createBlocksProject: vi.fn(),
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_a', role: 'kid', nickname: 'Mia' } }),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);
const listProjects = vi.mocked(blocksApi.listBlocksProjects);
const loadProject = vi.mocked(blocksApi.loadBlocksProject);

function project() {
  return {
    version: 1,
    name: 'C2-P5',
    lessonId: 'jtw-s1-c2-p5',
    pages: [{
      id: 'jtw-c2-p5-page',
      background: 'jtw-s1-c2-stage-base',
      characters: [
        {
          id: 'stone-monkey', name: 'Stone Monkey', emoji: '🐵',
          start: { gx: 2, gy: 8, size: 3, rot: 0 },
          scripts: [{ id: 'stone-monkey-route-to-curtain', blocks: [
            { op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'move_right', n: 1 },
            { op: 'move_up', n: 1 }, { op: 'move_right', n: 1 },
            { op: 'move_right', n: 1 }, { op: 'end' },
          ] }],
        },
        {
          id: 'water-curtain-trigger', name: 'Water Curtain', emoji: '💦',
          asset: '/story-blocks/journey-to-the-west/props/water-curtain-trigger/initial-v01.png',
          start: { gx: 6, gy: 7, size: 3, rot: 0, reach: 0.5 },
          scripts: [{ id: 'water-curtain-open', blocks: [
            { op: 'when_bump' }, { op: 'hide' }, { op: 'play_sound', n: 2 }, { op: 'end' },
          ] }],
        },
        {
          id: 'cave-entrance', name: 'Cave Entrance', emoji: '🪨',
          asset: '/story-blocks/journey-to-the-west/props/cave-entrance/revealed-v01.png',
          start: { gx: 6, gy: 7, size: 3, rot: 0, visible: false, reach: 0.5 },
          scripts: [{ id: 'cave-entrance-reveal', blocks: [
            { op: 'when_bump' }, { op: 'show' },
            { op: 'say', text: '桥、干地、石座、清水。' }, { op: 'end' },
          ] }],
        },
      ],
    }],
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p5']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC2Part5Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [],
    unlocked_part_ids: ['jtw-s1-c2-p5'],
  });
  listProjects.mockResolvedValue([{ id: 'proj_p5', title: 'C2-P5', kind: 'blocks', status: 'active' }]);
  loadProject.mockResolvedValue({
    project: project(),
    version: 2,
    history: { past: [], future: [] },
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c2-p5': { completedAt: '2026-07-25T11:00:00.000Z' } },
    },
    otherFiles: [],
  } as never);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c2-p5',
    completed_at: '2026-07-25T11:10:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC2Part5Page', () => {
  it('requires real saved bump tracks, prediction, and three cave clues before adjacent unlock', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p5-build-done')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c2p5-stage')).toHaveAttribute('data-state', 'before');
    fireEvent.click(screen.getByRole('button', { name: '只看见空的崖壁，找不到洞内证据' }));
    fireEvent.click(screen.getByRole('button', { name: '石桥' }));
    fireEvent.click(screen.getByRole('button', { name: '干爽地面' }));
    fireEvent.click(screen.getByRole('button', { name: '石座' }));
    expect(screen.getByTestId('jtw-c2p5-stage')).toHaveAttribute('data-state', 'resolved');
    fireEvent.click(screen.getByTestId('jtw-c2p5-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s1',
        'jtw-s1-c2-p5',
        expect.objectContaining({
          prediction: 'empty-cliff',
          selections: expect.objectContaining({
            bump_tracks: ['water-curtain-hide', 'cave-entrance-show'],
            build_project: ['proj_p5'],
          }),
        }),
      ),
    );
    expect(await screen.findByTestId('map-stub')).toBeInTheDocument();
  });
});
