// GeneratingScreen — the blocking "building your game" screen shown between the
// landing prompt and the workspace. Matches docs/mockup-generating.png: dark
// vignette canvas, echoed prompt, a spinning brand-gradient orb, a staged status
// list that ticks through, a progress bar, and a "Building your game…" caption.
//
// It owns NO product logic: it calls the stubbed `generateScaffold(prompt)`
// (panes/starterProject.ts) once on mount and hands the resulting VFS to
// `onDone`. The staged status is purely cosmetic timing — it advances on a timer
// and is decoupled from when the scaffold actually resolves (the stub delays
// ~1.8s; the steps cap at the last so the list never overruns the resolve).

import { useEffect, useRef, useState } from 'react';
import './playground.css';
import type { VfsFile } from '../code/codeApi';
import { generateScaffold } from './panes/starterProject';

// The build stages the kid sees tick through. Cosmetic — see file header.
const STEPS = [
  'Planning the game',
  'Creating scenes & files',
  'Writing game.js',
  'Wiring up the stage',
] as const;

// How often the cosmetic status list advances one step.
const STEP_INTERVAL_MS = 450;

// Near-black canvas vignette from the mockup (#17121F → #0F0B18). Raw hex is
// allowed here per the task: there are no design tokens for these dark stops.
const CANVAS_BG = 'radial-gradient(70% 70% at 50% 40%, #17121F 0%, #0F0B18 100%)';

export function GeneratingScreen({
  prompt,
  onDone,
}: {
  prompt: string;
  onDone: (files: VfsFile[]) => void;
}) {
  const [step, setStep] = useState(0);
  // Keep the latest onDone without re-running the mount effect.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;

    // Cosmetic ticker: advance through the stages, capping at the last one.
    const ticker = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    // The real (stubbed) work. When it resolves, stop ticking and hand off.
    generateScaffold(prompt).then((files) => {
      if (cancelled) return;
      window.clearInterval(ticker);
      onDoneRef.current(files);
    });

    return () => {
      cancelled = true;
      window.clearInterval(ticker);
    };
  }, [prompt]);

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-6 text-canvas-pure"
      style={{ background: CANVAS_BG }}
    >
      {/* Prompt echo — the kid's request, shown while it builds. */}
      <p className="max-w-2xl text-center text-xl italic text-stone2">
        “{prompt}”
      </p>

      {/* Animated gradient orb — the waiting indicator. */}
      <Orb />

      {/* Staged status list. */}
      <ol className="flex flex-col gap-3 text-[17px]">
        {STEPS.map((label, i) => (
          <StatusRow key={label} label={label} state={rowState(i, step)} />
        ))}

        {/* Progress bar — fills with the current step. */}
        <li className="mt-2 h-2 w-[min(560px,80vw)] overflow-hidden rounded-full bg-[#221E30]">
          <div
            className="pg-shimmer h-full rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${progressPct}%`,
              backgroundImage:
                'linear-gradient(90deg, #FF7A66, #FF6BA9, #5DAEFF, #3DD9A9)',
            }}
          />
        </li>
      </ol>

      {/* Blocking caption. */}
      <p className="font-extrabold text-stone2">Building your game…</p>
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
  const isGameJs = label === 'Writing game.js';
  return (
    <li className="flex items-center gap-3">
      <span className="w-4 text-center font-extrabold">
        {state === 'done' && <span className="text-brand-mint">✓</span>}
        {state === 'active' && (
          <span className="pg-orb-spin inline-block text-brand-sky">⟳</span>
        )}
        {state === 'pending' && <span className="text-steel">•</span>}
      </span>
      <span
        className={
          state === 'pending'
            ? 'text-steel'
            : state === 'active'
              ? 'font-bold text-canvas-pure'
              : 'text-stone2'
        }
      >
        {isGameJs ? (
          <>
            Writing <span className="font-mono">game.js</span>…
          </>
        ) : (
          label
        )}
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
          stroke="#3A3548"
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
      <span className="absolute h-3 w-3 rounded-full bg-canvas-pure" />
    </div>
  );
}
