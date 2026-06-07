// GeneratingScreen — the blocking "building your game" screen shown between the
// landing prompt and the workspace. Matches docs/mockup-generating.png: dark
// vignette canvas, echoed prompt, a spinning brand-gradient orb, a staged status
// list that ticks through, a progress bar, and a "Building your game…" caption.
//
// It owns NO product logic: on mount it calls `resolveProjectFiles` once — which
// loads the REAL project files from the S3-backed backend when a `projectId` is
// given, else falls back to the local starter scaffold — and hands the resulting
// VFS to `onDone`. The staged status is purely cosmetic timing — it advances on
// a timer, decoupled from when the files actually resolve (the steps cap at the
// last so the list never overruns the resolve).

import { Check, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './playground.css';
import type { VfsFile } from '../code/codeApi';
import { resolveProjectFiles } from './panes/playgroundApi';
import { SCAFFOLD_DELAY_MS } from './panes/starterProject';

// The build stages the kid sees tick through — intentionally GENERIC (work for
// any creation, not just games) and purely cosmetic (see file header).
const STEPS = [
  'Understanding your idea',
  'Designing the build',
  'Generating the code',
  'Wiring everything up',
  'Adding the finishing touches',
] as const;

// Spread the status ticks evenly across the (stubbed) build duration so they
// finish right as the scaffold resolves.
const STEP_INTERVAL_MS = SCAFFOLD_DELAY_MS / STEPS.length;

export function GeneratingScreen({
  prompt,
  name,
  projectId,
  onDone,
}: {
  prompt: string;
  /** The kid's game name (PRD J1) — labels the local scaffold when no backend. */
  name?: string;
  /** When set, the real project files are loaded from the backend (S3-backed). */
  projectId?: string;
  onDone: (files: VfsFile[]) => void;
}) {
  const [step, setStep] = useState(0);
  // Drives the progress bar: starts false, flips true on mount so the bar's
  // width transitions 0 → 100% smoothly (and monotonically) over the build span.
  const [filling, setFilling] = useState(false);
  // Keep the latest onDone without re-running the mount effect.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;

    // Cosmetic ticker: advance through the stages, capping at the last one.
    const ticker = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    // Kick off the progress-bar fill on the next frame (so the transition runs).
    const raf = requestAnimationFrame(() => setFilling(true));

    // Resolve the files (real backend load when projectId is set, else the local
    // scaffold). When it resolves, stop ticking and hand off.
    resolveProjectFiles({ projectId, prompt, name }).then((files) => {
      if (cancelled) return;
      window.clearInterval(ticker);
      onDoneRef.current(files);
    });

    return () => {
      cancelled = true;
      window.clearInterval(ticker);
      cancelAnimationFrame(raf);
    };
  }, [prompt, name, projectId]);

  return (
    <div className="pg-canvas fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-6 text-pg-text">
      {/* Prompt echo — the kid's request, shown while it builds. */}
      <p className="max-w-2xl text-center text-xl italic text-pg-text-dim">
        “{prompt}”
      </p>

      {/* Animated gradient orb — the waiting indicator. */}
      <Orb />

      {/* Staged status list. */}
      <ol className="flex flex-col gap-3 text-[17px]">
        {STEPS.map((label, i) => (
          <StatusRow key={label} label={label} state={rowState(i, step)} />
        ))}

        {/* Progress bar — fills smoothly 0 → 100% over the build span (linear,
            monotonic; no shimmer sweep). */}
        <li className="mt-2 h-2 w-[min(560px,80vw)] overflow-hidden rounded-full bg-pg-text/10">
          <div
            className="h-full rounded-full"
            style={{
              width: filling ? '100%' : '0%',
              transition: `width ${SCAFFOLD_DELAY_MS}ms linear`,
              backgroundImage:
                'linear-gradient(90deg, #FF7A66, #FF6BA9, #5DAEFF, #3DD9A9)',
            }}
          />
        </li>
      </ol>

      {/* Blocking caption — "loading" when opening a real project, else "building". */}
      <p className="font-extrabold text-pg-text-dim">
        {projectId ? 'Loading your game…' : 'Building your game…'}
      </p>
    </div>
  );
}

type RowState = 'done' | 'active' | 'pending';

function rowState(index: number, step: number): RowState {
  if (index < step) return 'done';
  if (index === step) return 'active';
  return 'pending';
}

function StatusRow({ label, state }: { label: string; state: RowState }) {
  return (
    <li
      className={`flex items-center gap-3 transition-all duration-300 ${
        state === 'pending' ? 'opacity-50' : 'opacity-100'
      } ${state === 'active' ? 'scale-[1.03]' : ''}`}
    >
      <span className="grid h-6 w-6 place-items-center">
        {state === 'done' && (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-mint/15 text-brand-mint">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        {state === 'active' && <Loader2 size={20} className="animate-spin text-brand-sky" />}
        {state === 'pending' && <span className="h-2 w-2 rounded-full bg-pg-text-muted" />}
      </span>
      <span
        className={
          state === 'active'
            ? 'bg-gradient-to-r from-brand-sky via-brand-bubblegum to-brand-mint bg-clip-text font-bold text-transparent'
            : state === 'done'
              ? 'text-pg-text-dim'
              : 'text-pg-text-muted'
        }
      >
        {label}
      </span>
    </li>
  );
}

// The spinning brand-gradient ring + soft glow + still core dot, from the mockup.
function Orb() {
  return (
    <div className="relative grid h-44 w-44 place-items-center">
      {/* Soft sky glow behind the ring. */}
      <div
        className="absolute h-40 w-40 rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(93,174,255,0.45) 0%, rgba(93,174,255,0) 70%)',
        }}
      />
      {/* Track + spinning gradient arc. */}
      <svg
        viewBox="0 0 160 160"
        className="pg-orb-spin h-40 w-40"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pg-orb-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF7A66" />
            <stop offset="0.33" stopColor="#FF6BA9" />
            <stop offset="0.66" stopColor="#5DAEFF" />
            <stop offset="1" stopColor="#3DD9A9" />
          </linearGradient>
        </defs>
        <circle
          cx="80"
          cy="80"
          r="64"
          fill="none"
          stroke="currentColor"
          className="text-pg-border"
          strokeWidth="6"
        />
        {/* ~three-quarter arc of the brand gradient. */}
        <path
          d="M 80 16 A 64 64 0 1 1 16 80"
          fill="none"
          stroke="url(#pg-orb-ring)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      {/* Still white core dot (not spun). */}
      <span className="absolute h-3 w-3 rounded-full bg-pg-text" />
    </div>
  );
}
