// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part4Page } from './JourneyWestC4Part4Page'
import * as blocksApi from '../blocksApi'
import * as storyPartsApi from './storyPartsApi'
import type { BlocksProject } from '../blocksModel'

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-c4-p4' } }),
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

const BUILT: BlocksProject = {
  version: 1,
  name: 'C4 P4',
  lessonId: 'jtw-s1-c4-p4',
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
        { id: 'sun-wukong-skill', blocks: [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '你邀请了我' }, { op: 'end' }] },
      ],
    }],
  }],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p4']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part4Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [],
    unlocked_part_ids: ['jtw-s1-c4-p4'],
  })
  listProjects.mockResolvedValue([{ id: 'project-c4-p4', title: 'C4 P4', kind: 'blocks', status: 'active' }])
  loadProject.mockResolvedValue({
    project: BUILT,
    version: 2,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: {
      schemaVersion: 1,
      completed: { 'jtw-s1-c4-p4': { completedAt: '2026-07-28T02:00:00.000Z' } },
    },
  })
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p4', completed_at: '2026-07-28T02:00:00.000Z' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part4Page', () => {
  it('requires both predictions and the saved dual-run project before continuing', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p4')
    expect(screen.getByTestId('jtw-c4p4-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /名字链运行，本领链保持安静/ }))
    fireEvent.click(screen.getByRole('button', { name: /Tap后叶纹目标才亮起/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p4-continue')).toBeEnabled())
    expect(screen.getByTestId('jtw-c4p4-resolved')).toHaveTextContent('伙伴先记住')
  })

  it('persists the project, six blocks, and ordered real-run evidence', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p4')
    fireEvent.click(screen.getByRole('button', { name: /名字链运行，本领链保持安静/ }))
    fireEvent.click(screen.getByRole('button', { name: /Tap后叶纹目标才亮起/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p4-continue')).toBeEnabled())
    fireEvent.click(screen.getByTestId('jtw-c4p4-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p4',
      expect.objectContaining({
        selections: expect.objectContaining({
          build_project: ['project-c4-p4'],
          placed_blocks: expect.arrayContaining([
            'sun-wukong-name:show',
            'sun-wukong-skill:hop-2',
          ]),
          run_trace: ['flag:name-show-say-end', 'wait:skill-quiet', 'tap:hop-say-end'],
        }),
        prediction: 'skill-quiet',
      }),
    ))
    await screen.findByTestId('map-stub')
  })

  it('uses server unlock truth', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: [],
    })
    renderPage()
    await screen.findByTestId('jtw-c4p4-locked')
  })
})
