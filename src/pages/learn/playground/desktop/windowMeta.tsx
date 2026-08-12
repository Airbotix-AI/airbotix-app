import { BookOpen, Code2, Database, Gamepad2, Globe, Images, ListChecks, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { PgWindowId } from '../playgroundStore';

/** Shared metadata (title + vector icon) for the playground windows. */
export const WINDOW_META: Record<PgWindowId, { title: string; Icon: LucideIcon }> = {
  chat: { title: 'Chat', Icon: MessageSquare },
  code: { title: 'Code Editor', Icon: Code2 },
  game: { title: 'Game Runner', Icon: Gamepad2 },
  assets: { title: 'Asset Viewer', Icon: Images },
  help: { title: 'Guide', Icon: BookOpen },
  mission: { title: 'Mission', Icon: ListChecks },
  // Website Studio only — the project's real server-side database, live.
  db: { title: 'Database', Icon: Database },
};

/**
 * Kind-aware display metadata (creative-code-studio-website-prd): the display
 * layer flips per project kind while the STABLE `PgWindowId` is unchanged. Two
 * windows switch:
 *   - the RUNNER ('game') reads "Website" + globe in Website Studio (else the
 *     Game Runner metadata);
 *   - the GUIDE ('help') reads "Website Guide" vs "Game Guide" (D-WEB-21) — same
 *     BookOpen icon, only the label changes with the corpus the pane loads.
 * Everywhere a label shows (window title bar, desktop tile, taskbar button,
 * split-tab) reads through here so the two never drift.
 */
const WEBSITE_GAME_DISPLAY = { title: 'Website', Icon: Globe } as const;
export function windowDisplay(
  id: PgWindowId,
  kind: 'game' | 'website' = 'game',
): { title: string; Icon: LucideIcon } {
  if (id === 'game' && kind === 'website') return WEBSITE_GAME_DISPLAY;
  if (id === 'help') {
    return { title: kind === 'website' ? 'Website Guide' : 'Game Guide', Icon: WINDOW_META.help.Icon };
  }
  return WINDOW_META[id];
}

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
  // mission=mint. The K-12 palette has exactly FIVE brand colours (DESIGN.md) and
  // this is the SIXTH window, so one hue is necessarily shared: mint (the "done /
  // progress" colour) is the right read for a checklist, and the ListChecks glyph
  // keeps it unmistakable next to the Code Editor's Code2.
  mission: {
    border: 'border-brand-mint/50',
    icon: 'text-brand-mint',
    wash: 'bg-brand-mint/15',
  },
  // db=sky (shared with Chat — five brand colours, seven windows). Sky is the
  // "information" read, and the two never sit confusably side by side: the db
  // tile shows only in Website Studio, right next to the coral Website window,
  // with the Database glyph keeping it unmistakable next to MessageSquare.
  db: {
    border: 'border-brand-sky/50',
    icon: 'text-brand-sky',
    wash: 'bg-brand-sky/15',
  },
};

/** Display order for the windows in the Taskbar and Desktop. `db` sits right
 *  after the runner it belongs to (Website Studio only — gated by kind). */
export const WINDOW_ORDER: PgWindowId[] = ['chat', 'code', 'game', 'db', 'assets', 'help', 'mission'];
