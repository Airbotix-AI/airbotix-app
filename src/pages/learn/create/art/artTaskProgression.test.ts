import { describe, expect, it } from 'vitest';

import type { Artifact } from '../shared/useStudio';
import { nextDrawingTask } from './artTaskProgression';
import type { ArtTaskListItem } from './artTaskTypes';

function task(slug: string, next: string | null): ArtTaskListItem {
  return {
    slug,
    version: 1,
    title: slug,
    short_description: slug,
    category: 'animals',
    age_min: 4,
    age_max: 8,
    difficulty: 1,
    duration_minutes: 5,
    step_count: 3,
    cover: { url: '/cover.svg', alt: slug },
    modes: ['look_and_draw'],
    progression: {
      path_id: 'ocean-adventure',
      path_title: 'Ocean Adventure',
      position: 1,
      total: 4,
      level: 'first',
      next_task_slug: next,
    },
  };
}

function drawing(slug: string, completedSteps = 3): Artifact {
  return {
    id: `${slug}-${completedSteps}`,
    kind: 'image',
    s3_key: 'drawing.png',
    mime_type: 'image/png',
    size_bytes: 10,
    created_at: '2026-07-29T00:00:00.000Z',
    project_id: 'project-1',
    metadata: { art_task_slug: slug, completed_steps: completedSteps },
  };
}

const TASKS = [
  task('fish', 'whale'),
  task('whale', 'turtle'),
  task('turtle', 'shark'),
  task('shark', null),
];

describe('nextDrawingTask', () => {
  it('recommends exactly the natural next task after a completed drawing', () => {
    expect(nextDrawingTask(TASKS, [drawing('fish')])?.slug).toBe('whale');
  });

  it('skips tasks the child already finished in the same path', () => {
    expect(nextDrawingTask(TASKS, [drawing('fish'), drawing('whale')])?.slug).toBe('turtle');
  });

  it('does not treat a partially completed guide as finished', () => {
    expect(nextDrawingTask(TASKS, [drawing('fish', 2)])).toBeNull();
  });

  it('returns no recommendation at the end of a path', () => {
    expect(nextDrawingTask(TASKS, [drawing('shark')])).toBeNull();
  });
});
