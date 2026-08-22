// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestPartExperience } from './JourneyWestPartExperience';
import * as storyAudio from '../storyAudio';
import * as storyPartsApi from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
}));

vi.mock('../storyAudio', async (importOriginal) => ({
  ...(await importOriginal<typeof storyAudio>()),
  speakStory: vi.fn(() => true),
  playRecordedStory: vi.fn(() => true),
  stopStorySpeech: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const speakStory = vi.mocked(storyAudio.speakStory);
const playRecordedStory = vi.mocked(storyAudio.playRecordedStory);

function renderExperience(partId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <JourneyWestPartExperience partId={partId}>
        <main>
          <h1>Golden-Hooped Staff</h1>
          <p>Wukong first observes the pillar hall and then runs the program.</p>
          <button type="button">Should not be read as the text of the story</button>
        </main>
      </JourneyWestPartExperience>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage?.clear();
});

describe('JourneyWestPartExperience', () => {
  it('integrates the chapter visual pack and switches to the resolved background from server progress', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [
        { part_id: 'jtw-s1-c5-p2', completed_at: '2026-08-13T00:00:00.000Z', evidence: {} },
      ],
      unlocked_part_ids: ['jtw-s1-c5-p2'],
    });

    renderExperience('jtw-s1-c5-p2');

    await waitFor(() =>
      expect(screen.getByTestId('jtw-chapter-stage')).toHaveAttribute('data-state', 'resolved'),
    );
    expect(screen.getByAltText('Sun Wukong')).toHaveAttribute(
      'src',
      '/story-blocks/journey-to-the-west/characters/wukong-traveller/hands-free-neutral-v01.png',
    );
    expect(screen.getByAltText('Golden-Hooped Staff')).toHaveAttribute(
      'src',
      '/story-blocks/journey-to-the-west/props/ruyi-staff/neutral-v01.png',
    );
  });

  it('plays the authored S1 recording instead of browser speech', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c5-p2'],
    });
    renderExperience('jtw-s1-c5-p2');

    fireEvent.click(screen.getByRole('button', { name: '🔊 Read this Part aloud' }));

    expect(playRecordedStory).toHaveBeenCalledWith(
      '/story-blocks/journey-to-the-west/audio/en-AU/s1/jtw-s1-c5-p2-v02.mp3',
      expect.stringContaining('What size will the last piece leave?'),
    );
    expect(speakStory).not.toHaveBeenCalled();
  });

  it('keeps C1-C3 pages on their existing interactive stages while still providing narration', () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s1',
      completed: [],
      unlocked_part_ids: ['jtw-s1-c2-p1'],
    });
    renderExperience('jtw-s1-c2-p1');

    expect(screen.queryByTestId('jtw-chapter-stage')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-audio-controls')).toBeInTheDocument();
  });

  it('plays the authored S2 recording instead of reading visible controls', () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c1-p1'],
    });
    renderExperience('jtw-s2-c1-p1');

    fireEvent.click(screen.getByRole('button', { name: '🔊 Read this Part aloud' }));

    expect(playRecordedStory).toHaveBeenCalledWith(
      '/story-blocks/journey-to-the-west/audio/en-AU/s2/jtw-s2-c1-p1-v02.mp3',
      expect.stringContaining(
        "In the early morning, Xuanzang packed his bags in Chang'an. The map on the table is very long, stretching far to the west.",
      ),
    );
    expect(speakStory).not.toHaveBeenCalled();
  });

  it('keeps child-facing audio controls at the 44px touch-target minimum', () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c1-p1'],
    });
    renderExperience('jtw-s2-c1-p1');

    expect(screen.getByRole('button', { name: '🔊 Read this Part aloud' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Mute' })).toHaveClass('min-h-11');
  });
});
