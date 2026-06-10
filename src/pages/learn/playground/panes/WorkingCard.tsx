// The in-flight "working" card for one chat turn (chat-ux: one turn → one message).
// Replaces the old fake-cycling ThinkingBubble: it shows HONEST steps built from the
// real tool/action deltas the agent fires (see turnProgress.ts), a header clock, and
// a per-step timer. When the turn finishes this card is replaced by the single
// settled message bubble — there is never a "responded, but still thinking" gap.

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

import {
  stepElapsedSeconds,
  totalElapsedSeconds,
  type ProgressStep,
  type TurnProgress,
} from './turnProgress';

const TICK_MS = 1000;

/** Whole-seconds → "4s" under a minute, "1:07" beyond. */
export function formatSecs(n: number): string {
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Brand spinning orb (same motion language as the ThinkingBubble / GeneratingScreen). */
function Orb() {
  return (
    <svg viewBox="0 0 160 160" className="pg-orb-spin h-5 w-5 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="pg-working-orb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7A66" />
          <stop offset="0.33" stopColor="#FF6BA9" />
          <stop offset="0.66" stopColor="#5DAEFF" />
          <stop offset="1" stopColor="#3DD9A9" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="64" fill="none" stroke="currentColor" className="text-pg-border" strokeWidth="12" />
      <path d="M 80 16 A 64 64 0 1 1 16 80" fill="none" stroke="url(#pg-working-orb)" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

function StepIcon({ status }: { status: ProgressStep['status'] }) {
  if (status === 'done') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-mint">
        <Check size={13} strokeWidth={3} className="text-pg-desktop" aria-hidden />
      </span>
    );
  }
  if (status === 'fixing') {
    // A calm amber pulse — a glitch is being smoothed over, never an alarm.
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-brand-sunshine animate-pulse" />
      </span>
    );
  }
  // active
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
      <span className="h-2.5 w-2.5 rounded-full bg-brand-sky animate-pulse" />
    </span>
  );
}

export function WorkingCard({ progress }: { progress: TurnProgress }) {
  // A 1s clock so the header + active-step timers tick. The card is transient, so
  // the interval lives only as long as it's mounted.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const total = totalElapsedSeconds(progress, now);
  const done = progress.steps.filter((s) => s.status === 'done').length;
  // Determinate-feeling bar that fills as steps complete but never reaches 100%
  // until the card is replaced by the finished message.
  const pct = Math.min(92, Math.max(10, Math.round((done / (progress.steps.length || 1)) * 100)));

  return (
    <div className="flex justify-start">
      <div
        data-testid="working-card"
        role="status"
        aria-live="polite"
        className="w-full max-w-[92%] rounded-2xl border border-pg-border bg-pg-surface px-4 py-3.5 shadow-lg"
      >
        <div className="flex items-center gap-2.5">
          <Orb />
          <span className="text-[15px] font-bold text-pg-text">Working on it…</span>
          <span className="ml-auto flex items-center gap-2">
            <span data-testid="working-clock" className="font-mono text-[12px] text-pg-text-muted">
              {formatSecs(total)}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-brand-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-mint" /> live
            </span>
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-pg-text/10">
          <div className="h-full rounded-full bg-grad-sky transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>

        <ul className="mt-3.5 space-y-2.5">
          {progress.steps.map((step) => {
            return (
              <li key={step.id} data-testid="working-step" className="flex items-center gap-2.5">
                <StepIcon status={step.status} />
                <span
                  className={
                    'text-[15px] ' +
                    (step.status === 'done'
                      ? 'text-pg-text-dim'
                      : 'font-semibold text-pg-text')
                  }
                >
                  {step.label}
                </span>
                <span
                  className={
                    'ml-auto font-mono text-[12px] ' +
                    (step.status === 'active'
                      ? 'font-bold text-brand-sky'
                      : step.status === 'fixing'
                        ? 'font-bold text-brand-sunshine'
                        : 'text-pg-text-muted')
                  }
                >
                  {formatSecs(stepElapsedSeconds(step, now))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
