// Floating-window chrome for the Playground "Window" layout mode.
//
// Draggable/stackable windows over the dark playground surface, built on
// react-rnd@^10. The non-obvious lesson (already paid for in this project):
// drive react-rnd UNCONTROLLED for the floating case — pass `default` only and
// let it track the drag natively, then persist the final rect on stop. Driving
// it controlled (`position`/`size`) every render makes the drag fight React's
// re-renders and stutter. We only switch to controlled `size`/`position` when
// the window is maximized (a fixed, non-interactive geometry).
//
// ASSUMPTIONS about the store (to be added to playgroundStore.ts):
//   - `interacting: boolean` — true while ANY window is being dragged/resized.
//   - `setInteracting(v: boolean)` — setter for the above.
// While `interacting`, every window covers its body with a transparent overlay
// so a drag that travels across the game iframe doesn't get swallowed by the
// frame (iframes eat pointer events, stalling the drag).

import { Rnd } from 'react-rnd';

import { usePlaygroundStore, type PgWindowId } from '../playgroundStore';

interface WindowProps {
  id: PgWindowId;
  title: string;
  icon: string;
  children: React.ReactNode;
}

export function Window({ id, title, icon, children }: WindowProps) {
  const { open, minimized, maximized, zIndex, rect } = usePlaygroundStore(
    (s) => s.windows[id],
  );
  const focus = usePlaygroundStore((s) => s.focus);
  const close = usePlaygroundStore((s) => s.close);
  const minimize = usePlaygroundStore((s) => s.minimize);
  const toggleMaximize = usePlaygroundStore((s) => s.toggleMaximize);
  const setRect = usePlaygroundStore((s) => s.setRect);
  const interacting = usePlaygroundStore((s) => s.interacting);
  const setInteracting = usePlaygroundStore((s) => s.setInteracting);

  if (!open || minimized) return null;

  return (
    <Rnd
      default={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      {...(maximized
        ? {
            size: { width: '100%', height: 'calc(100% - 0px)' },
            position: { x: 0, y: 0 },
            disableDragging: true,
            enableResizing: false,
          }
        : {})}
      dragHandleClassName="pg-win-title"
      bounds="parent"
      minWidth={300}
      minHeight={220}
      style={{ zIndex }}
      onMouseDown={() => focus(id)}
      onDragStart={() => setInteracting(true)}
      onResizeStart={() => setInteracting(true)}
      onDragStop={(_e, d) => {
        setInteracting(false);
        setRect(id, { ...rect, x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        setInteracting(false);
        setRect(id, {
          x: pos.x,
          y: pos.y,
          w: ref.offsetWidth,
          h: ref.offsetHeight,
        });
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-ink text-canvas-pure shadow-card-soft">
        <div className="pg-win-title flex cursor-move items-center justify-between gap-2 border-b border-canvas-pure/10 bg-canvas-pure/5 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="text-base leading-none">
              {icon}
            </span>
            <span className="truncate text-sm font-medium text-canvas-pure">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1 text-stone2">
            <button
              type="button"
              aria-label={`Minimize ${title}`}
              onClick={() => minimize(id)}
              className="rounded-md px-2 py-1 leading-none transition-colors hover:bg-canvas-pure/10"
            >
              {'–'}
            </button>
            <button
              type="button"
              aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
              onClick={() => toggleMaximize(id)}
              className="rounded-md px-2 py-1 leading-none transition-colors hover:bg-canvas-pure/10"
            >
              {maximized ? '◱' : '□'}
            </button>
            <button
              type="button"
              aria-label={`Close ${title}`}
              onClick={() => close(id)}
              className="rounded-md px-2 py-1 leading-none transition-colors hover:bg-canvas-pure/10"
            >
              {'×'}
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {children}
          {interacting && (
            <div className="absolute inset-0 z-50" aria-hidden />
          )}
        </div>
      </div>
    </Rnd>
  );
}
