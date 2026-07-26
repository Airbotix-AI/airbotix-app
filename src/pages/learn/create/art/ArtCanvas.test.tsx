// @vitest-environment jsdom

// ArtCanvas pointer pipeline (D-ISF-1/2, art-studio-canvas-and-intent-fix-prd):
// the vanishing-stroke regression. jsdom has no canvas 2D, so getContext is
// stubbed with a recording fake and renderOps is spied — what matters here is
// WHICH ops each repaint received, not the pixels.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

vi.mock('./strokeEngine', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  return {
    ...real,
    renderOps: vi.fn(),
    exportPng: vi.fn(() => 'data:image/png;base64,QQ=='),
  };
});

import { ArtCanvas } from './ArtCanvas';
import { renderOps, type CanvasOp, type StrokeOp } from './strokeEngine';

const renderOpsMock = vi.mocked(renderOps);

/** Host owning the ops state exactly like ArtStudioPage does. */
function Host({ onCommit }: { onCommit?: (ops: CanvasOp[]) => void }) {
  const [ops, setOps] = useState<CanvasOp[]>([]);
  return (
    <ArtCanvas
      ops={ops}
      onOpsChange={(next) => {
        setOps(next);
        onCommit?.(next);
      }}
      tool="pencil"
      color="#1f2437"
      brushSize={14}
      stampEmoji="⭐"
      baseImageUrl={null}
      ghostUrl={null}
      templateUrl={null}
      exportIncludesBase
      compareUrl={null}
      maskMode={false}
      maskOps={[]}
      onMaskOpsChange={() => undefined}
    />
  );
}

describe('ArtCanvas pointer pipeline', () => {
  const rafQueue: FrameRequestCallback[] = [];

  beforeEach(() => {
    renderOpsMock.mockClear();
    rafQueue.length = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    // jsdom implements neither canvas 2D nor pointer capture.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const fakeCtx = {
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  };

  function canvas(): HTMLCanvasElement {
    const el = screen.getByTestId('art-canvas') as HTMLCanvasElement;
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1024, height: 1024, right: 1024, bottom: 1024, x: 0, y: 0 }) as DOMRect;
    return el;
  }

  const flushFrames = () => {
    const pending = [...rafQueue];
    rafQueue.length = 0;
    for (const cb of pending) cb(0);
  };

  // D-ISF-1 regression: a frame scheduled by the LAST pointermove used to fire
  // after endStroke committed the ops — with the closure of the previous render
  // (empty ops, live stroke cleared) — repainting the canvas WITHOUT the stroke
  // the kid just finished. The stale frame must repaint current state.
  it('a pending animation frame firing after pen-up still paints the committed stroke', () => {
    render(<Host />);
    const el = canvas();
    flushFrames(); // settle the mount repaint

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(el, { clientX: 200, clientY: 220 });
    expect(rafQueue.length).toBe(1); // the stroke's repaint is pending
    fireEvent.pointerUp(el, { clientX: 200, clientY: 220 });

    flushFrames(); // the stale frame fires AFTER the commit
    const lastOps = renderOpsMock.mock.calls.at(-1)?.[1] as CanvasOp[];
    expect(lastOps).toHaveLength(1);
    expect((lastOps[0] as StrokeOp).points.length).toBeGreaterThan(1);
    // TRANSPARENT ground (D-ISF-7): repaints clear the bitmap, never fill white
    expect(fakeCtx.clearRect).toHaveBeenCalled();
    expect(fakeCtx.fillRect).not.toHaveBeenCalled();
  });

  // D-ISF-2: a tap (no pointermove) commits a single-point dot instead of
  // being silently discarded.
  it('a tap with no movement commits a one-point stroke (a dot)', () => {
    const commits: CanvasOp[][] = [];
    render(<Host onCommit={(ops) => commits.push(ops)} />);
    const el = canvas();

    fireEvent.pointerDown(el, { clientX: 300, clientY: 300 });
    fireEvent.pointerUp(el, { clientX: 300, clientY: 300 });

    expect(commits).toHaveLength(1);
    const op = commits[0][0] as StrokeOp;
    expect(op.kind).toBe('stroke');
    expect(op.points).toHaveLength(1);
  });

  it('cancels a pending frame on unmount', () => {
    const { unmount } = render(<Host />);
    const el = canvas();
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(el, { clientX: 40, clientY: 40 });
    expect(rafQueue.length).toBe(1);
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
