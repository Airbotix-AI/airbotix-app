// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as storyApi from './storyPartsApi'
import { JourneyWestC6IntroPartsPage } from './JourneyWestC6IntroPartsPage'

vi.mock('./storyPartsApi', async (original) => ({ ...(await original<typeof storyApi>()), fetchStoryLineProgress: vi.fn(), completeStoryPart: vi.fn() }))
function renderPart(partId: 'jtw-s1-c6-p1' | 'jtw-s1-c6-p2') { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><MemoryRouter><JourneyWestC6IntroPartsPage partId={partId} /></MemoryRouter></QueryClientProvider>) }
beforeEach(() => { vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({ story_line_id: 'journey-to-the-west-s1', unlocked_part_ids: ['jtw-s1-c6-p1', 'jtw-s1-c6-p2'], completed: [] }); vi.mocked(storyApi.completeStoryPart).mockResolvedValue({ part_id: 'done', completed_at: 'now' }) })
afterEach(cleanup)
describe('JourneyWestC6IntroPartsPage', () => {
  it('orders all six prior seals and identifies the expectation gap in P1', async () => { renderPart('jtw-s1-c6-p1'); await screen.findByText(/悟空带着名字/); for (const label of ['仙石', '水帘洞', '远行', '得名学艺', '金箍棒', '天宫', '愿望：', '安排：', '重要合适工作的期待']) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) })); expect(screen.getByTestId('jtw-c6-complete')).toBeEnabled() })
  it('keeps understandable feelings separate from the consequential choice in P2', async () => { renderPart('jtw-s1-c6-p2'); await screen.findByText(/悟空难过/); for (const label of ['愿望：', '安排：', '感受：', '选择：', '离开能表达不满']) fireEvent.click(screen.getByRole('button', { name: new RegExp(label) })); expect(screen.getByTestId('jtw-c6-complete')).toBeEnabled() })
})
