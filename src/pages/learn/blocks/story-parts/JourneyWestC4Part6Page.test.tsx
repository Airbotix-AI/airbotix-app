// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as blocksApi from '../blocksApi';
import * as storyApi from './storyPartsApi';
import { JourneyWestC4Part6Page } from './JourneyWestC4Part6Page';

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-p6' } }) }));
vi.mock('../blocksApi', async (original) => ({ ...(await original<typeof blocksApi>()), listBlocksProjects: vi.fn(), loadBlocksProject: vi.fn(), createBlocksProject: vi.fn() }));
vi.mock('./storyPartsApi', async (original) => ({ ...(await original<typeof storyApi>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn() }));

const fetchProgress = vi.mocked(storyApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyApi.completeStoryPart);
const listProjects = vi.mocked(blocksApi.listBlocksProjects);
const loadProject = vi.mocked(blocksApi.loadBlocksProject);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p6']}><Routes><Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part6Page />} /><Route path="/learn/story/journey-west" element={<div data-testid="map" />} /></Routes></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: ['jtw-s1-c4-p6'], completed: [{ part_id: 'jtw-s1-c4-p5', completed_at: '2026-08-08T00:00:00Z', evidence: { schema_version: 1, selections: { version: ['hop'] } } }] });
  listProjects.mockResolvedValue([{ id: 'p6-build', title: 'P6', kind: 'blocks', status: 'active' }]);
  loadProject.mockResolvedValue({ version: 2, history: { past: [], future: [] }, otherFiles: [], storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c4-p6': { completedAt: '2026-08-08T00:00:00Z' } } }, project: { version: 1, name: 'P6', lessonId: 'jtw-s1-c4-p6', pages: [{ id: 'jtw-c4-p6-page', background: 'jtw-s1-c4-mountain-gate', characters: [{ id: 'sun-wukong', name: '孙悟空', emoji: '🐒', asset: '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png', start: { gx: 10, gy: 9, size: 3, rot: 0 }, scripts: [{ id: 'sun-wukong-name', blocks: [{ op: 'when_flag' }, { op: 'show' }, { op: 'say', text: '我是孙悟空' }, { op: 'end' }] }, { id: 'sun-wukong-skill', blocks: [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '我等到邀请了' }, { op: 'end' }] }] }] }] } });
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p6', completed_at: '2026-08-08T00:00:00Z' });
});

describe('JourneyWestC4Part6Page', () => {
  it('requires prediction, real buggy run, first deviation and repaired dual-run project', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p6');
    expect(screen.getByTestId('jtw-c4p6-open-studio')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Go只得名，Tap才展示' }));
    fireEvent.click(screen.getByTestId('jtw-c4p6-run-bug'));
    await waitFor(() => expect(screen.getByTestId('jtw-c4p6-bug-trace')).toHaveTextContent('hop'), { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: '本领链使用了when_flag' }));
    await waitFor(() => expect(screen.getByTestId('jtw-c4p6-continue')).toBeEnabled());
    fireEvent.click(screen.getByTestId('jtw-c4p6-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p6', expect.objectContaining({ selections: expect.objectContaining({ trigger_diff: ['when_flag->when_tap'], skill_version: ['hop'] }) })));
  });
});
