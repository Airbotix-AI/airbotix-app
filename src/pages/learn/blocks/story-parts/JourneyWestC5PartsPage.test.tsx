// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as blocksApi from '../blocksApi'
import { C5_P4_TARGET, C5_P5_TARGET } from '../jtwC5C6Builds'
import * as storyApi from './storyPartsApi'
import { JourneyWestC5PartsPage } from './JourneyWestC5PartsPage'
import type { C5EarlyPartId } from './journeyWestC5Program'

vi.mock('./storyPartsApi', async (original) => ({ ...(await original<typeof storyApi>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn() }))
vi.mock('../blocksApi', async (original) => ({ ...(await original<typeof blocksApi>()), listBlocksProjects: vi.fn(), loadBlocksProject: vi.fn(), createBlocksProject: vi.fn() }))
vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-c5' } }) }))

function savedBuild(partId: 'jtw-s1-c5-p4' | 'jtw-s1-c5-p5') {
  const blocks = partId.endsWith('p4') ? C5_P4_TARGET : C5_P5_TARGET
  return { version: 2, history: { past: [], future: [] }, otherFiles: [], storyProgress: { schemaVersion: 1 as const, completed: { [partId]: { completedAt: 'now' } } }, project: { version: 1 as const, name: 'build', lessonId: partId, pages: [{ id: partId.endsWith('p4') ? 'jtw-c5-p4-page' : 'jtw-c5-p5-page', background: 'stage', characters: [{ id: 'ruyi-staff', name: 'Staff', emoji: '🦯', start: { gx: 5, gy: 9, size: 2, rot: 0 }, scripts: [{ id: 'story', blocks: blocks.map((block) => ({ ...block })) }] }] }] } }
}

function renderPart(partId: C5EarlyPartId) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><JourneyWestC5PartsPage partId={partId} /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: ['jtw-s1-c5-p1', 'jtw-s1-c5-p4', 'jtw-s1-c5-p5'],
    completed: [{ part_id: 'jtw-s1-c5-p4', completed_at: '2026-08-09T00:00:00Z', evidence: { schema_version: 1, selections: { build_ops: ['grow', 'wait', 'reset_size', 'shrink'], run_trace: ['final:1.8'] } } }],
  })
  vi.mocked(storyApi.completeStoryPart).mockResolvedValue({ part_id: 'done', completed_at: '2026-08-09T00:00:00Z' })
  vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([])
  vi.mocked(blocksApi.createBlocksProject).mockResolvedValue({ id: 'studio-build' })
})

afterEach(cleanup)

describe('JourneyWestC5PartsPage', () => {
  it('requires ordered story and two motive facts before P1 unlocks P2', async () => {
    renderPart('jtw-s1-c5-p1')
    await screen.findByTestId('jtw-jtw-s1-c5-p1')
    for (const label of ['学成回家', '旧工具不合适', '海底出现柱影', '木棍弯了', '石锤不便使用', '合适的线索最重要']) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
    expect(screen.getByTestId('jtw-c5-complete')).toBeEnabled()
    fireEvent.click(screen.getByTestId('jtw-c5-complete'))
    await waitFor(() => expect(storyApi.completeStoryPart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c5-p1', expect.objectContaining({ selections: expect.objectContaining({ route_order: ['learned-home', 'tools-unfit', 'pillar-shadow'], motive_evidence: ['wood-bent', 'hammer-awkward'] }) })))
  })

  it('requires a saved real Studio project and run marker for P4', async () => {
    vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: ['jtw-s1-c5-p4'], completed: [] })
    vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([{ id: 'p4-build', title: 'build', kind: 'blocks', status: 'active' }])
    vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue(savedBuild('jtw-s1-c5-p4'))
    renderPart('jtw-s1-c5-p4')
    await screen.findByTestId('jtw-c5-editor')
    await waitFor(() => expect(screen.getByText(/项目与真实Go运行已保存/)).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c5-complete')).toBeEnabled()
  })

  it('reloads P4 evidence and requires a portable P5 choice plus environment meaning', async () => {
    vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([{ id: 'p5-build', title: 'build', kind: 'blocks', status: 'active' }])
    vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue(savedBuild('jtw-s1-c5-p5'))
    renderPart('jtw-s1-c5-p5')
    await screen.findByText(/P4 保存链：grow → wait → reset_size → shrink/)
    for (const label of ['窄门', '弯曲水道', '看见原貌', '比较初始', '准备携带']) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
    await waitFor(() => expect(screen.getByTestId('jtw-c5-complete')).toBeEnabled())
  })
})
