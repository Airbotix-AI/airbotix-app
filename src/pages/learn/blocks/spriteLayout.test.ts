import { describe, expect, it } from 'vitest';

import { speechBubbleStyle } from './spriteLayout';

describe('speechBubbleStyle', () => {
  it('lifts asset speech above the full scaled character visual', () => {
    expect(
      speechBubbleStyle({ gx: 8, gy: 9, size: 2.6, rot: 0, visible: true }, true),
    ).toEqual({
      left: 'clamp(12%, 42.5%, 88%)',
      top: 'clamp(10%, calc(63.33333333333333% - 33.2cqh), 92%)',
    });
  });

  it('uses the smaller emoji visual footprint for portable fallback characters', () => {
    expect(
      speechBubbleStyle({ gx: 0, gy: 0, size: 1, rot: 0, visible: true }, false),
    ).toEqual({
      left: 'clamp(12%, 2.5%, 88%)',
      top: 'clamp(10%, calc(3.3333333333333335% - 9cqh), 92%)',
    });
  });
});
