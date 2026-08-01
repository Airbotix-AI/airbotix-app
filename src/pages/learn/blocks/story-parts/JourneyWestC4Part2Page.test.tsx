// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part2Page } from './JourneyWestC4Part2Page'
import {
  C4_P2_EXPECTED_FLAG_TRACE,
  C4_P2_EXPECTED_TAP_TRACE,
  C4_P2_FLAG_SCRIPT_ID,
  C4_P2_STARTER,
  C4_P2_TAP_SCRIPT_ID,
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
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c1-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c2-p${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `jtw-s1-c3-p${index + 1}`),
  'jtw-s1-c4-p1',
]
const P2_OPEN: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-08-01T00:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c4-p2'],
  chapter_seals: [],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p2']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part2Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function readAndPredict() {
  fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'))
  fireEvent.click(
    screen.getByRole('button', { name: '名字会出现；不点悟空，本领应该保持安静' }),
  )
}

async function runBothEvents() {
  fireEvent.click(screen.getByTestId('jtw-c4p2-run-go'))
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-flag-trace')).toHaveTextContent(
      C4_P2_EXPECTED_FLAG_TRACE.join(' → '),
    ),
  )
  fireEvent.click(screen.getByTestId('jtw-c4p2-wukong'))
  await waitFor(() =>
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveTextContent(
      C4_P2_EXPECTED_TAP_TRACE.join(' → '),
    ),
  )
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P2_OPEN)
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c4-p2',
    completed_at: '2026-08-01T00:10:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC4Part2Page · 一个名字，两个开始', () => {
  it('ships the approved wrong Start chain and separate read-only Tap example', () => {
    const scripts = C4_P2_STARTER.pages[0].characters[0].scripts
    expect(scripts.find((script) => script.id === C4_P2_FLAG_SCRIPT_ID)?.blocks).toEqual([
      { op: 'when_flag' },
      { op: 'show' },
      { op: 'say', text: '我是孙悟空。' },
      { op: 'hop', n: 1 },
      { op: 'end' },
    ])
    expect(scripts.find((script) => script.id === C4_P2_TAP_SCRIPT_ID)?.blocks).toEqual([
      { op: 'when_tap' },
      { op: 'turn_right', n: 2 },
      { op: 'end' },
    ])
  })

  it('stays locked until the server unlocks P2', async () => {
    fetchProgress.mockResolvedValue({ ...P2_OPEN, unlocked_part_ids: PRIOR_PART_IDS })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-locked')).toBeInTheDocument())
    expect(screen.queryByTestId('jtw-part-c4-p2')).not.toBeInTheDocument()
  })

  it('requires the full story and correct prediction before the real Go run', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-c4p2-run-go')).toBeDisabled()
    fireEvent.click(screen.getByTestId('jtw-c4p2-story-next'))
    fireEvent.click(screen.getByRole('button', { name: 'Go 会让 Start 和 On Tap 两条链一起开始' }))
    expect(screen.getByTestId('jtw-c4p2-run-go')).toBeDisabled()
  })

  it('measures Start and Tap separately through the real interpreter', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument())
    readAndPredict()
    await runBothEvents()
    expect(screen.getByTestId('jtw-c4p2-runaway-hop')).toBeInTheDocument()
    expect(screen.getByTestId('jtw-c4p2-name-board')).toHaveTextContent('孙悟空')
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Go 只启动 Start；点悟空只启动 On Tap' }))
    expect(screen.getByTestId('jtw-c4p2-resolved')).toHaveTextContent('会做什么')
    expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled()
  })

  it('persists the two measured traces and unlocks only adjacent P3', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p2')).toBeInTheDocument())
    readAndPredict()
    await runBothEvents()
    fireEvent.click(screen.getByRole('button', { name: 'Go 只启动 Start；点悟空只启动 On Tap' }))
    fireEvent.click(screen.getByTestId('jtw-c4p2-continue'))
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p2', {
        schema_version: 1,
        selections: {
          story_screens: ['name-links-time', 'learning-takes-time'],
          flag_trace: [...C4_P2_EXPECTED_FLAG_TRACE],
          tap_trace: [...C4_P2_EXPECTED_TAP_TRACE],
          event_comparison: ['different-events'],
        },
        prediction: 'name-only-until-tap',
      }),
    )
    await waitFor(() => expect(screen.getByTestId('map-stub')).toBeInTheDocument())
  })

  it('restores server evidence after refresh without creating or editing a project', async () => {
    fetchProgress.mockResolvedValue({
      ...P2_OPEN,
      completed: [
        ...P2_OPEN.completed,
        {
          part_id: 'jtw-s1-c4-p2',
          completed_at: '2026-08-01T00:10:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              story_screens: ['name-links-time', 'learning-takes-time'],
              flag_trace: [...C4_P2_EXPECTED_FLAG_TRACE],
              tap_trace: [...C4_P2_EXPECTED_TAP_TRACE],
              event_comparison: ['different-events'],
            },
            prediction: 'name-only-until-tap',
          },
        },
      ],
      unlocked_part_ids: [...P2_OPEN.unlocked_part_ids, 'jtw-s1-c4-p3'],
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-c4p2-continue')).toBeEnabled())
    expect(screen.getByTestId('jtw-c4p2-flag-trace')).toHaveTextContent('show → say → hop → end')
    expect(screen.getByTestId('jtw-c4p2-tap-trace')).toHaveTextContent('turn_right → end')
  })
})
