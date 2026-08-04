// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC5Part3Page } from './JourneyWestC5Part3Page'
import * as storyPartsApi from './storyPartsApi'
import type { StoryLineProgress } from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const OPEN_PROGRESS: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [{ part_id: 'jtw-s1-c5-p2', completed_at: '2026-08-04T01:00:00.000Z', evidence: {} }],
  unlocked_part_ids: ['jtw-s1-c5-p3'],
}

function renderPage(progress = OPEN_PROGRESS) {
  fetchProgress.mockResolvedValue(progress)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c5-p3']}>
        <Routes>
          <Route path="/learn/story/journey-west/jtw-s1-c5-p3" element={<JourneyWestC5Part3Page runnerSleep={async () => undefined} />} />
          <Route path="/learn/story/journey-west/jtw-s1-c5-p4" element={<div data-testid="p4-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function doBodyModel() {
  const body = within(screen.getByTestId('jtw-c5p3-body'))
  fireEvent.click(body.getByRole('button', { name: /Grow：/ }))
  fireEvent.click(body.getByRole('button', { name: /Reset：/ }))
  fireEvent.click(body.getByRole('button', { name: /Shrink：/ }))
  fireEvent.click(screen.getByTestId('jtw-c5p3-safety'))
}

function orderCards(testId: string, labels: RegExp[]) {
  const group = within(screen.getByTestId(testId))
  for (const label of labels) fireEvent.click(group.getByRole('button', { name: label }))
}

async function completeTwoRuns() {
  fireEvent.click(screen.getByTestId('jtw-c5p3-read'))
  doBodyModel()
  orderCards('jtw-c5p3-first-order', [/大 · Grow/, /原 · Reset/, /小 · Shrink/])
  fireEvent.click(within(screen.getByTestId('jtw-c5p3-first-prediction')).getByRole('button', { name: /最后留下小状态/ }))
  fireEvent.click(screen.getByTestId('jtw-c5p3-run-first'))
  await screen.findByTestId('jtw-c5p3-first-trace')

  orderCards('jtw-c5p3-second-order', [/小 · Shrink/, /原 · Reset/, /大 · Grow/])
  fireEvent.click(within(screen.getByTestId('jtw-c5p3-second-prediction')).getByRole('button', { name: /最后留下大状态/ }))
  fireEvent.click(screen.getByTestId('jtw-c5p3-run-second'))
  await screen.findByTestId('jtw-c5p3-second-trace')
  fireEvent.click(within(screen.getByTestId('jtw-c5p3-reset')).getByRole('button', { name: /后面的状态块仍会继续/ }))
}

describe('JourneyWestC5Part3Page', () => {
  beforeEach(() => {
    fetchProgress.mockResolvedValue(OPEN_PROGRESS)
    completePart.mockResolvedValue({ part_id: 'jtw-s1-c5-p3', completed_at: '2026-08-04T02:00:00.000Z' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('does not accept body motions and a safety check without real program runs', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p3')
    fireEvent.click(screen.getByTestId('jtw-c5p3-read'))
    doBodyModel()
    expect(screen.getByTestId('jtw-c5p3-continue')).toBeDisabled()
    expect(screen.getByTestId('jtw-c5p3-body')).toHaveTextContent('不能单独完成 Part')
  })

  it('locks each run until its card order and prediction are correct', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p3')
    fireEvent.click(screen.getByTestId('jtw-c5p3-read'))
    orderCards('jtw-c5p3-first-order', [/小 · Shrink/, /原 · Reset/, /大 · Grow/])
    fireEvent.click(within(screen.getByTestId('jtw-c5p3-first-prediction')).getByRole('button', { name: /最后留下大状态/ }))
    expect(screen.getByTestId('jtw-c5p3-run-first')).toBeDisabled()
    expect(screen.getByTestId('jtw-c5p3-run-second')).toBeDisabled()
  })

  it('records two real state traces with different final sizes', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p3')
    await completeTwoRuns()

    expect(screen.getByTestId('jtw-c5p3-first-trace')).toHaveAttribute('data-trace', 'grow:2.2,reset_size:2.0,shrink:1.8')
    expect(screen.getByTestId('jtw-c5p3-second-trace')).toHaveAttribute('data-trace', 'shrink:1.8,reset_size:2.0,grow:2.2')
    expect(screen.getByTestId('jtw-c5p3-resolved')).toHaveTextContent('下一 Part 才开始主 Build')
    expect(screen.getByTestId('jtw-c5p3-continue')).toBeEnabled()
  })

  it('persists both pre-run predictions, real traces and safety evidence before entering P4', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p3')
    await completeTwoRuns()
    fireEvent.click(screen.getByTestId('jtw-c5p3-continue'))

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c5-p3', {
      schema_version: 1,
      selections: {
        story_screens: ['story-screen-3'],
        body_state_model: ['stretch', 'neutral', 'gather'],
        safety_confirmation: ['own-space-no-contact-no-swinging'],
        first_card_order: ['grow', 'reset_size', 'shrink'],
        second_card_order: ['shrink', 'reset_size', 'grow'],
        pre_run_predictions: ['first-small', 'second-large'],
        first_op_trace: ['when_flag', 'grow', 'wait', 'reset_size', 'wait', 'shrink', 'end'],
        first_size_trace: ['grow:2.2', 'reset_size:2.0', 'shrink:1.8'],
        second_op_trace: ['when_flag', 'shrink', 'wait', 'reset_size', 'wait', 'grow', 'end'],
        second_size_trace: ['shrink:1.8', 'reset_size:2.0', 'grow:2.2'],
        final_state_comparison: ['first:1.8', 'second:2.2'],
        reset_explanation: ['middle-restore'],
      },
      prediction: 'first-small|second-large',
    })
    await screen.findByTestId('p4-stub')
  })

  it('restores both different real traces after refresh', async () => {
    renderPage({
      ...OPEN_PROGRESS,
      completed: [{
        part_id: 'jtw-s1-c5-p3',
        completed_at: '2026-08-04T02:00:00.000Z',
        evidence: {
          schema_version: 1,
          selections: {
            story_screens: ['story-screen-3'],
            body_state_model: ['stretch', 'neutral', 'gather'],
            safety_confirmation: ['own-space-no-contact-no-swinging'],
            first_card_order: ['grow', 'reset_size', 'shrink'],
            second_card_order: ['shrink', 'reset_size', 'grow'],
            pre_run_predictions: ['first-small', 'second-large'],
            first_op_trace: ['when_flag', 'grow', 'wait', 'reset_size', 'wait', 'shrink', 'end'],
            first_size_trace: ['grow:2.2', 'reset_size:2.0', 'shrink:1.8'],
            second_op_trace: ['when_flag', 'shrink', 'wait', 'reset_size', 'wait', 'grow', 'end'],
            second_size_trace: ['shrink:1.8', 'reset_size:2.0', 'grow:2.2'],
            final_state_comparison: ['first:1.8', 'second:2.2'],
            reset_explanation: ['middle-restore'],
          },
          prediction: 'first-small|second-large',
        },
      }],
      unlocked_part_ids: ['jtw-s1-c5-p3', 'jtw-s1-c5-p4'],
    })

    expect(await screen.findByTestId('jtw-c5p3-first-trace')).toHaveAttribute('data-trace', 'grow:2.2,reset_size:2.0,shrink:1.8')
    expect(screen.getByTestId('jtw-c5p3-second-trace')).toHaveAttribute('data-trace', 'shrink:1.8,reset_size:2.0,grow:2.2')
    expect(screen.getByTestId('jtw-c5p3-resolved')).toBeInTheDocument()
  })
})
