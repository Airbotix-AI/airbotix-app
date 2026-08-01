// The Mission Mode milestone celebration, rendered ONCE at workspace level.
//
// D-GAME14g (owner call): there is NO dialog. Completing a step never opens a card,
// never asks to be dismissed, and never covers the game. A kid ticking a box is mid-flow
// — a modal that has to be acknowledged interrupts exactly the person we just told to
// keep going, and it says nothing the checklist has not already shown (the step strikes
// through, the bar advances, the taskbar chip rolls on).
//
// What remains is a CONFETTI BURST for a milestone step: it celebrates without blocking,
// needs no acknowledgement, and clears itself. The milestone's words are not lost — the
// step row in `MissionPane` keeps them inline once it is ticked.
//
// It lives here rather than inside `MissionPane` because the kid can tick the current
// step from the taskbar chip with the Mission window CLOSED — a milestone reached that
// way must still celebrate (§9A.6). `Workspace` mounts this in both layout modes; the
// state comes from `missionCelebrationStore`.

import { useEffect } from 'react';

import { ConfettiBurst } from '@/components/celebration/ConfettiBurst';
import { useMissionCelebrationStore } from './missionCelebrationStore';

/** How long the burst lives before it clears itself. Matches the fall animation. */
const CONFETTI_MS = 2600;

export function MissionCelebration() {
  const celebration = useMissionCelebrationStore((s) => s.celebration);
  const dismiss = useMissionCelebrationStore((s) => s.dismiss);

  // Self-clearing: nothing here is dismissible by hand, so the store must not be left
  // holding a stale celebration (it would re-fire on the next mount).
  useEffect(() => {
    if (!celebration) return undefined;
    const timer = window.setTimeout(() => dismiss(), CONFETTI_MS);
    return () => window.clearTimeout(timer);
  }, [celebration, dismiss]);

  // Under `prefers-reduced-motion` the caller sets `confetti: false` — and with no card
  // to fall back on there is simply nothing to render. That is the correct outcome: the
  // kid still gets the inline milestone on the step row, without any motion at all.
  if (!celebration?.confetti) return null;

  return <ConfettiBurst testId="mission-confetti" />;
}
