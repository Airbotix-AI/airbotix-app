// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC4Part1Page } from './JourneyWestC4Part1Page';
import * as storyPartsApi from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));
const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);
const prior = Array.from(
  { length: 24 },
  (_, index) => `jtw-s1-c${Math.floor(index / 8) + 1}-p${(index % 8) + 1}`,
);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c4-p1']}>
        <Routes>
          <Route path="/learn/story/journey-west/:partId" element={<JourneyWestC4Part1Page />} />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function finishEvidence() {
  fireEvent.click(screen.getByRole('button', { name: '我读完了门前故事' }));
  for (const label of ['花果山', '海路', '师门'])
    fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('button', { name: '愿意认真学' }));
  fireEvent.click(screen.getByRole('button', { name: '想把所学带回家' }));
  fireEvent.click(screen.getByRole('button', { name: /因为他愿意认真学习/ }));
  fireEvent.click(screen.getByRole('button', { name: /都会对不上/ }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue({
    story_line_id: 'journey-to-the-west-s1',
    completed: prior.map((partId) => ({
      part_id: partId,
      completed_at: '2026-08-02T00:00:00Z',
      evidence: {},
    })),
    unlocked_part_ids: [...prior, 'jtw-s1-c4-p1'],
  });
  completePart.mockResolvedValue({ part_id: 'jtw-s1-c4-p1', completed_at: '2026-08-02T00:10:00Z' });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC4Part1Page', () => {
  it('gates motives behind reading and refuses distractor evidence', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-c4p1-motives')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '我读完了门前故事' }));
    fireEvent.click(screen.getByRole('button', { name: '来找闪亮宝物' }));
    fireEvent.click(screen.getByRole('button', { name: '不喜欢伙伴' }));
    expect(screen.getByTestId('jtw-c4p1-continue')).toBeDisabled();
  });

  it('persists exact Read/Why evidence and unlocks only the adjacent part', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c4-p1')).toBeInTheDocument());
    finishEvidence();
    expect(screen.getByTestId('jtw-c4p1-resolved')).toHaveTextContent('空名字牌');
    fireEvent.click(screen.getByTestId('jtw-c4p1-continue'));
    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c4-p1', {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-a'],
        route_card_order: ['flower-fruit-mountain', 'sea-route', 'master-gate'],
        motive_evidence: ['ready-to-learn', 'bring-learning-home'],
        why_sentence: ['learn-and-return'],
      },
      prediction: 'learning-and-home-conflict',
    });
    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument());
  });

  it('uses server unlock truth', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: [],
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c4p1-locked')).toBeInTheDocument());
  });
});
