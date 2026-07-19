// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StoryJourneyMap } from './StoryJourneyMap';
import { PLAYABLE_STORY_MISSION_COUNT, TINY_STAR_VILLAGE_CHAPTERS } from './storyJourneyCatalog';

afterEach(cleanup);

describe('StoryJourneyMap', () => {
  it('shows the complete six-chapter story while distinguishing playable scenes from previews', () => {
    render(<StoryJourneyMap busy={null} onStart={vi.fn()} />);

    expect(screen.getByText('Bring back the morning light')).toBeInTheDocument();
    expect(screen.getAllByTestId(/story-chapter-/)).toHaveLength(6);
    expect(screen.getAllByTestId(/blocks-starter-blocks_tsv_/)).toHaveLength(12);
    expect(screen.getByTestId('story-chapter-a3')).toHaveTextContent('4 scenes ready');
    expect(screen.getByTestId('story-chapter-a6')).toHaveTextContent('Ring in the morning light');
    expect(screen.getByTestId('story-collection-shelf')).toHaveTextContent(
      'The Missing Morning Light',
    );
    expect(screen.getByTestId('story-collection-shelf')).toHaveTextContent(
      'The Monkey King’s New Journey',
    );
    expect(screen.getByTestId('story-collection-shelf')).toHaveTextContent('Fable Forest');
    expect(screen.getAllByText(/Planned/)).toHaveLength(2);
    expect(screen.getByTestId('story-chapter-a1').querySelector('.bsx-lumilo')).toHaveAttribute(
      'data-performance',
      'idle',
    );
    expect(screen.getByTestId('story-chapter-a2').querySelector('.bsx-tuan')).toHaveAttribute(
      'data-performance',
      'idle',
    );
    expect(screen.getByTestId('story-collection-shelf').querySelectorAll('.bsx-lumilo')).toHaveLength(
      1,
    );
    expect(screen.getByTestId('story-collection-shelf').querySelectorAll('.bsx-tuan')).toHaveLength(
      1,
    );
    expect(screen.getByTestId('story-world-cast').querySelectorAll('.tsv-world-character')).toHaveLength(
      2,
    );
    expect(screen.getByTestId('story-world-cast').querySelector('.tsv-world-lumi')).toBeInTheDocument();
    expect(screen.getByTestId('story-world-cast').querySelector('.tsv-world-tuan')).toBeInTheDocument();
  });

  it('starts a scene with a meaningful project title', () => {
    const onStart = vi.fn();
    render(<StoryJourneyMap busy={null} onStart={onStart} />);

    fireEvent.click(screen.getByTestId('blocks-starter-blocks_tsv_a2_b'));

    expect(onStart).toHaveBeenCalledWith('blocks_tsv_a2_b', 'Tiny Star Village · Choose an arrow');
  });

  it('keeps the story count derived from the playable mission catalogue', () => {
    const derived = TINY_STAR_VILLAGE_CHAPTERS.flatMap((chapter) => chapter.missions);
    expect(PLAYABLE_STORY_MISSION_COUNT).toBe(12);
    expect(derived).toHaveLength(PLAYABLE_STORY_MISSION_COUNT);
  });
});
