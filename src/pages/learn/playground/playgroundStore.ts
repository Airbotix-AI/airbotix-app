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
  focus: (id: PgWindowId) => void;
  close: (id: PgWindowId) => void;
  openOrFocus: (id: PgWindowId) => void;
  minimize: (id: PgWindowId) => void;
  toggleMaximize: (id: PgWindowId) => void;
  setRect: (id: PgWindowId, rect: WinRect) => void;
}

// Cascaded defaults roughly matching the mockup: chat front-left, code center,
// game right, with ascending zIndex so game starts on top.
const BASE_Z = 1;

const DEFAULT_WINDOWS: Record<PgWindowId, WinState> = {
  chat: {
    id: 'chat',
    open: true,
    minimized: false,
    maximized: false,
    zIndex: BASE_Z,
    rect: { x: 24, y: 24, w: 380, h: 560 },
  },
  code: {
    id: 'code',
    open: true,
    minimized: false,
    maximized: false,
    zIndex: BASE_Z + 1,
    rect: { x: 432, y: 56, w: 520, h: 560 },
  },
  game: {
    id: 'game',
    open: true,
    minimized: false,
    maximized: false,
    zIndex: BASE_Z + 2,
    rect: { x: 980, y: 88, w: 420, h: 480 },
  },
};

const INITIAL_TOP_Z = BASE_Z + 2;

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  layoutMode: 'window',
  setLayoutMode: (m) => set({ layoutMode: m }),
  windows: DEFAULT_WINDOWS,
  topZ: INITIAL_TOP_Z,
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
