import clsx from 'clsx';

import { usePlaygroundStore } from '../playgroundStore';
import type { PgWindowId } from '../playgroundStore';
import { WINDOW_ACCENT, WINDOW_META } from './windowMeta';

// Per-window brand-tinted glow under the tile (DESIGN.md "card carries its own
// colour shadow"). Tighter than the card token so it reads as a lift, not a
// halo. Literal strings so Tailwind's scanner keeps them.
const TILE_SHADOW: Record<PgWindowId, string> = {
  chat: 'shadow-[0_10px_22px_-8px_rgba(93,174,255,0.55)]',
  code: 'shadow-[0_10px_22px_-8px_rgba(61,217,169,0.55)]',
  game: 'shadow-[0_10px_22px_-8px_rgba(255,122,102,0.55)]',
  assets: 'shadow-[0_10px_22px_-8px_rgba(255,107,169,0.55)]',
};

/**
 * A desktop shortcut tile (Window mode) — click to open/focus its window.
 * Polished, app-icon style: a raised surface tile carrying its window's
 * brand-tinted glow, with the (brand-coloured) lucide glyph sitting in a soft
 * brand-wash chip. Lifts on hover. Icons themselves are unchanged.
 */
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
      className="group flex w-[92px] flex-col items-center gap-2 rounded-2xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-sky"
    >
      <span
        className={clsx(
          'flex h-[76px] w-[76px] items-center justify-center rounded-[22px] bg-pg-surface ring-1 ring-pg-border/70',
          'transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-[1.03] group-active:translate-y-0 group-active:scale-100',
          TILE_SHADOW[id],
        )}
      >
        <span className={clsx('flex h-[46px] w-[46px] items-center justify-center rounded-2xl', accent.wash)}>
          <Icon size={26} className={accent.icon} />
        </span>
      </span>
      <span className="text-[12px] font-bold text-pg-text-dim transition-colors group-hover:text-pg-text">
        {title}
      </span>
    </button>
  );
}
