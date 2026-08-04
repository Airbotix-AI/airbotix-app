// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import * as blocksApi from '../blocksApi'
import * as storyPartsApi from './storyPartsApi'
import { JourneyWestC5Part5Page } from './JourneyWestC5Part5Page'

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-c5-p5' } }) }))
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
}))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const BEFORE = ['when_flag', 'grow:2', 'wait:5', 'reset_size', 'shrink:2', 'end']
const BUILT: BlocksProject = {
  version: 1,
  name: 'C5 P5',
  lessonId: 'jtw-s1-c5-p5',
  pages: [{ id: 'size-page', background: 'pillar-hall', characters: [{
    id: 'ruyi-staff', name: 'Ruyi Staff', emoji: '🦯', start: { gx: 10, gy: 8, size: 1, rot: 0 },
    scripts: [{ id: 'ruyi-staff/size-build', blocks: [
      { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'reset_size' },
      { op: 'wait', n: 5 }, { op: 'shrink', n: 2 },
      { op: 'say', text: '准备携带' }, { op: 'end' },
    ] }],
  }] }],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c5-p5']}><Routes><Route path="/learn/story/journey-west/:partId" element={<JourneyWestC5Part5Page />} /><Route path="/learn/story/journey-west" element={<div data-testid="map-stub" />} /></Routes></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.mocked(storyPartsApi.fetchStoryLineProgress).mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [{ part_id: 'jtw-s1-c5-p4', completed_at: '2026-08-04T00:00:00Z', evidence: { schema_version: 1, prediction: 'large-original-small', selections: { build_project: ['project-p4'], build_ast: BEFORE } } }],
    unlocked_part_ids: ['jtw-s1-c5-p5'],
  })
  vi.mocked(blocksApi.listBlocksProjects).mockResolvedValue([{ id: 'project-p5', title: 'P5', kind: 'blocks', status: 'active' }])
  vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue({
    project: BUILT, version: 2, history: { past: [], future: [] }, otherFiles: [],
    storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c5-p5': { completedAt: '2026-08-04T00:00:00Z' } } },
  })
  vi.mocked(storyPartsApi.completeStoryPart).mockResolvedValue({ part_id: 'jtw-s1-c5-p5', completed_at: '2026-08-04T00:00:00Z' })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })

function answerReadingAndUses() {
  fireEvent.click(screen.getByRole('button', { name: /窄门限制/ }))
  fireEvent.click(screen.getByRole('button', { name: /弯曲水道/ }))
  fireEvent.change(screen.getByLabelText('大状态'), { target: { value: '看见原貌' } })
  fireEvent.change(screen.getByLabelText('原状态'), { target: { value: '比较初始' } })
  fireEvent.change(screen.getByLabelText('小状态'), { target: { value: '准备携带' } })
  fireEvent.click(screen.getByRole('button', { name: /三个停点依次读出用途/ }))
}

describe('JourneyWestC5Part5Page', () => {
  it('requires two environment facts, three uses, changed AST and a carrying run', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p5')
    expect(screen.getByTestId('jtw-c5p5-continue')).toBeDisabled()
    answerReadingAndUses()
    await waitFor(() => expect(screen.getByTestId('jtw-c5p5-continue')).toBeEnabled())
    expect(screen.getByTestId('jtw-c5p5-resolved')).toHaveTextContent('窄门安全线')
  })

  it('persists P4 provenance, before/after AST, environment and carrying safety line', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c5-p5')
    answerReadingAndUses()
    fireEvent.click(await screen.findByTestId('jtw-c5p5-continue'))
    await waitFor(() => expect(storyPartsApi.completeStoryPart).toHaveBeenCalledWith(
      'journey-to-the-west-s1', 'jtw-s1-c5-p5', expect.objectContaining({
        selections: expect.objectContaining({
          environment_evidence: ['narrow-door', 'curved-waterway'],
          source_project: ['project-p4'],
          before_ast: BEFORE,
          after_ast: ['when_flag', 'grow:2', 'reset_size', 'wait:5', 'shrink:2', 'say:准备携带', 'end'],
          final_state: ['carrying-safe-line'],
        }),
      }),
    ))
    await screen.findByTestId('map-stub')
  })

  it('does not show the safety line for a non-carrying final state', async () => {
    const wrong = structuredClone(BUILT)
    wrong.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'wait', n: 5 },
      { op: 'shrink', n: 2 }, { op: 'reset_size' }, { op: 'say', text: '比较初始' }, { op: 'end' },
    ]
    vi.mocked(blocksApi.loadBlocksProject).mockResolvedValue({
      project: wrong, version: 2, history: { past: [], future: [] }, otherFiles: [],
      storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c5-p5': { completedAt: '2026-08-04T00:00:00Z' } } },
    })
    renderPage()
    await screen.findByTestId('jtw-part-c5-p5')
    answerReadingAndUses()
    await waitFor(() => expect(screen.getByTestId('jtw-c5p5-build-status')).toHaveTextContent('等待'))
    expect(screen.getByTestId('jtw-c5p5-continue')).toBeDisabled()
    expect(screen.queryByTestId('jtw-c5p5-resolved')).toBeNull()
  })
})
