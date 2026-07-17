import { describe, expect, it } from 'vitest';

import {
  nextStoryMissionForLesson,
  storyJourneyPositionForLesson,
  TINY_STAR_VILLAGE_CHAPTERS,
} from './storyJourneyCatalog';

describe('storyJourneyCatalog progression', () => {
  it('keeps every playable template and lesson id unique', () => {
    const missions = TINY_STAR_VILLAGE_CHAPTERS.flatMap((chapter) => chapter.missions);

    expect(new Set(missions.map((mission) => mission.template)).size).toBe(missions.length);
    expect(new Set(missions.map((mission) => mission.lessonId)).size).toBe(missions.length);
  });

  it('moves from the debug step to the personal story step in chapter 1', () => {
    const next = nextStoryMissionForLesson('tsv-s1-a1-d');

    expect(next?.chapter.number).toBe(1);
    expect(next?.mission.lessonId).toBe('tsv-s1-a1-s');
    expect(next?.sceneNumber).toBe(4);
  });

  it('crosses the chapter boundary after the chapter 1 personal story', () => {
    const next = nextStoryMissionForLesson('tsv-s1-a1-s');

    expect(next?.chapter.number).toBe(2);
    expect(next?.mission.lessonId).toBe('tsv-s1-a2-h');
    expect(next?.sceneNumber).toBe(1);
  });

  it('returns no next mission after the last production-ready scene', () => {
    expect(nextStoryMissionForLesson('tsv-s1-a2-d')?.mission.lessonId).toBe('tsv-s1-a2-s');
    expect(nextStoryMissionForLesson('tsv-s1-a2-s')?.mission.lessonId).toBe('tsv-s1-a3-h');
    expect(nextStoryMissionForLesson('tsv-s1-a3-h')?.mission.lessonId).toBe('tsv-s1-a3-b');
    expect(nextStoryMissionForLesson('tsv-s1-a3-b')?.mission.lessonId).toBe('tsv-s1-a3-d');
    expect(nextStoryMissionForLesson('tsv-s1-a3-d')).toBeUndefined();
    expect(storyJourneyPositionForLesson('unknown')).toBeUndefined();
  });
});
