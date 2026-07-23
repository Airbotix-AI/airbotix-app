import { describe, expect, it } from 'vitest';

import {
  storyJourneyMissionStates,
  storyJourneyUnlockedLessonIds,
} from './storyJourneyCatalog';

describe('Tiny Star Village season manifest', () => {
  it('aggregates saved completion across separate scene projects', () => {
    const progress = storyJourneyMissionStates([
      {
        id: 'newer-incomplete-a1-h-project',
        lessonId: 'tsv-s1-a1-h',
        completedLessonIds: [],
      },
      {
        id: 'a1-h-project',
        lessonId: 'tsv-s1-a1-h',
        completedLessonIds: ['tsv-s1-a1-h'],
      },
      {
        id: 'a1-b-project',
        lessonId: 'tsv-s1-a1-b',
        completedLessonIds: [],
      },
      { id: 'other-project', lessonId: 'other', completedLessonIds: ['other'] },
    ]);

    expect(progress).toEqual({
      'tsv-s1-a1-h': { completed: true, projectId: 'a1-h-project' },
      'tsv-s1-a1-b': { completed: false, projectId: 'a1-b-project' },
    });
    expect([...storyJourneyUnlockedLessonIds(progress)]).toEqual([
      'tsv-s1-a1-h',
      'tsv-s1-a1-b',
    ]);
  });

  it('keeps later scenes locked when a completion gap exists', () => {
    const progress = storyJourneyMissionStates([
      {
        id: 'a1-b-project',
        lessonId: 'tsv-s1-a1-b',
        completedLessonIds: ['tsv-s1-a1-b'],
      },
    ]);

    expect(storyJourneyUnlockedLessonIds(progress).has('tsv-s1-a1-b')).toBe(false);
    expect(storyJourneyUnlockedLessonIds(progress).has('tsv-s1-a1-d')).toBe(false);
  });
});
