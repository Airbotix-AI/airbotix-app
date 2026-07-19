// Pure-data engine tests (D-IS-17: the stroke list is a load-bearing data
// structure — these run without any canvas implementation).

import { describe, expect, it } from 'vitest';

import { dataUrlToBlob, floodFill, strokeOutline, type StrokeOp } from './strokeEngine';

const stroke = (tool: StrokeOp['tool']): StrokeOp => ({
  kind: 'stroke',
  tool,
  color: '#1f2437',
  size: 14,
  points: [
    [100, 100, 0.5],
    [140, 120, 0.5],
    [200, 140, 0.5],
  ],
});

describe('strokeOutline', () => {
  it('produces a closed outline polygon from pressure points', () => {
    const outline = strokeOutline(stroke('pencil'));
    expect(outline.length).toBeGreaterThan(6);
    for (const p of outline) {
      expect(Number.isFinite(p[0])).toBe(true);
      expect(Number.isFinite(p[1])).toBe(true);
    }
  });

  it('marker strokes are wider than pencil strokes (tool feel profiles)', () => {
    const spread = (pts: number[][]) => {
      const ys = pts.map((p) => p[1]);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(spread(strokeOutline(stroke('marker')))).toBeGreaterThan(
      spread(strokeOutline(stroke('pencil'))),
    );
  });
});

describe('floodFill (pure pixel-buffer scanline)', () => {
  // 4×4 white buffer with a black vertical wall at x=2
  const make = () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    for (let y = 0; y < 4; y++) {
      const i = (y * 4 + 2) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
    return data;
  };
  const px = (data: Uint8ClampedArray, x: number, y: number) => {
    const i = (y * 4 + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };

  it('fills the connected region and stops at the wall', () => {
    const data = make();
    floodFill(data, 4, 4, 0, 0, '#ff0000');
    expect(px(data, 0, 0)).toEqual([255, 0, 0]);
    expect(px(data, 1, 3)).toEqual([255, 0, 0]);
    expect(px(data, 2, 0)).toEqual([0, 0, 0]); // the wall survives
    expect(px(data, 3, 0)).toEqual([255, 255, 255]); // the other side untouched
  });

  it('is a no-op when the target already matches the fill color', () => {
    const data = make();
    floodFill(data, 4, 4, 0, 0, '#ffffff');
    expect(px(data, 0, 0)).toEqual([255, 255, 255]);
  });

  it('ignores out-of-bounds starts', () => {
    const data = make();
    floodFill(data, 4, 4, -1, 99, '#ff0000');
    expect(px(data, 0, 0)).toEqual([255, 255, 255]);
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a data URL into a typed Blob without fetch', () => {
    const blob = dataUrlToBlob('data:image/png;base64,aGVsbG8='); // "hello"
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(5);
  });
});
