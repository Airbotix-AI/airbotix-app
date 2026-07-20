import type { CSSProperties } from 'react';

import { GRID_H, GRID_W } from './blocksModel';
import type { SpriteState } from './interpreter';

const ASSET_HALF_HEIGHT_CQH = 12;
const EMOJI_HALF_HEIGHT_CQH = 7;
const SPEECH_GAP_CQH = 2;

/**
 * Keep a speech bubble above the scaled visual instead of pinning it to a
 * fixed grid offset. The clamp also prevents short text from leaving the
 * stage near an edge.
 */
export function speechBubbleStyle(state: SpriteState, hasAsset: boolean): CSSProperties {
  const centerX = ((state.gx + 0.5) / GRID_W) * 100;
  const centerY = ((state.gy + 0.5) / GRID_H) * 100;
  const halfHeight = hasAsset ? ASSET_HALF_HEIGHT_CQH : EMOJI_HALF_HEIGHT_CQH;
  const lift = halfHeight * state.size + SPEECH_GAP_CQH;

  return {
    left: `clamp(12%, ${centerX}%, 88%)`,
    top: `clamp(10%, calc(${centerY}% - ${lift}cqh), 92%)`,
  };
}
