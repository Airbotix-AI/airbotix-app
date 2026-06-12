// The shared guided-tour overlay for the `/try/*` demos (try-demo-mode-prd §2
// D-DEMO-05 / §3 v2 placement rules): a step card (title + explanation addressed
// to the ADULT evaluator), progress dots, Next / Back, and "Skip tour" (hideable
// per step — the landing step is not skippable). Each step carries a PLACEMENT
// hint so the card never covers the surface it points at (landing input, runner,
// editor, asset viewer). A `modal` step dims and blocks the studio behind it;
// every other step floats so the REAL studio underneath stays fully interactive.
// Steps that point at an area can carry a SPOTLIGHT selector: everything except
// that area is dimmed — one ring div whose giant box-shadow is the scrim
// (`shadow-spotlight-scrim`), so the rounded cut-out and the dim are a single
// animatable box — purely visual (pointer-events: none), the studio stays
// fully interactive, including inside the spotlight.
// K-12 design-system tokens only — this layer never restyles the studio.

import clsx from 'clsx';
import { useEffect, useState } from 'react';

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
  /**
   * CSS selector of the area this step points at. Everything else is dimmed
   * (visual only — nothing is blocked) so the user knows where to look/act.
   */
  spotlight?: string;
}

/** Padding around the spotlighted element's rect. */
const SPOT_PAD = 8;

type SpotRect = { left: number; top: number; right: number; bottom: number };

/** The whole viewport — every spotlight OPENS from here and shrinks onto its
 *  target, so the dim visibly "closes in" on where the user should look. */
const fullViewport = (): SpotRect => ({
  left: 0,
  top: 0,
  right: window.innerWidth,
  bottom: window.innerHeight,
});

/**
 * Dim everything EXCEPT the spotlighted element. One div is both the cut-out
 * and the scrim: its enormous box-shadow darkens everything around it and —
 * unlike scrim panels — follows the border-radius, so the hole has properly
 * ROUNDED corners. Mounts at full-viewport and animates down onto the target
 * (and between targets on step change); re-measures on resize and capture-phase
 * scroll; renders nothing if the selector matches nothing.
 */
function SpotlightMask({ selector, dark }: { selector: string; dark?: boolean }) {
  const [rect, setRect] = useState<SpotRect | null>(() =>
    typeof window === 'undefined' ? null : fullViewport(),
  );

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(selector);
      // A zero-size rect = the target isn't really on screen (e.g. a Monaco
      // content widget that exists but is hidden) — treat it as not found.
      const r = el?.getBoundingClientRect();
      if (!el || !r || r.width <= 0 || r.height <= 0) {
        setRect(null);
        return;
      }
      const next: SpotRect = {
        left: Math.max(0, r.left - SPOT_PAD),
        top: Math.max(0, r.top - SPOT_PAD),
        right: r.right + SPOT_PAD,
        bottom: r.bottom + SPOT_PAD,
      };
      // Bail on no movement so the poll doesn't re-render every tick.
      setRect((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.right === next.right &&
        prev.bottom === next.bottom
          ? prev
          : next,
      );
    };
    // First measure TWO frames out: the full-viewport mount state gets a
    // painted frame (so the shrink onto the target actually transitions) AND
    // any focus/window change the step's action fired has settled first.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(measure);
    });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    // Playground windows are DRAGGABLE (react-rnd) — no resize/scroll event
    // fires while one moves, so poll lightly too. `setRect` bails on equal
    // values (see measure), so the idle cost is one rect read per tick.
    const tick = setInterval(measure, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector]);

  if (!rect) return null;
  return (
    <div data-testid="tour-spotlight" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        data-testid="tour-spotlight-ring"
        // Transition ONLY the box geometry — including the giant scrim
        // box-shadow in the transition list makes every retarget repaint the
        // whole shadow per frame (visible stutter on card swaps). The scrim
        // follows the STUDIO's live theme (`darkUi`): ink@50% over an
        // already-dark UI is imperceptible, so dark themes get black@70%.
        className={clsx(
          'pointer-events-none absolute rounded-[22px] border-[3px] border-brand-coral/80 transition-[left,top,width,height] duration-500 ease-out motion-reduce:transition-none',
          dark ? 'shadow-spotlight-scrim-dark' : 'shadow-spotlight-scrim',
        )}
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
        }}
      />
    </div>
  );
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
  /**
   * While an action is in flight the engine can point the spotlight at the
   * surface where the action is HAPPENING (e.g. the Chat window from the
   * moment a scripted ask is clicked, before the message even sends) —
   * overriding the current card's own spotlight until the next card lands.
   */
  spotlightOverride?: string | null;
  /**
   * The studio under the overlay is showing its DARK theme. Pages pass their
   * studio's LIVE theme store value (never a media query — the workspace theme
   * is a store toggle), so the scrim/backdrop stay visible over dark surfaces
   * and a mid-tour theme flip re-picks them immediately.
   */
  darkUi?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function DemoTourOverlay({
  steps,
  step,
  busy,
  spotlightOverride,
  darkUi,
  onNext,
  onBack,
  onSkip,
}: DemoTourOverlayProps) {
  const current = steps[step];
  if (!current) return null;
  const placement = current.placement ?? (current.modal ? 'center' : 'bottom-right');
  const spotlight = spotlightOverride ?? current.spotlight;

  return (
    <div
      data-testid="demo-tour"
      data-dark-ui={darkUi || undefined}
      className="pointer-events-none fixed inset-0 z-[120]"
    >
      {current.modal && (
        <div
          data-testid="demo-tour-backdrop"
          className={clsx(
            'pointer-events-auto absolute inset-0',
            darkUi ? 'bg-black/70' : 'bg-ink/60', // same dark-legibility rule as the scrim
          )}
        />
      )}
      {!current.modal && spotlight && <SpotlightMask selector={spotlight} dark={darkUi} />}
      {/* Placement (absolute + translate) lives on the OUTER wrapper; the card
          itself remounts per step (key) with a short rise/fade entrance, so a
          placement jump reads as a new card arriving — not the old one teleporting.
          The entrance transform can't clash with the placement translate because
          they're on different elements. Reduced-motion: no animation. */}
      <div
        className={clsx(
          'pointer-events-auto absolute w-[min(420px,calc(100vw-2rem))]',
          PLACEMENT_CLASS[placement],
        )}
      >
      <div
        key={step}
        data-testid="tour-card"
        data-placement={placement}
        className="animate-tour-card-in rounded-3xl bg-white p-6 text-ink shadow-2xl motion-reduce:animate-none"
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
    </div>
  );
}
