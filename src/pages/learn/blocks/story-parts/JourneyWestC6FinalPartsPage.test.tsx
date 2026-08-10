// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as storyApi from './storyPartsApi'
import { JourneyWestC6FinalPartsPage } from './JourneyWestC6FinalPartsPage'

vi.mock('./storyPartsApi', async (original) => ({ ...(await original<typeof import('./storyPartsApi')>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn() }))

const PARTS = Array.from({ length: 10 }, (_, index) => `jtw-s1-c6-p${index + 1}`)
function renderPart(partId: `jtw-s1-c6-p${3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`) { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><MemoryRouter><JourneyWestC6FinalPartsPage partId={partId} /></MemoryRouter></QueryClientProvider>) }

beforeEach(() => { vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: PARTS, completed: [], chapter_seals: [] }); vi.mocked(storyApi.completeStoryPart).mockResolvedValue({ part_id: 'done', completed_at: 'now' }) })
afterEach(() => cleanup())

describe('JourneyWestC6FinalPartsPage', () => {
  it('ships child-visible contracts for every remaining Part', async () => {
    for (const [part, title] of [['jtw-s1-c6-p3', '六件事不能同时发生'], ['jtw-s1-c6-p4', '第一页把身份冲突讲清楚'], ['jtw-s1-c6-p5', '第二页让行动与回应分开'], ['jtw-s1-c6-p6', '我的前传节奏'], ['jtw-s1-c6-p7', '到了五行山却没有结束'], ['jtw-s1-c6-p8', '我的三页美猴王前传'], ['jtw-s1-c6-p9', '六枚印与四个因为'], ['jtw-s1-c6-p10', '第一程完整结束']] as const) { const view = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><JourneyWestC6FinalPartsPage partId={part} /></MemoryRouter></QueryClientProvider>); expect(await screen.findByRole('heading', { name: title })).toBeTruthy(); view.unmount() }
  })

  it('requires exact event order, page reasons and a real preview for P3', async () => {
    renderPart('jtw-s1-c6-p3'); await screen.findByText(/六件事同时发生/)
    for (const label of ['任职不满', '离开', '自立称号', '再次入天宫', '风波升级', '五行山结果', 'Page 1', 'Page 2']) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
    fireEvent.click(screen.getByRole('button', { name: '逐页预览' }))
    expect((await screen.findByTestId('jtw-c6-trace')).textContent).toContain('page-3:end')
    expect((screen.getByTestId('jtw-c6-complete') as HTMLButtonElement).disabled).toBe(false)
  })

  it('runs the stable P7 bug before allowing an exact End repair and repeat', async () => {
    renderPart('jtw-s1-c6-p7'); await screen.findByText(/预期在五行山/)
    fireEvent.click(screen.getByRole('button', { name: /错误版/ })); await screen.findByRole('button', { name: /第一次偏离/ }); fireEvent.click(screen.getByRole('button', { name: /第一次偏离/ }))
    fireEvent.click(screen.getByRole('button', { name: '修复后运行' })); await screen.findByTestId('jtw-c6-trace'); fireEvent.click(screen.getByRole('button', { name: '一致性重跑' }))
    await waitFor(() => expect((screen.getByTestId('jtw-c6-complete') as HTMLButtonElement).disabled).toBe(false))
  })
})
