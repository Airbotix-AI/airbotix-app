// A full-screen image viewer overlay (lightbox) with zoom + pan, shared by every
// Asset Viewer image preview (My assets / Library / Class). Opens over everything,
// closes on the ✕ / backdrop / Esc. Zoom via the +/− buttons, the mouse wheel, or
// the +/− keys; drag to pan once zoomed in. Display-only — never writes the VFS,
// never reaches the sandboxed game (it's chrome around the existing preview).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const STEP = 0.5;

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + STEP)), []);
  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);
  const zoomOut = useCallback(
    () =>
      setZoom((z) => {
        const next = clampZoom(z - STEP);
        if (next === 1) setPan({ x: 0, y: 0 }); // re-center when fully zoomed out
        return next;
      }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') zoomIn();
      else if (e.key === '-' || e.key === '_') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomIn, zoomOut]);

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? STEP : -STEP)));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  };
  const endDrag = () => {
    drag.current = null;
  };

  // Portal to <body>: the playground's react-rnd window sets a CSS `transform`,
  // which would otherwise make this `position: fixed` overlay relative to that
  // window (not the viewport), so it wouldn't truly cover the full screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      data-testid="image-lightbox"
      onClick={onClose}
      // black backdrop is an allowed constant for the game-stage / overlays.
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
    >
      <div
        className="absolute right-3 top-3 z-10 flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <ToolBtn onClick={zoomOut} disabled={zoom <= MIN_ZOOM} label="Zoom out">
          <Minus size={18} />
        </ToolBtn>
        <span className="min-w-[3.5rem] text-center text-[13px] font-bold tabular-nums text-white">
          {Math.round(zoom * 100)}%
        </span>
        <ToolBtn onClick={zoomIn} disabled={zoom >= MAX_ZOOM} label="Zoom in">
          <Plus size={18} />
        </ToolBtn>
        <ToolBtn onClick={reset} disabled={zoom === 1 && pan.x === 0 && pan.y === 0} label="Reset zoom">
          <RotateCcw size={17} />
        </ToolBtn>
        <ToolBtn onClick={onClose} label="Close" testid="image-lightbox-close">
          <X size={18} />
        </ToolBtn>
      </div>

      <img
        src={src}
        alt={alt ?? ''}
        draggable={false}
        data-testid="image-lightbox-img"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          cursor: zoom > 1 ? (drag.current ? 'grabbing' : 'grab') : 'auto',
        }}
        className="max-h-[88vh] max-w-[92vw] touch-none select-none object-contain"
      />
    </div>,
    document.body,
  );
}

function ToolBtn({
  onClick,
  disabled,
  label,
  testid,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  testid?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid={testid}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** A small "enlarge to full screen" affordance to sit over an image preview. */
export function EnlargeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Enlarge image"
      title="Enlarge"
      data-testid="asset-enlarge"
      className="inline-flex items-center gap-1.5 rounded-lg border border-pg-border bg-pg-surface/90 px-2.5 py-1 text-[12px] font-bold text-pg-text-dim shadow-sm hover:text-pg-text"
    >
      <Maximize2 size={14} /> Enlarge
    </button>
  );
}
