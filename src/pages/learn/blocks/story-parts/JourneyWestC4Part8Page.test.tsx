// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P7_LESSON_ID,
  JTW_C4_P7_SKILL_TARGETS,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_WUKONG_ASSET,
} from '../jtwC4DualBuild'
import { JourneyWestC4Part8Page } from './JourneyWestC4Part8Page'
import type { C4P7BuildEvidence } from './journeyWestC4Part7Program'
import * as storyPartsApi from './storyPartsApi'

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-c4-p8' } }),
}))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const PROJECT: BlocksProject = {
  version: 1,
  name: 'Meet Sun Wukong',
  lessonId: JTW_C4_P7_LESSON_ID,
  pages: [{
    id: JTW_C4_P4_PAGE_ID,
    background: 'jtw-s1-c4-mountain-gate',
    characters: [{
      id: 'sun-wukong', name: 'Sun Wukong', emoji: '🐒', asset: JTW_C4_WUKONG_ASSET,
      start: { gx: 10, gy: 9, size: 3, rot: 0 },
      scripts: [
        { id: 'sun-wukong-name', blocks: [...JTW_C4_NAME_TARGET] },
        { id: 'sun-wukong-skill', blocks: [...JTW_C4_P7_SKILL_TARGETS.turn] },
      ],
    }],
  }],
}

const BUILD: C4P7BuildEvidence = {
  projectId: 'c4-p7-saved',
  project: PROJECT,
  version: 8,
  design: 'turn',
  dualRunCompleted: true,
  blockCount: 9,
  childLedBlockCount: 7,
  endCount: 2,
}

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)

function renderPage(loadBuild = vi.fn().mockResolvedValue(BUILD)) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><JourneyWestC4Part8Page previewSleep={async () => undefined} loadBuild={loadBuild} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [],
    unlocked_part_ids: ['jtw-s1-c4-p8'],
    chapter_seals: [{
      seal_id: 'jtw-s1-c4-name-seal', chapter_code: 'C4', lit: false,
      missing: ['part:jtw-s1-c4-p8'],
    }],
  })
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p8', completed_at: '2026-08-04T00:00:00Z' })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('JourneyWestC4Part8Page', () => {
  it('fails closed until the P7 saved Personal Ship unlocks Retell', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1', completed: [], unlocked_part_ids: [],
      chapter_seals: [{ seal_id: 'jtw-s1-c4-name-seal', chapter_code: 'C4', lit: false, missing: ['part:jtw-s1-c4-p8'] }],
    })
    renderPage()
    expect(await screen.findByText('先保存并重开你的悟空认识卡。')).toBeVisible()
  })

  it('reruns the exact P7 save, requires six cause cards and all Retell evidence', async () => {
    renderPage()
    await screen.findByTestId('jtw-part-c4-p8')
    for (const label of ['离开花果山', '到门前说明来意', '得到名字', '经过学习', '等待邀请', '展示本领']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    fireEvent.click(screen.getByRole('button', { name: '真实Go，再真实Tap' }))
    await screen.findByTestId('jtw-c4p8-run-trace')
    fireEvent.click(screen.getByRole('button', { name: /因为石猴愿意远行求学/ }))
    fireEvent.click(screen.getByRole('button', { name: /我从花果山来，想认真学习/ }))
    fireEvent.click(screen.getByRole('button', { name: /本领误接在 Start 后/ }))
    expect(screen.getByTestId('jtw-c4p8-resolved')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '点亮得名印' }))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s1',
      'jtw-s1-c4-p8',
      expect.objectContaining({
        selections: expect.objectContaining({
          run_project: ['c4-p7-saved'],
          run_saved_version: ['8'],
          start_trace: ['when_flag', 'show', 'say', 'end'],
          tap_trace: ['when_tap', 'turn_left', 'wait', 'say', 'end'],
        }),
      }),
    ))
  })

  it('does not accept an absent or structurally incomplete P7 save', async () => {
    renderPage(vi.fn().mockResolvedValue(null))
    await screen.findByTestId('jtw-part-c4-p8')
    expect(screen.getByText(/找不到合格的P7保存版本/)).toBeVisible()
    expect(screen.getByRole('button', { name: '真实Go，再真实Tap' })).toBeDisabled()
  })
})
