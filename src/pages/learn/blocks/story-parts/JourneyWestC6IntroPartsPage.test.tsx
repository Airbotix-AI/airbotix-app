// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as storyApi from './storyPartsApi';
import { JourneyWestC6IntroPartsPage } from './JourneyWestC6IntroPartsPage';

vi.mock('./storyPartsApi', async (original) => ({
  ...(await original<typeof storyApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));
function renderPart(partId: 'jtw-s1-c6-p1' | 'jtw-s1-c6-p2') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <JourneyWestC6IntroPartsPage partId={partId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    unlocked_part_ids: ['jtw-s1-c6-p1', 'jtw-s1-c6-p2'],
    completed: [],
  });
  vi.mocked(storyApi.completeStoryPart).mockResolvedValue({ part_id: 'done', completed_at: 'now' });
});
afterEach(cleanup);
describe('JourneyWestC6IntroPartsPage', () => {
  it('orders all six prior seals and identifies the expectation gap in P1', async () => {
    renderPart('jtw-s1-c6-p1');
    await screen.findByText(/Wukong came to Yunmen with his name/i);
    for (const label of [
      'fairy stone',
      'Water Curtain Cave',
      'Travel far away',
      'Get the name Xueyi',
      'Golden-Hooped Staff',
      'Tiangong',
      'Desire:',
      'Arrangement: Take care of Pegasus',
      'There is a gap between the expectation',
    ])
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
    expect(screen.getByTestId('jtw-c6-complete')).toBeEnabled();
  });
  it('keeps understandable feelings separate from the consequential choice in P2', async () => {
    renderPart('jtw-s1-c6-p2');
    await screen.findByText(/Wukong What’s sad/i);
    for (const label of [
      'Desire:',
      'Arrangement: Take care of Pegasus',
      'Feeling: Ability not seen',
      'Choice:',
      'Leaving expresses dissatisfaction',
    ])
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
    expect(screen.getByTestId('jtw-c6-complete')).toBeEnabled();
  });
});
