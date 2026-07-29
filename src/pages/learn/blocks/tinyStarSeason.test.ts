import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { completeStoryPart, type StoryLineProgress } from './story-parts/storyPartsApi';
import { TINY_STAR_VILLAGE_CHAPTERS } from './storyJourneyCatalog';
import {
  isTinyStarSeasonScene,
  recordTinyStarSeasonScene,
  TINY_STAR_SEASON_MANIFEST,
  TINY_STAR_SEASON_SCENE_COUNT,
  TINY_STAR_STORY_LINE_ID,
  tinyStarResumeProject,
  tinyStarSceneState,
  tinyStarSeasonScene,
  tinyStarSeasonView,
} from './tinyStarSeason';

vi.mock('./story-parts/storyPartsApi', () => ({
  completeStoryPart: vi.fn(async () => ({ part_id: 'x', completed_at: 'now' })),
  fetchStoryLineProgress: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

function progressAfter(completedLessonIds: string[]): StoryLineProgress {
  const index = TINY_STAR_SEASON_MANIFEST.findIndex(
    (scene) => !completedLessonIds.includes(scene.lessonId),
  );
  const frontier = index >= 0 ? [TINY_STAR_SEASON_MANIFEST[index].lessonId] : [];
  return {
    story_line_id: TINY_STAR_STORY_LINE_ID,
    completed: completedLessonIds.map((part_id) => ({
      part_id,
      completed_at: '2026-07-25T00:00:00.000Z',
      evidence: { schema_version: 1 as const, selections: { saved_project: ['p1'] } },
    })),
    unlocked_part_ids: [...completedLessonIds, ...frontier],
  };
}

describe('Tiny Star Village season manifest', () => {
  it('orders all 24 scenes as one chain: chapter by chapter, Explore → Build', () => {
    expect(TINY_STAR_SEASON_SCENE_COUNT).toBe(24);
    expect(TINY_STAR_SEASON_MANIFEST).toHaveLength(24);

    const lessonIds = TINY_STAR_SEASON_MANIFEST.map((scene) => scene.lessonId);
    expect(new Set(lessonIds).size).toBe(24);
    expect(lessonIds[0]).toBe('tsv-s1-a1-h');
    expect(lessonIds.slice(0, 4)).toEqual([
      'tsv-s1-a1-h',
      'tsv-s1-a1-b',
      'tsv-s1-a1-d',
      'tsv-s1-a1-s',
    ]);
    expect(lessonIds[4]).toBe('tsv-s1-a2-h');
    expect(lessonIds[23]).toBe('tsv-s1-a6-s');

    // The manifest is derived from the journey catalogue — never a second copy.
    const catalogue = TINY_STAR_VILLAGE_CHAPTERS.flatMap((chapter) => chapter.missions);
    expect(lessonIds).toEqual(catalogue.map((mission) => mission.lessonId));
    for (const scene of TINY_STAR_SEASON_MANIFEST) {
      expect(scene.order).toBe(scene.mission.number);
      expect(scene.sceneCount).toBe(scene.chapter.missions.length);
    }
  });

  it('resolves a scene by lesson id and rejects anything outside the season', () => {
    const scene = tinyStarSeasonScene('tsv-s1-a3-d');
    expect(scene?.order).toBe(11);
    expect(scene?.chapter.number).toBe(3);
    expect(scene?.sceneNumber).toBe(3);
    expect(isTinyStarSeasonScene('tsv-s1-a6-s')).toBe(true);
    expect(isTinyStarSeasonScene('jtw-s1-c1-p6')).toBe(false);
    expect(isTinyStarSeasonScene(undefined)).toBe(false);
  });
});

describe('Tiny Star Village season progression', () => {
  it('locks everything after the first scene before the season is started', () => {
    const view = tinyStarSeasonView(progressAfter([]));

    expect(view.known).toBe(true);
    expect(tinyStarSceneState(view, 'tsv-s1-a1-h')).toBe('open');
    expect(tinyStarSceneState(view, 'tsv-s1-a1-b')).toBe('locked');
    expect(tinyStarSceneState(view, 'tsv-s1-a6-s')).toBe('locked');
    expect(view.completedCount).toBe(0);
    expect(view.resume?.lessonId).toBe('tsv-s1-a1-h');
    expect(view.seasonComplete).toBe(false);
  });

  it('opens exactly one more scene per finished scene, across chapter borders', () => {
    const view = tinyStarSeasonView(
      progressAfter(['tsv-s1-a1-h', 'tsv-s1-a1-b', 'tsv-s1-a1-d', 'tsv-s1-a1-s']),
    );

    expect(tinyStarSceneState(view, 'tsv-s1-a1-s')).toBe('completed');
    expect(tinyStarSceneState(view, 'tsv-s1-a2-h')).toBe('open');
    expect(tinyStarSceneState(view, 'tsv-s1-a2-b')).toBe('locked');
    expect(view.completedCount).toBe(4);
    expect(view.resume?.lessonId).toBe('tsv-s1-a2-h');
    expect(view.resume?.order).toBe(5);
  });

  it('keeps finished scenes replayable and reports the finished season', () => {
    const all = TINY_STAR_SEASON_MANIFEST.map((scene) => scene.lessonId);
    const view = tinyStarSeasonView(progressAfter(all));

    expect(view.completedCount).toBe(24);
    expect(view.seasonComplete).toBe(true);
    expect(view.resume).toBeUndefined();
    for (const lessonId of all) {
      expect(tinyStarSceneState(view, lessonId)).toBe('completed');
    }
  });

  it('locks nothing until the server has answered', () => {
    const view = tinyStarSeasonView(undefined);

    expect(view.known).toBe(false);
    expect(view.resume).toBeUndefined();
    expect(view.seasonComplete).toBe(false);
    for (const scene of TINY_STAR_SEASON_MANIFEST) {
      expect(tinyStarSceneState(view, scene.lessonId)).toBe('open');
    }
  });
});

describe('Tiny Star Village season resume', () => {
  const scene = tinyStarSeasonScene('tsv-s1-a2-h')!;

  it('reopens the newest saved project for the scene', () => {
    const found = tinyStarResumeProject(
      [
        { id: 'other', title: 'Tiny Star Village · Choose an arrow', updated_at: '2026-07-25' },
        {
          id: 'older',
          title: 'Tiny Star Village · Which way is the plaza?',
          updated_at: '2026-07-20',
        },
        {
          id: 'newest',
          title: 'Tiny Star Village · Press Go once — watch Left 3',
          updated_at: '2026-07-24',
        },
      ],
      scene,
    );

    expect(found?.id).toBe('newest');
  });

  it('returns nothing when the child has not started the scene', () => {
    expect(tinyStarResumeProject([], scene)).toBeUndefined();
    expect(
      tinyStarResumeProject([{ id: 'p', title: 'My Story Blocks project' }], scene),
    ).toBeUndefined();
  });
});

describe('Tiny Star Village season record', () => {
  it('records the finished scene against the saved project, never a page flag', async () => {
    const result = await recordTinyStarSeasonScene('tsv-s1-a1-h', 'proj_42');

    expect(result).toBe('recorded');
    expect(completeStoryPart).toHaveBeenCalledWith(TINY_STAR_STORY_LINE_ID, 'tsv-s1-a1-h', {
      schema_version: 1,
      selections: { saved_project: ['proj_42'] },
    });
  });

  it('leaves other story lines alone', async () => {
    expect(await recordTinyStarSeasonScene('jtw-s1-c1-p6', 'proj_42')).toBe('not-a-season-scene');
    expect(completeStoryPart).not.toHaveBeenCalled();
  });

  it('reports a scene the server refused as locked, and a lost server as unavailable', async () => {
    vi.mocked(completeStoryPart).mockRejectedValueOnce(
      new ApiError(403, 'STORY_PART_LOCKED', 'Finish the previous story part first.'),
    );
    expect(await recordTinyStarSeasonScene('tsv-s1-a4-b', 'proj_42')).toBe('locked');

    vi.mocked(completeStoryPart).mockRejectedValueOnce(new Error('offline'));
    expect(await recordTinyStarSeasonScene('tsv-s1-a4-b', 'proj_42')).toBe('unavailable');
  });
});
