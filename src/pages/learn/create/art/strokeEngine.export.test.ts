// @vitest-environment jsdom

// Export contracts (D-IS-18/19/22): exportPng is "what the kid made" — white
// ground + optional base + ops (the ghost is guidance and never part of the
// call); the `includeBase` flag is the Mission `strokes-only` magic contract.
// exportMask is the gpt-image edits mask: opaque black, TRANSPARENT where the
// kid painted. jsdom has no canvas 2D, so a recording fake context is stubbed.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exportMask, exportPng, type CanvasOp, type StrokeOp } from './strokeEngine';

const stroke: StrokeOp = {
  kind: 'stroke',
  tool: 'pencil',
  color: '#1f2437',
  size: 14,
  points: [
    [100, 100, 0.5],
    [200, 140, 0.5],
  ],
};

interface FakeCtx {
  fillStyle: string;
  globalAlpha: number;
  globalCompositeOperation: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  putImageData: ReturnType<typeof vi.fn>;
  canvas: { width: number; height: number };
}

function makeFakeCtx(): FakeCtx {
  const ctx: FakeCtx = {
    fillStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
    putImageData: vi.fn(),
    canvas: { width: 0, height: 0 },
  };
  return ctx;
}

describe('exportPng / exportMask (fake 2D context)', () => {
  let ctx: FakeCtx;

  beforeEach(() => {
    ctx = makeFakeCtx();
    HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
      ctx.canvas = { width: this.width, height: this.height };
      return ctx;
    }) as never;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,RkFLRQ==');
    // jsdom has no Path2D — the outline path is opaque to these assertions.
    vi.stubGlobal(
      'Path2D',
      class {
        moveTo() {}
        lineTo() {}
        closePath() {}
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const baseImage = { width: 1024, height: 1024 } as HTMLImageElement;

  it('exports on a TRANSPARENT ground by default (D-ISF-7 — Photoshop-style alpha)', () => {
    const url = exportPng([stroke], baseImage, 1, true);
    expect(url).toBe('data:image/png;base64,RkFLRQ==');
    // NO ground fill — unpainted pixels keep their alpha
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(baseImage, 0, 0, 1024, 1024);
    expect(ctx.fill).toHaveBeenCalled(); // the stroke outline
  });

  it("ground='white' composites paper ONLY for model-bound snapshots", () => {
    exportPng([], null, 1, true, 'white'); // no ops → fillStyle stays the ground's
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
  });

  it('excludes the base when includeBase=false (Mission strokes-only magic, D-IS-22)', () => {
    exportPng([stroke], baseImage, 1, false);
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled(); // the kid's strokes still export
  });

  it('scales the export surface via the scale parameter', () => {
    exportPng([stroke], null, 0.5, true, 'white');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(ctx.scale).toHaveBeenCalledWith(0.5, 0.5);
  });

  it('exportMask punches TRANSPARENT holes through opaque black (gpt-image edits contract)', () => {
    exportMask([stroke]);
    // opaque black ground first…
    expect(ctx.fillStyle).toBe('#000000');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
    // …then the painted region is ERASED (destination-out), not painted over
    expect(ctx.globalCompositeOperation).toBe('destination-out');
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it('exportMask ignores non-stroke ops (stamps/fills cannot punch the mask)', () => {
    const stamp: CanvasOp = { kind: 'stamp', emoji: '⭐', x: 10, y: 10, size: 40 };
    exportMask([stamp]);
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});
