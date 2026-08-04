// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC5Part1Page } from './JourneyWestC5Part1Page'
import { C5_P1_STORY, C5_P1_STORY_CARDS } from './journeyWestC5Part1Program'
import * as storyPartsApi from './storyPartsApi'
import type { StoryLineProgress } from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const PRIOR_PART_IDS = Array.from({ length: 32 }, (_, index) => {
  const chapter = Math.floor(index / 8) + 1
  const part = (index % 8) + 1
  return `jtw-s1-c${chapter}-p${part}`
})
const C4_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-29T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c5-p1'],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c5-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC5Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
          <Route path="/learn/story/journey-west/jtw-s1-c5-p2" element={<div data-testid="p2-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function finishPart() {
  fireEvent.click(screen.getByTestId('jtw-c5p1-story-read'))
  for (const card of C5_P1_STORY_CARDS) {
    fireEvent.click(screen.getByRole('button', { name: card.label }))
  }
  fireEvent.click(screen.getByRole('button', { name: '木棍弯了' }))
  fireEvent.click(screen.getByRole('button', { name: '石锤不便使用和携带' }))
  fireEvent.click(screen.getByRole('button', { name: /要拿得动、能改变大小/ }))
  fireEvent.click(screen.getByRole('button', { name: /旧工具会弯或不便携带/ }))
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C4_DONE)
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c5-p1',
    completed_at: '2026-07-29T01:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC5Part1Page — 海底柱影为什么出现', () => {
  it('shows the approved story before exposing motive evidence', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p1')
    expect(screen.getByText(C5_P1_STORY)).toBeInTheDocument()
    expect(screen.getByTestId('jtw-c5p1-unread')).toBeInTheDocument()
    expect(screen.queryByTestId('jtw-c5p1-motives')).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c5p1-continue')).toBeDisabled()
  })

  it('rejects wrong order, enemy motive and largest-is-best prediction', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p1')
    fireEvent.click(screen.getByTestId('jtw-c5p1-story-read'))
    fireEvent.click(screen.getByRole('button', { name: '🌊 海底出现柱影' }))
    fireEvent.click(screen.getByRole('button', { name: '🏡 学成回家' }))
    fireEvent.click(screen.getByRole('button', { name: '🪵 旧工具不合适' }))
    fireEvent.click(screen.getByRole('button', { name: '木棍弯了' }))
    fireEvent.click(screen.getByRole('button', { name: '为了打败一个本章敌人' }))
    fireEvent.click(screen.getByRole('button', { name: '海底的影子看起来最大' }))
    expect(screen.getByTestId('jtw-c5p1-continue')).toBeDisabled()
    expect(screen.getByTestId('jtw-c5p1-stage')).toHaveAttribute('data-world-state', 'shadow-clue')
  })

  it('resolves only after Read, ordered story, two motives and suitable-not-largest prediction', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p1')
    finishPart()
    expect(screen.getByTestId('jtw-c5p1-stage')).toHaveAttribute('data-world-state', 'route-lit')
    expect(screen.getByTestId('jtw-c5p1-resolved')).toHaveTextContent('弯木棍和石锤留在安全处')
    expect(screen.getByTestId('jtw-c5p1-resolved')).toHaveTextContent('柱厅仍被巨大阴影遮住')
    expect(screen.getByTestId('jtw-c5p1-continue')).toBeEnabled()
  })

  it('persists exact evidence and continues directly to the server-owned P2 unlock', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p1')
    finishPart()
    fireEvent.click(screen.getByTestId('jtw-c5p1-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c5-p1',
      {
        schema_version: 1,
        selections: {
          story_screens: ['story-card-a'],
          story_card_order: [
            'return-after-learning',
            'old-tools-unsuitable',
            'undersea-shadow',
          ],
          motive_evidence: ['wood-bent', 'hammer-hard-to-use'],
          oral_explanation: ['suitable-tool-explanation'],
        },
        prediction: 'change-and-carry',
      },
    )
    await screen.findByTestId('p2-stub')
  })

  it('restores persisted evidence on refresh and keeps locked children out', async () => {
    fetchProgress.mockResolvedValue({
      ...C4_DONE,
      completed: [
        ...C4_DONE.completed,
        {
          part_id: 'jtw-s1-c5-p1',
          completed_at: '2026-07-29T01:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-a'],
              story_card_order: [
                'return-after-learning',
                'old-tools-unsuitable',
                'undersea-shadow',
              ],
              motive_evidence: ['wood-bent', 'can-change-and-carry'],
              oral_explanation: ['suitable-tool-explanation'],
            },
            prediction: 'change-and-carry',
          },
        },
      ],
    })
    renderPage()
    await screen.findByTestId('jtw-c5p1-resolved')
    expect(screen.getByTestId('jtw-c5p1-continue')).toBeEnabled()

    cleanup()
    fetchProgress.mockResolvedValue({ ...C4_DONE, unlocked_part_ids: PRIOR_PART_IDS })
    renderPage()
    await screen.findByTestId('jtw-c5p1-locked')
    expect(screen.queryByTestId('jtw-part-c5-p1')).not.toBeInTheDocument()
  })
})
