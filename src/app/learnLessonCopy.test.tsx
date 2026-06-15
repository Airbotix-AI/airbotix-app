// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { NAV_ITEMS } from './LearnTopBar';
import { studioMeta } from '@/pages/portal/kidGrowth';

// D-LP-2 (lesson-plan-prd §7): every human-facing surface — kids, parents, teachers,
// ops — uses ONE word, "Lesson / 课节". "Mission" survives ONLY as an internal code /
// route identifier and must never appear in copy a child or parent reads. These guards
// keep the kids-Learn nav + the parent growth tracker on the right side of that line.
describe('Lesson copy unity (D-LP-2)', () => {
  it('the Learn top-bar nav labels the lessons section "Lessons", never "Missions"', () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toContain('Lessons');
    expect(labels).not.toContain('Missions');
    // the route path is the internal identifier and intentionally stays /learn/missions
    expect(NAV_ITEMS.find((i) => i.label === 'Lessons')?.to).toBe('/learn/missions');
  });

  it('the parent growth tracker labels the lessons studio "Lessons" with the "lessons" noun', () => {
    const meta = studioMeta('mission'); // `mission` is the internal studio key
    expect(meta.label).toBe('Lessons');
    expect(meta.noun).toBe('lessons');
  });
});
