// Mission Mode milestone celebration — hoisted OUT of the pane (D-GAME14 / §9A).
//
// The kid can now tick the current step from the bottom taskbar chip, which means
// a milestone can be reached while the Mission WINDOW IS CLOSED. A celebration
// owned by `MissionPane` would then silently never render — the one moment the
// feature exists for. So the celebration lives here, outside React, and
// `Workspace` renders it once at workspace level in BOTH layout modes.
//
// Mirrors the `saveStatusStore` idiom: a tiny zustand store driven from wherever
// the event happens, read by whichever component is on screen.

import { create } from 'zustand';

export interface MissionCelebration {
  /** The authored `milestone` copy — the celebration says something specific. */
  label: string;
  /** Confetti is dropped under `prefers-reduced-motion`; the card always shows. */
  confetti: boolean;
  /** Monotonic — a fresh nonce re-fires the card (and its auto-dismiss timer)
   *  even when the SAME milestone is celebrated twice. */
  nonce: number;
}

interface MissionCelebrationState {
  celebration: MissionCelebration | null;
  celebrate: (label: string, confetti: boolean) => void;
  dismiss: () => void;
}

export const useMissionCelebrationStore = create<MissionCelebrationState>((set, get) => ({
  celebration: null,
  celebrate: (label, confetti) =>
    set({ celebration: { label, confetti, nonce: (get().celebration?.nonce ?? 0) + 1 } }),
  dismiss: () => set({ celebration: null }),
}));
