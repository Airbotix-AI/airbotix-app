// Bottom taskbar / dock for the Playground "Window" layout mode.
//
// A 56px-tall dark bar pinned to the bottom of the workspace (see
// docs/mockup-workspace-v2.png): a "playground" brand on the left, the
// LayoutToggle, then one button per window. Each button restores/focuses or
// minimizes its window; the active (topmost, open, non-minimized) window is
// highlighted in a sky tint, open-but-not-active windows read neutral, and
// minimized/closed windows are dimmed.
//
// The dark hexes (#16121F bar, #221E30 button, #46415C border) match the
// mockup chrome and the sibling Window.tsx; the accents use design tokens
// (brand-mint, brand-sky, canvas-pure, stone2, steel).

import clsx from 'clsx';
import { LayoutGrid } from 'lucide-react';

import { LayoutToggle } from '../LayoutToggle';
import { usePlaygroundStore, type PgWindowId } from '../playgroundStore';

import { WINDOW_META, WINDOW_ORDER } from './windowMeta';

export function Taskbar() {
  const windows = usePlaygroundStore((s) => s.windows);
  const openOrFocus = usePlaygroundStore((s) => s.openOrFocus);
  const minimize = usePlaygroundStore((s) => s.minimize);

  // Active window = the open, non-minimized window with the highest zIndex.
  let activeId: PgWindowId | null = null;
  let activeZ = -Infinity;
  for (const id of WINDOW_ORDER) {
    const w = windows[id];
    if (w.open && !w.minimized && w.zIndex > activeZ) {
      activeZ = w.zIndex;
      activeId = id;
    }
  }

  const handleClick = (id: PgWindowId) => {
    const w = windows[id];
    if (!w.open || w.minimized) {
      openOrFocus(id); // restore / reopen + focus
    } else if (id === activeId) {
      minimize(id); // toggle: hide the focused window
    } else {
      openOrFocus(id); // bring an open background window to front
    }
  };

  return (
    <div className="flex h-14 items-center gap-2 border-t border-[#46415C] bg-[#16121F] px-4">
      <div className="flex items-center gap-2 pr-2">
        <LayoutGrid size={20} className="text-brand-mint" />
        <span className="font-extrabold text-brand-mint">playground</span>
      </div>

      <LayoutToggle />

      <div className="flex items-center gap-2 pl-2">
        {WINDOW_ORDER.map((id) => {
          const w = windows[id];
          const { title, Icon } = WINDOW_META[id];
          const isActive = id === activeId;
          const isVisible = w.open && !w.minimized;

          return (
            <button
              key={id}
              type="button"
              aria-label={
                isActive
                  ? `Minimize ${title}`
                  : isVisible
                    ? `Focus ${title}`
                    : `Open ${title}`
              }
              aria-pressed={isActive}
              onClick={() => handleClick(id)}
              className={clsx(
                'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold leading-none transition-colors',
                isActive
                  ? 'border-brand-sky/50 bg-brand-sky/16 text-canvas-pure'
                  : isVisible
                    ? 'border-[#46415C] bg-[#221E30] text-stone2 hover:text-canvas-pure'
                    : 'border-transparent bg-transparent text-steel hover:text-stone2',
              )}
            >
              <Icon size={18} />
              {title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
