// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as blocksApi from '../blocksApi'
import * as storyApi from './storyPartsApi'
import { JourneyWestC5FinalPartsPage } from './JourneyWestC5FinalPartsPage'
import { c5PersonalProject } from './journeyWestC5Program'
import { C5_P7_TARGETS } from '../jtwC5C6Builds'

vi.mock('../blocksApi', async (original) => ({ ...(await original<typeof blocksApi>()), createBlocksProject: vi.fn(), listBlocksProjects: vi.fn(), loadBlocksProject: vi.fn() }))
vi.mock('./storyPartsApi', async (original) => ({ ...(await original<typeof storyApi>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn() }))
vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-c5' } }) }))

const personal = c5PersonalProject(['grow', 'wait', 'reset_size', 'shrink', 'wait'], 3)
function renderPart(partId: 'jtw-s1-c5-p6' | 'jtw-s1-c5-p7' | 'jtw-s1-c5-p8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><JourneyWestC5FinalPartsPage partId={partId} /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: ['jtw-s1-c5-p6', 'jtw-s1-c5-p7', 'jtw-s1-c5-p8'], completed: [] })
  vi.mocked(storyApi.completeStoryPart).mockResolvedValue({ part_id: 'done', completed_at: '2026-08-09T00:00:00Z' })
  vi.mocked(blocksApi.createBlocksProject).mockResolvedValue({ id: 'ruyi-vfs' })
  vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue({ project: personal, version: 1, history: { past: [], future: [] }, otherFiles: [] })
  vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([])
})
afterEach(cleanup)

describe('JourneyWestC5FinalPartsPage', () => {
  it('preserves the buggy trace and accepts only the Reset position repair twice', async () => {
    renderPart('jtw-s1-c5-p6'); await screen.findByText(/末尾藏着 Reset/)
    fireEvent.click(screen.getByRole('button', { name: /第一次偏离在末尾 Reset/ })); fireEvent.click(screen.getByTestId('jtw-c5p6-bug'))
    await waitFor(() => expect(screen.getAllByTestId('jtw-c5-final-trace')[0]).toHaveTextContent('final:2'))
    fireEvent.click(screen.getByRole('button', { name: /第一次偏离：最后 Reset/ })); fireEvent.click(screen.getByRole('button', { name: /只把 Reset/ })); fireEvent.click(screen.getByTestId('jtw-c5p6-fixed'))
    await waitFor(() => expect(screen.getAllByTestId('jtw-c5-final-trace').some((node) => node.textContent?.includes('final:1.8'))).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: '一致性重跑' }))
    await waitFor(() => expect(screen.getByTestId('jtw-c5-final-complete')).toBeEnabled())
  })

  it('requires the same saved Studio P7 project before peer evidence', async () => {
    const studioProject = { version: 1 as const, name: 'Ruyi Staff Size Story', lessonId: 'jtw-s1-c5-p7', pages: [{ id: 'jtw-c5-p7-page', background: 'stage', characters: [{ id: 'ruyi-staff', name: 'Staff', emoji: '🦯', start: { gx: 5, gy: 9, size: 2, rot: 0 }, scripts: [{ id: 'story', blocks: C5_P7_TARGETS[0].map((block) => ({ ...block })) }] }] }] }
    vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([{ id: 'ruyi-vfs', title: 'Ruyi', kind: 'blocks', status: 'active' }])
    vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue({ project: studioProject, version: 2, history: { past: [], future: [] }, otherFiles: [], storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c5-p7': { completedAt: 'now' } } } })
    renderPart('jtw-s1-c5-p7'); await screen.findByText(/Blocks Studio亲手搭建/)
    fireEvent.click(screen.getByRole('button', { name: /三个停点/ }))
    await screen.findByText(/VFS 2/); fireEvent.click(screen.getByRole('button', { name: /运行保存的个人故事/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c5p7-reopen')).toBeEnabled()); fireEvent.click(screen.getByTestId('jtw-c5p7-reopen'))
    await screen.findByRole('button', { name: /同伴从真实运行/ }); fireEvent.click(screen.getByRole('button', { name: /同伴从真实运行/ }))
    expect(screen.getByTestId('jtw-c5-final-complete')).toBeEnabled()
  })

  it('reloads P7 for P8 Retell and leaves chapter completion to the server seal', async () => {
    vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: ['jtw-s1-c5-p8'], completed: [{ part_id: 'jtw-s1-c5-p7', completed_at: 'now', evidence: { schema_version: 1, selections: { build_project: ['ruyi-vfs'] } } }], chapter_seals: [{ seal_id: 'jtw-s1-c5-ruyi-seal', chapter_code: 'C5', lit: false, missing: ['part:jtw-s1-c5-p8'] }] })
    renderPart('jtw-s1-c5-p8'); await screen.findByText(/原著保留到龙宫/)
    for (const label of ['学成回家', '旧物不合适', '去龙宫', '试验状态', '修 Reset', '带走金箍棒']) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
    fireEvent.click(screen.getByRole('button', { name: /P7 保存版最后/ })); fireEvent.click(screen.getByTestId('jtw-c5p8-run'))
    await screen.findByRole('button', { name: /因为需要合适工具/ }); fireEvent.click(screen.getByRole('button', { name: /因为需要合适工具/ })); fireEvent.click(screen.getByRole('button', { name: /原著有要求/ }))
    expect(screen.getByTestId('jtw-c5-final-complete')).toBeEnabled()
  })
})
