// Reusable floating-window chrome for the playground virtual desktop (C2.4).
// Wraps arbitrary content in a draggable/resizable <Rnd> with a custom titlebar
// (minimize / maximize / close) and a per-window drag overlay so dragging across
// an iframe child (the game) doesn't stall. See virtual-desktop-design.md §4 + §10 #2.

import { Rnd } from 'react-rnd';
import { useWindowStore, type WindowId } from './windowStore';

// Vertical allowance for the (later) taskbar when a window is maximized.
const TASKBAR_ALLOWANCE_PX = 48;

interface WindowProps {
  id: WindowId;
  title: string;
  icon: string;
  children: React.ReactNode;
}

export function Window({ id, title, icon, children }: WindowProps) {
  const state = useWindowStore((s) => s.windows[id]);
  const focus = useWindowStore((s) => s.focus);
  const close = useWindowStore((s) => s.close);
  const minimize = useWindowStore((s) => s.minimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const setRect = useWindowStore((s) => s.setRect);
  // Shared flag: true while ANY window is being dragged/resized, so every window
  // covers its body — dragging one window across another's iframe works (§10 #2).
  const anyInteracting = useWindowStore((s) => s.interacting);
  const setAnyInteracting = useWindowStore((s) => s.setInteracting);

  if (!state.open || state.minimized) return null;

  const { maximized, zIndex, rect } = state;

  // Maximized: fill the parent desktop minus a taskbar strip; drag/resize off.
  const size = maximized
    ? { width: '100%', height: `calc(100% - ${TASKBAR_ALLOWANCE_PX}px)` }
    : { width: rect.w, height: rect.h };
  const position = maximized ? { x: 0, y: 0 } : { x: rect.x, y: rect.y };

  return (
    <Rnd
      size={size}
      position={position}
      dragHandleClassName="pg-titlebar"
      bounds="parent"
      minWidth={320}
      minHeight={240}
      disableDragging={maximized}
      enableResizing={!maximized}
      style={{ zIndex }}
      onMouseDown={() => focus(id)}
      onDragStart={() => setAnyInteracting(true)}
      onResizeStart={() => setAnyInteracting(true)}
      onDragStop={(_e, d) => {
        setAnyInteracting(false);
        setRect(id, { ...rect, x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        setAnyInteracting(false);
        setRect(id, { x: pos.x, y: pos.y, w: ref.offsetWidth, h: ref.offsetHeight });
      }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-canvas-pure shadow-card-soft">
        {/* Titlebar — the only drag handle (pg-titlebar). */}
        <div className="pg-titlebar flex shrink-0 cursor-move items-center justify-between gap-2 border-b border-hairline bg-surface px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-base" aria-hidden="true">
              {icon}
            </span>
            <span className="truncate text-sm font-semibold text-ink">{title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => minimize(id)}
              aria-label={`Minimize ${title}`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate2 hover:bg-canvas hover:text-ink"
            >
              <span aria-hidden="true">—</span>
            </button>
            <button
              type="button"
              onClick={() => toggleMaximize(id)}
              aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate2 hover:bg-canvas hover:text-ink"
            >
              <span aria-hidden="true">{maximized ? '❐' : '▢'}</span>
            </button>
            <button
              type="button"
              onClick={() => close(id)}
              aria-label={`Close ${title}`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate2 hover:bg-wash-coral hover:text-brand-coral"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>

        {/* Body — fills remaining height; holds the window content. */}
        <div className="relative min-h-0 flex-1 overflow-hidden bg-canvas-pure">
          {children}
          {/* Drag overlay: while ANY window is being dragged/resized, cover this
              body so iframe children don't swallow pointer events (§10 #2). */}
          {anyInteracting && <div className="absolute inset-0 z-50" />}
        </div>
      </div>
    </Rnd>
  );
}
