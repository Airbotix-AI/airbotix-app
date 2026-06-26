// The in-flight "working" card for one chat turn (chat-ux: one turn → one message).
// ONE indicator + ONE line: a brand-gradient dot that BREATHES (scale + soft glow,
// no spin) next to a SHIMMERING current-state label — the latest real tool/action
// delta (see turnProgress.ts), or rotating generic fillers while no delta has landed
// yet. The state line IS the title (no redundant "Working on it…" heading, no
// separate bar). When the turn finishes this card is replaced by the single settled
// message bubble — there is never a "responded, but still thinking" gap.

import { useEffect, useState } from 'react';

import {
  currentStateLabel,
  formatSecs,
  totalElapsedSeconds,
  type TurnProgress,
} from './turnProgress';

const TICK_MS = 1000;

/** The single progress indicator: a brand-gradient dot that breathes (scale + soft
 *  glow via pg-breathe-dot, NO rotation) — warm amber tones during a "fixing" beat.
 *  Held static under prefers-reduced-motion (playground.css). */
function WorkingDot({ fixing }: { fixing: boolean }) {
  return (
    <span
      data-testid="working-dot"
      aria-hidden="true"
      className={`pg-breathe-dot h-3 w-3 shrink-0${fixing ? ' pg-breathe-dot--fixing' : ''}`}
    />
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
          <WorkingDot fixing={current.status === 'fixing'} />
          {/* The label keys a remount so the shimmer + fade/rise replay on a state change. */}
          <span key={label} data-testid="working-current" className="pg-shimmer-text text-[15px] font-bold">
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
