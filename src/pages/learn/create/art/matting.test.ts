// D-ISF-6 matting core (pure buffer, no canvas): the white PAPER around a
// drawing goes transparent; white INSIDE the drawing (an eye highlight)
// survives because it is not connected to the border.

import { describe, expect, it } from 'vitest';

import { eraseEdgeConnectedWhite } from './matting';

// 6×6: white everywhere, a red ring at (1..4,1..4) with a white pixel enclosed
// at (2,2) and a red fill elsewhere inside the ring.
function makeBuffer(): { data: Uint8ClampedArray; w: number; h: number } {
  const w = 6;
  const h = 6;
  const data = new Uint8ClampedArray(w * h * 4).fill(255); // opaque white
  const setRed = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    data[i] = 220;
    data[i + 1] = 40;
    data[i + 2] = 40;
  };
  for (let x = 1; x <= 4; x++) {
    for (let y = 1; y <= 4; y++) setRed(x, y);
  }
  // enclosed white highlight inside the red block
  const hi = (2 * w + 2) * 4;
  data[hi] = 255;
  data[hi + 1] = 255;
  data[hi + 2] = 255;
  return { data, w, h };
}

const alpha = (data: Uint8ClampedArray, w: number, x: number, y: number) =>
  data[(y * w + x) * 4 + 3];

describe('eraseEdgeConnectedWhite', () => {
  it('erases the edge-connected white ground but keeps enclosed white and the subject', () => {
    const { data, w, h } = makeBuffer();
    const erased = eraseEdgeConnectedWhite(data, w, h);

    // the border paper is gone…
    expect(alpha(data, w, 0, 0)).toBe(0);
    expect(alpha(data, w, 5, 5)).toBe(0);
    expect(alpha(data, w, 3, 0)).toBe(0);
    // …the subject is untouched…
    expect(alpha(data, w, 1, 1)).toBe(255);
    expect(alpha(data, w, 4, 4)).toBe(255);
    // …and the ENCLOSED white highlight survives (not border-connected)
    expect(alpha(data, w, 2, 2)).toBe(255);
    // exactly the 20 border-ring pixels of the 6×6 went transparent
    expect(erased).toBe(20);
  });

  it('near-white (off-white paper) counts as ground within the tolerance', () => {
    const w = 3;
    const h = 1;
    // [off-white 240] [red] [pure white]
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    data[0] = 240;
    data[1] = 240;
    data[2] = 240;
    data[4] = 200;
    data[5] = 30;
    data[6] = 30;
    eraseEdgeConnectedWhite(data, w, h);
    expect(alpha(data, w, 0, 0)).toBe(0); // off-white erased
    expect(alpha(data, w, 1, 0)).toBe(255); // red kept
    expect(alpha(data, w, 2, 0)).toBe(0); // pure white erased
  });

  it('an image with no white border erases nothing', () => {
    const w = 2;
    const h = 2;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 10;
      data[i + 1] = 20;
      data[i + 2] = 30;
      data[i + 3] = 255;
    }
    expect(eraseEdgeConnectedWhite(data, w, h)).toBe(0);
    expect(alpha(data, w, 0, 0)).toBe(255);
  });
});
