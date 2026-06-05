// Window store for the playground virtual desktop. Holds window state only —
// pure store, no React/JSX. Per virtual-desktop-design.md §4.
//
// Seed geometry here is a reasonable placeholder; the canonical per-window
// default geometry lives in windowConfig (C2.1). The store owns runtime state
// (open/minimized/maximized, z-order, last restored rect).

import { create } from 'zustand';

export type WindowId = 'code' | 'game' | 'share';

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowState {
  id: WindowId;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  /** Last restored geometry (floating, not maximized). */
  rect: WindowRect;
}

interface WindowStore {
  windows: Record<WindowId, WindowState>;
  topZ: number;
  openOrFocus: (id: WindowId) => void;
  focus: (id: WindowId) => void;
  close: (id: WindowId) => void;
  minimize: (id: WindowId) => void;
  toggleMaximize: (id: WindowId) => void;
  setRect: (id: WindowId, rect: WindowRect) => void;
}

// Base z-index for the initial (unfocused) stack. `focus` bumps from `topZ`.
const BASE_Z_INDEX = 1;

// Placeholder default geometry per window — canonical values come from
// windowConfig (C2.1). Seeded so the store stands alone before that lands.
const DEFAULT_RECT: Record<WindowId, WindowRect> = {
  code: { x: 80, y: 80, w: 760, h: 560 },
  game: { x: 880, y: 80, w: 800, h: 600 },
  share: { x: 480, y: 240, w: 480, h: 360 },
};

const WINDOW_ORDER: WindowId[] = ['code', 'game', 'share'];

function seedWindows(): Record<WindowId, WindowState> {
  const windows = {} as Record<WindowId, WindowState>;
  WINDOW_ORDER.forEach((id, index) => {
    windows[id] = {
      id,
      open: false,
      minimized: false,
      maximized: false,
      zIndex: BASE_Z_INDEX + index,
      rect: DEFAULT_RECT[id],
    };
  });
  return windows;
}

const INITIAL_TOP_Z = BASE_Z_INDEX + WINDOW_ORDER.length - 1;

export const useWindowStore = create<WindowStore>((set) => ({
  windows: seedWindows(),
  topZ: INITIAL_TOP_Z,

  openOrFocus: (id) =>
    set((state) => {
      const topZ = state.topZ + 1;
      return {
        topZ,
        windows: {
          ...state.windows,
          [id]: {
            ...state.windows[id],
            open: true,
            minimized: false,
            zIndex: topZ,
          },
        },
      };
    }),

  focus: (id) =>
    set((state) => {
      const topZ = state.topZ + 1;
      return {
        topZ,
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], zIndex: topZ },
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
        [id]: {
          ...state.windows[id],
          maximized: !state.windows[id].maximized,
        },
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
