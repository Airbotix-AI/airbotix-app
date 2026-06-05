// Bottom taskbar for the playground virtual desktop. Per virtual-desktop-design.md
// §4 / mockup #10: a left "playground" brand label followed by one pill button per
// open window (icon + title), driven by the window store + WINDOW_CONFIG.
//
// Height is exactly 48px — Window.tsx's maximize logic reserves 48px for this bar,
// so the two MUST stay in lockstep.

import clsx from 'clsx';

import { WINDOW_CONFIG } from './windowConfig';
import { useWindowStore, type WindowId, type WindowState } from './windowStore';

// openOrFocus already clears `minimized` and brings the window to the front,
// so it doubles as "restore + focus" for a minimized taskbar entry.

const WINDOW_ORDER: WindowId[] = ['code', 'game', 'share'];

/**
 * The focused window is the open, non-minimized one with the highest z-index.
 * Minimized windows are never "focused" even if they hold the top z.
 */
function focusedWindowId(windows: Record<WindowId, WindowState>): WindowId | null {
  let top: WindowState | null = null;
  for (const id of WINDOW_ORDER) {
    const w = windows[id];
    if (!w.open || w.minimized) continue;
    if (top === null || w.zIndex > top.zIndex) top = w;
  }
  return top ? top.id : null;
}

export function Taskbar() {
  const windows = useWindowStore((s) => s.windows);
  const focus = useWindowStore((s) => s.focus);
  const minimize = useWindowStore((s) => s.minimize);
  const openOrFocus = useWindowStore((s) => s.openOrFocus);

  const activeId = focusedWindowId(windows);

  const handleClick = (id: WindowId) => {
    const w = windows[id];
    if (w.minimized) {
      openOrFocus(id); // restore + focus
      return;
    }
    if (id === activeId) {
      // Clicking the focused window tucks it away.
      minimize(id);
      return;
    }
    focus(id);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-[9999] flex h-12 items-center gap-2 border-t border-hairline bg-surface px-4">
      <span className="select-none text-[14px] font-extrabold text-brand-mint">
        ▦ playground
      </span>

      <div className="ml-2 flex items-center gap-2">
        {WINDOW_ORDER.filter((id) => windows[id].open).map((id) => {
          const isActive = id === activeId;
          const isMinimized = windows[id].minimized;
          const { title, icon } = WINDOW_CONFIG[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleClick(id)}
              aria-pressed={isActive}
              title={title}
              className={clsx(
                'flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[12.5px] font-bold transition-colors',
                isActive
                  ? 'border-brand-sky bg-wash-sky text-ink'
                  : isMinimized
                    ? 'border-hairline bg-canvas-pure text-slate2 hover:bg-wash-sky/40'
                    : 'border-hairline bg-canvas-pure text-ink-soft hover:bg-wash-sky/40',
              )}
            >
              <span aria-hidden>{icon}</span>
              <span className="truncate">{title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
