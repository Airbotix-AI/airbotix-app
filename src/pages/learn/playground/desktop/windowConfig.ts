// Per-window registry for the playground virtual desktop. Canonical title,
// shortcut/taskbar icon, and default (first-open) geometry for each window.
// Data-driven so DesktopIcon / Window / Taskbar all read the same source.
// Per virtual-desktop-design.md §4; placement mirrors virtual-desktop-mockup.svg.
//
// The store (windowStore.ts) owns runtime state; these are the defaults it
// seeds from. WindowId / WindowRect are imported so this stays in lockstep
// with the store's shape.

import type { WindowId, WindowRect } from './windowStore';

export interface WindowConfig {
  title: string;
  /** Emoji shown on the desktop shortcut + taskbar entry + titlebar. */
  icon: string;
  /** First-open floating geometry, before the kid moves/resizes the window. */
  defaultRect: WindowRect;
}

export const WINDOW_CONFIG: Record<WindowId, WindowConfig> = {
  // Code Editor: large, left-of-centre (mockup window opens at x=160, w=860).
  code: {
    title: 'Code Editor',
    icon: '🧑‍💻',
    defaultRect: { x: 160, y: 40, w: 860, h: 620 },
  },
  // Game Runner: large, right side (mockup runner sits near x=900), offset
  // down a little so it cascades over the editor rather than fully overlapping.
  game: {
    title: 'Game Runner',
    icon: '🎮',
    defaultRect: { x: 900, y: 120, w: 660, h: 600 },
  },
  // Share: small/medium, centred placeholder window.
  share: {
    title: 'Share',
    icon: '🔗',
    defaultRect: { x: 520, y: 240, w: 460, h: 360 },
  },
};
