// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JourneyWestC4Part5Page } from './JourneyWestC4Part5Page';
import * as blocksApi from '../blocksApi';
import * as storyApi from './storyPartsApi';

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-p5' } }) }));
vi.mock('../blocksApi', async (original) => ({
  ...(await original<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
  createBlocksProject: vi.fn(),
}));
vi.mock('./storyPartsApi', async (original) => ({
  ...(await original<typeof storyApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyApi.completeStoryPart);
const listProjects = vi.mocked(blocksApi.listBlocksProjects);
const loadProject = vi.mocked(blocksApi.loadBlocksProject);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p5']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part5Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [],
    unlocked_part_ids: ['jtw-s1-c4-p5'],
  });
  listProjects.mockResolvedValue([
    { id: 'p5-build', title: 'P5', kind: 'blocks', status: 'active' },
  ]);
  loadProject.mockResolvedValue({
    version: 3,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c4-p5': { completedAt: '2026-08-05T00:00:00Z' } },
    },
    project: {
      version: 1,
      name: 'P5',
      lessonId: 'jtw-s1-c4-p5',
      pages: [
        {
          id: 'jtw-c4-p5-page',
          background: 'jtw-s1-c4-mountain-gate',
          characters: [
            {
              id: 'sun-wukong',
              name: 'Sun Wukong',
              emoji: '🐒',
              asset:
                '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png',
              start: { gx: 10, gy: 9, size: 3, rot: 0 },
              scripts: [
                {
                  id: 'sun-wukong-name',
                  blocks: [
                    { op: 'when_flag' },
                    { op: 'show' },
                    { op: 'say', text: '我是孙悟空' },
                    { op: 'end' },
                  ],
                },
                {
                  id: 'sun-wukong-skill',
                  blocks: [
                    { op: 'when_tap' },
                    { op: 'hop', n: 2 },
                    { op: 'say', text: '我等到邀请了' },
                    { op: 'end' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p5', completed_at: '2026-08-05T00:00:00Z' });
});

describe('JourneyWestC4Part5Page', () => {
  it('requires motive, matching version, partner prediction and real runs', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p5');
    fireEvent.click(screen.getByRole('button', { name: /等观众准备好/ }));
    fireEvent.click(screen.getByRole('button', { name: /跃过叶纹/ }));
    fireEvent.click(screen.getByRole('button', { name: /Go只显示名字/ }));
    await waitFor(() => expect(screen.getByTestId('jtw-c4p5-continue')).toBeEnabled());
    fireEvent.click(screen.getByTestId('jtw-c4p5-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s1',
        'jtw-s1-c4-p5',
        expect.objectContaining({
          selections: expect.objectContaining({
            skill_version: ['leaf'],
            build_project: ['p5-build'],
            runner_result: ['flag:name-only:end', 'tap:leaf:visible:end'],
          }),
        }),
      ),
    );
  });

  it('refuses a selection that differs from the saved program', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p5');
    fireEvent.click(screen.getByRole('button', { name: /等观众准备好/ }));
    fireEvent.click(screen.getByRole('button', { name: /转身指家/ }));
    fireEvent.click(screen.getByRole('button', { name: /Go只显示名字/ }));
    expect(screen.getByTestId('jtw-c4p5-continue')).toBeDisabled();
  });
});
