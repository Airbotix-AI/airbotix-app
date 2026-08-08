// The CURRENT mission step, surfaced in the bottom taskbar (§9A, D-GAME14).
//
// Mission Mode's window is one of six and is often closed or buried, so "what do
// I do now?" was still a click away. This chip keeps the answer permanently on
// screen — and tickable — in BOTH layout modes (the Taskbar is shared).
//
// It is a STATUS + ACTION chip, not a window button: it carries brand-mint
// prominence (mint wash + mint ring + a breathing ring) so it reads clearly apart
// from the neutral window buttons beside it. The breathing ring is held still
// under `prefers-reduced-motion` (playground.css).
//
// TWO layout rules make it a STABLE landmark instead of something that jumps:
//  1. It sits in the taskbar's LEFT cluster (right after the theme toggle) with
//     its own divider — NOT in the window-button group, whose width changes every
//     time a window opens, closes or minimizes. It owns that divider so the dock
//     never shows an orphaned separator on a mission-less project.
//  2. Its width is FIXED and it never grows (`shrink-0`, no `flex-1`). A chip
//     that absorbed leftover dock space, or resized to its step title, would
//     shove everything after it sideways on every tick and every window toggle —
//     the same instability in a different form. The title truncates inside and
//     stays whole in `title=` and in the checkbox's `aria-label`.
//
// It shares `useMissionChecklist` with `MissionPane`, so both surfaces show the
// same state and a tick here is the same mutation (and celebrates the same way,
// even with the Mission window closed).

import { useRef } from 'react';
import clsx from 'clsx';
import { PartyPopper } from 'lucide-react';

import { prefersReducedMotion } from '@/components/celebration/reducedMotion';
import { useMissionChecklist } from '../panes/useMissionChecklist';

interface MissionStepChipProps {
  /** The real backend project. Absent ⇒ no checklist, so nothing to show. */
  projectId?: string;
  /**
   * The Mission this project backs (D-GAME14). Null/absent ⇒ a free-play game:
   * the chip shows nothing AND never fetches, so the always-mounted dock costs a
   * mission-less project no request at all.
   */
  missionId?: string | null;
  /** Teacher live viewer (D-LV-6) — read the step, never tick it. */
  readOnly?: boolean;
}

/** One face of the wheel — what the chip reads at a given step. */
interface WheelFace {
  title: string;
  /** `null` on the finished face, which has no "Step N of M" to show. */
  cue: string | null;
}

export function MissionStepChip({ projectId, missionId, readOnly = false }: MissionStepChipProps) {
  const { currentStep, currentIndex, total, allDone, isPending, isError, toggle } =
    useMissionChecklist({ projectId, readOnly, enabled: !!missionId });

  const face: WheelFace | null = allDone
    ? { title: 'All done 🎉', cue: null }
    : currentStep
      ? { title: currentStep.title, cue: `Step ${currentIndex + 1} of ${total}` }
      : null;
  // What the wheel is showing. The finished state is its own face, so the LAST
  // tick rolls the final step away into "All done" like any other advance.
  const faceKey = allDone ? 'all-done' : (currentStep?.id ?? null);

  // Odometer state, derived during render and held in refs so a re-render that
  // does NOT change the step can never cancel an in-flight roll (a timer could).
  // `previous` is the face to roll OUT; it stays null until the SECOND face we
  // ever show, so the chip never animates on first load — that reads as a glitch.
  const wheel = useRef<{ key: string | null; previous: WheelFace | null }>({
    key: null,
    previous: null,
  });
  const shownFace = useRef<WheelFace | null>(null);
  if (faceKey !== wheel.current.key) {
    wheel.current = {
      key: faceKey,
      previous: wheel.current.key !== null ? shownFace.current : null,
    };
  }
  shownFace.current = face;

  // Nothing to say: no project, no mission, no authored steps, still loading, or
  // the checklist failed to load (the pane owns the error copy — the dock stays
  // quiet rather than shouting an error at the kid mid-build).
  if (!projectId || !missionId || isPending || isError || total === 0 || !face) return null;

  // The CSS guard block also holds the roll still under reduced motion; dropping
  // the outgoing face here as well means the movement is never even rendered.
  const rolling = wheel.current.previous !== null && !prefersReducedMotion();

  return (
    <>
      {/* This chip's own divider — the dock's separator idiom, owned here so a
          mission-less project shows no orphaned line. */}
      <span aria-hidden className="h-5 w-px shrink-0 bg-pg-border" />
      <span
        data-testid="mission-taskbar-chip"
        data-state={allDone ? 'done' : 'current'}
        title={face.title}
        className={clsx(
          // FIXED width, never grows: the dock must not reflow when a window
          // opens/closes or when the step title changes length.
          'inline-flex h-9 w-[264px] shrink-0 items-center gap-2 overflow-hidden rounded-full border border-brand-mint/60 bg-brand-mint/15 px-3 text-pg-text',
          !allDone && 'pg-mission-chip',
        )}
      >
        {allDone ? (
          <PartyPopper size={17} className="shrink-0 text-brand-mint" aria-hidden="true" />
        ) : (
          <input
            type="checkbox"
            data-testid="mission-taskbar-checkbox"
            checked={false}
            disabled={readOnly}
            onChange={(e) => currentStep && toggle(currentStep, e.target.checked)}
            aria-label={`Mark step ${currentIndex + 1}, ${currentStep?.title ?? ''}, as done`}
            className="h-[17px] w-[17px] shrink-0 accent-brand-mint"
          />
        )}
        {/* The wheel WINDOW. Two things are load-bearing here:
            - `overflow-hidden` is what sells the roll as a WHEEL rather than a
              fade — the outgoing face is CLIPPED, not faded out.
            - `h-7` pins it to EXACTLY ONE face (the same height as a WheelCell).
              Without it the window has no height of its own, so mid-roll it grows
              to the full two-face track (56px) inside a 36px chip and the chip
              clips it through the middle — both faces show, each cut in half.
              A one-face window is also what makes the track's `-50%` translate a
              true odometer: one face out, exactly one face in. */}
        <span className="block h-7 min-w-0 flex-1 overflow-hidden">
          {/* The track. A keyed remount replays the CSS animation — no timers. */}
          <span
            key={wheel.current.key ?? 'face'}
            data-testid="mission-taskbar-label"
            data-rolling={rolling ? 'true' : 'false'}
            className={clsx('block', rolling && 'pg-wheel-roll')}
          >
            {rolling && wheel.current.previous && (
              // The finished face, rolling up and out of the window. Decorative.
              <WheelCell face={wheel.current.previous} aria-hidden="true" />
            )}
            <WheelCell face={face} />
          </span>
        </span>
      </span>
    </>
  );
}

/** One line of the wheel: the step title over its "Step N of M" cue. */
function WheelCell({ face, ...rest }: { face: WheelFace; 'aria-hidden'?: 'true' }) {
  return (
    <span className="flex h-7 flex-col justify-center" {...rest}>
      <span className="truncate text-[12.5px] font-extrabold leading-tight">{face.title}</span>
      {face.cue && (
        <span className="truncate text-[10px] font-bold leading-tight text-pg-text-dim">
          {face.cue}
        </span>
      )}
    </span>
  );
}
