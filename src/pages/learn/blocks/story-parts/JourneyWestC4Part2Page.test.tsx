// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part2Page } from './JourneyWestC4Part2Page'
import { C4_P2_STORY_SCREENS } from './journeyWestC4Part2Program'
import * as storyPartsApi from './storyPartsApi'
import type { StoryLineProgress } from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const PRIOR_PART_IDS = Array.from({ length: 25 }, (_, index) => {
  const chapter = Math.floor(index / 8) + 1
  const part = (index % 8) + 1
  return `jtw-s1-c${chapter}-p${part}`
})
const OPEN: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T07:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p2'],
}

function renderPage(progress = OPEN) {
  fetchProgress.mockResolvedValue(progress)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p2']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC4Part2Page previewSleep={async () => undefined} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function readAndPredict() {
  await screen.findByTestId('jtw-part-c4-p2')
  fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'))
  fireEvent.click(screen.getByRole('button', { name: /名字出现；不点悟空/ }))
}

beforeEach(() => {
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p2',
    completed_at: '2026-07-27T08:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part2Page — 一个名字，两个开始', () => {
  it('shows both approved story screens and keeps observation locked before reading and prediction', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p2')

    expect(screen.getByText(C4_P2_STORY_SCREENS[0])).toBeInTheDocument()
    expect(screen.queryByText(C4_P2_STORY_SCREENS[1])).not.toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p2-run-start')).toBeDisabled()
    expect(screen.getByTestId('jtw-c4p2-tap-wukong')).toBeDisabled()
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeDisabled()
  })

  it('rejects the self-running-b​​elief and requires the text-grounded prediction', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p2')
    fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'))
    fireEvent.click(screen.getByRole('button', { name: /不点悟空，他也应该自己展示/ }))

    expect(screen.getByTestId('jtw-c4p2-run-start')).toBeDisabled()
  })

  it('runs Go first, measures the premature Hop, then runs only the real Tap chain', async () => {
    renderPage()
    await readAndPredict()

    fireEvent.click(screen.getByTestId('jtw-c4p2-run-start'))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-start-trace')).toHaveTextContent('show → say → hop → end'))
    expect(screen.getByTestId('jtw-c4p2-tap-wukong')).toBeEnabled()
    expect(screen.queryByTestId('jtw-c4p2-tap-trace')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('jtw-c4p2-tap-wukong'))
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveTextContent('turn_right → end'))
    expect(screen.getByTestId('jtw-c4p2-resolved')).toHaveTextContent('抢跑的 Hop 被圈出')
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled()
  })

  it('persists both measured event traces and unlocks only C4-P3 through the server', async () => {
    renderPage()
    await readAndPredict()
    fireEvent.click(screen.getByTestId('jtw-c4p2-run-start'))
    await screen.findByTestId('jtw-c4p2-start-trace')
    fireEvent.click(screen.getByTestId('jtw-c4p2-tap-wukong'))
    await screen.findByTestId('jtw-c4p2-tap-trace')
    fireEvent.click(screen.getByTestId('jtw-c4p2-continue'))

    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p2',
      expect.objectContaining({
        selections: expect.objectContaining({
          start_trace: ['show', 'say', 'hop', 'end'],
          tap_trace: ['turn_right', 'end'],
        }),
        prediction: 'name-only',
      }),
    ))
    await screen.findByTestId('map-stub')
  })

  it('restores saved traces after refresh without impersonating a project', async () => {
    renderPage({
      ...OPEN,
      completed: [...OPEN.completed, {
        part_id: 'jtw-s1-c4-p2',
        completed_at: '2026-07-27T08:00:00.000Z',
        evidence: {
          schema_version: 1,
          prediction: 'name-only',
          selections: {
            story_screens: ['story-card-b', 'story-card-c'],
            start_trace: ['show', 'say', 'hop', 'end'],
            tap_trace: ['turn_right', 'end'],
          },
        },
      }],
    })

    await screen.findByTestId('jtw-c4p2-resolved')
    expect(screen.getByTestId('jtw-c4p2-start-trace')).toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toBeInTheDocument()
    expect(screen.getByText(/不开放编辑器、不创建项目/)).toBeInTheDocument()
  })

  it('fails closed when C4-P1 is not complete', async () => {
    renderPage({ ...OPEN, completed: [], unlocked_part_ids: [] })
    await screen.findByTestId('jtw-c4p2-locked')
    expect(screen.queryByTestId('jtw-part-c4-p2')).not.toBeInTheDocument()
  })
})
