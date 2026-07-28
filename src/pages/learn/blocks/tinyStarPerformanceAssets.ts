import type { CharacterPerformance } from './characterPerformance';

const LUMILO_ASSET_SEGMENT = '/tiny-star-village/characters/little-light/';
const TUAN_TUAN_ASSET_SEGMENT = '/tiny-star-village/characters/cloud-bear/';
const DOT_DOT_ASSET_SEGMENT = '/tiny-star-village/characters/dot-dot/';

export const TINY_STAR_SUCCESS_ASSETS = {
  lumilo:
    '/story-blocks/tiny-star-village/characters/little-light/success-joyful-v01.png',
  tuanTuan:
    '/story-blocks/tiny-star-village/characters/cloud-bear/success-joyful-v01.png',
  dotDot:
    '/story-blocks/tiny-star-village/characters/dot-dot/success-joyful-v01.png',
} as const;

/**
 * Resolves terminal pose art without changing the asset stored in the child's
 * project. Transient block performances stay on the layered puppets so a run
 * never jumps between the puppet and a static raster pose.
 */
export function tinyStarPerformanceAsset(
  asset: string | undefined,
  performance: CharacterPerformance,
): string | null {
  if (!asset || performance !== 'success') return null;
  if (asset.includes(LUMILO_ASSET_SEGMENT)) return TINY_STAR_SUCCESS_ASSETS.lumilo;
  if (asset.includes(TUAN_TUAN_ASSET_SEGMENT)) return TINY_STAR_SUCCESS_ASSETS.tuanTuan;
  if (asset.includes(DOT_DOT_ASSET_SEGMENT)) return TINY_STAR_SUCCESS_ASSETS.dotDot;
  return null;
}
