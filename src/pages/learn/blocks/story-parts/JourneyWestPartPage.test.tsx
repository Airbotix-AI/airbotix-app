// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestPartPage, JourneyWestPartRoute } from './JourneyWestPartPage';
import { C1_P1_STORY_BEFORE } from './journeyWestSeason1';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

const EMPTY_PROGRESS: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: [],
  unlocked_part_ids: ['jtw-s1-c1-p1'],
};

const instantSleep = () => Promise.resolve();

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c1-p1']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestPartPage previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function completeEvidenceAndPreview() {
  // Environment evidence (pick 3 of 5) + the two true observe reasons.
  fireEvent.click(screen.getByRole('button', { name: 'sea' }));
  fireEvent.click(screen.getByRole('button', { name: 'fruit trees' }));
  fireEvent.click(screen.getByRole('button', { name: 'magic stone' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Light shines from the cracks in the rocks' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'A "dong" sound came from the stone' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Stop, hide behind the leaves and observe carefully' }),
  );
  // Watch the read-only preview run (real BlocksRunner, instant sleep).
  fireEvent.click(screen.getByTestId('jtw-p1-run'));
  await waitFor(() => expect(screen.getByTestId('jtw-p1-prediction')).toBeInTheDocument());
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(EMPTY_PROGRESS);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c1-p1',
    completed_at: '2026-07-24T04:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestPartPage · C1-P1 Huaguoshan in the early morning', () => {
  it('ships the full child-facing story text and the classic card', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c1-p1')).toBeInTheDocument());
    for (const paragraph of C1_P1_STORY_BEFORE) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    expect(
      screen.getByText(
        /In the opening chapter of the classic novel, the magic stone on Flower-Fruit Mountain gives birth to the Stone Monkey\. He is not called Sun Wukong yet, and he has not met the pilgrims\./i,
      ),
    ).toBeInTheDocument();
  });

  it('keeps the stone monkey invisible before, during and after the preview run', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p1-stage')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p1-stone-monkey').dataset.visible).toBe('false');

    fireEvent.click(screen.getByTestId('jtw-p1-run'));
    await waitFor(() => expect(screen.getByTestId('jtw-p1-prediction')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p1-stone-monkey').dataset.visible).toBe('false');
  });

  it('keeps continue locked until evidence, preview run and prediction are all done', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p1-continue')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-p1-continue')).toBeDisabled();

    await completeEvidenceAndPreview();
    expect(screen.getByTestId('jtw-p1-continue')).toBeDisabled();

    // Wrong (not picture-grounded) prediction → gentle retry, still locked.
    fireEvent.click(
      screen.getByRole('button', { name: /Already appeared, standing on the stone platform/i }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Look again. Can you see the Stone Monkey on the platform yet?',
    );
    expect(screen.getByTestId('jtw-p1-continue')).toBeDisabled();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Not yet - there is no stone monkey on the stone platform, he is still hidden in the stone/i,
      }),
    );
    expect(screen.getByTestId('jtw-p1-resolved')).toBeInTheDocument();
    expect(screen.getByText('The monkeys decided to wait quietly.')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-p1-continue')).toBeEnabled();
  });

  it('persists the evidence server-side on continue and returns to the map', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-p1-continue')).toBeInTheDocument());
    await completeEvidenceAndPreview();
    fireEvent.click(
      screen.getByRole('button', {
        name: /Not yet - there is no stone monkey on the stone platform, he is still hidden in the stone/i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-p1-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c1-p1', {
      schema_version: 1,
      selections: {
        environment_evidence: ['sea', 'fruit-trees', 'immortal-stone'],
        observe_reasons: ['crack-light', 'stone-sound'],
        so_sentence: ['stop-watch'],
      },
      prediction: 'not-yet-appeared',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores saved Read/Why evidence after a refresh (completed part)', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [
        {
          part_id: 'jtw-s1-c1-p1',
          completed_at: '2026-07-24T04:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              environment_evidence: ['sea', 'spring', 'warm-light'],
              observe_reasons: ['crack-light', 'stone-sound'],
              so_sentence: ['stop-watch'],
            },
            prediction: 'not-yet-appeared',
          },
        },
      ],
      unlocked_part_ids: ['jtw-s1-c1-p1', 'jtw-s1-c1-p2'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-p1-resolved')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'sea' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'clear spring' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'fruit trees' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByTestId('jtw-p1-continue')).toBeEnabled();
  });

  it('bounces unknown / not-yet-built parts back to the story map', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c9-p9']}>
          <Routes>
            <Route path="/learn/story/journey-west/:partId" element={<JourneyWestPartRoute />} />
            <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });
});
