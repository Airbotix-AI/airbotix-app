// Mission Mode — the guided step checklist (learn-game-studio-prd §9A, D-GAME14).
//
// The 6th playground window. It answers the kid's real in-class question ("what
// do I do now?") with the lesson's ALREADY-AUTHORED steps, one at a time.
//
// Three rules shape everything here:
//  1. PROGRESSIVE REVEAL, but the kid is never TRAPPED (D-GAME14e revised).
//     Done steps collapse to a ✓ line and re-open on tap; the CURRENT step is
//     expanded with its instruction; every step AFTER it is LOCKED — it renders
//     fixed-length placeholder bars, never the authored title or instruction.
//     Only *peeking ahead* is gated: the kid can always tick the current step to
//     advance, and always untick a done step to go back.
//     The placeholder is a real placeholder, NOT a CSS blur of the real text: a
//     blur leaves the authored copy in the DOM (devtools, select-all, screen
//     readers) so it hides nothing. The bar widths are a fixed repeating pattern,
//     identical for every locked step, so they can't leak how long a title is.
//  2. Check-off is GUIDANCE, not the reward gate (D-GAME14c) — no Stars, no
//     acceptance. That is exactly what makes a manual, kid-controlled checkbox
//     safe: ticking every box farms nothing.
//  3. A teacher override is NEVER silent (§9A.4) — a step the teacher ticked for
//     a stuck kid says so, in the kid's own words.
//
// State (the query + the optimistic toggle) lives in `useMissionChecklist`, which
// the taskbar's `MissionStepChip` shares; the milestone celebration is hoisted to
// `missionCelebrationStore` so a tick from the taskbar celebrates even with this
// window closed. That celebration is CONFETTI ONLY — completing a step never opens a
// dialog (D-GAME14g); the milestone's words stay inline on the finished step row.
//
// An empty `steps` array is a NORMAL state (a free-play project, or a mission
// with no authored steps), not an error — the pane says so gently and the
// Workspace doesn't auto-open the window.

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, ListChecks, Loader2, Lock, PartyPopper } from 'lucide-react';

import { prefersReducedMotion } from '@/components/celebration/reducedMotion';
import type { MissionStep } from './missionApi';
import { useMissionChecklist } from './useMissionChecklist';

interface MissionPaneProps {
  /** The real backend project. Absent (a project-less session) ⇒ nothing to read. */
  projectId?: string;
  /** Teacher live viewer (D-LV-6) — read the checklist, never write it. */
  readOnly?: boolean;
}

/**
 * FIXED skeleton-bar widths for a locked step — the SAME pattern for every locked
 * row on purpose. Deriving a width from the real title's length would leak how
 * long it is, which is the thing the placeholder exists to hide.
 */
const LOCKED_BAR_WIDTHS = ['70%', '45%'] as const;

/** How long the newly-current step keeps its arrival highlight. */
const SETTLE_MS = 900;

