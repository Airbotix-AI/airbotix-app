// Playground workspace layout store.
//
// Owns the layout mode toggle (floating windows vs. split panes) and, for
// Window mode, the floating-window geometry of the 3 panels (chat, code,
// game). Pure state — no React/JSX. Mirrors the windowStore we had before.

import { create } from 'zustand';

export type LayoutMode = 'window' | 'split';

/** Visual theme for the whole playground (all phases share it). Light = default. */
export type Theme = 'light' | 'dark';

export type PgWindowId = 'chat' | 'code' | 'game' | 'assets';

export interface WinRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WinState {
  id: PgWindowId;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  rect: WinRect;
}

interface PlaygroundState {
  /** Visual theme, shared across landing / generating / workspace. */
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  layoutMode: LayoutMode;
  setLayoutMode: (m: LayoutMode) => void;
  windows: Record<PgWindowId, WinState>;
  topZ: number;
  /** True while any window is being dragged/resized — drives a drag overlay so
   *  dragging across the game iframe doesn't stall. */
  interacting: boolean;
  setInteracting: (v: boolean) => void;
  focus: (id: PgWindowId) => void;
  close: (id: PgWindowId) => void;
  openOrFocus: (id: PgWindowId) => void;
  minimize: (id: PgWindowId) => void;
  toggleMaximize: (id: PgWindowId) => void;
  setRect: (id: PgWindowId, rect: WinRect) => void;
}

// Default window layout (v2 mockup): Asset Viewer is a large BACKDROP at the
// back, then Code Editor lower-left & wide, Game Runner right, Chat center & top
// (front-most/focused). Computed from the viewport at module load so windows
// mount with the right geometry — `Window` uses react-rnd UNCONTROLLED `default`,
// so the rects must be correct BEFORE mount (a post-mount setRect would be
// ignored by the uncontrolled drag).
// zIndex: assets(1) < code(2) < game(3) < chat(4) so Chat starts on top and the
// Asset Viewer sits behind, its edges peeking around the three front windows.
const TASKBAR_H = 56;
// Left margin that keeps the desktop shortcut icon column clear, so a closed
// window can always be reopened from its icon (windows don't cover it by default).
const ICON_COL_PX = 124;
// Width of the Code Editor's fixed file column (keep in sync with
// `FILES_DEFAULT_W` in `panes/CodeEditorPane.tsx`). Used to size the launch
// window so the EDITOR area — window width minus this column — is what scales.
const CODE_FILES_COL_W = 256;

function r(x: number, y: number, w: number, h: number): WinRect {
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function defaultWindows(): Record<PgWindowId, WinState> {
  const W = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const H = (typeof window !== 'undefined' ? window.innerHeight : 900) - TASKBAR_H;
  const base = (id: PgWindowId, zIndex: number, rect: WinRect): WinState => ({
    id,
    open: true,
    minimized: false,
    maximized: false,
    zIndex,
    rect,
  });
  // Launch the Code Editor with DOUBLE the editor area while the file column
  // keeps its width: width = files column + 2·(prior editor area), where the
  // prior editor area was W/3 − files column. (The old launch width was W/3 and
  // the editor part read too narrow.)
  const codeW = CODE_FILES_COL_W + 2 * (W / 3 - CODE_FILES_COL_W);
  return {
    // Open on launch, lowest z: a wide backdrop whose titlebar peeks above the
    // others (its top sits just above Chat's) and whose edges show around them.
    assets: base('assets', 1, r(ICON_COL_PX, H * 0.04, W - ICON_COL_PX - 24, H * 0.9)),
    code: base('code', 2, r(ICON_COL_PX, H * 0.3, codeW, H * 0.62)),
    game: base('game', 3, r(W * 0.685, H * 0.1, W * 0.3, H * 0.74)),
    chat: base('chat', 4, r(W * 0.3, H * 0.05, W * 0.36, H * 0.8)),
  };
}

const DEFAULT_WINDOWS = defaultWindows();
const INITIAL_TOP_Z = 4;

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  theme: 'light',
  setTheme: (t) => set({ theme: t }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  layoutMode: 'window',
  setLayoutMode: (m) => set({ layoutMode: m }),
  windows: DEFAULT_WINDOWS,
  topZ: INITIAL_TOP_Z,
  interacting: false,
  setInteracting: (v) => set({ interacting: v }),
  focus: (id) =>
    set((state) => {
      const nextZ = state.topZ + 1;
      return {
        topZ: nextZ,
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], zIndex: nextZ },
        },
      };
    }),
  close: (id) =>
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], open: false },
      },
    })),
  openOrFocus: (id) =>
    set((state) => {
      const nextZ = state.topZ + 1;
      return {
        topZ: nextZ,
        windows: {
          ...state.windows,
          [id]: {
            ...state.windows[id],
            open: true,
            minimized: false,
            zIndex: nextZ,
          },
        },
      };
    }),
  minimize: (id) =>
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], minimized: true },
      },
    })),
  toggleMaximize: (id) =>
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], maximized: !state.windows[id].maximized },
      },
    })),
  setRect: (id, rect) =>
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], rect },
      },
    })),
}));
