import { describe, expect, it } from 'vitest';

import {
  buildComparisonRows,
  matchesCommitment,
  matchesKid,
  recommendCoursesForKid,
  sortComparisonRows,
  type CoursePack,
  type MarketingCourseCard,
} from './courseComparison';

const pack = (overrides: Partial<CoursePack> = {}): CoursePack => ({
  id: 'pack-1',
  slug: 'music-game',
  title: 'Music Game',
  description: 'Build a game.',
  target_age_min: 9,
  target_age_max: 12,
  product_line: 'line_b_coding',
  lessons: [{ id: 'lesson-1' }],
  estimated_stars: 100,
  owner_teacher: null,
  ...overrides,
});

const card = (overrides: Partial<MarketingCourseCard> = {}): MarketingCourseCard => ({
  slug: 'music-game',
  title: 'Build a Music Game',
  series: 'Game Studio',
  format: null,
  weeks_count: 4,
  age_range: '9–12',
  price_label: 'A$240',
  price_note: '4 sessions',
  session_length: '90 min',
  difficulty: 2,
  compare_ship: 'A playable game',
  compare_best_for: 'First-time coders',
  ...overrides,
});

describe('course comparison model', () => {
  it('keeps the protected pack set authoritative and joins decision copy by slug', () => {
    const rows = buildComparisonRows(
      [pack()],
      [card(), card({ slug: 'catalog-only', title: 'Not bookable' })],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'Build a Music Game',
      ageLabel: '9–12',
      difficulty: 2,
      lengthLabel: '4 weeks',
      priceAud: 240,
      ship: 'A playable game',
      bestFor: 'First-time coders',
    });
  });

  it('shows a configured standard course price when marketing display copy has no amount', () => {
    const [row] = buildComparisonRows(
      [
        pack({
          default_price_aud_cents: 6000,
          default_session_count: 4,
          default_session_minutes: 90,
        }),
      ],
      [card({ price_label: 'Ask us', price_note: null })],
    );

    expect(row.priceLabel).toBe('A$360');
    expect(row.priceNote).toBe('4 sessions · A$90 per session');
    expect(row.priceAud).toBe(360);
  });

  it('filters by exact child age and the three commitment bands', () => {
    const short = buildComparisonRows([pack()], [card()])[0];
    const taster = buildComparisonRows(
      [pack({ id: 'pack-2', slug: 'taster' })],
      [card({ slug: 'taster', format: 'workshop', weeks_count: 1 })],
    )[0];
    const full = buildComparisonRows(
      [pack({ id: 'pack-3', slug: 'term' })],
      [card({ slug: 'term', weeks_count: 9 })],
    )[0];

    expect(matchesKid(short, { id: 'kid-1', nickname: 'Mia', age: 10 })).toBe(true);
    expect(matchesKid(short, { id: 'kid-2', nickname: 'Ari', age: 13 })).toBe(false);
    expect(matchesCommitment(taster, 'taster')).toBe(true);
    expect(matchesCommitment(short, 'short')).toBe(true);
    expect(matchesCommitment(full, 'full')).toBe(true);
    expect(matchesCommitment(full, 'short')).toBe(false);
  });

  it('sorts missing values last and uses difficulty as a stable tie-break', () => {
    const rows = buildComparisonRows(
      [
        pack({ id: 'pack-1', slug: 'hard' }),
        pack({ id: 'pack-2', slug: 'gentle' }),
        pack({ id: 'pack-3', slug: 'unknown' }),
      ],
      [
        card({ slug: 'hard', difficulty: 4, price_label: 'A$240' }),
        card({ slug: 'gentle', difficulty: 1, price_label: 'A$240' }),
      ],
    );

    expect(sortComparisonRows(rows, 'difficulty').map((row) => row.pack.slug)).toEqual([
      'gentle',
      'hard',
      'unknown',
    ]);
    expect(sortComparisonRows(rows, 'price').map((row) => row.pack.slug)).toEqual([
      'gentle',
      'hard',
      'unknown',
    ]);
  });

  it('recommends only exact age matches and ranks the closest age-band centre first', () => {
    const rows = buildComparisonRows(
      [
        pack({ id: 'pack-1', slug: 'wide', target_age_min: 8, target_age_max: 14 }),
        pack({ id: 'pack-2', slug: 'exact', target_age_min: 9, target_age_max: 11 }),
        pack({ id: 'pack-3', slug: 'teen', target_age_min: 13, target_age_max: 17 }),
      ],
      [
        card({ slug: 'wide', age_range: '8–14', difficulty: 1 }),
        card({ slug: 'exact', age_range: '9–11', difficulty: 2 }),
        card({ slug: 'teen', age_range: '13–17', difficulty: 1 }),
      ],
    );

    const recommendations = recommendCoursesForKid(rows, {
      id: 'kid-1',
      nickname: 'Mia',
      age: 10,
    });

    expect(recommendations.map(({ row }) => row.pack.slug)).toEqual(['exact', 'wide']);
    expect(recommendations.some(({ row }) => row.pack.slug === 'teen')).toBe(false);
  });
});
