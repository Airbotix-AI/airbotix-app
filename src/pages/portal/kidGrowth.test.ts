import { describe, it, expect } from 'vitest';

import {
  currentStreak,
  activeDays,
  favouriteStudio,
  studiosTried,
  studioMeta,
  summarize,
  growthHeadline,
} from './kidGrowth';
import type { KidUsageDetail, UsageTrendPoint } from './walletTypes';

const trend = (...values: number[]): UsageTrendPoint[] =>
  values.map((value, i) => ({ local_date: `2026-06-${String(i + 1).padStart(2, '0')}`, value }));

const detail = (over: Partial<KidUsageDetail> = {}): KidUsageDetail => ({
  kid_id: 'k1',
  nickname: 'Emma',
  from: '2026-05-10',
  to: '2026-06-07',
  tokens_in: 0,
  tokens_out: 0,
  stars: 0,
  requests: 0,
  sessions: 0,
  active_seconds: 0,
  flagged_count: 0,
  approvals_asked: 0,
  approvals_granted: 0,
  by_task_type: {},
  by_model: {},
  by_project: {},
  ...over,
});

describe('currentStreak', () => {
  it('counts trailing consecutive active days', () => {
    expect(currentStreak(trend(0, 5, 0, 2, 3, 1))).toBe(3);
  });
  it('is 0 when the most recent day is inactive', () => {
    expect(currentStreak(trend(5, 5, 0))).toBe(0);
  });
  it('handles a single active day', () => {
    expect(currentStreak(trend(4))).toBe(1);
  });
  it('handles empty and all-zero series', () => {
    expect(currentStreak([])).toBe(0);
    expect(currentStreak(trend(0, 0, 0))).toBe(0);
  });
});

describe('activeDays', () => {
  it('counts every day with activity', () => {
    expect(activeDays(trend(0, 5, 0, 2, 3))).toBe(3);
    expect(activeDays(trend(0, 0))).toBe(0);
  });
});

describe('favouriteStudio', () => {
  it('picks the studio with the most creations', () => {
    const d = detail({
      by_task_type: {
        image: { requests: 8, stars: 8 },
        music: { requests: 3, stars: 3 },
      },
    });
    const fav = favouriteStudio(d);
    expect(fav?.key).toBe('image');
    expect(fav?.noun).toBe('pictures');
    expect(fav?.requests).toBe(8);
  });
  it('returns null when there is no activity', () => {
    expect(favouriteStudio(detail())).toBeNull();
    expect(favouriteStudio(detail({ by_task_type: { image: { requests: 0, stars: 0 } } }))).toBeNull();
  });
});

describe('studiosTried', () => {
  it('counts distinct studios with at least one creation', () => {
    const d = detail({
      by_task_type: {
        image: { requests: 2, stars: 2 },
        music: { requests: 1, stars: 1 },
        voice: { requests: 0, stars: 0 },
      },
    });
    expect(studiosTried(d)).toBe(2);
  });
});

describe('studioMeta', () => {
  it('maps known studios', () => {
    expect(studioMeta('music').noun).toBe('songs');
    expect(studioMeta('IMAGE').label).toBe('Art Studio');
  });
  it('falls back gracefully for unknown keys', () => {
    const m = studioMeta('puppetry');
    expect(m.emoji).toBe('✨');
    expect(m.label).toBe('Puppetry');
    expect(m.noun).toBe('creations');
  });
});

describe('summarize', () => {
  it('marks a no-activity kid as empty', () => {
    const s = summarize(detail(), []);
    expect(s.isEmpty).toBe(true);
    expect(s.creations).toBe(0);
  });
  it('summarises an active kid', () => {
    const d = detail({
      requests: 12,
      sessions: 4,
      active_seconds: 2700,
      by_task_type: { image: { requests: 8, stars: 8 }, music: { requests: 4, stars: 4 } },
    });
    const s = summarize(d, trend(0, 2, 3, 1));
    expect(s.isEmpty).toBe(false);
    expect(s.creations).toBe(12);
    expect(s.minutes).toBe(45);
    expect(s.sessions).toBe(4);
    expect(s.streak).toBe(3);
    expect(s.studiosTried).toBe(2);
    expect(s.favourite?.key).toBe('image');
  });
  it('tolerates null detail/trend', () => {
    const s = summarize(null, null);
    expect(s.isEmpty).toBe(true);
    expect(s.streak).toBe(0);
  });
});

describe('growthHeadline', () => {
  it('gives an encouraging line when empty', () => {
    const s = summarize(detail(), []);
    expect(growthHeadline('Leo', s)).toContain('one sign-in away');
  });
  it('builds a warm sentence with favourite + streak', () => {
    const d = detail({
      requests: 12,
      sessions: 4,
      by_task_type: { image: { requests: 8, stars: 8 } },
    });
    const line = growthHeadline('Emma', summarize(d, trend(2, 3, 1)));
    expect(line).toContain('Emma made 12 things with AI');
    expect(line).toContain('pictures in the Art Studio');
    expect(line).toContain('3-day streak');
  });
  it('singularises a single creation', () => {
    const d = detail({ requests: 1, sessions: 1 });
    const line = growthHeadline('Mia', summarize(d, trend(1)));
    expect(line).toContain('made 1 thing with AI');
  });
});
