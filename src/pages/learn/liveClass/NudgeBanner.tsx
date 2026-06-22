// Transient teacher→kid nudge banner (D-LIVE-2). A ONE-WAY message: the kid sees
// "✋ coming to help!" (canned) or the teacher's short note, and can dismiss it.
// There is NO reply control — this is not a chat (teacher-console-prd §4.5, no DMs).
//
// Hosted once in LearnLayout (like the heartbeat) so it shows across every studio.
// It auto-dismisses after AUTO_DISMISS_MS; [OK] dismisses immediately. The note
// text was already clamped + control-char-stripped server-side (≤120 chars).

import { useEffect, useState } from 'react';

import { useKidToken } from '@/auth/authStore';
import { onWsEvent } from '@/lib/ws';

const AUTO_DISMISS_MS = 12_000;

export interface NudgePayload {
  kind: 'coming' | 'note';
  text?: string;
  ts?: string;
}

// Subscribe to `kid.nudge` on the kid socket; returns the latest nudge (or null)
// + a dismiss fn. A new nudge replaces the previous banner (a teacher tapping
// twice shouldn't stack banners on a kid's screen). Local to this component (only
// NudgeBanner consumes it) — keeps this a component-only module for fast-refresh.
function useKidNudge(): { nudge: NudgePayload | null; dismiss: () => void } {
  const [nudge, setNudge] = useState<NudgePayload | null>(null);
  // Re-subscribe when the kid token lands/rotates: the kid socket only exists once
  // authed, and the bootstrap refresh resolves AFTER this mounts — a `[]` effect
  // would attach to no socket and never receive a nudge.
  const kidToken = useKidToken();

  useEffect(() => {
    return onWsEvent<NudgePayload>('kid.nudge', (payload) => setNudge(payload), 'kid');
  }, [kidToken]);

  useEffect(() => {
    if (!nudge) return undefined;
    const id = window.setTimeout(() => setNudge(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [nudge]);

  return { nudge, dismiss: () => setNudge(null) };
}

export function NudgeBanner() {
  const { nudge, dismiss } = useKidNudge();
  if (!nudge) return null;

  const message =
    nudge.kind === 'note' && nudge.text
      ? nudge.text
      : 'Your teacher saw your hand — coming to help! 🖐';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="kid-nudge-banner"
      className="fixed inset-x-0 top-3 z-50 mx-auto flex w-[min(92vw,420px)] items-center gap-3 rounded-2xl bg-brand-mint px-4 py-3 text-white shadow-brand-mint"
    >
      <span aria-hidden className="text-[22px]">
        ✋
      </span>
      <span className="flex-1 text-[15px] font-extrabold leading-snug">{message}</span>
      <button
        type="button"
        data-testid="kid-nudge-dismiss"
        onClick={dismiss}
        className="rounded-full bg-white/25 px-3 py-1 text-[14px] font-extrabold transition hover:bg-white/40"
      >
        OK
      </button>
    </div>
  );
}
