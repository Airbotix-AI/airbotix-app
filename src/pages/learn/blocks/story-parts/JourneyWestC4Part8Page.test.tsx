// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as blocksApi from '../blocksApi';
import * as storyApi from './storyPartsApi';
import { JourneyWestC4Part8Page } from './JourneyWestC4Part8Page';

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-p8' } }) }));
vi.mock('../blocksApi', async (original) => ({
  ...(await original<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
}));
vi.mock('./storyPartsApi', async (original) => ({
  ...(await original<typeof storyApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const project = {
  version: 1 as const,
  name: 'Meet Sun Wukong',
  lessonId: 'jtw-s1-c4-p7',
  pages: [
    {
      id: 'jtw-c4-p7-page',
      background: 'jtw-s1-c4-mountain-gate',
      characters: [
        {
          id: 'sun-wukong',
          name: 'Sun Wukong',
          emoji: '🐒',
          asset: '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png',
          start: { gx: 10, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'sun-wukong-name',
              blocks: [
                { op: 'when_flag' as const },
                { op: 'show' as const },
                { op: 'say' as const, text: 'I am Sun Wukong' },
                { op: 'end' as const },
              ],
            },
            {
              id: 'sun-wukong-skill',
              blocks: [
                { op: 'when_tap' as const },
                { op: 'hop' as const, n: 2 },
                { op: 'wait' as const, n: 1 },
                { op: 'say' as const, text: "I'm waiting for the invitation" },
                { op: 'end' as const },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p8']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part8Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    unlocked_part_ids: ['jtw-s1-c4-p8'],
    completed: [],
    chapter_seals: [
      {
        seal_id: 'jtw-s1-c4-naming-seal',
        chapter_code: 'C4',
        lit: false,
        missing: ['part:jtw-s1-c4-p8'],
      },
    ],
  });
  vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([
    { id: 'personal-p7', title: 'Meet Sun Wukong', kind: 'blocks', status: 'active' },
  ]);
  vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue({
    version: 7,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c4-p7': { completedAt: '2026-08-09T00:00:00Z' } },
    },
    project,
  });
  vi.mocked(storyApi.completeStoryPart).mockResolvedValue({
    part_id: 'jtw-s1-c4-p8',
    completed_at: '2026-08-09T00:00:00Z',
  });
});

afterEach(cleanup);

describe('JourneyWestC4Part8Page', () => {
  it('runs the saved P7 work through Go and real Tap before accepting the retell', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p8');
    for (const name of [
      /Leave Flower-Fruit Mountain/i,
      '⛩ Go to the door and explain your intention',
      '🏷 Get a name',
      '📚 After learning',
      '👆 Waiting for invitation',
      '✨ Show your skills',
    ])
      fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
    fireEvent.click(screen.getByTestId('jtw-c4p8-go'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c4p8-flag-trace')).toHaveTextContent(
        'when_flag → show → say → end',
      ),
    );
    expect(screen.getByTestId('jtw-c4p8-tap-trace')).toHaveTextContent(
      'Still waiting for invitation',
    );
    fireEvent.click(screen.getByTestId('jtw-c4p8-tap'));
    await waitFor(() =>
      expect(screen.getByTestId('jtw-c4p8-tap-trace')).toHaveTextContent(
        'when_tap → hop → wait → say → end',
      ),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Because Stone Monkey wanted to study seriously/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /I come from Flower-Fruit Mountain/i }));
    fireEvent.click(
      screen.getByRole('button', {
        name: /The Go track only goes through the name chain, and the real Tap goes through the skill chain, both of which go to End\./i,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /The first deviation of P6 was that the skill used the wrong Start Trigger\./i,
      }),
    );
    expect(screen.getByTestId('jtw-c4p8-complete')).toBeEnabled();
    fireEvent.click(screen.getByTestId('jtw-c4p8-complete'));
    await waitFor(() =>
      expect(storyApi.completeStoryPart).toHaveBeenCalledWith(
        'journey-to-the-west-s1',
        'jtw-s1-c4-p8',
        expect.objectContaining({
          selections: expect.objectContaining({
            run_project: ['personal-p7'],
            run_saved_version: ['7'],
            flag_trace: ['when_flag', 'show', 'say', 'end'],
            tap_trace: ['when_tap', 'hop', 'wait', 'say', 'end'],
          }),
        }),
      ),
    );
  });

  it('does not invent a project when the P7 saved work is missing', async () => {
    vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([]);
    renderPage();
    await screen.findByTestId('jtw-c4p8-work-missing');
    expect(screen.queryByTestId('jtw-c4p8-go')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c4p8-complete')).toBeDisabled();
  });
});
