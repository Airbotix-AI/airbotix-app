// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC5Part2Page } from './JourneyWestC5Part2Page'
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
  completed: [{ part_id: 'jtw-s1-c5-p1', completed_at: '2026-08-04T00:00:00.000Z', evidence: {} }],
  unlocked_part_ids: ['jtw-s1-c5-p2'],
}

function renderPage(progress = OPEN_PROGRESS) {
  fetchProgress.mockResolvedValue(progress)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c5-p2']}>
        <Routes>
          <Route path="/learn/story/journey-west/jtw-s1-c5-p2" element={<JourneyWestC5Part2Page runnerSleep={async () => undefined} />} />
          <Route path="/learn/story/journey-west/jtw-s1-c5-p3" element={<div data-testid="p3-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function runAndExplain() {
  fireEvent.click(screen.getByTestId('jtw-c5p2-read'))
  fireEvent.click(within(screen.getByTestId('jtw-c5p2-prediction')).getByRole('button', { name: /最后留下小状态/ }))
  fireEvent.click(screen.getByTestId('jtw-c5p2-go'))
  await screen.findByTestId('jtw-c5p2-trace')
  fireEvent.click(within(screen.getByTestId('jtw-c5p2-reset')).getByRole('button', { name: /恢复到初始大小/ }))
  fireEvent.click(within(screen.getByTestId('jtw-c5p2-comparison')).getByRole('button', { name: /预测与实际相同/ }))
}

describe('JourneyWestC5Part2Page', () => {
  beforeEach(() => {
    completePart.mockResolvedValue({ part_id: 'jtw-s1-c5-p2', completed_at: '2026-08-04T01:00:00.000Z' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('locks Go until the story is read and the correct prediction is recorded first', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p2')
    expect(screen.getByTestId('jtw-c5p2-go')).toBeDisabled()
    fireEvent.click(screen.getByTestId('jtw-c5p2-read'))
    fireEvent.click(within(screen.getByTestId('jtw-c5p2-prediction')).getByRole('button', { name: /最后留下大状态/ }))
    expect(screen.getByTestId('jtw-c5p2-go')).toBeDisabled()
    expect(screen.getByTestId('jtw-c5p2-continue')).toBeDisabled()
  })

  it('shows every real operation and size state rather than only a final image', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p2')
    fireEvent.click(screen.getByTestId('jtw-c5p2-read'))
    fireEvent.click(within(screen.getByTestId('jtw-c5p2-prediction')).getByRole('button', { name: /最后留下小状态/ }))
    fireEvent.click(screen.getByTestId('jtw-c5p2-go'))

    const trace = await screen.findByTestId('jtw-c5p2-trace')
    expect(trace).toHaveAttribute('data-op-trace', 'when_flag,grow,wait,reset_size,wait,shrink,end')
    expect(trace).toHaveAttribute('data-size-trace', 'grow:2.2,reset_size:2.0,shrink:1.8')
    expect(trace).toHaveTextContent('实际结尾：size 1.8')
    expect(screen.getByTestId('jtw-c5p2-continue')).toBeDisabled()
  })

  it('requires the correct Reset explanation and prediction/actual comparison', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p2')
    fireEvent.click(screen.getByTestId('jtw-c5p2-read'))
    fireEvent.click(within(screen.getByTestId('jtw-c5p2-prediction')).getByRole('button', { name: /最后留下小状态/ }))
    fireEvent.click(screen.getByTestId('jtw-c5p2-go'))
    await screen.findByTestId('jtw-c5p2-trace')
    fireEvent.click(within(screen.getByTestId('jtw-c5p2-reset')).getByRole('button', { name: /什么也没做/ }))
    fireEvent.click(within(screen.getByTestId('jtw-c5p2-comparison')).getByRole('button', { name: /预测与实际相同/ }))
    expect(screen.getByTestId('jtw-c5p2-continue')).toBeDisabled()
    fireEvent.click(within(screen.getByTestId('jtw-c5p2-reset')).getByRole('button', { name: /恢复到初始大小/ }))
    expect(screen.getByTestId('jtw-c5p2-continue')).toBeEnabled()
  })

  it('persists the prediction-before-run trace and continues directly to P3', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p2')
    await runAndExplain()
    fireEvent.click(screen.getByTestId('jtw-c5p2-continue'))

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c5-p2', {
      schema_version: 1,
      selections: {
        story_screens: ['story-screen-2', 'classic-card'],
        op_trace: ['when_flag', 'grow', 'wait', 'reset_size', 'wait', 'shrink', 'end'],
        size_trace: ['grow:2.2', 'reset_size:2.0', 'shrink:1.8'],
        actual_final_state: ['size:1.8'],
        reset_explanation: ['restore-initial'],
        prediction_actual_comparison: ['prediction-matched-small'],
      },
      prediction: 'small-after-shrink',
    })
    await screen.findByTestId('p3-stub')
  })

  it('restores the persisted interpreter trace after refresh', async () => {
    renderPage({
      ...OPEN_PROGRESS,
      completed: [{
        part_id: 'jtw-s1-c5-p2',
        completed_at: '2026-08-04T01:00:00.000Z',
        evidence: {
          schema_version: 1,
          selections: {
            story_screens: ['story-screen-2'],
            op_trace: ['when_flag', 'grow', 'wait', 'reset_size', 'wait', 'shrink', 'end'],
            size_trace: ['grow:2.2', 'reset_size:2.0', 'shrink:1.8'],
            actual_final_state: ['size:1.8'],
            reset_explanation: ['restore-initial'],
            prediction_actual_comparison: ['prediction-matched-small'],
          },
          prediction: 'small-after-shrink',
        },
      }],
      unlocked_part_ids: ['jtw-s1-c5-p2', 'jtw-s1-c5-p3'],
    })

    const trace = await screen.findByTestId('jtw-c5p2-trace')
    expect(trace).toHaveAttribute('data-size-trace', 'grow:2.2,reset_size:2.0,shrink:1.8')
    expect(screen.getByTestId('jtw-c5p2-resolved')).toBeInTheDocument()
  })
})
