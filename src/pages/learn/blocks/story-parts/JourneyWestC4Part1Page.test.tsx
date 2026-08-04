// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

const OPEN: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((part_id) => ({ part_id, completed_at: '2026-08-04T00:00:00Z', evidence: {} })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p1'],
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

function clickWithin(testId: string, label: string) {
  fireEvent.click(within(screen.getByTestId(testId)).getByRole('button', { name: label }))
}

function finishCorrectly() {
  fireEvent.click(screen.getByTestId('jtw-c4p1-read'))
  clickWithin('jtw-c4p1-route', '花果山')
  clickWithin('jtw-c4p1-route', '海路')
  clickWithin('jtw-c4p1-route', '师门')
  clickWithin('jtw-c4p1-motives', '“想认真学习”')
  clickWithin('jtw-c4p1-motives', '“想把学到的带回家”')
  clickWithin('jtw-c4p1-why', '因为他想认真学习，也想把所学带回家，所以走过花果山、海路来到师门。')
  clickWithin('jtw-c4p1-prediction', '“想认真学习”和“想把学到的带回家”都会与只为寻宝互相矛盾。')
}

describe('JourneyWestC4Part1Page', () => {
  beforeEach(() => {
    fetchProgress.mockResolvedValue(OPEN)
    completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p1', completed_at: '2026-08-04T00:10:00Z' })
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('refuses unopened and distractor-only evidence', async () => {
    fetchProgress.mockResolvedValue({ ...OPEN, unlocked_part_ids: PRIOR_PART_IDS })
    renderPage()
    expect(await screen.findByTestId('jtw-c4p1-locked')).toBeInTheDocument()
    cleanup()
    fetchProgress.mockResolvedValue(OPEN)
    renderPage()
    expect(await screen.findByTestId('jtw-c4p1-unread')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('jtw-c4p1-read'))
    clickWithin('jtw-c4p1-route', '师门')
    clickWithin('jtw-c4p1-route', '海路')
    clickWithin('jtw-c4p1-route', '花果山')
    clickWithin('jtw-c4p1-motives', '来找闪亮宝物')
    clickWithin('jtw-c4p1-motives', '不喜欢伙伴')
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled()
  })

  it('persists the complete Read and Why contract and opens only P2', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p1')
    finishCorrectly()
    expect(screen.getByTestId('jtw-c4p1-stage')).toHaveAttribute('data-world-state', 'gate-lit')
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p1', {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-a'],
        route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
        motive_evidence: ['learn-carefully', 'bring-learning-home'],
        why_sentence: ['learn-and-return'],
      },
      prediction: 'learning-and-home-conflict',
    })
    expect(await screen.findByTestId('map-stub')).toBeInTheDocument()
  })

  it('restores saved evidence after refresh without creating a project', async () => {
    fetchProgress.mockResolvedValue({
      ...OPEN,
      completed: [...OPEN.completed, {
        part_id: 'jtw-s1-c4-p1',
        completed_at: '2026-08-04T00:10:00Z',
        evidence: {
          schema_version: 1,
          selections: {
            story_screens: ['story-card-a'],
            route_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
            motive_evidence: ['learn-carefully', 'bring-learning-home'],
            why_sentence: ['learn-and-return'],
          },
          prediction: 'learning-and-home-conflict',
        },
      }],
      unlocked_part_ids: [...OPEN.unlocked_part_ids, 'jtw-s1-c4-p2'],
    })
    renderPage()
    expect(await screen.findByTestId('jtw-c4p1-resolved')).toBeInTheDocument()
    expect(screen.queryByText(/项目/)).not.toBeInTheDocument()
  })
})
