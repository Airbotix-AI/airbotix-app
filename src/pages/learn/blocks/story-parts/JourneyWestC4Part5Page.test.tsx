// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import * as blocksApi from '../blocksApi'
import * as storyPartsApi from './storyPartsApi'
import { JourneyWestC4Part5Page } from './JourneyWestC4Part5Page'

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-c4-p5' } }) }))
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()), listBlocksProjects: vi.fn(), loadBlocksProject: vi.fn(), createBlocksProject: vi.fn(),
}))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const listProjects = vi.mocked(blocksApi.listBlocksProjects)
const loadProject = vi.mocked(blocksApi.loadBlocksProject)

const HOP_BUILD: BlocksProject = {
  version: 1, name: 'C4 P5', lessonId: 'jtw-s1-c4-p5', pages: [{
    id: 'jtw-c4-p5-page', background: 'jtw-s1-c4-mountain-gate', characters: [{
      id: 'sun-wukong', name: 'Sun Wukong', emoji: '🐒',
      asset: '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png',
      start: { gx: 10, gy: 9, size: 3, rot: 0 }, scripts: [
        { id: 'sun-wukong-name', blocks: [{ op: 'when_flag' }, { op: 'show' }, { op: 'say', text: '我是孙悟空' }, { op: 'end' }] },
        { id: 'sun-wukong-skill', blocks: [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '我等到邀请了' }, { op: 'end' }] },
      ],
    }],
  }],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p5']}><Routes><Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part5Page />} /><Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} /></Routes></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', completed: [], unlocked_part_ids: ['jtw-s1-c4-p5'] })
  listProjects.mockResolvedValue([{ id: 'project-c4-p5', title: 'C4 P5', kind: 'blocks', status: 'active' }])
  loadProject.mockResolvedValue({ project: HOP_BUILD, version: 2, history: { past: [], future: [] }, otherFiles: [], storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c4-p5': { completedAt: '2026-08-11T00:00:00.000Z' } } } })
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p5', completed_at: '2026-08-11T00:00:00.000Z' })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('JourneyWestC4Part5Page', () => {
  it('requires motive, matching version, prediction, and saved Go/Tap evidence', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p5')
    fireEvent.click(screen.getByRole('button', { name: /伙伴先准备好/ }))
    fireEvent.click(screen.getByRole('button', { name: /跃过叶纹/ }))
    fireEvent.click(screen.getByRole('button', { name: /Go只显示名字/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p5-continue')).toBeEnabled())
    expect(screen.getByTestId('jtw-c4p5-resolved')).toHaveTextContent('一阵风')
  })

  it('persists the selected program version and ordered real-run evidence', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p5')
    fireEvent.click(screen.getByRole('button', { name: /伙伴先准备好/ }))
    fireEvent.click(screen.getByRole('button', { name: /跃过叶纹/ }))
    fireEvent.click(screen.getByRole('button', { name: /Go只显示名字/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p5-continue')).toBeEnabled())
    fireEvent.click(screen.getByTestId('jtw-c4p5-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p5', expect.objectContaining({ selections: expect.objectContaining({ version: ['hop'], run_trace: ['flag:name-only-end', 'partner-prediction', 'tap:hop:visible-end'] }), prediction: 'chosen-after-tap' })))
  })

  it('rejects a selected version that does not match the saved program', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p5')
    fireEvent.click(screen.getByRole('button', { name: /伙伴先准备好/ }))
    fireEvent.click(screen.getByRole('button', { name: /转身指家/ }))
    fireEvent.click(screen.getByRole('button', { name: /Go只显示名字/ }))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p5-continue')).toBeDisabled())
  })
})
