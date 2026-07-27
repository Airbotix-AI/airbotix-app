// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StoryJourneyMap } from './StoryJourneyMap';
import { PLAYABLE_STORY_MISSION_COUNT, TINY_STAR_VILLAGE_CHAPTERS } from './storyJourneyCatalog';
import {
  TINY_STAR_SEASON_MANIFEST,
  TINY_STAR_STORY_LINE_ID,
  tinyStarSeasonView,
} from './tinyStarSeason';

afterEach(cleanup);

/** A server progress payload with `completedLessonIds` finished, in order. */
function seasonAfter(completedLessonIds: string[]) {
  const next = TINY_STAR_SEASON_MANIFEST.find(
    (scene) => !completedLessonIds.includes(scene.lessonId),
  );
  return tinyStarSeasonView({
    story_line_id: TINY_STAR_STORY_LINE_ID,
    completed: completedLessonIds.map((part_id) => ({
      part_id,
      completed_at: '2026-07-25T00:00:00.000Z',
      evidence: {},
    })),
    unlocked_part_ids: [...completedLessonIds, ...(next ? [next.lessonId] : [])],
  });
}

describe('StoryJourneyMap', () => {
  it('shows the complete six-chapter story while distinguishing playable scenes from previews', () => {
    render(<StoryJourneyMap busy={null} onStart={vi.fn()} />);

    expect(screen.getByText('Bring back the morning light')).toBeInTheDocument();
    expect(screen.getAllByTestId(/story-chapter-/)).toHaveLength(6);
    expect(screen.getAllByTestId(/blocks-starter-blocks_tsv_/)).toHaveLength(24);
    expect(screen.getByTestId('story-chapter-a3')).toHaveTextContent('4 scenes ready');
    expect(screen.getByTestId('story-chapter-a4')).toHaveTextContent('4 scenes ready');
    expect(screen.getByTestId('story-chapter-a5')).toHaveTextContent('4 scenes ready');
    expect(screen.getByTestId('story-chapter-a6')).toHaveTextContent('4 scenes ready');
    expect(screen.getByTestId('story-collection-shelf')).toHaveTextContent(
      'The Missing Morning Light',
    );
    expect(screen.getByTestId('story-collection-shelf')).toHaveTextContent(
      'The Monkey King’s New Journey',
    );
    expect(screen.getByTestId('story-collection-shelf')).toHaveTextContent('Alice in Wonderland');
    expect(screen.getByTestId('story-collection-shelf')).not.toHaveTextContent('Fable Forest');
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

  it('locks every scene past the one the season is waiting on', () => {
    const onStart = vi.fn();
    render(
      <StoryJourneyMap
        busy={null}
        onStart={onStart}
        season={seasonAfter(['tsv-s1-a1-h', 'tsv-s1-a1-b'])}
      />,
    );

    const done = screen.getByTestId('blocks-starter-blocks_tsv_a1_b');
    const open = screen.getByTestId('blocks-starter-blocks_tsv_a1_d');
    const locked = screen.getByTestId('blocks-starter-blocks_tsv_a1_s');
    const laterChapter = screen.getByTestId('blocks-starter-blocks_tsv_a6_s');

    expect(done).toHaveAttribute('data-state', 'completed');
    expect(done).toHaveTextContent('Done');
    expect(open).toHaveAttribute('data-state', 'open');
    expect(locked).toHaveAttribute('data-state', 'locked');
    expect(locked).toBeDisabled();
    expect(locked).toHaveTextContent('Locked');
    expect(laterChapter).toBeDisabled();

    // A finished scene stays replayable; a locked scene cannot be started.
    fireEvent.click(locked);
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(done);
    expect(onStart).toHaveBeenCalledWith('blocks_tsv_a1_b', 'Tiny Star Village · Wake up first');
  });

  it('offers the unfinished scene as the place to continue the season', () => {
    const onResume = vi.fn();
    render(
      <StoryJourneyMap
        busy={null}
        onStart={vi.fn()}
        season={seasonAfter(['tsv-s1-a1-h', 'tsv-s1-a1-b', 'tsv-s1-a1-d', 'tsv-s1-a1-s'])}
        onResume={onResume}
      />,
    );

    const resume = screen.getByTestId('story-season-resume');
    expect(resume).toHaveTextContent('Chapter 2 · Which way is the plaza?');
    expect(resume).toHaveTextContent('Scene 5 of 24 · 4 finished');
    expect(screen.queryByTestId('story-season-complete')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('story-season-resume-start'));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('celebrates the finished season and keeps every scene replayable', () => {
    render(
      <StoryJourneyMap
        busy={null}
        onStart={vi.fn()}
        season={seasonAfter(TINY_STAR_SEASON_MANIFEST.map((scene) => scene.lessonId))}
      />,
    );

    expect(screen.getByTestId('story-season-complete')).toHaveTextContent(
      'You finished all 24 scenes',
    );
    expect(screen.queryByTestId('story-season-resume')).not.toBeInTheDocument();
    for (const button of screen.getAllByTestId(/blocks-starter-blocks_tsv_/)) {
      expect(button).toHaveAttribute('data-state', 'completed');
      expect(button).not.toBeDisabled();
    }
  });

  it('locks nothing while the season progress is still unknown', () => {
    render(<StoryJourneyMap busy={null} onStart={vi.fn()} />);

    expect(screen.queryByTestId('story-season-resume')).not.toBeInTheDocument();
    for (const button of screen.getAllByTestId(/blocks-starter-blocks_tsv_/)) {
      expect(button).toHaveAttribute('data-state', 'open');
      expect(button).not.toBeDisabled();
    }
  });

  it('keeps the story count derived from the playable mission catalogue', () => {
    const derived = TINY_STAR_VILLAGE_CHAPTERS.flatMap((chapter) => chapter.missions);
    expect(PLAYABLE_STORY_MISSION_COUNT).toBe(24);
    expect(derived).toHaveLength(PLAYABLE_STORY_MISSION_COUNT);
  });
});
