// White-background matting for the art→game hand-off (D-ISF-6,
// art-studio-canvas-and-intent-fix-prd v0.3). Art Studio pictures are OPAQUE
// by design (white canvas ground; gpt-image-2 rejects transparency — parent
// PRD v0.5), so a take sent into a game arrived with a white box around it.
// This erases the near-white region CONNECTED TO THE EDGES only — a white eye
// highlight inside a character survives, the paper around it goes transparent.

/** RGB distance from pure white a pixel may have and still count as ground. */
export const MATTING_TOLERANCE = 40;

/**
 * Erase (alpha=0) every near-white pixel connected to the image border.
 * Operates on a raw RGBA buffer in place (pure — unit-testable, same pattern
 * as strokeEngine.floodFill). Returns the number of pixels erased.
 */
export function eraseEdgeConnectedWhite(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = MATTING_TOLERANCE,
): number {
  const isGround = (i: number) =>
    data[i + 3] !== 0 &&
    255 - data[i] <= tolerance &&
    255 - data[i + 1] <= tolerance &&
    255 - data[i + 2] <= tolerance;

  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const flat = y * width + x;
    if (seen[flat]) return;
    seen[flat] = 1;
    if (isGround(flat * 4)) stack.push(x, y);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let erased = 0;
  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    data[(y * width + x) * 4 + 3] = 0;
    erased++;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  return erased;
}

/**
 * Decode an image blob, erase its edge-connected white ground, re-encode as
 * PNG (the format game sprites need for transparency). Browser-only wrapper
 * around the pure core above.
 */
export async function removeWhiteBackground(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  eraseEdgeConnectedWhite(image.data, canvas.width, canvas.height);
  ctx.putImageData(image, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (out) => (out ? resolve(out) : reject(new Error('canvas toBlob failed'))),
      'image/png',
    );
  });
}
