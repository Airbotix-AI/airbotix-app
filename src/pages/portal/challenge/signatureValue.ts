export type SignaturePoint = readonly [x: number, y: number];
export type SignatureStroke = readonly SignaturePoint[];

const DRAWN_SIGNATURE_PREFIX = 'drawn:v1:';
const MAX_STROKES = 8;
const MAX_POINTS = 35;

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value * 255)));

function sampleStroke(stroke: SignatureStroke, count: number): SignatureStroke {
  if (stroke.length <= count) return stroke;
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.round((index * (stroke.length - 1)) / (count - 1));
    return stroke[sourceIndex];
  });
}

function compactStrokes(strokes: readonly SignatureStroke[]): SignatureStroke[] {
  const drawable = strokes.filter((stroke) => stroke.length >= 2).slice(0, MAX_STROKES);
  if (drawable.length === 0) return [];

  const available = Math.max(2 * drawable.length, MAX_POINTS);
  const total = drawable.reduce((sum, stroke) => sum + stroke.length, 0);
  const quotas = drawable.map((stroke) =>
    Math.max(2, Math.min(stroke.length, Math.floor((stroke.length / total) * available))),
  );

  while (quotas.reduce((sum, quota) => sum + quota, 0) > MAX_POINTS) {
    const index = quotas.reduce(
      (largest, quota, candidate) => (quota > quotas[largest] ? candidate : largest),
      0,
    );
    if (quotas[index] <= 2) break;
    quotas[index] -= 1;
  }

  while (quotas.reduce((sum, quota) => sum + quota, 0) < Math.min(total, MAX_POINTS)) {
    const index = quotas.findIndex((quota, candidate) => quota < drawable[candidate].length);
    if (index < 0) break;
    quotas[index] += 1;
  }

  return drawable.map((stroke, index) => sampleStroke(stroke, quotas[index]));
}

function toBase64Url(bytes: readonly number[]): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

/** A compact, non-image representation that stays inside the existing 120-char API contract. */
export function encodeDrawnSignature(strokes: readonly SignatureStroke[]): string {
  const compact = compactStrokes(strokes);
  if (compact.length === 0) return '';

  const bytes = [compact.length];
  for (const stroke of compact) {
    bytes.push(stroke.length);
    for (const [x, y] of stroke) bytes.push(clampByte(x), clampByte(y));
  }
  return `${DRAWN_SIGNATURE_PREFIX}${toBase64Url(bytes)}`;
}

export function decodeDrawnSignature(value: string): SignatureStroke[] | null {
  if (!value.startsWith(DRAWN_SIGNATURE_PREFIX)) return null;
  const bytes = fromBase64Url(value.slice(DRAWN_SIGNATURE_PREFIX.length));
  if (!bytes || bytes.length < 6) return null;

  const strokeCount = bytes[0];
  if (strokeCount < 1 || strokeCount > MAX_STROKES) return null;
  const strokes: SignatureStroke[] = [];
  let offset = 1;
  for (let strokeIndex = 0; strokeIndex < strokeCount; strokeIndex += 1) {
    const pointCount = bytes[offset];
    offset += 1;
    if (pointCount < 2 || offset + pointCount * 2 > bytes.length) return null;
    const stroke: SignaturePoint[] = [];
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      stroke.push([bytes[offset] / 255, bytes[offset + 1] / 255]);
      offset += 2;
    }
    strokes.push(stroke);
  }
  return offset === bytes.length ? strokes : null;
}

export function isMeaningfulSignature(strokes: readonly SignatureStroke[]): boolean {
  let distance = 0;
  let points = 0;
  for (const stroke of strokes) {
    points += stroke.length;
    for (let index = 1; index < stroke.length; index += 1) {
      distance += Math.hypot(
        stroke[index][0] - stroke[index - 1][0],
        stroke[index][1] - stroke[index - 1][1],
      );
    }
  }
  return points >= 3 && distance >= 0.08;
}

export function isDrawnSignature(value: string): boolean {
  const strokes = decodeDrawnSignature(value);
  return strokes !== null && isMeaningfulSignature(strokes);
}
