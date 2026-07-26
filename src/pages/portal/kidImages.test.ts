import { describe, expect, it } from 'vitest';

import {
  bucketFor,
  buildPromptsCsv,
  GALLERY_FETCH_LIMIT,
  gallerySummary,
  groupImages,
  type KidImageArtifact,
} from './kidImages';

function art(overrides: Partial<KidImageArtifact>): KidImageArtifact {
  return {
    id: 'art-x',
    kind: 'image',
    s3_key: 'k',
    mime_type: 'image/png',
    size_bytes: 1,
    created_at: '2026-07-01T00:00:00Z',
    project_id: 'proj-1',
    metadata: {},
    ...overrides,
  };
}

describe('bucketFor', () => {
  it('buckets today / within 7 days / older correctly', () => {
    const now = new Date();
    expect(bucketFor(now.toISOString(), now)).toBe('Today');
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(bucketFor(threeDaysAgo.toISOString(), now)).toBe('This week');
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(bucketFor(twoWeeksAgo.toISOString(), now)).toBe('Earlier');
  });
});

describe('groupImages', () => {
  it('keeps bucket order and drops empty buckets', () => {
    const now = new Date();
    const today = art({ id: 'a', created_at: now.toISOString() });
    const old = art({ id: 'b', created_at: '2020-01-01T00:00:00Z' });
    const groups = groupImages([today, old], now);
    expect(groups.map((g) => g.bucket)).toEqual(['Today', 'Earlier']);
    expect(groups[0].items).toEqual([today]);
    expect(groups[1].items).toEqual([old]);
  });
});

describe('gallerySummary', () => {
  it('sums stars from metadata and finds the newest picture', () => {
    const a = art({
      id: 'a',
      created_at: '2026-07-10T00:00:00Z',
      metadata: { stars_charged: 9 },
    });
    const b = art({ id: 'b', created_at: '2026-07-12T00:00:00Z', metadata: { stars_charged: 2 } });
    const c = art({ id: 'c', created_at: '2026-07-01T00:00:00Z', metadata: {} });
    expect(gallerySummary([a, b, c])).toEqual({
      count: 3,
      totalStars: 11,
      lastCreatedAt: '2026-07-12T00:00:00Z',
      capped: false,
      limit: GALLERY_FETCH_LIMIT,
    });
    expect(gallerySummary([])).toEqual({
      count: 0,
      totalStars: 0,
      lastCreatedAt: null,
      capped: false,
      limit: GALLERY_FETCH_LIMIT,
    });
  });

  it('flags the list as capped when the backend returned exactly the requested limit', () => {
    const under = [art({ id: 'a' }), art({ id: 'b' })];
    expect(gallerySummary(under, 3).capped).toBe(false);

    const atCap = [art({ id: 'a' }), art({ id: 'b' }), art({ id: 'c' })];
    const summary = gallerySummary(atCap, 3);
    expect(summary.capped).toBe(true);
    expect(summary.limit).toBe(3);
    // The totals still describe only what came back — the header must say so.
    expect(summary.count).toBe(3);
  });

  it('defaults to the 200-row cap the gallery requests from the backend', () => {
    expect(GALLERY_FETCH_LIMIT).toBe(200);
    const full = Array.from({ length: GALLERY_FETCH_LIMIT }, (_, i) => art({ id: `a-${i}` }));
    expect(gallerySummary(full).capped).toBe(true);
    expect(gallerySummary(full.slice(0, -1)).capped).toBe(false);
  });
});

describe('buildPromptsCsv', () => {
  it('emits a header row and quotes commas/quotes per RFC 4180', () => {
    const csv = buildPromptsCsv([
      art({ metadata: { prompt: 'plain prompt', stars_charged: 9 } }),
      art({ metadata: { prompt: 'a "quoted", tricky prompt', stars_charged: 2 } }),
      art({ metadata: {} }),
    ]);
    const lines = csv.trimEnd().split('\n');
    expect(lines[0]).toBe('date,prompt,stars');
    expect(lines[1]).toBe('2026-07-01T00:00:00Z,plain prompt,9');
    expect(lines[2]).toBe('2026-07-01T00:00:00Z,"a ""quoted"", tricky prompt",2');
    expect(lines[3]).toBe('2026-07-01T00:00:00Z,,');
  });
});
