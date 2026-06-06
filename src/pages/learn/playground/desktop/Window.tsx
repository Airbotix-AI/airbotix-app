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

import { Minimize2, Minus, Square, X } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';

import { usePlaygroundStore, type PgWindowId } from '../playgroundStore';

interface WindowProps {
  id: PgWindowId;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  /**
   * 'game' renders an always-dark window with a highlighted brand-gradient title
   * bar (the Game Runner is a media-player surface — dark in both themes). The
   * `data-theme="dark"` on the root re-themes the chrome + pane to dark locally.
   */
  variant?: 'default' | 'game';
}

export function Window({ id, title, icon, children, variant = 'default' }: WindowProps) {
  const { open, minimized, maximized, zIndex, rect } = usePlaygroundStore(
    (s) => s.windows[id],
  );
  const topZ = usePlaygroundStore((s) => s.topZ);
  const focus = usePlaygroundStore((s) => s.focus);
  const close = usePlaygroundStore((s) => s.close);
  const minimize = usePlaygroundStore((s) => s.minimize);
  const toggleMaximize = usePlaygroundStore((s) => s.toggleMaximize);
  const setRect = usePlaygroundStore((s) => s.setRect);
  const interacting = usePlaygroundStore((s) => s.interacting);
  const setInteracting = usePlaygroundStore((s) => s.setInteracting);

  const rndRef = useRef<Rnd>(null);
  const wasMaximized = useRef(maximized);

  // Restore to the saved rect on the maximized → restored transition. react-rnd
  // is UNCONTROLLED (its `default` only seeds the first mount), and maximizing
  // forces it to position {0,0}; without this it would snap to the top-left on
  // restore. `rect` still holds the pre-maximize geometry (maximize never calls
  // setRect), so we imperatively move/size it back. useLayoutEffect = before
  // paint, so there's no top-left flash.
  useLayoutEffect(() => {
    if (wasMaximized.current && !maximized && rndRef.current) {
      rndRef.current.updatePosition({ x: rect.x, y: rect.y });
      rndRef.current.updateSize({ width: rect.w, height: rect.h });
    }
    wasMaximized.current = maximized;
  }, [maximized, rect.x, rect.y, rect.w, rect.h]);

  if (!open || minimized) return null;

  const focused = zIndex === topZ;
  const isGame = variant === 'game';

  return (
    <Rnd
      ref={rndRef}
      default={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
      {...(maximized
        ? {
            size: { width: '100%', height: '100%' },
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
      <div
        data-theme={isGame ? 'dark' : undefined}
        className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-pg-surface text-pg-text shadow-[0_18px_40px_-8px_rgba(0,0,0,0.6)] ${
          focused ? 'border-brand-sky/60' : 'border-pg-border'
        }`}
      >
        <div
          onDoubleClick={() => toggleMaximize(id)}
          className={`pg-win-title flex cursor-move items-center justify-between gap-2 border-b px-3 py-2 ${
            isGame
              ? 'pg-runner-bar border-transparent text-white'
              : 'border-pg-border bg-pg-surface-2 text-pg-text'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="flex items-center leading-none">
              {icon}
            </span>
            <span className={`truncate text-sm font-medium ${isGame ? 'text-white' : 'text-pg-text'}`}>
              {title}
            </span>
          </div>
          {/* Stop dbl-click on the controls from also toggling maximize. */}
          <div className="flex items-center gap-1" onDoubleClick={(e) => e.stopPropagation()}>
            {[
              { key: 'min', label: `Minimize ${title}`, onClick: () => minimize(id), node: <Minus size={16} /> },
              {
                key: 'max',
                label: maximized ? `Restore ${title}` : `Maximize ${title}`,
                onClick: () => toggleMaximize(id),
                node: maximized ? <Minimize2 size={16} /> : <Square size={16} />,
              },
            ].map((b) => (
              <button
                key={b.key}
                type="button"
                aria-label={b.label}
                onClick={b.onClick}
                className={`rounded-md p-1 leading-none transition-colors ${
                  isGame
                    ? 'text-white/75 hover:bg-white/20 hover:text-white'
                    : 'text-pg-text-muted hover:bg-pg-text/10 hover:text-pg-text'
                }`}
              >
                {b.node}
              </button>
            ))}
            <button
              type="button"
              aria-label={`Close ${title}`}
              onClick={() => close(id)}
              className={`rounded-md p-1 leading-none transition-colors hover:text-brand-coral ${
                isGame ? 'text-white/75 hover:bg-white/20' : 'text-pg-text-muted hover:bg-pg-text/10'
              }`}
            >
              <X size={16} />
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
