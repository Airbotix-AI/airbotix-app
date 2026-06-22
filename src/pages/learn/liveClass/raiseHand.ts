// Shared raise-hand state for the kid's live-class studios (D-LIVE-1).
//
// "🙋 Ask my teacher" is a one-tap, no-text signal — the kid raises their own
// hand and can lower it again; a class-scoped teacher can also lower it from Live
// Mode. The actual state lives server-side (the ephemeral `RaisedHand` table); the
// client store is an optimistic mirror so the button flips instantly and stays in
// sync when the TEACHER lowers the hand (server → `class.hand_lowered`).
//
// WS-only — no REST "help" endpoint, no `needs_help` flag (D-TCW-2). The payloads
// carry nothing but the implicit principal (the kid's own JWT) — no question text,
// no PII (C5). The button is gated on being in a class (`useKidClassId`) and is
// hidden in the teacher read-only viewer; this store only tracks raised/lowered.

import { useEffect } from 'react';
import { create } from 'zustand';

import { getKidSub, useKidToken } from '@/auth/authStore';
import { onWsEvent, sendWsEvent } from '@/lib/ws';

interface RaiseHandState {
  raised: boolean;
  raise: () => void;
  lowerOwn: () => void;
  // Sync from the server (teacher lowered it / reconnect snapshot). Not user-driven.
  setRaised: (v: boolean) => void;
}

export const useRaiseHandStore = create<RaiseHandState>((set) => ({
  raised: false,
  raise: () => {
    // Optimistic: flip immediately, then tell the server. The kid can only raise
    // their OWN hand — class + kid are taken from the JWT principal server-side,
    // so the event needs no payload.
    set({ raised: true });
    sendWsEvent('class.raise_hand', {}, 'kid');
  },
  lowerOwn: () => {
    set({ raised: false });
    sendWsEvent('class.lower_hand', {}, 'kid');
  },
  setRaised: (v) => set({ raised: v }),
}));

// Hook for the studio button. Subscribes to `class.hand_lowered` on the KID socket
// so that when the teacher lowers THIS kid's hand, the button returns to idle. The
// broadcast goes to the whole class room and carries `kid_id`, so we match it
// against the kid's own `sub` and ignore lowers for other kids (otherwise another
// kid's lower would flip this button to idle while the server row stays open).
export function useRaiseHand(): { raised: boolean; raise: () => void; lowerOwn: () => void } {
  const raised = useRaiseHandStore((s) => s.raised);
  const raise = useRaiseHandStore((s) => s.raise);
  const lowerOwn = useRaiseHandStore((s) => s.lowerOwn);
  const setRaised = useRaiseHandStore((s) => s.setRaised);
  // Re-attach when the kid token lands/rotates — the kid socket only exists once
  // authed (the bootstrap refresh resolves after mount), so a `[setRaised]`-only
  // effect can attach to no socket and miss the teacher's lower.
  const kidToken = useKidToken();

  useEffect(() => {
    const off = onWsEvent<{ kid_id: string }>(
      'class.hand_lowered',
      (payload) => {
        const ownSub = getKidSub();
        // Match own hand; if we can't read our id, fall back to reacting (a lower
        // we received in our class room is almost certainly ours — a single
        // browser is one kid, and re-lowering is a no-op).
        if (!ownSub || payload.kid_id === ownSub) setRaised(false);
      },
      'kid',
    );
    return off;
  }, [setRaised, kidToken]);

  return { raised, raise, lowerOwn };
}
