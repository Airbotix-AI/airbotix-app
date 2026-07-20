// Art Studio canvas engine (image-studio-prd.md D-IS-17): a STROKE-LIST core.
// Ops are plain data — that one decision buys undo/redo, take-branching at
// stroke granularity, export at any resolution for the magic pipeline, and
// deterministic tests. Feel is outsourced to perfect-freehand (pressure ink);
// smoothing to lazy-brush in ArtCanvas.

import { getStroke } from 'perfect-freehand';

export const CANVAS_SIZE = 1024; // logical px, square (P1 — size presets at magic time later)

export type BrushTool = 'pencil' | 'crayon' | 'marker' | 'eraser';
export type ToolId = BrushTool | 'fill' | 'stamp';

/** [x, y, pressure] in logical canvas coordinates. */
export type StrokePoint = [number, number, number];

export interface StrokeOp {
  kind: 'stroke';
  tool: BrushTool;
  color: string;
  size: number;
  points: StrokePoint[];
}
export interface StampOp {
  kind: 'stamp';
  emoji: string;
  x: number;
  y: number;
  size: number;
}
export interface FillOp {
  kind: 'fill';
  color: string;
  x: number;
  y: number;
}
export type CanvasOp = StrokeOp | StampOp | FillOp;

// Per-tool feel (tuned on a real iPad before ship — D-IS-17).
const BRUSH_PROFILE: Record<BrushTool, { thinning: number; alpha: number; mult: number }> = {
  pencil: { thinning: 0.6, alpha: 1, mult: 1 },
  crayon: { thinning: 0.3, alpha: 0.85, mult: 1.6 },
  marker: { thinning: 0.05, alpha: 0.55, mult: 2.4 },
  eraser: { thinning: 0.1, alpha: 1, mult: 3 },
};

/** perfect-freehand outline polygon for a stroke (pure — unit-testable). */
export function strokeOutline(op: StrokeOp): number[][] {
  const profile = BRUSH_PROFILE[op.tool];
  return getStroke(op.points, {
    size: op.size * profile.mult,
    thinning: profile.thinning,
    smoothing: 0.6,
    streamline: 0.5,
    // Mouse/touch report a constant 0.5 → let perfect-freehand fake pressure
    // from velocity; a real pencil's varying pressure is used as-is.
    simulatePressure: op.points.every((p) => p[2] === 0.5),
  });
}

function outlinePath(outline: number[][]): Path2D {
  const path = new Path2D();
  if (!outline.length) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (const [x, y] of outline.slice(1)) path.lineTo(x, y);
  path.closePath();
  return path;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    255,
  ];
}

/**
 * Scanline flood fill over a raw RGBA pixel buffer (pure — unit-testable).
 * Tolerance is generous: kid outlines are wobbly, the paint should still pour.
 */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillColor: string,
  tolerance = 48,
): void {
  const sx = Math.round(startX);
  const sy = Math.round(startY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;
  const idx = (x: number, y: number) => (y * width + x) * 4;
  const start = idx(sx, sy);
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const [fr, fg, fb, fa] = hexToRgba(fillColor);
  if (
    Math.abs(target[0] - fr) <= 2 &&
    Math.abs(target[1] - fg) <= 2 &&
    Math.abs(target[2] - fb) <= 2
  ) {
    return; // already that color
  }
  const matches = (i: number) =>
    Math.abs(data[i] - target[0]) <= tolerance &&
    Math.abs(data[i + 1] - target[1]) <= tolerance &&
    Math.abs(data[i + 2] - target[2]) <= tolerance &&
    Math.abs(data[i + 3] - target[3]) <= tolerance;
  const paint = (i: number) => {
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = fa;
  };
  const stack: number[] = [sx, sy];
  const seen = new Uint8Array(width * height);
  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const flat = y * width + x;
    if (seen[flat]) continue;
    seen[flat] = 1;
    const i = idx(x, y);
    if (!matches(i)) continue;
    paint(i);
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
}

/**
 * Replay ops onto a 2D context (logical coordinates — caller scales for DPR).
 * Order is the op list order; the eraser erases whatever came before it.
 */
export function renderOps(ctx: CanvasRenderingContext2D, ops: CanvasOp[]): void {
  for (const op of ops) {
    if (op.kind === 'stroke') {
      ctx.save();
      const profile = BRUSH_PROFILE[op.tool];
      if (op.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.globalAlpha = profile.alpha;
      ctx.fillStyle = op.color;
      ctx.fill(outlinePath(strokeOutline(op)));
      ctx.restore();
    } else if (op.kind === 'stamp') {
      ctx.save();
      ctx.font = `${op.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(op.emoji, op.x, op.y);
      ctx.restore();
    } else {
      const image = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      floodFill(image.data, CANVAS_SIZE, CANVAS_SIZE, op.x, op.y, op.color);
      ctx.putImageData(image, 0, 0);
    }
  }
}

/** data: URL → Blob without fetch (jsdom-safe, no network semantics). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Export the magic-brush MASK (D-IS-18 ④): opaque black everywhere, TRANSPARENT
 * where the kid painted the highlight — the gpt-image edits contract.
 */
export function exportMask(maskOps: CanvasOp[], scale = 1): string {
  const size = Math.round(CANVAS_SIZE * scale);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  ctx.scale(scale, scale);
  ctx.globalCompositeOperation = 'destination-out';
  for (const op of maskOps) {
    if (op.kind !== 'stroke') continue;
    ctx.fill(
      // Wide, fully-opaque punch-through regardless of the op's tool profile.
      new Path2D(
        strokeOutline({ ...op, tool: 'eraser' })
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`)
          .join(' ') + ' Z',
      ),
    );
  }
  return canvas.toDataURL('image/png');
}

/**
 * Export the picture the kid actually made: white ground + base take (if any)
 * + the kid's ops. The ghost underlay is GUIDANCE, not content — deliberately
 * excluded (D-IS-18 ①: AI output stays subordinate).
 */
export function exportPng(
  ops: CanvasOp[],
  baseImage: HTMLImageElement | null,
  scale = 1,
  includeBase = true,
): string {
  const size = Math.round(CANVAS_SIZE * scale);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.scale(scale, scale);
  if (baseImage && includeBase) ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  renderOps(ctx, ops);
  return canvas.toDataURL('image/png');
}
