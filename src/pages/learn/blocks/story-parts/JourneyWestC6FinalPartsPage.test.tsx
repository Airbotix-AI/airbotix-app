// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as storyApi from './storyPartsApi';
import { JourneyWestC6FinalPartsPage } from './JourneyWestC6FinalPartsPage';
import { boundedC6EvidenceTrace, nonEmptyC6Selections } from './journeyWestC6Evidence';

vi.mock('./storyPartsApi', async (original) => ({
  ...(await original<typeof import('./storyPartsApi')>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const PARTS = Array.from({ length: 10 }, (_, index) => `jtw-s1-c6-p${index + 1}`);
function renderPart(partId: `jtw-s1-c6-p${3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <JourneyWestC6FinalPartsPage partId={partId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(storyApi.fetchStoryLineProgress).mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    unlocked_part_ids: PARTS,
    completed: [],
    chapter_seals: [],
  });
  vi.mocked(storyApi.completeStoryPart).mockResolvedValue({ part_id: 'done', completed_at: 'now' });
});
afterEach(() => cleanup());

describe('JourneyWestC6FinalPartsPage', () => {
  it('bounds persisted runtime evidence without losing the first event or stable ending', () => {
    const trace = Array.from({ length: 30 }, (_, index) =>
      index === 18 ? 'page-3:planned:forever' : `page-${index}:step`,
    );
    trace[29] = 'page-3:end';
    const bounded = boundedC6EvidenceTrace(trace);
    expect(bounded).toHaveLength(12);
    expect(bounded[0]).toBe('page-0:step');
    expect(bounded).toContain('page-3:planned:forever');
    expect(bounded.at(-1)).toBe('page-3:end');
  });

  it('omits empty evidence groups so each Part stays within the backend schema bound', () => {
    expect(
      nonEmptyC6Selections({ event_order: ['one'], build_ast: [], run_trace: ['end'] }),
    ).toEqual({
      event_order: ['one'],
      run_trace: ['end'],
    });
  });

  it('bounds every evidence value to the backend contract', () => {
    const longRetell = 'As a result, there was still controversy over the invitation again.';
    const selections = nonEmptyC6Selections({ retell_links: [longRetell] });
    expect(selections.retell_links[0]).toHaveLength(64);
    expect(longRetell.startsWith(selections.retell_links[0])).toBe(true);
  });

  it('ships child-visible contracts for every remaining Part', async () => {
    for (const [part, title] of [
      ['jtw-s1-c6-p3', 'Six things cannot happen at the same time'],
      ['jtw-s1-c6-p4', 'Make the identity conflict clear on the first page'],
      ['jtw-s1-c6-p5', 'Page 2 separates action from response'],
      ['jtw-s1-c6-p6', 'My prequel rhythm'],
      ['jtw-s1-c6-p7', 'It’s Five Elements Mountain but it’s not over yet'],
      ['jtw-s1-c6-p8', 'My three-page Monkey King prequel'],
      ['jtw-s1-c6-p9', 'Six seals and four reasons'],
      ['jtw-s1-c6-p10', 'The first journey is complete'],
    ] as const) {
      const view = render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <JourneyWestC6FinalPartsPage partId={part} />
          </MemoryRouter>
        </QueryClientProvider>,
      );
      expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
      view.unmount();
    }
  });

  it('requires exact event order, page reasons and a real preview for P3', async () => {
    renderPart('jtw-s1-c6-p3');
    await screen.findByText(/If six things happen at the same time/i);
    for (const label of [
      'dissatisfied with office',
      'leave',
      'independent title',
      'Enter the heaven again',
      'The storm escalates',
      'Five Elements Mountain results',
      'Page 1',
      'Page 2',
    ])
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview page by page' }));
    expect((await screen.findByTestId('jtw-c6-trace')).textContent).toContain('page-3:end');
    expect((screen.getByTestId('jtw-c6-complete') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows a child-readable retry message when completion cannot be saved', async () => {
    vi.mocked(storyApi.completeStoryPart).mockRejectedValueOnce(new Error('bad request'));
    renderPart('jtw-s1-c6-p3');
    await screen.findByText(/If six things happen at the same time/i);
    for (const label of [
      'dissatisfied with office',
      'leave',
      'independent title',
      'Enter the heaven again',
      'The storm escalates',
      'Five Elements Mountain results',
      'Page 1',
      'Page 2',
    ])
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview page by page' }));
    fireEvent.click(await screen.findByTestId('jtw-c6-complete'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/not saved/i);
  });

  it('runs the stable P7 bug before allowing an exact End repair and repeat', async () => {
    renderPart('jtw-s1-c6-p7');
    await screen.findByText(/Expected to end stable in Five Elements Mountain/i);
    fireEvent.click(screen.getByRole('button', { name: /Run Stop \+ Again error version/i }));
    await screen.findByRole('button', { name: /The first deviation is in Again/i });
    fireEvent.click(screen.getByRole('button', { name: /The first deviation is in Again/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Run after repair' }));
    await screen.findByTestId('jtw-c6-trace');
    fireEvent.click(screen.getByRole('button', { name: 'Consistent reruns' }));
    await waitFor(() =>
      expect((screen.getByTestId('jtw-c6-complete') as HTMLButtonElement).disabled).toBe(false),
    );
  });
});
