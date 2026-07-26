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
  /**
   * Export what the kid made (base + ops on a TRANSPARENT ground; NO ghost —
   * D-ISF-7). `ground: 'white'` is for model-bound snapshots only.
   */
  exportPng(scale?: number, ground?: 'transparent' | 'white'): string;
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
  /** Mission template underlay (D-IS-22) — slightly stronger than the ghost. */
  templateUrl: string | null;
  /** Whether exportPng includes the base image (D-IS-22 magic flag). */
  exportIncludesBase: boolean;
  /** Hold-to-compare: when true, only white + base sketch shows (no ops hidden — ops ARE the kid's). */
  compareUrl: string | null;
  /** Magic-brush mode (D-IS-18 ④): strokes go to maskOps and render as a pink highlight. */
  maskMode: boolean;
  maskOps: CanvasOp[];
  onMaskOpsChange(ops: CanvasOp[]): void;
}

const LAZY_RADIUS = 14;

export const ArtCanvas = forwardRef<ArtCanvasHandle, ArtCanvasProps>(function ArtCanvas(
  {
    ops,
    onOpsChange,
    tool,
    color,
    brushSize,
    stampEmoji,
    baseImageUrl,
    ghostUrl,
    templateUrl,
    exportIncludesBase,
    compareUrl,
    maskMode,
    maskOps,
    onMaskOpsChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [ghostImage, setGhostImage] = useState<HTMLImageElement | null>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
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
  useEffect(() => loadImage(templateUrl, setTemplateImage), [templateUrl]);
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
    // TRANSPARENT ground (D-ISF-7): the bitmap holds only what the kid made —
    // the Photoshop-style checkerboard behind it is CSS on the element, so the
    // eraser reveals transparency and every export keeps its alpha.
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (compareImage) {
      // Hold-to-compare (D-IS-19): show the kid's original sketch take.
      ctx.drawImage(compareImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return;
    }

    if (baseImage) ctx.drawImage(baseImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (templateImage) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(templateImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.restore();
    }
    if (ghostImage) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.drawImage(ghostImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.restore();
    }
    const live = liveStroke.current;
    const liveOp: CanvasOp | null = live
      ? { kind: 'stroke', tool: tool as BrushTool, color, size: brushSize, points: live }
      : null;
    renderOps(ctx, liveOp && !maskMode ? [...ops, liveOp] : ops);
    // Magic-brush highlight (never part of the picture): pink glow over the
    // region the kid wants changed.
    const maskAll = liveOp && maskMode ? [...maskOps, liveOp] : maskOps;
    if (maskAll.length) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      renderOps(
        ctx,
        maskAll.map((m) =>
          m.kind === 'stroke' ? { ...m, tool: 'marker', color: '#f277c3' } : m,
        ),
      );
      ctx.restore();
    }
  }, [ops, maskOps, maskMode, baseImage, ghostImage, templateImage, compareImage, tool, color, brushSize]);

  // rAF repaints ALWAYS run the latest draw (D-ISF-1). A frame scheduled by the
  // last pointermove used to capture that render's `draw` closure; firing after
  // endStroke committed the ops it repainted the OLD (often empty) list — the
  // just-finished stroke visually vanished. The ref makes a pending frame
  // harmless: it repaints identical, current state.
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

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
      drawRef.current();
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (compareUrl) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const [x, y] = toLogical(e);
    if (!maskMode && tool === 'stamp') {
      onOpsChange([...ops, { kind: 'stamp', emoji: stampEmoji, x, y, size: brushSize * 8 }]);
      return;
    }
    if (!maskMode && tool === 'fill') {
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
    // A tap is a dot (D-ISF-2): a single-point stroke commits too —
    // perfect-freehand renders the one-point outline as a dab.
    if (live && live.length > 0) {
      const op: CanvasOp = {
        kind: 'stroke',
        tool: maskMode ? 'marker' : (tool as BrushTool),
        color,
        size: maskMode ? Math.max(brushSize, 20) : brushSize,
        points: live,
      };
      if (maskMode) onMaskOpsChange([...maskOps, op]);
      else onOpsChange([...ops, op]);
    } else {
      scheduleDraw();
    }
  };

  useImperativeHandle(ref, () => ({
    exportPng: (scale = 1, ground = 'transparent') =>
      exportPng(ops, baseImage, scale, exportIncludesBase, ground),
  }));

  return (
    <canvas
      ref={canvasRef}
      data-testid="art-canvas"
      // Photoshop-style transparency checkerboard (D-ISF-7) — design-token
      // greys via theme(), rendered by CSS UNDER the transparent bitmap.
      className="w-full h-full max-h-full max-w-full rounded-2xl touch-none select-none shadow-inner bg-[length:16px_16px] bg-[repeating-conic-gradient(theme(colors.hairline.DEFAULT)_0%_25%,theme(colors.canvas.pure)_0%_50%)]"
      style={{ aspectRatio: '1 / 1', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    />
  );
});
