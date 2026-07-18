// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, VISIBLE_NAV_ITEMS } from './LearnTopBar';
import { SHOW_LESSONS_CATALOG } from '@/lib/features';
import { studioMeta } from '@/pages/portal/kidGrowth';

// Mission/Lesson split (platform model): "Lesson / 课节" is the course-CONTENT unit —
// the catalog, the syllabus, what carries the plan. "Mission" is the kid's TASK inside a
// Lesson. The two must never be swapped in copy: the catalog nav says "Lessons", but a
// kid's task surface says "Mission". (PR #77 over-renamed all task copy to "Lesson";
// this guard pins the corrected split.)
describe('Lesson(content) / Mission(task) copy split', () => {
  it('the Learn top-bar nav labels the catalog (课节) "Lessons", never "Missions"', () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toContain('Lessons');
    expect(labels).not.toContain('Missions');
    // the route path is the internal identifier and intentionally stays /learn/missions
    expect(NAV_ITEMS.find((i) => i.label === 'Lessons')?.to).toBe('/learn/missions');
  });

  it('the rendered nav only shows the Lessons catalog entry when the feature switch is on', () => {
    // features.ts SHOW_LESSONS_CATALOG — the catalog is temporarily hidden on
    // owner request (2026-07-17); the canonical NAV_ITEMS list keeps the entry.
    expect(VISIBLE_NAV_ITEMS.some((i) => i.to === '/learn/missions')).toBe(SHOW_LESSONS_CATALOG);
    // every other entry is untouched by the switch
    expect(VISIBLE_NAV_ITEMS.filter((i) => i.to !== '/learn/missions')).toEqual(
      NAV_ITEMS.filter((i) => i.to !== '/learn/missions'),
    );
  });

  it('the parent growth tracker labels the kid TASK studio "Missions", not "Lessons"', () => {
    const meta = studioMeta('mission'); // `mission` is the task-level studio key
    expect(meta.label).toBe('Missions');
    expect(meta.noun).toBe('missions');
  });
});
