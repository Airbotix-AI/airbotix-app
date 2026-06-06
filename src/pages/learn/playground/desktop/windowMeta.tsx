import { Code2, Gamepad2, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { PgWindowId } from '../playgroundStore';

/** Shared metadata (title + vector icon) for the playground windows. */
export const WINDOW_META: Record<PgWindowId, { title: string; Icon: LucideIcon }> = {
  chat: { title: 'Chat', Icon: MessageSquare },
  code: { title: 'Code Editor', Icon: Code2 },
  game: { title: 'Game Runner', Icon: Gamepad2 },
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
};

/** Display order for the windows in the Taskbar and Desktop. */
export const WINDOW_ORDER: PgWindowId[] = ['chat', 'code', 'game'];
