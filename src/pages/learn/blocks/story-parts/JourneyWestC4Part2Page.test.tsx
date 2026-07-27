// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part2Page } from './JourneyWestC4Part2Page'
import {
  C4_P2_STARTER_PROJECT,
  c4p2StartMeasured,
  c4p2TapMeasured,
} from './journeyWestC4Part2Program'
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
  'jtw-s1-c1-p1', 'jtw-s1-c1-p2', 'jtw-s1-c1-p3', 'jtw-s1-c1-p4',
  'jtw-s1-c1-p5', 'jtw-s1-c1-p6', 'jtw-s1-c1-p7', 'jtw-s1-c1-p8',
  'jtw-s1-c2-p1', 'jtw-s1-c2-p2', 'jtw-s1-c2-p3', 'jtw-s1-c2-p4',
  'jtw-s1-c2-p5', 'jtw-s1-c2-p6', 'jtw-s1-c2-p7', 'jtw-s1-c2-p8',
  'jtw-s1-c3-p1', 'jtw-s1-c3-p2', 'jtw-s1-c3-p3', 'jtw-s1-c3-p4',
  'jtw-s1-c3-p5', 'jtw-s1-c3-p6', 'jtw-s1-c3-p7', 'jtw-s1-c3-p8',
  'jtw-s1-c4-p1',
]

const P1_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-27T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p2'],
}

function renderPage(progress = P1_DONE) {
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

function readAndPredict() {
  fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'))
  fireEvent.click(screen.getByRole('button', {
    name: '名字会出现，本领应保持安静；不点悟空就不该展示',
  }))
}

async function runBothEvents() {
  readAndPredict()
  fireEvent.click(screen.getByTestId('jtw-c4p2-go'))
  await waitFor(() => expect(screen.getByTestId('jtw-c4p2-start-result')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('jtw-c4p2-real-tap'))
  await waitFor(() => expect(screen.getByTestId('jtw-c4p2-tap-result')).toBeInTheDocument())
}

beforeEach(() => {
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p2',
    completed_at: '2026-07-27T01:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part2Page — 一个名字，两个开始', () => {
  it('ships the exact wrong Start and read-only Tap starter chains', () => {
    const scripts = C4_P2_STARTER_PROJECT.pages[0].characters[0].scripts
    expect(scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'show' },
      { op: 'say', text: '我是孙悟空' },
      { op: 'hop', n: 1 },
      { op: 'end' },
    ])
    expect(scripts[1].blocks).toEqual([
      { op: 'when_tap' },
      { op: 'turn_right', n: 2 },
      { op: 'end' },
    ])
  })

  it('keeps Go locked until both story screens and the correct prediction are complete', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c4p2-go')).toBeDisabled()
    fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'))
    fireEvent.click(screen.getByRole('button', { name: '名字和本领都会一起开始' }))
    expect(screen.getByTestId('jtw-c4p2-go')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {
      name: '名字会出现，本领应保持安静；不点悟空就不该展示',
    }))
    expect(screen.getByTestId('jtw-c4p2-go')).toBeEnabled()
  })

  it('runs only Start on Go, then only Tap after a real child tap', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument())
    await runBothEvents()
    expect(screen.getByTestId('jtw-c4p2-start-result')).toHaveTextContent('Hop 抢跑了')
    expect(screen.getByTestId('jtw-c4p2-tap-result')).toHaveTextContent('Start 链没有被重新触发')
    expect(screen.getByTestId('jtw-c4p2-track-0').querySelector('[data-circled="true"]'))
      .toHaveTextContent('Hop')
    expect(screen.getByTestId('jtw-c4p2-real-tap')).toHaveStyle({ transform: 'rotate(60deg)' })
  })

  it('rejects watching alone and persists measured event traces before adjacent unlock', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument())
    await runBothEvents()
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '两个入口其实一样，只是图案不同' }))
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {
      name: 'Start 等场景开始；Tap 等观众邀请',
    }))
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled()
    fireEvent.click(screen.getByTestId('jtw-c4p2-continue'))

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    const evidence = completePart.mock.calls[0][2]
    expect(evidence.prediction).toBe('name-only-no-skill')
    expect(evidence.selections.start_trace).toEqual(expect.arrayContaining([
      'trigger:start',
      'scripts:sun-wukong-wrong-start',
      'ops:show>say>hop>end',
      'say:我是孙悟空',
    ]))
    expect(evidence.selections.tap_trace).toEqual(expect.arrayContaining([
      'trigger:tap',
      'scripts:sun-wukong-tap-example',
      'ops:turn_right>end',
    ]))
    expect(evidence.selections.event_comparison).toEqual(['start-scene-tap-invitation'])
    await waitFor(() => expect(screen.getByTestId('map-stub')).toBeInTheDocument())
  })

  it('blocks direct access before C4-P1 and restores completed evidence', async () => {
    const { unmount } = renderPage({
      ...P1_DONE,
      unlocked_part_ids: PRIOR_PART_IDS,
    })
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-locked')).toBeInTheDocument())
    unmount()

    renderPage({
      ...P1_DONE,
      completed: [
        ...P1_DONE.completed,
        {
          part_id: 'jtw-s1-c4-p2',
          completed_at: '2026-07-27T01:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['story-card-b', 'story-card-c'],
              event_comparison: ['start-scene-tap-invitation'],
            },
            prediction: 'name-only-no-skill',
          },
        },
      ],
      unlocked_part_ids: [...P1_DONE.unlocked_part_ids, 'jtw-s1-c4-p3'],
    })
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-resolved')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled()
  })

  it('measures exact event signatures rather than accepting an animation boolean', () => {
    const baseState = { gx: 7, gy: 8, size: 3, rot: 0, visible: true }
    expect(c4p2StartMeasured({
      trigger: 'start',
      scriptIds: ['sun-wukong-wrong-start'],
      ops: ['show', 'say', 'hop', 'end'],
      finalState: baseState,
      says: ['我是孙悟空'],
    })).toBe(true)
    expect(c4p2StartMeasured({
      trigger: 'start',
      scriptIds: ['sun-wukong-wrong-start', 'sun-wukong-tap-example'],
      ops: ['show', 'say', 'hop', 'end'],
      finalState: baseState,
      says: ['我是孙悟空'],
    })).toBe(false)
    expect(c4p2TapMeasured({
      trigger: 'tap',
      scriptIds: ['sun-wukong-tap-example'],
      ops: ['turn_right', 'end'],
      finalState: { ...baseState, rot: 60 },
      says: [],
    })).toBe(true)
  })
})
