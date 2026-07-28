// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { JourneyWestC4Part7Page } from './JourneyWestC4Part7Page'
import * as storyPartsApi from './storyPartsApi'

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-c4-p7' } }),
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
  })
})

describe('JourneyWestC4Part7Page', () => {
  it('fails closed until C4-P6 unlocks the personal ship', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <JourneyWestC4Part7Page />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByTestId('jtw-c4p7-locked')).toHaveTextContent(
      '先修好错误Trigger',
    )
  })
})

