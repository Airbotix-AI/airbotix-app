// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part1Page } from './JourneyWestC4Part1Page'
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
    completed_at: '2026-07-29T01:00:00.000Z',
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
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function finishEvidence() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
  for (const label of ['花果山', '海路', '师门']) {
    fireEvent.click(screen.getByRole('button', { name: label }))
  }
  fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }))
  fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }))
  fireEvent.click(screen.getByRole('button', { name: /因为还有许多要学/ }))
  fireEvent.click(screen.getByRole('button', { name: /想认真学习.*想把学到的带回家/ }))
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C3_DONE)
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p1',
    completed_at: '2026-07-29T01:30:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part1Page', () => {
  it('keeps motive evidence hidden until the full story is read', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c4p1-unread')).toBeInTheDocument()
    expect(screen.queryByTestId('jtw-c4p1-motives')).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
    fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
    expect(screen.getByTestId('jtw-c4p1-story-count')).toHaveTextContent('2 / 2')
    expect(screen.getByTestId('jtw-c4p1-motives')).toBeInTheDocument()
  })

  it('rejects distractor motives and the wrong route order', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
    fireEvent.click(screen.getByRole('button', { name: '师门' }))
    fireEvent.click(screen.getByRole('button', { name: '海路' }))
    fireEvent.click(screen.getByRole('button', { name: '花果山' }))
    fireEvent.click(screen.getByRole('button', { name: '来找闪亮宝物' }))
    fireEvent.click(screen.getByRole('button', { name: '不喜欢伙伴' }))
    fireEvent.click(screen.getByRole('button', { name: /因为还有许多要学/ }))
    fireEvent.click(screen.getByRole('button', { name: /想认真学习.*想把学到的带回家/ }))
    expect(screen.getByRole('status')).toHaveTextContent('不是正文证据')
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
  })

  it('persists Read and Why evidence and unlocks only the adjacent Part', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())
    finishEvidence()
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent('山门的暖灯亮起')
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p1', {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-a', 'story-dialogue'],
        route_card_order: ['flower-fruit-mountain', 'sea-road', 'master-gate'],
        motive_evidence: ['learn-carefully', 'bring-learning-home'],
        why_sentence: ['learn-and-bring-back'],
      },
      prediction: 'learn-and-return-lines',
    })
    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument())
  })

  it('blocks kids whose C3-P8 server unlock is missing', async () => {
    fetchProgress.mockResolvedValue({ ...C3_DONE, unlocked_part_ids: PRIOR_PART_IDS })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-locked')).toBeInTheDocument())
  })

  it('restores saved evidence after refresh without creating a project', async () => {
    fetchProgress.mockResolvedValue({
      ...C3_DONE,
      completed: [
        ...C3_DONE.completed,
        {
          part_id: 'jtw-s1-c4-p1',
          completed_at: '2026-07-29T01:30:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-a', 'story-dialogue'],
              route_card_order: ['flower-fruit-mountain', 'sea-road', 'master-gate'],
              motive_evidence: ['learn-carefully', 'bring-learning-home'],
              why_sentence: ['learn-and-bring-back'],
            },
            prediction: 'learn-and-return-lines',
          },
        },
      ],
      unlocked_part_ids: [...C3_DONE.unlocked_part_ids, 'jtw-s1-c4-p2'],
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-resolved')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled()
  })
})
