// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import * as blocksApi from '../blocksApi'
import { JourneyWestC4Part6Page } from './JourneyWestC4Part6Page'
import * as storyPartsApi from './storyPartsApi'

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-c4-p6' } }),
}))
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
  createBlocksProject: vi.fn(),
}))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const listProjects = vi.mocked(blocksApi.listBlocksProjects)
const loadProject = vi.mocked(blocksApi.loadBlocksProject)

const FIXED: BlocksProject = {
  version: 1,
  name: 'C4 P6',
  lessonId: 'jtw-s1-c4-p6',
  pages: [{
    id: 'jtw-c4-p4-page',
    background: 'jtw-s1-c4-mountain-gate',
    characters: [{
      id: 'sun-wukong',
      name: 'Sun Wukong',
      emoji: '🐒',
      asset: '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png',
      start: { gx: 10, gy: 9, size: 3, rot: 0 },
      scripts: [
        { id: 'sun-wukong-name', blocks: [{ op: 'when_flag' }, { op: 'show' }, { op: 'say', text: '我是孙悟空' }, { op: 'end' }] },
        { id: 'sun-wukong-skill', blocks: [{ op: 'when_tap' }, { op: 'turn_left', n: 2 }, { op: 'wait', n: 1 }, { op: 'say', text: '家在那边' }, { op: 'end' }] },
      ],
    }],
  }],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p6']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part6Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [{
      part_id: 'jtw-s1-c4-p5',
      completed_at: '2026-07-28T03:00:00.000Z',
      evidence: { schema_version: 1, selections: { version: ['turn'] } },
    }],
    unlocked_part_ids: ['jtw-s1-c4-p6'],
  })
  listProjects.mockResolvedValue([{ id: 'project-c4-p6', title: 'C4 P6', kind: 'blocks', status: 'active' }])
  loadProject.mockResolvedValue({
    project: FIXED,
    version: 2,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c4-p6': { completedAt: '2026-07-28T04:00:00.000Z' } },
    },
  })
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p6', completed_at: '2026-07-28T04:00:00.000Z' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part6Page', () => {
  it('requires prediction, first deviation, exact trigger diff, and saved dual run', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p6')
    expect(screen.getByTestId('jtw-c4p6-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Go只得名并等待/ }))
    fireEvent.click(screen.getByRole('button', { name: /本领小链用了Start入口/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p6-continue')).toBeEnabled())
    expect(screen.getByTestId('jtw-c4p6-resolved')).toHaveTextContent('两条独立的路')
  })

  it('persists the single trigger diff, wrong run, fixed Go wait, Tap run, and adjacent unlock', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p6')
    fireEvent.click(screen.getByRole('button', { name: /Go只得名并等待/ }))
    fireEvent.click(screen.getByRole('button', { name: /本领小链用了Start入口/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p6-continue')).toBeEnabled())
    fireEvent.click(screen.getByTestId('jtw-c4p6-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p6',
      expect.objectContaining({
        selections: expect.objectContaining({
          build_project: ['project-c4-p6'],
          trigger_diff: ['sun-wukong-skill:when_flag→when_tap'],
          run_trace: ['bug:flag-name-and-skill', 'fixed:flag-name-wait', 'fixed:tap-skill-end'],
        }),
      }),
    ))
    await screen.findByTestId('map-stub')
  })
})
