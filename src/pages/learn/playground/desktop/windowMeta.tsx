import { BookOpen, Code2, Gamepad2, Images, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { PgWindowId } from '../playgroundStore';

/** Shared metadata (title + vector icon) for the playground windows. */
export const WINDOW_META: Record<PgWindowId, { title: string; Icon: LucideIcon }> = {
  chat: { title: 'Chat', Icon: MessageSquare },
  code: { title: 'Code Editor', Icon: Code2 },
  game: { title: 'Game Runner', Icon: Gamepad2 },
  assets: { title: 'Asset Viewer', Icon: Images },
  help: { title: 'Guide', Icon: BookOpen },
};

/**
 * Per-window brand identity (chat=sky, code=mint, game=coral) — the desktop
 * tiles, taskbar buttons, and any window-scoped accents all share it so a window
 * reads the same colour everywhere. Matches the brand-tinted tiles in the
 * mockups. `wash` is a translucent brand fill that works on light AND dark.
 * Class strings are literals so Tailwind's scanner keeps them.
 */
export const WINDOW_ACCENT: Record<PgWindowId, { border: string; icon: string; wash: string }> = {
  chat: { border: 'border-brand-sky/50', icon: 'text-brand-sky', wash: 'bg-brand-sky/15' },
  code: { border: 'border-brand-mint/50', icon: 'text-brand-mint', wash: 'bg-brand-mint/15' },
  game: { border: 'border-brand-coral/50', icon: 'text-brand-coral', wash: 'bg-brand-coral/15' },
  assets: {
    border: 'border-brand-bubblegum/50',
    icon: 'text-brand-bubblegum',
    wash: 'bg-brand-bubblegum/15',
  },
  // help=sunshine — the one brand colour not used by another window. NOTE:
  // `brand-sunshine` (#FFD43B) is much lighter than the others, so a tinted glyph
  // on the pale wash reads poorly; `DesktopIcon` renders the Guide tile with a
  // SOLID sunshine chip + a dark `text-ink` glyph instead (see DesktopIcon).
  help: {
    border: 'border-brand-sunshine/50',
    icon: 'text-brand-sunshine',
    wash: 'bg-brand-sunshine/15',
  },
};

/** Display order for the windows in the Taskbar and Desktop. */
export const WINDOW_ORDER: PgWindowId[] = ['chat', 'code', 'game', 'assets', 'help'];
