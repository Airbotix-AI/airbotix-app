// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC5Part6Page } from './JourneyWestC5Part6Page'
import * as storyPartsApi from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c5-p6']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC5Part6Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function finishDebug() {
  fireEvent.click(screen.getByRole('button', { name: '最后应是可携带的小状态' }))
  fireEvent.click(screen.getByRole('button', { name: '运行错误版' }))
  await screen.findByTestId('jtw-c5p6-wrong-trace')
  fireEvent.click(screen.getByRole('button', { name: '实际又回到原状态，窄门被挡住' }))
  fireEvent.click(screen.getByRole('button', { name: '第一次偏离在末尾 Reset 执行时' }))
  fireEvent.click(screen.getByRole('button', { name: '把 Reset 移到 Shrink 2 前面' }))
  fireEvent.click(screen.getByRole('button', { name: '运行修复版' }))
  await screen.findByTestId('jtw-c5p6-fixed-trace')
  fireEvent.click(screen.getByRole('button', { name: '第二次一致重跑' }))
  await screen.findByTestId('jtw-c5p6-repeat-trace')
  fireEvent.click(screen.getByRole('button', {
    name: '最后是小状态，因为最后一个状态块是 Shrink 2',
  }))
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [{
      part_id: 'jtw-s1-c5-p5',
      completed_at: '2026-08-04T12:00:00.000Z',
      evidence: { schema_version: 1, selections: { after_ast: ['when_flag', 'grow:2', 'reset_size', 'wait:5', 'say:准备携带', 'shrink:2', 'end'] } },
    }],
    unlocked_part_ids: ['jtw-s1-c5-p6'],
  })
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c5-p6',
    completed_at: '2026-08-04T13:00:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestC5Part6Page', () => {
  it('fails closed until wrong run, exact one-Reset move, two matching reruns, and explanation', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p6')
    expect(screen.getByTestId('jtw-c5p6-continue')).toBeDisabled()
    await finishDebug()
    expect(screen.getByTestId('jtw-c5p6-ast-diff')).toHaveTextContent(
      '修复后：when_flag → grow:2 → wait:5 → reset_size → shrink:2 → end',
    )
    expect(screen.getByTestId('jtw-c5p6-resolved')).toHaveTextContent('窄门重开')
    expect(screen.getByTestId('jtw-c5p6-continue')).toBeEnabled()
  })

  it('persists before/after AST, wrong/fixed/repeat traces, explanation, and adjacent P7 handoff', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p6')
    await finishDebug()
    fireEvent.click(screen.getByTestId('jtw-c5p6-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c5-p6',
      expect.objectContaining({
        selections: expect.objectContaining({
          expectation: ['final-small'],
          source_p5_ast: ['when_flag', 'grow:2', 'reset_size', 'wait:5', 'say:准备携带', 'shrink:2', 'end'],
          actual: ['reset-restored-initial'],
          first_deviation: ['final-reset'],
          before_ast: ['when_flag', 'grow:2', 'wait:5', 'shrink:2', 'reset_size', 'end'],
          after_ast: ['when_flag', 'grow:2', 'wait:5', 'reset_size', 'shrink:2', 'end'],
          order_diff: ['ruyi-staff/debug:reset_size:4→3'],
          wrong_run_trace: ['when_flag', 'grow', 'wait', 'shrink', 'reset_size', 'end'],
          fixed_run_trace: ['when_flag', 'grow', 'wait', 'reset_size', 'shrink', 'end'],
          repeat_run_trace: ['when_flag', 'grow', 'wait', 'reset_size', 'shrink', 'end'],
          final_size: ['0.8'],
          explanation: ['last-state-wins'],
        }),
      }),
    )
    await screen.findByTestId('map-stub')
  })

  it('keeps a locked child out and restores a server-completed P6 on refresh', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: [],
    })
    renderPage()
    await screen.findByTestId('jtw-c5p6-locked')
    expect(screen.queryByTestId('jtw-part-c5-p6')).not.toBeInTheDocument()

    cleanup()
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      unlocked_part_ids: ['jtw-s1-c5-p6', 'jtw-s1-c5-p7'],
      completed: [{
        part_id: 'jtw-s1-c5-p6',
        completed_at: '2026-08-04T13:00:00.000Z',
        evidence: {
          schema_version: 1,
          selections: {
            before_ast: ['before'],
            after_ast: ['after'],
            wrong_run_trace: ['wrong'],
            fixed_run_trace: ['fixed'],
            repeat_run_trace: ['repeat'],
            source_p5_ast: ['source'],
          },
        },
      }],
    })
    renderPage()
    await screen.findByTestId('jtw-c5p6-resolved')
    expect(screen.getByTestId('jtw-c5p6-continue')).toHaveTextContent('回到地图')
  })
})
