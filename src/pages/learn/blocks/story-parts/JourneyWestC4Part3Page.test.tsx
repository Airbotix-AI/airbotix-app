// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part3Page } from './JourneyWestC4Part3Page'
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
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p3']}><Routes><Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part3Page />} /><Route path="/learn/story/journey-west" element={<div data-testid="map" />} /></Routes></MemoryRouter></QueryClientProvider>)
}

describe('JourneyWestC4Part3Page', () => {
  beforeEach(() => {
    fetchProgress.mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', completed: [{ part_id: 'jtw-s1-c4-p2', completed_at: '2026-08-03T00:00:00.000Z', evidence: {} }], unlocked_part_ids: ['jtw-s1-c4-p3'] })
    completePart.mockResolvedValue({ ok: true } as never)
  })
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('requires both trigger evidence and the corrected card circles', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p3')
    fireEvent.click(screen.getByTestId('jtw-c4p3-read'))
    fireEvent.click(screen.getByRole('button', { name: 'Start 等场景开始' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tap 等观众邀请' }))
    fireEvent.click(screen.getByRole('button', { name: /名字卡：我是孙悟空/ }))
    fireEvent.click(screen.getByRole('button', { name: /动作卡：转身/ }))
    fireEvent.click(screen.getByRole('button', { name: /动作卡：转身/ }))
    fireEvent.click(screen.getByRole('button', { name: /动作卡：Hop 一步/ }))
    fireEvent.click(screen.getByRole('button', { name: /动作卡：Hop 一步/ }))
    fireEvent.click(screen.getByRole('button', { name: /动作卡：Hide → Show/ }))
    fireEvent.click(screen.getByRole('button', { name: /动作卡：Hide → Show/ }))
    fireEvent.click(screen.getByRole('button', { name: '转身会在举旗时抢跑，两条入口混在一起' }))
    fireEvent.click(screen.getByRole('button', { name: '🚩 举旗演练' }))
    fireEvent.click(screen.getByRole('button', { name: '👆 纸卡 Tap 演练' }))
    expect(screen.getByTestId('jtw-c4p3-resolved')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('jtw-c4p3-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p3', expect.objectContaining({ prediction: 'cross', selections: expect.objectContaining({ trigger_evidence: ['start-waits-scene', 'tap-waits-invite'], rehearsals: ['start', 'tap'] }) })))
  })
})
