// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part8Page } from './JourneyWestC4Part8Page'
import * as storyPartsApi from './storyPartsApi'

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-c4-p8' } }),
}))
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
}))

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress)

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: [],
    unlocked_part_ids: [],
    chapter_seals: [{
      seal_id: 'jtw-s1-c4-name-seal',
      chapter_code: 'C4',
      lit: false,
      missing: ['part:jtw-s1-c4-p8'],
    }],
  })
})

describe('JourneyWestC4Part8Page', () => {
  it('fails closed until the P7 saved Personal Ship unlocks Retell', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <JourneyWestC4Part8Page />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('先保存并重开你的悟空认识卡。')).toBeVisible()
  })
})
