// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import { JTW_C5_P4_TARGET_BLOCKS } from '../jtwC5SizeBuild'
import * as blocksApi from '../blocksApi'
import * as storyPartsApi from './storyPartsApi'
import { JourneyWestC5Part4Page } from './JourneyWestC5Part4Page'

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-c5-p4' } }) }))
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
}))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const BUILT: BlocksProject = {
  version: 1,
  name: 'C5 P4',
  lessonId: 'jtw-s1-c5-p4',
  pages: [{ id: 'size-page', background: 'pillar-hall', characters: [{
    id: 'ruyi-staff', name: 'Ruyi Staff', emoji: '🦯', start: { gx: 10, gy: 8, size: 1, rot: 0 },
    scripts: [{ id: 'ruyi-staff/size-build', blocks: [...JTW_C5_P4_TARGET_BLOCKS] }],
  }] }],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c5-p4']}><Routes><Route path="/learn/story/journey-west/:partId" element={<JourneyWestC5Part4Page />} /><Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} /></Routes></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.mocked(storyPartsApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', completed: [], unlocked_part_ids: ['jtw-s1-c5-p4'] })
  vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([{ id: 'project-p4', title: 'P4', kind: 'blocks', status: 'active' }])
  vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue({
    project: BUILT, version: 2, history: { past: [], future: [] }, otherFiles: [],
    storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c5-p4': { completedAt: '2026-08-04T00:00:00Z' } } },
  })
  vi.mocked(storyPartsApi.completeStoryPart).mockResolvedValue({ part_id: 'jtw-s1-c5-p4', completed_at: '2026-08-04T00:00:00Z' })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('JourneyWestC5Part4Page', () => {
  it('requires target, two predictions and real build evidence', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p4')
    expect(screen.getByTestId('jtw-c5p4-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /大 → 原 → 小/ }))
    fireEvent.click(screen.getByRole('button', { name: /Grow后大、Reset后原/ }))
    fireEvent.click(screen.getByRole('button', { name: /Grow后的Wait帮助/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c5p4-continue')).toBeEnabled())
    expect(screen.getByTestId('jtw-c5p4-build-status')).toHaveTextContent('1.2 → 1.0 → 0.8')
  })

  it('persists exact AST, placements, real size trace and only unlocks P5', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p4')
    fireEvent.click(screen.getByRole('button', { name: /大 → 原 → 小/ }))
    fireEvent.click(screen.getByRole('button', { name: /Grow后大、Reset后原/ }))
    fireEvent.click(screen.getByRole('button', { name: /Grow后的Wait帮助/ }))
    fireEvent.click(await screen.findByTestId('jtw-c5p4-continue'))
    await waitFor(() => expect(storyPartsApi.completeStoryPart).toHaveBeenCalledWith(
      'journey-to-the-west-s1', 'jtw-s1-c5-p4', expect.objectContaining({
        selections: expect.objectContaining({
          build_ast: ['when_flag', 'grow:2', 'wait:5', 'reset_size', 'shrink:2', 'end'],
          placed_blocks: ['grow:2', 'wait:5', 'reset_size', 'shrink:2'],
          state_trace: ['grow:1.2', 'reset_size:1.0', 'shrink:0.8'],
          final_state: ['carrying'],
        }),
      }),
    ))
    await screen.findByTestId('map-stub')
  })

  it('uses server unlock truth', async () => {
    vi.mocked(storyPartsApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', completed: [], unlocked_part_ids: [] })
    renderPage()
    await screen.findByTestId('jtw-c5p4-locked')
  })
})
