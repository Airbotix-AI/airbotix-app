// Pure-data engine tests (D-IS-17: the stroke list is a load-bearing data
// structure — these run without any canvas implementation).

import { describe, expect, it } from 'vitest';

import {
  CANVAS_SIZE,
  dataUrlToBlob,
  floodFill,
  renderOps,
  strokeOutline,
  type FillOp,
  type StrokeOp,
} from './strokeEngine';

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

describe('renderOps fill on a scaled backing bitmap (Retina)', () => {
  it('reads the FULL device-pixel bitmap and scales the tap point (dpr 2)', () => {
    const dpr = 2;
    const width = CANVAS_SIZE * dpr;
    const height = CANVAS_SIZE * dpr;
    // All-white bitmap with a red 2×2 island at DEVICE (20,20) — the flood
    // target. A logical tap at (10,10) must land on it only if the fill scales.
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (const [x, y] of [[20, 20], [21, 20], [20, 21], [21, 21]]) {
      const i = (y * width + x) * 4;
      data[i + 1] = 0;
      data[i + 2] = 0; // red: (255, 0, 0)
    }
    const putCalls: Array<{ w: number; h: number; x: number; y: number }> = [];
    const ctx = {
      canvas: { width, height },
      getImageData: (_x: number, _y: number, w: number, h: number) => ({ data, width: w, height: h }),
      putImageData: (image: { width: number; height: number }, x: number, y: number) =>
        putCalls.push({ w: image.width, h: image.height, x, y }),
    } as unknown as CanvasRenderingContext2D;

    const fill: FillOp = { kind: 'fill', color: '#3fa7e9', x: 10, y: 10 };
    renderOps(ctx, [fill]);

    const px = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    // the red island (device pixels) took the fill colour…
    expect(px(20, 20)).toEqual([0x3f, 0xa7, 0xe9]);
    expect(px(21, 21)).toEqual([0x3f, 0xa7, 0xe9]);
    // …the white ground outside it did not (red↔white is beyond tolerance)
    expect(px(0, 0)).toEqual([255, 255, 255]);
    expect(px(200, 200)).toEqual([255, 255, 255]);
    // and the write-back covered the whole backing bitmap, not a quadrant
    expect(putCalls).toEqual([{ w: width, h: height, x: 0, y: 0 }]);
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a data URL into a typed Blob without fetch', () => {
    const blob = dataUrlToBlob('data:image/png;base64,aGVsbG8='); // "hello"
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(5);
  });
});
