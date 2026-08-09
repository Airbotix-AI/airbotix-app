// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as blocksApi from '../blocksApi';
import * as storyApi from './storyPartsApi';
import { JourneyWestC4Part7Page } from './JourneyWestC4Part7Page';

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-p7' } }) }));
vi.mock('../blocksApi', async (original) => ({ ...(await original<typeof blocksApi>()), listBlocksProjects: vi.fn(), loadBlocksProject: vi.fn(), createBlocksProject: vi.fn() }));
vi.mock('./storyPartsApi', async (original) => ({ ...(await original<typeof storyApi>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn() }));

const project = { version: 1 as const, name: 'Meet Sun Wukong', lessonId: 'jtw-s1-c4-p7', pages: [{ id: 'jtw-c4-p7-page', background: 'jtw-s1-c4-mountain-gate', characters: [{ id: 'sun-wukong', name: '孙悟空', emoji: '🐒', asset: '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png', start: { gx: 10, gy: 9, size: 3, rot: 0 }, scripts: [{ id: 'sun-wukong-name', blocks: [{ op: 'when_flag' as const }, { op: 'show' as const }, { op: 'say' as const, text: '我是孙悟空' }, { op: 'end' as const }] }, { id: 'sun-wukong-skill', blocks: [{ op: 'when_tap' as const }, { op: 'hop' as const, n: 2 }, { op: 'wait' as const, n: 1 }, { op: 'say' as const, text: '我等到邀请了' }, { op: 'end' as const }] }] }] }] };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p7']}><Routes><Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part7Page />} /><Route path="/learn/story/journey-west" element={<div data-testid="map" />} /></Routes></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: ['jtw-s1-c4-p7'], completed: [] });
  vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([{ id: 'personal-p7', title: 'Meet Sun Wukong', kind: 'blocks', status: 'active' }]);
  vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue({ version: 2, history: { past: [], future: [] }, otherFiles: [], storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c4-p7': { completedAt: '2026-08-09T00:00:00Z' } } }, project });
  vi.mocked(storyApi.completeStoryPart).mockResolvedValue({ part_id: 'jtw-s1-c4-p7', completed_at: '2026-08-09T00:00:00Z' });
});

describe('JourneyWestC4Part7Page', () => {
  it('requires dual-event prediction, real saved run, peer discovery and exact reopen read-back', async () => {
    renderPage();
    await screen.findByTestId('jtw-part-c4-p7');
    fireEvent.click(screen.getByRole('button', { name: 'Go只得名，Tap才展示' }));
    fireEvent.click(screen.getByRole('button', { name: /跃过叶纹/ }));
    await waitFor(() => expect(screen.getByTestId('jtw-c4p7-build-status')).toHaveTextContent('VFS'));
    fireEvent.click(screen.getByRole('button', { name: '先看名字，再从轻微指尖目标发现悟空可点' }));
    fireEvent.click(screen.getByTestId('jtw-c4p7-reopen'));
    await waitFor(() => expect(screen.getByTestId('jtw-c4p7-continue')).toBeEnabled());
    fireEvent.click(screen.getByTestId('jtw-c4p7-continue'));
    await waitFor(() => expect(storyApi.completeStoryPart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p7', expect.objectContaining({ selections: expect.objectContaining({ reopen_json_match: ['true'], peer_discovery: ['found-wukong-by-gentle-cue'] }) })));
  });

  it('rejects a reopened project whose saved JSON changed', async () => {
    vi.mocked(blocksApi.loadBlocksProject).mockResolvedValueOnce({ version: 2, history: { past: [], future: [] }, otherFiles: [], storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c4-p7': { completedAt: '2026-08-09T00:00:00Z' } } }, project }).mockResolvedValueOnce({ version: 3, history: { past: [], future: [] }, otherFiles: [], storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c4-p7': { completedAt: '2026-08-09T00:00:00Z' } } }, project: { ...project, name: 'Changed' } });
    renderPage();
    await screen.findByTestId('jtw-part-c4-p7');
    fireEvent.click(screen.getByRole('button', { name: 'Go只得名，Tap才展示' }));
    fireEvent.click(screen.getByRole('button', { name: /跃过叶纹/ }));
    fireEvent.click(await screen.findByRole('button', { name: '先看名字，再从轻微指尖目标发现悟空可点' }));
    fireEvent.click(screen.getByTestId('jtw-c4p7-reopen'));
    await waitFor(() => expect(screen.getByTestId('jtw-c4p7-reopen-status')).toHaveTextContent('尚未'));
    expect(screen.getByTestId('jtw-c4p7-continue')).toBeDisabled();
  });
});
