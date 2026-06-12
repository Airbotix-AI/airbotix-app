// The in-flight "working" card for one chat turn (chat-ux: one turn → one message).
// ONE indicator + ONE line: a spinning brand ring whose arc breathes (SVG dash
// animation) next to the current-state label — the latest real tool/action delta
// (see turnProgress.ts), or rotating generic fillers while no delta has landed yet.
// The state line IS the title (no redundant "Working on it…" heading, no separate
// bar). When the turn finishes this card is replaced by the single settled message
// bubble — there is never a "responded, but still thinking" gap.

import { useEffect, useState } from 'react';

import {
  currentStateLabel,
  formatSecs,
  totalElapsedSeconds,
  type TurnProgress,
} from './turnProgress';

const TICK_MS = 1000;

/** The single combined progress indicator: the svg spins (pg-orb-spin) while the
 *  arc length breathes (pg-ring-arc) — amber tones during a "fixing" beat. The
 *  static strokeDasharray is the reduced-motion frame. */
function WorkingRing({ fixing }: { fixing: boolean }) {
  return (
    <svg viewBox="0 0 48 48" data-testid="working-ring" className="pg-orb-spin h-6 w-6 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="pg-working-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7A66" />
          <stop offset="0.33" stopColor="#FF6BA9" />
          <stop offset="0.66" stopColor="#5DAEFF" />
          <stop offset="1" stopColor="#3DD9A9" />
        </linearGradient>
        <linearGradient id="pg-working-ring-fix" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE26B" />
          <stop offset="1" stopColor="#FFB638" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" className="text-pg-border" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke={fixing ? 'url(#pg-working-ring-fix)' : 'url(#pg-working-ring)'}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="80 46"
        className="pg-ring-arc"
      />
    </svg>
  );
}

export function WorkingCard({ progress }: { progress: TurnProgress }) {
  // A 1s clock so the header timer ticks (and the filler rotation advances). The
  // card is transient, so the interval lives only as long as it's mounted.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const total = totalElapsedSeconds(progress, now);
  // The single current state: the last step is always the live one (turnProgress
  // settles earlier steps to 'done' whenever a new one starts).
  const current = progress.steps[progress.steps.length - 1];
  const label = currentStateLabel(current, now);

  return (
    <div className="flex justify-start">
      <div
        data-testid="working-card"
        role="status"
        aria-live="polite"
        className="w-full max-w-[92%] rounded-2xl border border-pg-border bg-pg-surface px-4 py-3.5 shadow-lg"
      >
        <div className="flex items-center gap-2.5">
          <WorkingRing fixing={current.status === 'fixing'} />
          {/* The label keys a remount so the fade/rise plays on a state change. */}
          <span key={label} data-testid="working-current" className="pg-thinking-line text-[15px] font-bold text-pg-text">
            {label}
          </span>
          <span data-testid="working-clock" className="ml-auto font-mono text-[12px] text-pg-text-muted">
            {formatSecs(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
