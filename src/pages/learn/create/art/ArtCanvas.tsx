import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { LazyBrush } from 'lazy-brush';

import {
  CANVAS_SIZE,
  exportPng,
  renderOps,
  type BrushTool,
  type CanvasOp,
  type StrokePoint,
  type ToolId,
} from './strokeEngine';

// The drawing surface (D-IS-17/19). Pointer events carry Apple Pencil pressure
// natively in iPad Safari; lazy-brush smooths shaky little hands; coalesced
// events keep fast strokes dense. Rendering replays the op list every frame a
// stroke grows — plain, predictable, fast enough at 1024².

export interface ArtCanvasHandle {
  /** Export what the kid made (white ground + base + ops; NO ghost). */
  exportPng(scale?: number): string;
}

interface ArtCanvasProps {
  ops: CanvasOp[];
  onOpsChange(ops: CanvasOp[]): void;
  tool: ToolId;
  color: string;
  brushSize: number;
  stampEmoji: string;
  /** The active take rendered UNDER the kid's strokes (magic result to paint over). */
  baseImageUrl: string | null;
  /** Faint AI trace-me underlay (D-IS-18 ①) — guidance, never exported. */
  ghostUrl: string | null;
  /** Hold-to-compare: when true, only white + base sketch shows (no ops hidden — ops ARE the kid's). */
  compareUrl: string | null;
}

const LAZY_RADIUS = 14;

export const ArtCanvas = forwardRef<ArtCanvasHandle, ArtCanvasProps>(function ArtCanvas(
  { ops, onOpsChange, tool, color, brushSize, stampEmoji, baseImageUrl, ghostUrl, compareUrl },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [ghostImage, setGhostImage] = useState<HTMLImageElement | null>(null);
  const [compareImage, setCompareImage] = useState<HTMLImageElement | null>(null);
  const liveStroke = useRef<StrokePoint[] | null>(null);
  const lazy = useRef(new LazyBrush({ radius: LAZY_RADIUS, enabled: true }));
  const frame = useRef<number | null>(null);

  const loadImage = (url: string | null, set: (img: HTMLImageElement | null) => void) => {
    if (!url) {
      set(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => set(img);
    img.onerror = () => set(null);
    img.src = url;
  };
  useEffect(() => loadImage(baseImageUrl, setBaseImage), [baseImageUrl]);
  useEffect(() => loadImage(ghostUrl, setGhostImage), [ghostUrl]);
  useEffect(() => loadImage(compareUrl, setCompareImage), [compareUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== CANVAS_SIZE * dpr) {
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (compareImage) {
      // Hold-to-compare (D-IS-19): show the kid's original sketch take.
      ctx.drawImage(compareImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return;
    }

    if (baseImage) ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (ghostImage) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.drawImage(ghostImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.restore();
    }
    const live = liveStroke.current;
    const all: CanvasOp[] = live
      ? [
          ...ops,
          {
            kind: 'stroke',
            tool: tool as BrushTool,
            color,
            size: brushSize,
            points: live,
          },
        ]
      : ops;
    renderOps(ctx, all);
  }, [ops, baseImage, ghostImage, compareImage, tool, color, brushSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  const toLogical = (e: React.PointerEvent): [number, number] => {
    const rect = (canvasRef.current as HTMLCanvasElement).getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    ];
  };

  const scheduleDraw = () => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      draw();
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (compareUrl) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const [x, y] = toLogical(e);
    if (tool === 'stamp') {
      onOpsChange([...ops, { kind: 'stamp', emoji: stampEmoji, x, y, size: brushSize * 8 }]);
      return;
    }
    if (tool === 'fill') {
      onOpsChange([...ops, { kind: 'fill', color, x, y }]);
      return;
    }
    lazy.current.update({ x, y }, { both: true });
    liveStroke.current = [[x, y, e.pressure || 0.5]];
    scheduleDraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!liveStroke.current) return;
    const events =
      'getCoalescedEvents' in e.nativeEvent
        ? (e.nativeEvent as PointerEvent).getCoalescedEvents()
        : [e.nativeEvent as PointerEvent];
    const rect = (canvasRef.current as HTMLCanvasElement).getBoundingClientRect();
    for (const ev of events) {
      const x = ((ev.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const y = ((ev.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      lazy.current.update({ x, y });
      const b = lazy.current.getBrushCoordinates();
      liveStroke.current.push([b.x, b.y, ev.pressure || 0.5]);
    }
    scheduleDraw();
  };

  const endStroke = () => {
    const live = liveStroke.current;
    liveStroke.current = null;
    if (live && live.length > 1) {
      onOpsChange([
        ...ops,
        { kind: 'stroke', tool: tool as BrushTool, color, size: brushSize, points: live },
      ]);
    } else {
      scheduleDraw();
    }
  };

  useImperativeHandle(ref, () => ({
    exportPng: (scale = 1) => exportPng(ops, baseImage, scale),
  }));

  return (
    <canvas
      ref={canvasRef}
      data-testid="art-canvas"
      className="w-full h-full max-h-full max-w-full rounded-2xl bg-white touch-none select-none shadow-inner"
      style={{ aspectRatio: '1 / 1', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    />
  );
});
