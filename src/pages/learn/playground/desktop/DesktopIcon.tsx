import clsx from 'clsx';

import { usePlaygroundStore } from '../playgroundStore';
import type { PgWindowId } from '../playgroundStore';
import { WINDOW_ACCENT, WINDOW_META } from './windowMeta';

/** A desktop shortcut tile (Window mode) — click to open/focus its window. */
export function DesktopIcon({ id }: { id: PgWindowId }) {
  const { title, Icon } = WINDOW_META[id];
  const accent = WINDOW_ACCENT[id];
  const openOrFocus = usePlaygroundStore((s) => s.openOrFocus);

  const open = () => openOrFocus(id);

  return (
    <button
      type="button"
      aria-label={title}
      onClick={open}
      onDoubleClick={open}
      className="group flex w-[84px] flex-col items-center gap-2 rounded-2xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-sky"
    >
      <span
        className={clsx(
          'flex h-[84px] w-[84px] items-center justify-center rounded-2xl border bg-pg-surface transition-transform duration-150 group-hover:scale-105',
          accent.border,
        )}
      >
        <Icon size={30} className={accent.icon} />
      </span>
      <span className="text-[12px] font-bold text-pg-text-dim">{title}</span>
    </button>
  );
}