export function MissionPane({ projectId, readOnly = false }: MissionPaneProps) {
  const {
    steps,
    completed,
    teacherMarked,
    currentIndex,
    currentStep,
    total,
    doneCount,
    allDone,
    isPending,
    isError,
    refetch,
    toggle,
  } = useMissionChecklist({ projectId, readOnly });

  // A DONE step re-opens on tap (going back is always allowed). Cleared on a
  // toggle so the checklist returns to "what's still left", and when the project
  // changes. Steps AHEAD are locked and have no open state at all.
  const [openDoneId, setOpenDoneId] = useState<string | null>(null);
  useEffect(() => {
    setOpenDoneId(null);
  }, [projectId]);

  // Scroll-to-next: when the current step CHANGES (a tick advanced the
  // checklist), bring the new one into view inside this pane's scroll container
  // and let it settle. Never fires on first load (`prev === null`), and no-ops
  // when the pane isn't on screen — the element ref is simply null then, which is
  // the normal case for a tick made from the taskbar with this window closed.
  const currentRef = useRef<HTMLLIElement | null>(null);
  const previousCurrentIdRef = useRef<string | null>(null);
  const [settling, setSettling] = useState(false);
  const currentStepId = currentStep?.id ?? null;
  useEffect(() => {
    const previous = previousCurrentIdRef.current;
    previousCurrentIdRef.current = currentStepId;
    if (!currentStepId || previous === null || previous === currentStepId) return undefined;
    const el = currentRef.current;
    // jsdom (and a closed/unmounted pane) has no element to scroll — degrade, never throw.
    if (!el || typeof el.scrollIntoView !== 'function') return undefined;
    const reduced = prefersReducedMotion();
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    if (reduced) return undefined;
    setSettling(true);
    const timer = window.setTimeout(() => setSettling(false), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [currentStepId]);

  const onToggle = (step: MissionStep, done: boolean) => {
    setOpenDoneId(null);
    toggle(step, done);
  };

  const lockedCount = steps.filter((s, i) => !completed.has(s.id) && i > currentIndex).length;
  // `currentIndex` is -1 once every step is done; the "last completed" row is then the
  // final one, so normalise to the end of the list for the untick rule below.
  const currentIndexOrEnd = currentIndex < 0 ? steps.length : currentIndex;

  return (
    <div
      data-testid="mission-pane"
      className="relative flex h-full min-h-0 flex-col bg-pg-surface text-pg-text"
    >
      <header className="shrink-0 border-b border-pg-border px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-mint/15">
            <ListChecks size={16} className="text-brand-mint" />
          </span>
          <h2 className="text-[14px] font-extrabold">Your mission</h2>
        </div>
        {total > 0 && (
          <>
            <p
              data-testid="mission-progress"
              className="mt-2 text-[12px] font-bold text-pg-text-dim"
            >
              {allDone
                ? `All ${total} steps done!`
                : `Step ${Math.max(currentIndex, 0) + 1} of ${total}`}
            </p>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-pg-text/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={doneCount}
              aria-label="Steps ticked"
            >
              <div
                className="h-full rounded-full bg-brand-mint transition-[width] duration-300"
                style={{ width: `${(doneCount / total) * 100}%` }}
              />
            </div>
          </>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3 pg-scroll">
        {isPending && projectId ? (
          <p className="flex items-center gap-2 text-[13px] text-pg-text-dim">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Loading your steps…
          </p>
        ) : isError ? (
          <div data-testid="mission-error" className="text-[13px] text-pg-text-dim">
            <p className="font-bold text-pg-text">We couldn&apos;t load your steps.</p>
            <p className="mt-1">Your game is safe — this is just the checklist.</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 rounded-full border border-pg-border px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-pg-text/5"
            >
              Try again
            </button>
          </div>
        ) : total === 0 ? (
          // NORMAL state — a free-play game, or a mission with no authored steps.
          <div data-testid="mission-empty" className="text-[13px] text-pg-text-dim">
            <p className="text-[15px] font-extrabold text-pg-text">No mission steps here</p>
            <p className="mt-1.5 leading-snug">
              This project doesn&apos;t have a step-by-step mission. Build whatever you like — ask
              the AI in Chat for your next idea.
            </p>
          </div>
        ) : (
          <>
            <ol className="space-y-2">
              {steps.map((step, index) => {
                const isDone = completed.has(step.id);
                const isCurrent = index === currentIndex;
                // Sequential check-off (D-M12): the only two rows a kid may toggle are the
                // CURRENT step (tick forward) and the LAST completed one (untick back).
                const isTogglable = isCurrent || index === currentIndexOrEnd - 1;
                // Everything after the current step stays sealed. A step the
                // TEACHER ticked ahead of the kid is `done`, never locked.
                const isLocked = !isDone && !isCurrent;

                if (isLocked) {
                  return (
                    <li
                      key={step.id}
                      data-testid={`mission-step-${step.id}`}
                      data-state="locked"
                      // Non-interactive and invisible to assistive tech — the
                      // group is summarised once below instead.
                      aria-hidden="true"
                      className="select-none rounded-2xl border border-pg-border bg-pg-surface-2 px-3 py-2.5 opacity-70"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border border-pg-border bg-pg-text/5">
                          <Lock size={10} className="text-pg-text-muted" />
                        </span>
                        {/* FAKE fixed-length bars — the authored title and
                            instruction are NOT rendered for a locked step. */}
                        <span className="min-w-0 flex-1 blur-[2px]">
                          {LOCKED_BAR_WIDTHS.map((width, bar) => (
                            <span
                              key={width}
                              style={{ width }}
                              className={clsx(
                                'block h-2.5 rounded-full bg-pg-text/15',
                                bar > 0 && 'mt-1.5',
                              )}
                            />
                          ))}
                        </span>
                      </div>
                    </li>
                  );
                }

                const isOpen = isCurrent || step.id === openDoneId;
                const byTeacher = teacherMarked.has(step.id);
                return (
                  <li
                    key={step.id}
                    ref={isCurrent ? currentRef : undefined}
                    data-testid={`mission-step-${step.id}`}
                    data-state={isDone ? 'done' : 'current'}
                    className={clsx(
                      'rounded-2xl border px-3 py-2.5 transition-colors',
                      isCurrent
                        ? 'border-brand-mint/50 bg-brand-mint/10'
                        : 'border-pg-border bg-pg-surface-2',
                      isCurrent && settling && 'pg-step-settle',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        data-testid={`mission-step-checkbox-${step.id}`}
                        checked={isDone}
                        // Sequential check-off (D-M12): tick only the CURRENT step, untick
                        // only the LAST completed one. An earlier done step stays ticked and
                        // visibly locked rather than throwing STEP_OUT_OF_ORDER when tapped
                        // — the server enforces the same rule, this just stops a child
                        // meeting an error for something the UI let them try.
                        disabled={readOnly || !isTogglable}
                        onChange={(e) => onToggle(step, e.target.checked)}
                        aria-label={
                          isTogglable
                            ? `Mark step ${index + 1}, ${step.title}, as done`
                            : `Step ${index + 1}, ${step.title}, is finished. Un-tick the most recent step first.`
                        }
                        className={clsx(
                          'mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-mint',
                          !isTogglable && !readOnly && 'cursor-not-allowed opacity-60',
                        )}
                      />
                      {isDone ? (
                        // Going back is always allowed — a done step re-opens.
                        <button
                          type="button"
                          onClick={() => setOpenDoneId(isOpen ? null : step.id)}
                          aria-expanded={isOpen}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex items-center gap-1.5 text-[13px] font-bold text-pg-text-dim line-through">
                            <Check size={13} className="shrink-0 text-brand-mint" aria-hidden="true" />
                            <span className="min-w-0">{step.title}</span>
                          </span>
                          {/* The milestone's WORDS live here, inline on the step the kid
                              just finished — not in a dialog (D-GAME14g). The confetti
                              marks the moment; this keeps the message afterwards, and it
                              is still there when they scroll back later. */}
                          {step.milestone && (
                            <span
                              data-testid={`mission-milestone-${step.id}`}
                              className="mt-1 flex items-start gap-1 text-[11.5px] font-extrabold text-brand-sunshine"
                            >
                              <PartyPopper size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                              <span className="min-w-0">{step.milestone}</span>
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-pg-text">
                            {step.title}
                          </span>
                          {step.milestone && (
                            <span className="mt-1 inline-block rounded-full bg-brand-sunshine/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-pg-text-dim">
                              Milestone
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {isOpen && step.instruction_md && (
                      <p className="ml-[28px] mt-1.5 whitespace-pre-line text-[12.5px] leading-snug text-pg-text-dim">
                        {step.instruction_md}
                      </p>
                    )}
                    {byTeacher && (
                      <p
                        data-testid="mission-teacher-marked"
                        data-step-id={step.id}
                        className="ml-[28px] mt-1.5 text-[11.5px] font-bold text-brand-sky"
                      >
                        Your teacher marked this done
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            {lockedCount > 0 && (
              // The ONE accessible summary standing in for every aria-hidden
              // locked row above.
              <p
                data-testid="mission-locked-hint"
                className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-bold text-pg-text-muted"
              >
                <Lock size={11} aria-hidden="true" />
                {lockedCount === 1
                  ? '1 more step unlocks as you go'
                  : `${lockedCount} more steps unlock as you go`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
