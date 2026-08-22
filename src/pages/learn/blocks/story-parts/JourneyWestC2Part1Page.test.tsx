// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC2Part1Page } from './JourneyWestC2Part1Page';
import {
  C2_P1_CLUE_OPTIONS,
  C2_P1_PREVIEW_PROJECT,
  C2_P1_STORY_BEFORE,
} from './journeyWestSeason1';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

const C1_PART_IDS = [
  'jtw-s1-c1-p1',
  'jtw-s1-c1-p2',
  'jtw-s1-c1-p3',
  'jtw-s1-c1-p4',
  'jtw-s1-c1-p5',
  'jtw-s1-c1-p6',
  'jtw-s1-c1-p7',
  'jtw-s1-c1-p8',
];

/** Chapter one fully complete — C2-P1 is the unlock frontier. */
const C1_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: C1_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-25T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...C1_PART_IDS, 'jtw-s1-c2-p1'],
};

const instantSleep = () => Promise.resolve();

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p1']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC2Part1Page previewSleep={instantSleep} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Motive + the three real clues + the 因为/所以 sentence. */
function completeEvidence() {
  fireEvent.click(
    screen.getByRole('button', {
      name: /He wanted his partners to see what was going on and find a route they could take/i,
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'The sound of water becomes louder' }));
  fireEvent.click(screen.getByRole('button', { name: 'stones get wet' }));
  fireEvent.click(screen.getByRole('button', { name: 'The mist becomes thicker' }));
  fireEvent.click(
    screen.getByRole('button', {
      name: /Stop outside the wet rocks to observe and help your friends find a feasible route\./i,
    }),
  );
}

async function runPreview() {
  fireEvent.click(screen.getByTestId('jtw-c2p1-run'));
  await waitFor(() => expect(screen.getByTestId('jtw-c2p1-prediction')).toBeInTheDocument());
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(C1_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c2-p1',
    completed_at: '2026-07-25T05:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC2Part1Page · C2-P1 Where does the sound of water take everyone?', () => {
  it('ships the full story text, the hidden cave mouth and the exact read-only chain', async () => {
    // Contract: exactly when_flag → play_sound(Chime) → wait(2) → end.
    expect(
      C2_P1_PREVIEW_PROJECT.pages[0].characters[0].scripts[0].blocks.map((block) => block.op),
    ).toEqual(['when_flag', 'play_sound', 'wait', 'end']);
    // Clue options: three real clues + the excluded 看见洞口.
    expect(C2_P1_CLUE_OPTIONS.filter((option) => option.correct)).toHaveLength(3);
    expect(C2_P1_CLUE_OPTIONS.find((option) => !option.correct)?.id).toBe('see-cave-mouth');

    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p1')).toBeInTheDocument());
    for (const paragraph of C2_P1_STORY_BEFORE) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    expect(screen.getByTestId('jtw-c2p1-story')).toHaveTextContent('Sun Wukong');
    expect(screen.getByTestId('jtw-c2p1-story')).toHaveTextContent('On Bump');
    // The cave mouth starts hidden, the monkey waits visible at the left.
    expect(screen.getByTestId('jtw-c2p1-cave-mouth')).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('jtw-c2p1-stone-monkey')).toHaveAttribute('data-visible', 'true');
    expect(
      screen.getByTestId('jtw-c2p1-preview-chain').querySelectorAll('.bsx-block'),
    ).toHaveLength(4);
  });

  it('blocks kids who have not finished C1-P8 (server unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...C1_DONE,
      completed: C1_DONE.completed.slice(0, 7),
      unlocked_part_ids: C1_PART_IDS,
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p1-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c2-p1')).not.toBeInTheDocument();
  });

  it('rejects see the hole as evidence with the hint and keeps continue locked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p1')).toBeInTheDocument());
    completeEvidence();
    await runPreview();
    fireEvent.click(
      screen.getByRole('button', {
        name: /I don’t know yet—the water curtain is closed, and there is no hole exposed in the picture\./i,
      }),
    );

    // Everything else is done — adding the cave mouth breaks the clue evidence.
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'see the hole' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'The entrance to the cave is hidden behind a curtain of water, and no one can see it in the picture—it cannot be used as evidence.',
    );
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'see the hole' }));
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeEnabled();
  });

  it('shows the three water ripples after the real preview run (readable in mute)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p1')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-c2p1-water-ripples')).not.toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c2p1-prediction')).not.toBeInTheDocument();

    await runPreview();
    const ripples = screen.getByTestId('jtw-c2p1-water-ripples');
    expect(ripples.querySelectorAll('span')).toHaveLength(3);
  });

  it('hints on the wrong prediction and resolves the world only when everything is done', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p1-continue')).toBeInTheDocument());
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeDisabled();

    completeEvidence();
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeDisabled(); // preview + prediction pending
    await runPreview();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Already know - the entrance to the cave is in the picture/i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Look at the picture again: with the water curtain closed, is the hole exposed? The answer can be found in the picture.',
    );
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c2p1-resolved')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /I don’t know yet—the water curtain is closed, and there is no hole exposed in the picture\./i,
      }),
    );
    // 三类线索从近到远点亮，视线停在关闭的水帘。
    expect(screen.getByTestId('jtw-c2p1-resolved')).toHaveTextContent('from near to far');
    const lights = screen.getByTestId('jtw-c2p1-clue-lights').querySelectorAll('[data-lit="true"]');
    expect(Array.from(lights).map((light) => light.getAttribute('data-clue'))).toEqual([
      'water-louder',
      'stones-wet',
      'mist-thicker',
    ]);
    expect(screen.getByTestId('jtw-c2p1-curtain-gaze')).toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeEnabled();
  });

  it('persists the three clues + Why evidence on continue and unlocks only C2-P2', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p1-continue')).toBeInTheDocument());
    completeEvidence();
    await runPreview();
    fireEvent.click(
      screen.getByRole('button', {
        name: /I don’t know yet—the water curtain is closed, and there is no hole exposed in the picture\./i,
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-c2p1-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c2-p1', {
      schema_version: 1,
      selections: {
        motive: ['observe-for-partners'],
        clue_evidence: ['water-louder', 'stones-wet', 'mist-thicker'],
        so_sentence: ['stop-observe-route'],
      },
      prediction: 'not-known-yet',
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved Read/Why evidence after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...C1_DONE,
      completed: [
        ...C1_DONE.completed,
        {
          part_id: 'jtw-s1-c2-p1',
          completed_at: '2026-07-25T05:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              motive: ['observe-for-partners'],
              clue_evidence: ['water-louder', 'stones-wet', 'mist-thicker'],
              so_sentence: ['stop-observe-route'],
            },
            prediction: 'not-known-yet',
          },
        },
      ],
      unlocked_part_ids: [...C1_DONE.unlocked_part_ids, 'jtw-s1-c2-p2'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-c2p1-resolved')).toBeInTheDocument());
    expect(
      screen.getByRole('button', {
        name: /He wanted his partners to see what was going on and find a route they could take/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'The sound of water becomes louder' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'see the hole' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByTestId('jtw-c2p1-continue')).toBeEnabled();
  });
});
