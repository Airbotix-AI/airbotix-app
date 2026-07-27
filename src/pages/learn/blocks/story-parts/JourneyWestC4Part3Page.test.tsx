// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part3Page } from './JourneyWestC4Part3Page'
import * as storyPartsApi from './storyPartsApi'
import type { StoryLineProgress } from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const PROGRESS: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [],
  unlocked_part_ids: ['jtw-s1-c4-p3'],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p3']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part3Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function solve() {
  fireEvent.click(screen.getByRole('button', { name: 'Start在等场景开始' }))
  fireEvent.click(screen.getByRole('button', { name: 'Tap在等观众邀请' }))
  fireEvent.click(screen.getByRole('button', { name: /一举旗，名字和转身会挤在一起/ }))
  fireEvent.click(screen.getByTestId('jtw-c4p3-move-turn'))
  fireEvent.click(screen.getByRole('button', { name: /举Start旗/ }))
  fireEvent.click(screen.getByRole('button', { name: /点纸悟空/ }))
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(PROGRESS)
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p3',
    completed_at: '2026-07-27T09:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part3Page — 两个入口圈', () => {
  it('keeps the wrong turn card in Start until meanings and prediction are correct', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p3')
    expect(screen.getByTestId('jtw-c4p3-wrong-turn')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start在等观众点纸卡' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tap在等场景开始' }))
    fireEvent.click(screen.getByRole('button', { name: '转身卡虽然在Start圈，还是会等Tap' }))
    expect(screen.getByTestId('jtw-c4p3-move-turn')).toBeDisabled()
    expect(screen.getByTestId('jtw-c4p3-continue')).toBeDisabled()
  })

  it('moves the whole action card, rehearses both entries, and reveals story_after', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p3')
    solve()
    expect(screen.queryByTestId('jtw-c4p3-wrong-turn')).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p3-moved-turn')).toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p3-rehearsal-trace')).toHaveTextContent('start → tap')
    expect(screen.getByTestId('jtw-c4p3-resolved')).toHaveTextContent('真正的两条积木链仍有空槽')
    expect(screen.getByTestId('jtw-c4p3-continue')).toBeEnabled()
  })

  it('persists model evidence and returns to the map', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p3')
    solve()
    fireEvent.click(screen.getByTestId('jtw-c4p3-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p3',
      {
        schema_version: 1,
        selections: {
          trigger_identification: ['start-waits-scene', 'tap-waits-invitation'],
          card_locations: ['name:start', 'turn:tap', 'hop:tap', 'hide-show:tap'],
          minimal_move: ['turn:start-to-tap'],
          rehearsal: ['start', 'tap'],
        },
        prediction: 'turn-runs-too-early',
      },
    ))
    await screen.findByTestId('map-stub')
  })

  it('uses server unlock truth', async () => {
    fetchProgress.mockResolvedValue({ ...PROGRESS, unlocked_part_ids: [] })
    renderPage()
    await screen.findByTestId('jtw-c4p3-locked')
    expect(screen.queryByTestId('jtw-part-c4-p3')).not.toBeInTheDocument()
  })
})
