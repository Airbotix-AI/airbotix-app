// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestS2C1Part2Page } from './JourneyWestS2C1Part2Page'
import * as storyPartsApi from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s2-c1-p2']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestS2C1Part2Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s2',
    completed: [{ part_id: 'jtw-s2-c1-p1', completed_at: 'now', evidence: {} }],
    unlocked_part_ids: ['jtw-s2-c1-p1', 'jtw-s2-c1-p2'],
  })
  completePart.mockResolvedValue({ part_id: 'jtw-s2-c1-p2', completed_at: '2026-08-15T00:00:00Z' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestS2C1Part2Page', () => {
  it('stays locked until P1 is complete', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c1-p1'],
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1p2-locked')).toBeInTheDocument())
  })

  it('requires the story-grounded motive and because sentence', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1-p2')).toBeInTheDocument())
    const continueButton = screen.getByTestId('jtw-s2-c1p2-continue')
    fireEvent.click(screen.getByTestId('jtw-s2-c1p2-read'))
    fireEvent.click(screen.getByRole('button', { name: '因为玄奘害怕走路' }))
    expect(screen.getByRole('status')).toHaveTextContent('远目标还在')
    fireEvent.click(screen.getByRole('button', { name: /远目标很大/ }))
    fireEvent.click(screen.getByRole('button', { name: '因为系统规定，所以只能写三步' }))
    expect(screen.getByRole('alert')).toHaveTextContent('不是来自系统规则')
    expect(continueButton).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '因为地图很长，所以先写今天的三步' }))
    expect(screen.getByTestId('jtw-s2-c1p2-resolved')).toHaveTextContent('三幅图亮起来了')
    expect(continueButton).toBeEnabled()
  })

  it('persists Why evidence and returns to the map', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1-p2')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('jtw-s2-c1p2-read'))
    fireEvent.click(screen.getByRole('button', { name: /远目标很大/ }))
    fireEvent.click(screen.getByRole('button', { name: '因为地图很长，所以先写今天的三步' }))
    fireEvent.click(screen.getByTestId('jtw-s2-c1p2-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s2', 'jtw-s2-c1-p2', {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-2'],
        motive_choice: ['break-down-goal'],
        because_sentence: ['map-long-three-steps'],
      },
    }))
    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument())
  })

  it('restores completed evidence after refresh', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [{
        part_id: 'jtw-s2-c1-p2',
        completed_at: 'now',
        evidence: { schema_version: 1, selections: { story_screens: ['story-card-2'], motive_choice: ['break-down-goal'], because_sentence: ['map-long-three-steps'] } },
      }],
      unlocked_part_ids: ['jtw-s2-c1-p1', 'jtw-s2-c1-p2', 'jtw-s2-c1-p3'],
    })
    renderPage()
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1p2-resolved')).toBeInTheDocument())
    expect(screen.getByTestId('jtw-s2-c1p2-continue')).toBeEnabled()
  })
})
