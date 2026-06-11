// Shared light/dark theme for Blocks Studio. Lives in a tiny store (not local
// component state) so the Learn top bar can flip with the studio — the studio
// surface is full-bleed under the nav, and a light nav over a dark studio looks
// broken. Defaults to the system preference; the override persists.

import { create } from 'zustand';

export type BlocksTheme = 'light' | 'dark';

function initialTheme(): BlocksTheme {
  try {
    const stored = localStorage.getItem('bsx-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

interface BlocksThemeStore {
  theme: BlocksTheme;
  toggle: () => void;
}

export const useBlocksTheme = create<BlocksThemeStore>((set, get) => ({
  theme: initialTheme(),
  toggle() {
    const next: BlocksTheme = get().theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('bsx-theme', next);
    } catch {
      // ignore
    }
    set({ theme: next });
  },
}));
