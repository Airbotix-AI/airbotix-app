// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  JTW_S2_ASSETS,
  JTW_S2_C1_P4_TARGET,
  JTW_S2_C2_P4_TARGET,
  JTW_S2_C2_P5_WUKONG_TARGET,
} from '../jtwS2Builds'
import { JourneyWestS2BatchPartPage } from './JourneyWestS2BatchPartPage'
import * as blocksApi from '../blocksApi'
import * as storyPartsApi from './storyPartsApi'

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-1' } }) }))
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
  createBlocksProject: vi.fn(),
}))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)
const completePart = vi.mocked(storyPartsApi.completeStoryPart)
const listProjects = vi.mocked(blocksApi.listBlocksProjects)
const loadProject = vi.mocked(blocksApi.loadBlocksProject)

function renderPart(partId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/learn/story/journey-west/${partId}`]}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestS2BatchPartPage partId={partId} />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function p4Loaded(runCompleted: boolean) {
  const completed: Record<string, { completedAt: string }> = runCompleted
    ? { 'jtw-s2-c1-p4': { completedAt: 'now' } }
    : {}
  return {
    version: 2,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: { schemaVersion: 1 as const, completed },
    project: {
      version: 1 as const,
      name: 'Journey to the West S2 · Three Steps to the Mountain',
      lessonId: 'jtw-s2-c1-p4',
      pages: [{
        id: 'jtw-s2-c1-p4-page',
        background: 'jtw-s2-c1-changan-to-mountain',
        characters: [{
          id: 'xuanzang', name: 'Xuanzang', emoji: '🧑‍🦲',
          asset: JTW_S2_ASSETS.xuanzang,
          start: { gx: 2, gy: 9, size: 2, rot: 0 },
          scripts: [{ id: 'xuanzang-departure', blocks: JTW_S2_C1_P4_TARGET }],
        }],
      }],
    },
  }
}

function c2p5Loaded(runCompleted: boolean) {
  const completed: Record<string, { completedAt: string }> = runCompleted
    ? { 'jtw-s2-c2-p5': { completedAt: 'now' } }
    : {}
  return {
    version: 2,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: { schemaVersion: 1 as const, completed },
    project: {
      version: 1 as const,
      name: 'Journey to the West S2 · Answer After the Question',
      lessonId: 'jtw-s2-c2-p5',
      pages: [{
        id: 'jtw-s2-c2-p5-page',
        background: 'jtw-s2-c2-five-elements-mountain',
        characters: [
          {
            id: 'xuanzang', name: 'Xuanzang', emoji: '🧑‍🦲',
            asset: JTW_S2_ASSETS.xuanzang,
            start: { gx: 2, gy: 9, size: 2, rot: 0 },
            scripts: [{ id: 'xuanzang-approaches-mountain', blocks: JTW_S2_C2_P4_TARGET }],
          },
          {
            id: 'wukong-waiting', name: 'Wukong Waiting', emoji: '🐒',
            asset: JTW_S2_ASSETS.wukong,
            start: { gx: 12, gy: 8, size: 2, rot: 0, visible: false },
            scripts: [{ id: 'wukong-answers', blocks: JTW_S2_C2_P5_WUKONG_TARGET }],
          },
        ],
      }],
    },
  }
}

function c2p6Loaded(runCompleted: boolean) {
  const loaded = c2p5Loaded(false)
  loaded.project.name = 'Journey to the West S2 · Fix the Early Answer'
  loaded.project.lessonId = 'jtw-s2-c2-p6'
  loaded.project.pages[0].id = 'jtw-s2-c2-p6-page'
  loaded.project.pages[0].characters[1].scripts[0].id = 'wukong-answers-too-early'
  loaded.storyProgress.completed = runCompleted
    ? { 'jtw-s2-c2-p6': { completedAt: 'now' } }
    : {}
  return loaded
}

beforeEach(() => {
  fetchProgress.mockImplementation(async (_line) => ({
    story_line_id: 'journey-to-the-west-s2', completed: [],
    unlocked_part_ids: ['jtw-s2-c1-p3', 'jtw-s2-c1-p4'],
  }))
  completePart.mockResolvedValue({ part_id: 'done', completed_at: 'now' })
  listProjects.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JourneyWestS2BatchPartPage', () => {
  it('requires both C4-P1 text evidence choices and creates no Blocks project', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2', completed: [],
      unlocked_part_ids: ['jtw-s2-c4-p1'],
    })
    renderPart('jtw-s2-c4-p1')
    await screen.findByTestId('jtw-s2-c4-p1')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: '自己跑得最快' }))
    fireEvent.click(screen.getByRole('button', { name: '风车听到，等消息的白龙马没听见' }))
    expect(screen.getByTestId('jtw-s2-c4-p1-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '认真核对并把消息送到' }))
    fireEvent.click(screen.getByTestId('jtw-s2-c4-p1-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s2',
      'jtw-s2-c4-p1',
      expect.objectContaining({
        selections: expect.objectContaining({
          story_screens: ['jtw-s2-c4-p1-story'],
          answer: ['check-and-deliver'],
          extra_answer: ['windmill-not-horse'],
          build_project: [],
        }),
      }),
    ))
    expect(blocksApi.createBlocksProject).not.toHaveBeenCalled()
    expect(listProjects).not.toHaveBeenCalled()
  })

  it('requires C4-P2 motive and shared-signal reasoning without creating a Blocks project', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2', completed: [],
      unlocked_part_ids: ['jtw-s2-c4-p2'],
    })
    renderPart('jtw-s2-c4-p2')
    await screen.findByTestId('jtw-s2-c4-p2')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: '只要跑得最快就一定送对' }))
    fireEvent.click(screen.getByRole('button', { name: '只要发送者喜欢这个颜色，接收者一定会行动' }))
    expect(screen.getByTestId('jtw-s2-c4-p2-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '能核对并把消息送到正确伙伴' }))
    fireEvent.click(screen.getByRole('button', { name: '因为两边都要认得同一种信号，所以先核对再发送' }))
    fireEvent.click(screen.getByTestId('jtw-s2-c4-p2-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s2',
      'jtw-s2-c4-p2',
      expect.objectContaining({
        selections: expect.objectContaining({
          story_screens: ['jtw-s2-c4-p2-story'],
          answer: ['check-and-deliver'],
          extra_answer: ['both-sides-recognise'],
          build_project: [],
        }),
      }),
    ))
    expect(blocksApi.createBlocksProject).not.toHaveBeenCalled()
    expect(listProjects).not.toHaveBeenCalled()
  })

  it('stores the complete C4-P3 sender, receiver, matching and mismatch prediction without a project', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2', completed: [],
      unlocked_part_ids: ['jtw-s2-c4-p3'],
    })
    renderPart('jtw-s2-c4-p3')
    await screen.findByTestId('jtw-s2-c4-p3')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    for (const label of ['悟空 · 发送者', 'Send · 蓝色', 'Get · 蓝色', '八戒 · 接收者']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    fireEvent.click(screen.getByRole('button', { name: '八戒继续等待，即使两边都是蓝色' }))
    fireEvent.click(screen.getByRole('button', { name: '八戒会行动，因为任何颜色都能接通' }))
    expect(screen.getByTestId('jtw-s2-c4-p3-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '八戒会行动，因为发送和接收都是蓝色' }))
    fireEvent.click(screen.getByRole('button', { name: '八戒继续等待，因为蓝色与橙色没有配成一对' }))
    expect(screen.getByTestId('jtw-s2-c4-p3-comparison')).toHaveTextContent('悟空 Send 蓝色')
    fireEvent.click(screen.getByTestId('jtw-s2-c4-p3-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s2',
      'jtw-s2-c4-p3',
      expect.objectContaining({
        prediction: 'bajie-acts',
        selections: expect.objectContaining({
          story_screens: ['jtw-s2-c4-p3-story'],
          action_order: ['wukong-sender', 'send-blue', 'get-blue', 'bajie-receiver'],
          sender: ['wukong'],
          receiver: ['bajie'],
          matching_pair: ['blue-blue'],
          mismatch_pair: ['blue-orange'],
          matching_prediction: ['bajie-acts'],
          mismatch_prediction: ['bajie-waits'],
          checkpoint_sentence: ['悟空发送蓝色，八戒接收蓝色，所以八戒会行动；如果八戒等橙色，他会继续等待。'],
          build_project: [],
        }),
      }),
    ))
    expect(blocksApi.createBlocksProject).not.toHaveBeenCalled()
    expect(listProjects).not.toHaveBeenCalled()
  })

  it.each([
    ['jtw-s2-c5-p1', '悟空到八戒，八戒再到悟净', '先接住第一段，再发送第二段', 'two-legs', 'receive-then-send'],
    ['jtw-s2-c5-p2', '加入一支彼此不丢下的队伍', '先听完、再复述、最后行动', 'join-together', 'listen-retell-act'],
  ] as const)('requires both reading evidence groups for %s without creating a project', async (partId, answerLabel, extraLabel, answerId, extraId) => {
    fetchProgress.mockResolvedValue({ story_line_id: 'journey-to-the-west-s2', completed: [], unlocked_part_ids: [partId] })
    renderPart(partId)
    await screen.findByTestId(partId)
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: answerLabel }))
    fireEvent.click(screen.getByRole('button', { name: extraLabel }))
    fireEvent.click(screen.getByTestId(`${partId}-continue`))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s2', partId,
      expect.objectContaining({ selections: expect.objectContaining({ answer: [answerId], extra_answer: [extraId], build_project: [] }) }),
    ))
    expect(listProjects).not.toHaveBeenCalled()
  })

  it('requires the complete C5-P3 two-leg relay order and stores the missing-middle prediction', async () => {
    fetchProgress.mockResolvedValue({ story_line_id: 'journey-to-the-west-s2', completed: [], unlocked_part_ids: ['jtw-s2-c5-p3'] })
    renderPart('jtw-s2-c5-p3')
    await screen.findByTestId('jtw-s2-c5-p3')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    for (const label of ['悟空 · Send 蓝色', '八戒 · Get 蓝色', '八戒 · Send 黄色', '悟净 · Get 黄色']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    fireEvent.click(screen.getByRole('button', { name: '停在八戒，因为他收到蓝色后没有继续发送' }))
    fireEvent.click(screen.getByRole('button', { name: '悟空 → 八戒 → 悟净' }))
    fireEvent.click(screen.getByTestId('jtw-s2-c5-p3-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s2', 'jtw-s2-c5-p3',
      expect.objectContaining({
        prediction: 'stops-at-bajie',
        selections: expect.objectContaining({
          action_order: ['wukong-send-blue', 'bajie-get-blue', 'bajie-send-yellow', 'wujing-get-yellow'],
          answer: ['stops-at-bajie'], extra_answer: ['wukong-bajie-wujing'], build_project: [],
        }),
      }),
    ))
  })

  it('requires the complete C6-P3 three-page order before unlocking Build 1', async () => {
    fetchProgress.mockResolvedValue({ story_line_id: 'journey-to-the-west-s2', completed: [], unlocked_part_ids: ['jtw-s2-c6-p3'] })
    renderPart('jtw-s2-c6-p3')
    await screen.findByTestId('jtw-s2-c6-p3')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    for (const label of ['第一页 · 集合', 'Send · 蓝色', '第二页 · 过桥', 'Send · 黄色', '第三页 · 向西', 'End']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    fireEvent.click(screen.getByRole('button', { name: '集合 → 过桥 → 向西' }))
    fireEvent.click(screen.getByRole('button', { name: '第三页队伍到旗旁以后' }))
    fireEvent.click(screen.getByTestId('jtw-s2-c6-p3-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s2', 'jtw-s2-c6-p3',
      expect.objectContaining({ selections: expect.objectContaining({ action_order: [
        'page-one-gather', 'send-blue', 'page-two-bridge', 'send-yellow', 'page-three-west', 'end',
      ] }) }),
    ))
  })

  it('makes P3 an off-screen order prediction and stores its own evidence', async () => {
    renderPart('jtw-s2-c1-p3')
    await screen.findByTestId('jtw-s2-c1-p3')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    for (const label of ['读路条', '带行囊', '过城门', '停在山下']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    fireEvent.click(screen.getByRole('button', { name: '已经到达西天' }))
    expect(screen.getByTestId('jtw-s2-c1-p3-continue')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '停在第一座山下' }))
    fireEvent.click(screen.getByTestId('jtw-s2-c1-p3-continue'))
    await waitFor(() => expect(completePart).toHaveBeenCalledWith(
      'journey-to-the-west-s2',
      'jtw-s2-c1-p3',
      expect.objectContaining({ prediction: 'mountain-stop' }),
    ))
  })

  it('does not complete a matching P4 program until Studio persisted a real run', async () => {
    listProjects.mockResolvedValue([{ id: 'project-p4', title: 'P4', kind: 'blocks', status: 'active' }])
    loadProject.mockResolvedValue(p4Loaded(false))
    const first = renderPart('jtw-s2-c1-p4')
    await screen.findByTestId('jtw-s2-c1-p4')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: /停在山下/ }))
    expect(screen.getByTestId('jtw-s2-c1-p4-build')).toHaveAttribute('data-build-state', 'in-progress')
    expect(screen.getByTestId('jtw-s2-c1-p4-continue')).toBeDisabled()
    first.unmount()

    loadProject.mockResolvedValue(p4Loaded(true))
    renderPart('jtw-s2-c1-p4')
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c1-p4-build')).toHaveAttribute('data-build-state', 'done'))
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: /停在山下/ }))
    expect(screen.getByTestId('jtw-s2-c1-p4-continue')).toBeEnabled()
  })

  it('requires the saved C2-P5 dual-event program and its completed Go-then-Tap run marker', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2', completed: [],
      unlocked_part_ids: ['jtw-s2-c2-p5'],
    })
    listProjects.mockResolvedValue([{ id: 'project-c2p5', title: 'C2 P5', kind: 'blocks', status: 'active' }])
    loadProject.mockResolvedValue(c2p5Loaded(false))
    const first = renderPart('jtw-s2-c2-p5')
    await screen.findByTestId('jtw-s2-c2-p5')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: '先 Go 让玄奘询问，再点悟空回应' }))
    expect(screen.getByTestId('jtw-s2-c2-p5-build')).toHaveAttribute('data-build-state', 'in-progress')
    expect(screen.getByTestId('jtw-s2-c2-p5-continue')).toBeDisabled()
    first.unmount()

    loadProject.mockResolvedValue(c2p5Loaded(true))
    renderPart('jtw-s2-c2-p5')
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c2-p5-build')).toHaveAttribute('data-build-state', 'done'))
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: '先 Go 让玄奘询问，再点悟空回应' }))
    expect(screen.getByTestId('jtw-s2-c2-p5-continue')).toBeEnabled()
  })

  it('requires P6 answers plus the persisted wrong-run and fixed Go-then-Tap marker', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2', completed: [],
      unlocked_part_ids: ['jtw-s2-c2-p6'],
    })
    listProjects.mockResolvedValue([{ id: 'project-c2p6', title: 'C2 P6', kind: 'blocks', status: 'active' }])
    loadProject.mockResolvedValue(c2p6Loaded(false))
    const first = renderPart('jtw-s2-c2-p6')
    await screen.findByTestId('jtw-s2-c2-p6')
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: '悟空在玄奘询问前就回答了' }))
    fireEvent.click(screen.getByRole('button', { name: '第一次只 Go，看悟空等待；第二次再点悟空' }))
    expect(screen.getByTestId('jtw-s2-c2-p6-continue')).toBeDisabled()
    first.unmount()

    loadProject.mockResolvedValue(c2p6Loaded(true))
    renderPart('jtw-s2-c2-p6')
    await waitFor(() => expect(screen.getByTestId('jtw-s2-c2-p6-build')).toHaveAttribute('data-build-state', 'done'))
    fireEvent.click(screen.getByRole('button', { name: '我已读完这张故事卡' }))
    fireEvent.click(screen.getByRole('button', { name: '悟空在玄奘询问前就回答了' }))
    fireEvent.click(screen.getByRole('button', { name: '第一次只 Go，看悟空等待；第二次再点悟空' }))
    expect(screen.getByTestId('jtw-s2-c2-p6-continue')).toBeEnabled()
  })
})
