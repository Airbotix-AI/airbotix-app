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

const PRIOR_PART_IDS = [
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c3-p${index + 1}`),
]

const OPEN_PROGRESS: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-30T08:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1'],
  chapter_seals: [],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function completeEvidence() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
  fireEvent.click(screen.getByRole('button', { name: '花果山' }))
  fireEvent.click(screen.getByRole('button', { name: '海路' }))
  fireEvent.click(screen.getByRole('button', { name: '师门' }))
  fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }))
  fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }))
  fireEvent.click(screen.getByRole('button', { name: /因为他还有许多想学的事/ }))
  fireEvent.click(screen.getByRole('button', { name: /想认真学习.*把经历带回家/ }))
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(OPEN_PROGRESS)
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p1',
    completed_at: '2026-07-30T09:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part1Page', () => {
  it('requires the full story, ordered route, two text motives, Why and prediction', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())

    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute(
      'data-world-state',
      'gate-waiting',
    )
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
    expect(screen.getByTestId('jtw-c4p1-story')).toHaveTextContent('没有一进门就表演本领')
    expect(screen.getByTestId('jtw-c4p1-story')).toHaveTextContent('不把他写成寻宝')

    completeEvidence()

    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute('data-world-state', 'gate-open')
    expect(screen.getByTestId('jtw-c4p1-name-board')).toHaveTextContent('空名字牌')
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent('门只打开通往庭院的一条路')
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeEnabled()
  })

  it('refuses distractor motives and an out-of-order journey', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('jtw-c4p1-story-next'))
    fireEvent.click(screen.getByRole('button', { name: '师门' }))
    fireEvent.click(screen.getByRole('button', { name: '海路' }))
    fireEvent.click(screen.getByRole('button', { name: '花果山' }))
    fireEvent.click(screen.getByRole('button', { name: '来找闪亮宝物' }))
    fireEvent.click(screen.getByRole('button', { name: '不喜欢伙伴' }))
    fireEvent.click(screen.getByRole('button', { name: /因为他还有许多想学的事/ }))
    fireEvent.click(screen.getByRole('button', { name: /想认真学习.*把经历带回家/ }))

    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
    expect(screen.queryByTestId('jtw-c4p1-name-board')).not.toBeInTheDocument()
  })

  it('persists measured evidence and unlocks only C4-P2 without creating a project', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument())
    completeEvidence()
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'))

    await waitFor(() => expect(completePart).toHaveBeenCalledOnce())
    expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p1',
      expect.objectContaining({
        selections: {
          story_screens: ['story-card-a', 'story-dialogue'],
          route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
          motive_evidence: ['learn-seriously', 'bring-learning-home'],
          why_sentence: ['learn-and-share'],
        },
        prediction: 'learn-and-return',
      }),
    )
    const evidence = completePart.mock.calls[0]?.[2]
    expect(evidence?.selections).not.toHaveProperty('build_project')
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument())
  })

  it('uses the server unlock frontier and restores saved evidence on refresh', async () => {
    fetchProgress.mockResolvedValueOnce({
      ...OPEN_PROGRESS,
      unlocked_part_ids: PRIOR_PART_IDS,
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-locked')).toBeInTheDocument())
    cleanup()

    fetchProgress.mockResolvedValueOnce({
      ...OPEN_PROGRESS,
      completed: [
        ...OPEN_PROGRESS.completed,
        {
          part_id: 'jtw-s1-c4-p1',
          completed_at: '2026-07-30T09:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-a', 'story-dialogue'],
              route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
              motive_evidence: ['learn-seriously', 'bring-learning-home'],
              why_sentence: ['learn-and-share'],
            },
            prediction: 'learn-and-return',
          },
        },
      ],
      unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1', 'jtw-s1-c4-p2'],
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-resolved')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
  })
})
