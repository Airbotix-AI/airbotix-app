// The shared guided-tour overlay for the `/try/*` demos (try-demo-mode-prd §2
// D-DEMO-05 / §3 v2 placement rules): a step card (title + explanation addressed
// to the ADULT evaluator), progress dots, Next / Back, and "Skip tour" (hideable
// per step — the landing step is not skippable). Each step carries a PLACEMENT
// hint so the card never covers the surface it points at (landing input, runner,
// editor, asset viewer). A `modal` step dims and blocks the studio behind it;
// every other step floats so the REAL studio underneath stays fully interactive.
// K-12 design-system tokens only — this layer never restyles the studio.

import clsx from 'clsx';

/** Where a step's card sits, chosen so it never covers the step's surface. */
export type DemoTourPlacement =
  | 'center'
  | 'beside-input' // beside the landing prompt box (bottom-center on narrow screens)
  | 'bottom-left' // clear of the Game Runner (right column)
  | 'bottom-right' // clear of the Code Editor (lower-left)
  | 'top-right'; // clear of the bottom half

export interface DemoTourStep {
  title: string;
  /** Adult-facing explanation (what the child does / why it's safe). */
  body: string;
  /** Label for the advance button (default "Next →"). Keep these SHORT — the
   *  pill truncates rather than overflow the card. */
  nextLabel?: string;
  /** Dim + block the studio behind the card (intro steps). */
  modal?: boolean;
  /** Card position (defaults to `center` for modal steps, else `bottom-right`). */
  placement?: DemoTourPlacement;
  /** Hide "Skip tour" on this step (§3 step 1 — the landing step is mandatory). */
  hideSkip?: boolean;
}

const PLACEMENT_CLASS: Record<DemoTourPlacement, string> = {
  center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
  // Beside the centred landing prompt box (max-w-3xl = 48rem): on xl+ screens a
  // narrower card sits in the free left column; below xl it drops to the bottom
  // centre — either way it never covers the input.
  'beside-input':
    'max-xl:bottom-6 max-xl:left-1/2 max-xl:-translate-x-1/2 ' +
    'xl:left-4 xl:top-1/2 xl:-translate-y-1/2 xl:w-[min(20rem,calc(50vw-26rem))]',
  'bottom-left': 'bottom-20 left-4',
  'bottom-right': 'bottom-20 right-4',
  'top-right': 'right-4 top-16',
};

interface DemoTourOverlayProps {
  steps: DemoTourStep[];
  /** The visible step index (controlled by the page). */
  step: number;
  /** Disables Next while a scripted turn is in flight. */
  busy?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function DemoTourOverlay({ steps, step, busy, onNext, onBack, onSkip }: DemoTourOverlayProps) {
  const current = steps[step];
  if (!current) return null;
  const placement = current.placement ?? (current.modal ? 'center' : 'bottom-right');

  return (
    <div data-testid="demo-tour" className="pointer-events-none fixed inset-0 z-[120]">
      {current.modal && (
        <div data-testid="demo-tour-backdrop" className="pointer-events-auto absolute inset-0 bg-ink/60" />
      )}
      <div
        data-testid="tour-card"
        data-placement={placement}
        className={clsx(
          'pointer-events-auto absolute w-[min(420px,calc(100vw-2rem))] rounded-3xl bg-white p-6 text-ink shadow-2xl',
          PLACEMENT_CLASS[placement],
        )}
      >
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-mint">
          Step {step + 1} of {steps.length}
        </span>
        <h2 data-testid="tour-title" className="mt-1.5 text-[21px] font-extrabold leading-snug">
          {current.title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">{current.body}</p>

        {/* Wrap-friendly controls (≥44px touch targets): the action pills keep
            their single-line shape, the ROW wraps when they don't fit beside the
            dots, and the Next pill truncates rather than overflow the card. */}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                data-testid="tour-dot"
                className={clsx(
                  'h-2 rounded-full transition-all',
                  i === step ? 'w-5 bg-brand-coral' : 'w-2 bg-ink/15',
                )}
              />
            ))}
          </div>
          <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
            {!current.hideSkip && (
              <button
                type="button"
                data-testid="tour-skip"
                onClick={onSkip}
                className="min-h-11 whitespace-nowrap rounded-full px-3 text-[13px] font-bold text-ink/60 transition-colors hover:text-ink"
              >
                Skip tour
              </button>
            )}
            {step > 0 && (
              <button
                type="button"
                data-testid="tour-back"
                onClick={onBack}
                className="min-h-11 whitespace-nowrap rounded-full border-2 border-ink/15 px-4 text-[13px] font-extrabold transition-colors hover:bg-ink/5"
              >
                Back
              </button>
            )}
            <button
              type="button"
              data-testid="tour-next"
              onClick={onNext}
              disabled={busy}
              className="min-h-11 max-w-full truncate rounded-full bg-brand-coral px-5 text-[13px] font-extrabold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {busy ? 'Airo is working…' : (current.nextLabel ?? 'Next →')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
