// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part5Page } from './JourneyWestC4Part5Page'
import * as storyPartsApi from './storyPartsApi'

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-c4-p5' } }) }))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const BUILD = {
  projectId: 'c4-p5-turn',
  version: 'turn' as const,
  placedBlocks: ['name:show', 'name:say', 'name:end', 'skill:turn_left-2', 'skill:wait-1', 'skill:say', 'skill:end'],
  dualRunCompleted: true,
}

function renderPage(loadBuild = vi.fn().mockResolvedValue(BUILD)) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p5']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part5Page loadBuild={loadBuild} />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  sessionStorage.setItem('story-blocks:jtw:c4-p5-plan:kid-c4-p5', JSON.stringify({
    motive: 'respond', version: 'turn', prediction: true,
  }))
  vi.mocked(storyPartsApi.fetchStoryLineProgress).mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [],
    unlocked_part_ids: ['jtw-s1-c4-p5'],
  })
  vi.mocked(storyPartsApi.completeStoryPart).mockResolvedValue({
    part_id: 'jtw-s1-c4-p5',
    completed_at: '2026-08-04T00:00:00Z',
  })
})

afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks() })

describe('JourneyWestC4Part5Page', () => {
  it('requires motive, selected version prediction, exact saved version and dual run', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p5')
    await waitFor(() => expect(screen.getByTestId('jtw-c4p5-continue')).toBeEnabled())
    expect(screen.getByTestId('jtw-c4p5-resolved')).toHaveTextContent('一阵风随后把整段本领链吹到了错误入口')
  })

  it('persists the real saved project, placed-block ledger and adjacent P6 evidence', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p5')
    fireEvent.click(await screen.findByTestId('jtw-c4p5-continue'))
    await waitFor(() => expect(storyPartsApi.completeStoryPart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p5',
      expect.objectContaining({
        selections: expect.objectContaining({
          version: ['turn'],
          build_project: ['c4-p5-turn'],
          placed_blocks: BUILD.placedBlocks,
          run_trace: ['flag:name-only', 'tap:turn:visible-result', 'stable:end'],
        }),
      }),
    ))
    await screen.findByTestId('map-stub')
  })

  it('fails closed when the server has not unlocked P5', async () => {
    vi.mocked(storyPartsApi.fetchStoryLineProgress).mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1', completed: [], unlocked_part_ids: [],
    })
    renderPage()
    await screen.findByTestId('jtw-c4p5-locked')
  })
})
