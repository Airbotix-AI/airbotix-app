import clsx from 'clsx';

import { usePlaygroundStore } from '../playgroundStore';
import type { PgWindowId } from '../playgroundStore';
import { WINDOW_META } from './windowMeta';

/**
 * Per-id accent: tile border + icon colour. Matches the brand-tinted desktop
 * tiles in `docs/mockup-workspace-v2.png` (chat=sky, code=mint, game=coral).
 */
const ACCENT: Record<PgWindowId, { border: string; icon: string }> = {
  chat: { border: 'border-brand-sky/50', icon: 'text-brand-sky' },
  code: { border: 'border-brand-mint/50', icon: 'text-brand-mint' },
  game: { border: 'border-brand-coral/50', icon: 'text-brand-coral' },
};

/** A desktop shortcut tile (Window mode) — click to open/focus its window. */
export function DesktopIcon({ id }: { id: PgWindowId }) {
  const { title, Icon } = WINDOW_META[id];
  const accent = ACCENT[id];
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
          'flex h-[84px] w-[84px] items-center justify-center rounded-2xl border bg-[#242133] transition-transform duration-150 group-hover:scale-105',
          accent.border,
        )}
      >
        <Icon size={30} className={accent.icon} />
      </span>
      <span className="text-[12px] font-bold text-stone2">{title}</span>
    </button>
  );
}
