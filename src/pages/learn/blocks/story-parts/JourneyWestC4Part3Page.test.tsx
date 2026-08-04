// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part3Page } from './JourneyWestC4Part3Page'
import * as storyPartsApi from './storyPartsApi'
import type { StoryLineProgress } from './storyPartsApi'

vi.mock('./storyPartsApi', async (importOriginal) => ({ ...(await importOriginal<typeof storyPartsApi>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn() }))
const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const OPEN_PROGRESS: StoryLineProgress = { story_line_id: 'journey-to-the-west-s1', completed: [{ part_id: 'jtw-s1-c4-p2', completed_at: '2026-08-03T12:00:00.000Z', evidence: {} }], unlocked_part_ids: ['jtw-s1-c4-p3'] }

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p3']}><Routes><Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part3Page />} /><Route path="/learn/story/journey-west" element={<div data-testid="map" />} /></Routes></MemoryRouter></QueryClientProvider>)
}

async function completeModel() {
  fireEvent.click(screen.getByTestId('jtw-c4p3-read'))
  fireEvent.click(within(screen.getByTestId('jtw-c4p3-meanings')).getByRole('button', { name: 'Start在等场景开始' }))
  fireEvent.click(within(screen.getByTestId('jtw-c4p3-meanings')).getByRole('button', { name: 'Tap在等观众邀请' }))
  fireEvent.click(within(screen.getByTestId('jtw-c4p3-prediction')).getByRole('button', { name: '举旗后，悟空会没等邀请就先转身' }))
  fireEvent.click(screen.getByTestId('jtw-c4p3-move'))
  fireEvent.click(screen.getByTestId('jtw-c4p3-flag-rehearsal'))
  fireEvent.click(screen.getByTestId('jtw-c4p3-tap-rehearsal'))
}

describe('JourneyWestC4Part3Page', () => {
  beforeEach(() => { fetchProgress.mockResolvedValue(OPEN_PROGRESS); completePart.mockResolvedValue({ ok: true } as never) })
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('refuses the move until the story, both trigger meanings and the error prediction are correct', async () => {
    renderPage(); await screen.findByTestId('jtw-part-c4-p3')
    expect(screen.getByTestId('jtw-c4p3-move')).toBeDisabled()
    fireEvent.click(screen.getByTestId('jtw-c4p3-read'))
    fireEvent.click(within(screen.getByTestId('jtw-c4p3-meanings')).getByRole('button', { name: 'Start在等观众邀请' }))
    fireEvent.click(within(screen.getByTestId('jtw-c4p3-meanings')).getByRole('button', { name: 'Tap在等观众邀请' }))
    fireEvent.click(within(screen.getByTestId('jtw-c4p3-prediction')).getByRole('button', { name: '举旗后只会介绍名字，动作会安静等待' }))
    expect(screen.getByTestId('jtw-c4p3-move')).toBeDisabled()
    expect(screen.getByTestId('jtw-c4p3-continue')).toBeDisabled()
  })

  it('requires one minimal card move and both distinct offline rehearsals', async () => {
    renderPage(); await screen.findByTestId('jtw-part-c4-p3'); await completeModel()
    expect(screen.getByTestId('jtw-c4p3-rehearsal-count')).toHaveTextContent('2/2')
    expect(screen.getByTestId('jtw-c4p3-resolved')).toHaveTextContent('真正的两条积木链仍有空槽')
    expect(screen.getByTestId('jtw-c4p3-continue')).toBeEnabled()
  })

  it('persists model evidence without Code or Run evidence and unlocks only P4', async () => {
    renderPage(); await screen.findByTestId('jtw-part-c4-p3'); await completeModel(); fireEvent.click(screen.getByTestId('jtw-c4p3-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1))
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p3', { schema_version: 1, selections: { story_screens: ['story-screen-3'], trigger_meanings: ['scene-start', 'audience-tap'], action_circle: ['tap'], card_moves: ['turn:start-to-tap'], rehearsals: ['flag:name-only', 'paper-tap:turn'], model_evidence: ['name-in-start', 'turn-in-tap', 'paths-not-crossed'] }, prediction: 'turn-before-invite' })
    expect(completePart.mock.calls[0]?.[2].selections).not.toHaveProperty('run_trace')
    await screen.findByTestId('map')
  })
})
