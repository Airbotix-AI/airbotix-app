// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part1Page } from './JourneyWestC4Part1Page'
import {
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_ROUTE_CARDS,
  C4_P1_STORY_SCREENS,
} from './journeyWestC4Part1Program'
import * as storyPartsApi from './storyPartsApi'
import type { StoryLineProgress } from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const PRIOR_PART_IDS = Array.from({ length: 24 }, (_, index) => {
  const chapter = Math.floor(index / 8) + 1
  const part = (index % 8) + 1
  return `jtw-s1-c${chapter}-p${part}`
})
const C3_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T06:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1'],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function finishPart() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
  for (const card of C4_P1_ROUTE_CARDS) fireEvent.click(screen.getByRole('button', { name: card.label }))
  fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }))
  fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }))
  fireEvent.click(screen.getByRole('button', { name: /因为他愿意认真学习/ }))
  fireEvent.click(screen.getByRole('button', { name: /想认真学习.*把懂得的事带回家/ }))
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C3_DONE)
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p1',
    completed_at: '2026-07-27T07:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part1Page — 山门前，把来路讲清楚', () => {
  it('shows the approved story first and refuses motive guessing before the second screen', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p1')
    expect(screen.getByText(C4_P1_STORY_SCREENS[0])).toBeInTheDocument()
    expect(screen.queryByText(C4_P1_STORY_SCREENS[1])).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p1-unread')).toBeInTheDocument()
    expect(screen.queryByTestId('jtw-c4p1-motives')).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
  })

  it('rejects distractor motives and the wrong route order', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p1')
    fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
    fireEvent.click(screen.getByRole('button', { name: '🌊 海路' }))
    fireEvent.click(screen.getByRole('button', { name: '🍑 花果山' }))
    fireEvent.click(screen.getByRole('button', { name: '⛩ 师门' }))
    for (const label of ['愿意认真学', '来找闪亮宝物']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    fireEvent.click(screen.getByRole('button', { name: /因为他愿意认真学习/ }))
    fireEvent.click(screen.getByRole('button', { name: /想认真学习.*把懂得的事带回家/ }))
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
    expect(C4_P1_MOTIVE_OPTIONS.filter((option) => !option.correct).map((option) => option.id))
      .toEqual(['find-shiny-treasure', 'dislike-friends'])
  })

  it('opens the gate only after Read, ordered route, two motives, Why and prediction', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p1')
    finishPart()
    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute('data-world-state', 'gate-open')
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent('空名字牌进入视野')
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled()
  })

  it('persists exact evidence and returns to the map, unlocking only P2 server-side', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p1')
    finishPart()
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p1',
      expect.objectContaining({
        selections: {
          story_screens: ['story-card-a', 'gate-dialogue'],
          route_card_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
          motive_evidence: ['learn-carefully', 'bring-learning-home'],
          why_sentence: ['because-learn-and-share'],
        },
        prediction: 'learn-and-return',
      }),
    )
    await screen.findByTestId('map-stub')
  })

  it('blocks a child when the server has not unlocked C4-P1', async () => {
    fetchProgress.mockResolvedValue({ ...C3_DONE, unlocked_part_ids: PRIOR_PART_IDS })
    renderPage()
    await screen.findByTestId('jtw-c4p1-locked')
    expect(screen.queryByTestId('jtw-part-c4-p1')).not.toBeInTheDocument()
  })
})
