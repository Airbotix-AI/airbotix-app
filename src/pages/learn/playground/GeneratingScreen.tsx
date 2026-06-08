// GeneratingScreen — the blocking "building your game" screen shown between the
// landing prompt and the workspace. Matches docs/mockup-generating.png: dark
// vignette canvas, echoed prompt, a spinning brand-gradient orb, a staged status
// list that ticks through, a progress bar, and a "Building your game…" caption.
//
// It owns NO product logic: on mount it calls `resolveProjectFiles` once and
// hands the resulting VFS to `onDone`. For a real project the backend is the
// source of truth (no scaffold fallback) — if it can't load, `onError` fires and
// the caller shows an error + returns to project creation; the local scaffold is
// only for a project-less session. The staged status is purely cosmetic
// timing — it advances on a timer, decoupled from when the files resolve (the
// steps cap at the last so the list never overruns the resolve).

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
  onError,
}: {
  prompt: string;
  /** The kid's game name (PRD J1) — labels the local scaffold when no backend. */
  name?: string;
  /** When set, the real project files are loaded from the backend (S3-backed). */
  projectId?: string;
  onDone: (files: VfsFile[]) => void;
  /** Loading the real project failed — no scaffold fallback; the caller errors out. */
  onError?: (err: unknown) => void;
}) {
  const [step, setStep] = useState(0);
  // Drives the progress bar: starts false, flips true on mount so the bar's
  // width transitions 0 → 100% smoothly (and monotonically) over the build span.
  const [filling, setFilling] = useState(false);
  // Keep the latest callbacks without re-running the mount effect.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Building = a NEW game from a typed prompt → the full "building your game"
  // animation. Resuming an existing project has no prompt → load only, no build phase.
  const building = prompt.trim().length > 0;

  useEffect(() => {
    let cancelled = false;

    // Cosmetic ticker: advance through the stages, capping at the last one.
    const ticker = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    // Kick off the progress-bar fill on the next frame (so the transition runs).
    const raf = requestAnimationFrame(() => setFilling(true));

    // Resolve the files (real backend load when projectId is set, else the local
    // scaffold). For a NEW build the load resolves almost instantly, so hold the
    // hand-off until the staged animation has played its full `SCAFFOLD_DELAY_MS`.
    // For a RESUME (no prompt) hand off as soon as the VFS loads — no build phase.
    const startedAt = Date.now();
    let doneTimer = 0;
    resolveProjectFiles({ projectId, prompt, name })
      .then((files) => {
        if (cancelled) return;
        const remaining = building
          ? Math.max(0, SCAFFOLD_DELAY_MS - (Date.now() - startedAt))
          : 0;
        doneTimer = window.setTimeout(() => {
          if (cancelled) return;
          window.clearInterval(ticker);
          onDoneRef.current(files);
        }, remaining);
      })
      .catch((err) => {
        // Real project couldn't load → no fallback; the caller shows an error
        // and sends the kid back to project creation.
        if (cancelled) return;
        window.clearInterval(ticker);
        onErrorRef.current?.(err);
      });

    return () => {
      cancelled = true;
      window.clearInterval(ticker);
      cancelAnimationFrame(raf);
      if (doneTimer) window.clearTimeout(doneTimer);
    };
  }, [prompt, name, projectId, building]);

  return (
    <div className="pg-canvas fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-6 text-pg-text">
      {/* Prompt echo — the kid's request, only while BUILDING a new game. */}
      {building && (
        <p className="max-w-2xl text-center text-xl italic text-pg-text-dim">
          “{prompt}”
        </p>
      )}

      {/* Animated gradient orb — the waiting indicator (build + resume). */}
      <Orb />

      {/* Staged "building" status list + progress bar — only for a NEW build,
          never on resume (resuming just loads the saved game). */}
      {building && (
        <ol className="flex flex-col gap-3 text-[17px]">
          {STEPS.map((label, i) => (
            <StatusRow key={label} label={label} state={rowState(i, step)} />
          ))}

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
      )}

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
