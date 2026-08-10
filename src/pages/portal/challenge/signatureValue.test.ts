import { describe, expect, it } from 'vitest';

import {
  decodeDrawnSignature,
  encodeDrawnSignature,
  isDrawnSignature,
  isMeaningfulSignature,
  type SignatureStroke,
} from './signatureValue';

describe('drawn signature encoding', () => {
  it('round-trips strokes within the existing 120-character API limit', () => {
    const strokes: SignatureStroke[] = [
      Array.from({ length: 80 }, (_, index) => [index / 79, 0.5 + Math.sin(index / 5) * 0.2]),
      [
        [0.25, 0.7],
        [0.75, 0.72],
      ],
    ];

    const encoded = encodeDrawnSignature(strokes);

    expect(encoded).toMatch(/^drawn:v1:/);
    expect(encoded.length).toBeLessThanOrEqual(120);
    expect(decodeDrawnSignature(encoded)).not.toBeNull();
    expect(isDrawnSignature(encoded)).toBe(true);
  });

  it('rejects a tap or tiny accidental mark as a signature', () => {
    expect(isMeaningfulSignature([[[0.5, 0.5]]])).toBe(false);
    expect(
      isMeaningfulSignature([
        [
          [0.5, 0.5],
          [0.51, 0.51],
          [0.52, 0.5],
        ],
      ]),
    ).toBe(false);
  });

  it('fails closed for malformed encoded values', () => {
    expect(decodeDrawnSignature('drawn:v1:not-valid')).toBeNull();
    expect(isDrawnSignature('Mary Chen')).toBe(false);
  });
});
