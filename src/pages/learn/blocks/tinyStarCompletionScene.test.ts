import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  tinyStarCompletionScene,
  TINY_STAR_RESOLVED_SCENES,
} from './tinyStarCompletionScene';

describe('tinyStarCompletionScene', () => {
  it('resolves each eligible completed chapter scene without changing its stored background', () => {
    const expected = [
      ...['h', 'b', 'd', 's'].map((part) => [
        `tsv-s1-a1-${part}`, 'tsv-window-room-dim', TINY_STAR_RESOLVED_SCENES.windowRoom,
      ]),
      ...['h', 'b', 'd', 's'].map((part) => [
        `tsv-s1-a3-${part}`, 'tsv-rooftop', TINY_STAR_RESOLVED_SCENES.rooftop,
      ]),
      ...['b', 'd', 's'].map((part) => [
        `tsv-s1-a5-${part}`, 'tsv-greeting-stage', TINY_STAR_RESOLVED_SCENES.greetingStage,
      ]),
      ...['b', 'd', 's'].map((part) => [
        `tsv-s1-a6-${part}`, 'tsv-clocktower-path', TINY_STAR_RESOLVED_SCENES.clocktowerPath,
      ]),
    ] as const;

    for (const [lessonId, background, visual] of expected) {
      expect(tinyStarCompletionScene(lessonId, background, true)).toBe(visual);
    }
  });

  it('keeps early, mismatched and observation-only hook scenes on their before art', () => {
    expect(tinyStarCompletionScene('tsv-s1-a6-d', 'tsv-clocktower-path', false)).toBeNull();
    expect(tinyStarCompletionScene('tsv-s1-a1-b', 'tsv-rooftop', true)).toBeNull();
    expect(tinyStarCompletionScene('tsv-s1-a5-h', 'tsv-greeting-stage', true)).toBeNull();
    expect(tinyStarCompletionScene('tsv-s1-a6-h', 'tsv-clocktower-path', true)).toBeNull();
    expect(tinyStarCompletionScene(undefined, 'tsv-rooftop', true)).toBeNull();
  });

  it('ships an exact CSS selector and first-party file for every resolved token', () => {
    const css = readFileSync('src/pages/learn/blocks/blocks.css', 'utf8');
    const expected = [
      [TINY_STAR_RESOLVED_SCENES.windowRoom, 'window-room-resolved-bright-v01.webp'],
      [TINY_STAR_RESOLVED_SCENES.rooftop, 'rooftop-awake-lit-v01.webp'],
      [TINY_STAR_RESOLVED_SCENES.greetingStage, 'greeting-stage-lamp-lit-v01.webp'],
      [TINY_STAR_RESOLVED_SCENES.clocktowerPath, 'clocktower-path-bell-lit-v01.webp'],
    ] as const;

    for (const [token, file] of expected) {
      expect(css).toContain(`.bsx-stage[data-story-scene-visual='${token}']`);
      expect(css).toContain(`/story-blocks/tiny-star-village/backgrounds/${file}`);
    }
  });
});
