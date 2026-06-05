// Playground workspace layout store.
//
// Owns the layout mode toggle (floating windows vs. split panes) and, for
// Window mode, the floating-window geometry of the 3 panels (chat, code,
// game). Pure state — no React/JSX. Mirrors the windowStore we had before.

import { create } from 'zustand';

export type LayoutMode = 'window' | 'split';

export type PgWindowId = 'chat' | 'code' | 'game';

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

// Default window layout (v2 mockup): Code Editor lower-left & wide, Chat
// center & top (front-most/focused), Game Runner right. Computed from the
// viewport at module load so windows mount with the right geometry — `Window`
// uses react-rnd UNCONTROLLED `default`, so the rects must be correct BEFORE
// mount (a post-mount setRect would be ignored by the uncontrolled drag).
// zIndex: code(1) < game(2) < chat(3) so Chat starts on top.
const TASKBAR_H = 56;

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
  return {
    code: base('code', 1, r(W * 0.02, H * 0.3, W * 0.42, H * 0.62)),
    game: base('game', 2, r(W * 0.685, H * 0.1, W * 0.3, H * 0.74)),
    chat: base('chat', 3, r(W * 0.3, H * 0.05, W * 0.36, H * 0.8)),
  };
}

const DEFAULT_WINDOWS = defaultWindows();
const INITIAL_TOP_Z = 3;

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
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
