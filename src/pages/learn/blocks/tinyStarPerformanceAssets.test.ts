import { describe, expect, it } from 'vitest';

import {
  tinyStarPerformanceAsset,
  TINY_STAR_SUCCESS_ASSETS,
} from './tinyStarPerformanceAssets';

describe('tinyStarPerformanceAsset', () => {
  it('maps each Tiny Star friend to the formal terminal success pose', () => {
    expect(
      tinyStarPerformanceAsset(
        '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
        'success',
      ),
    ).toBe(TINY_STAR_SUCCESS_ASSETS.lumilo);
    expect(
      tinyStarPerformanceAsset(
        '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
        'success',
      ),
    ).toBe(TINY_STAR_SUCCESS_ASSETS.tuanTuan);
    expect(
      tinyStarPerformanceAsset(
        '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
        'success',
      ),
    ).toBe(TINY_STAR_SUCCESS_ASSETS.dotDot);
  });

  it('keeps every transient performance on the existing visual renderer', () => {
    const lumilo =
      '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png';
    const tuanTuan =
      '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png';

    for (const performance of ['idle', 'moving', 'hopping', 'speaking'] as const) {
      expect(tinyStarPerformanceAsset(lumilo, performance)).toBeNull();
      expect(tinyStarPerformanceAsset(tuanTuan, performance)).toBeNull();
    }
    expect(tinyStarPerformanceAsset('/story-blocks/another-story/hero.png', 'success')).toBeNull();
    expect(tinyStarPerformanceAsset(undefined, 'success')).toBeNull();
  });
});
