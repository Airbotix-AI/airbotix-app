import { describe, expect, it } from 'vitest';

import { STORY_MISSION_CHAPTERS, storyMissionFor } from './curriculumGuides';

describe('curriculumGuides catalogue', () => {
  it('no lesson id appears in two chapter modules', () => {
    // The catalogue is assembled by spreading the chapter modules in order, so a
    // duplicated key would silently shadow the earlier chapter's guide instead of
    // failing. Splitting the data across files is only safe with this guard.
    const seen = new Map<string, number>();
    const duplicates: string[] = [];
    STORY_MISSION_CHAPTERS.forEach((chapter, index) => {
      for (const lessonId of Object.keys(chapter)) {
        if (seen.has(lessonId)) {
          duplicates.push(`${lessonId} (chapters ${seen.get(lessonId)} and ${index})`);
        } else {
          seen.set(lessonId, index);
        }
      }
    });

    expect(duplicates).toEqual([]);
  });

  it('every chapter module contributes, and each guide is reachable by lesson id', () => {
    const lessonIds = STORY_MISSION_CHAPTERS.flatMap((chapter) => Object.keys(chapter));

    expect(STORY_MISSION_CHAPTERS.every((chapter) => Object.keys(chapter).length > 0)).toBe(true);
    for (const lessonId of lessonIds) {
      expect(storyMissionFor(lessonId), lessonId).toBeDefined();
    }
    expect(storyMissionFor('does-not-exist')).toBeUndefined();
    expect(storyMissionFor(undefined)).toBeUndefined();
  });

  it("every guide's own lessonId matches the key it is filed under", () => {
    for (const chapter of STORY_MISSION_CHAPTERS) {
      for (const [lessonId, mission] of Object.entries(chapter)) {
        expect(mission.lessonId, lessonId).toBe(lessonId);
      }
    }
  });

  it('registers every implemented S2 Studio gate, including the C2-P6 debug choice', () => {
    for (const lessonId of [
      'jtw-s2-c1-p4', 'jtw-s2-c1-p5', 'jtw-s2-c1-p6', 'jtw-s2-c1-p7',
      'jtw-s2-c2-p4', 'jtw-s2-c2-p5', 'jtw-s2-c2-p6',
    ]) {
      expect(storyMissionFor(lessonId)?.lessonId).toBe(lessonId);
    }
    expect(storyMissionFor('jtw-s2-c2-p6')?.choices).toContainEqual({
      id: 'wukong-too-early', label: '悟空在玄奘询问前就回答了', correct: true,
    });
  });
});
