// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part1Page } from './JourneyWestC4Part1Page'
import {
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_ROUTE_ORDER,
  C4_P1_STORY_SCREENS,
  c4p1MotivesCorrect,
  c4p1RouteOrdered,
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
  return `jtw-s1-c${chapter}-p${(index % 8) + 1}`
})

const C3_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-30T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1'],
  chapter_seals: [
    { seal_id: 'jtw-s1-c1-birth-seal', chapter_code: 'C1', lit: true, missing: [] },
    { seal_id: 'jtw-s1-c2-water-curtain-seal', chapter_code: 'C2', lit: true, missing: [] },
    { seal_id: 'jtw-s1-c3-long-journey-seal', chapter_code: 'C3', lit: true, missing: [] },
  ],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function readStory() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
}

function orderRoute() {
  for (const label of ['花果山', '海路', '师门']) {
    fireEvent.click(screen.getByRole('button', { name: label }))
  }
}

function chooseEvidence() {
  fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }))
  fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }))
  fireEvent.click(screen.getByRole('button', { name: /因为他愿意认真学习/ }))
  fireEvent.click(screen.getByRole('button', { name: /“想认真学习”和“想把所学带回家”/ }))
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C3_DONE)
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p1',
    completed_at: '2026-07-30T01:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part1Page · 山门前，把来路讲清楚', () => {
  it('locks motives behind the full story and preserves the C3 traveller and empty name board', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())

    expect(screen.getByText(C4_P1_STORY_SCREENS[0])).toBeInTheDocument()
    expect(screen.queryByText(C4_P1_STORY_SCREENS[1])).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p1-story-count')).toHaveTextContent('1 / 2')
    expect(screen.getByTestId('jtw-c4p1-unread')).toBeInTheDocument()
    expect(screen.queryByTestId('jtw-c4p1-motives')).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p1-monkey')).toHaveAttribute('data-continuity', 'c3-traveller')
    expect(screen.getByTestId('jtw-c4p1-name-board')).toHaveTextContent('空名字牌')
    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute('data-world-state', 'gate-closed')
  })

  it('refuses distractor motives and wrong route order', async () => {
    expect(C4_P1_MOTIVE_OPTIONS.filter((option) => option.correct).map((option) => option.id)).toEqual([
      'ready-to-learn',
      'bring-learning-home',
    ])
    expect(c4p1MotivesCorrect(['shiny-treasure', 'dislike-friends'])).toBe(false)
    expect(c4p1RouteOrdered([...C4_P1_ROUTE_ORDER].reverse())).toBe(false)

    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())
    readStory()
    fireEvent.click(screen.getByRole('button', { name: '师门' }))
    fireEvent.click(screen.getByRole('button', { name: '海路' }))
    fireEvent.click(screen.getByRole('button', { name: '花果山' }))
    fireEvent.click(screen.getByRole('button', { name: '来找闪亮宝物' }))
    fireEvent.click(screen.getByRole('button', { name: '不喜欢伙伴' }))
    expect(screen.getByRole('status')).toHaveTextContent('不是来寻宝或逃开伙伴')
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
  })

  it('persists read, route, motive, Why and prediction evidence and unlocks only P2', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())
    readStory()
    orderRoute()
    chooseEvidence()

    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute('data-world-state', 'gate-warm')
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent('空名字牌进入视野')
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'))

    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s1',
        'jtw-s1-c4-p1',
        {
          schema_version: 1,
          selections: {
            story_screens: ['gate-arrival', 'why-he-came'],
            route_order: ['flower-fruit-mountain', 'sea-road', 'master-gate'],
            motive_evidence: ['ready-to-learn', 'bring-learning-home'],
            why_sentence: ['learn-and-return'],
          },
          prediction: 'learning-and-home-conflict',
        },
      ),
    )
    await waitFor(() => expect(screen.getByTestId('map-stub')).toBeInTheDocument())
  })

  it('blocks kids whose C3-P8 is not complete', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_DONE,
      completed: C3_DONE.completed.slice(0, -1),
      unlocked_part_ids: PRIOR_PART_IDS,
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-locked')).toBeInTheDocument())
    expect(screen.queryByTestId('jtw-part-c4-p1')).not.toBeInTheDocument()
  })

  it('restores persisted completion evidence after refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_DONE,
      completed: [
        ...C3_DONE.completed,
        {
          part_id: 'jtw-s1-c4-p1',
          completed_at: '2026-07-30T01:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['gate-arrival', 'why-he-came'],
              route_order: ['flower-fruit-mountain', 'sea-road', 'master-gate'],
              motive_evidence: ['ready-to-learn', 'bring-learning-home'],
              why_sentence: ['learn-and-return'],
            },
            prediction: 'learning-and-home-conflict',
          },
        },
      ],
      unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1', 'jtw-s1-c4-p2'],
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-resolved')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled()
  })
})
