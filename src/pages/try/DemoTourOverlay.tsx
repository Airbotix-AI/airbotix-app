// The shared guided-tour overlay for the `/try/*` demos (try-demo-mode-prd §2
// D-DEMO-05 / §3 v2 placement rules): a step card (title + explanation addressed
// to the ADULT evaluator), progress dots, Next / Back, and "Skip tour" (hideable
// per step — the landing step is not skippable). Each step carries a PLACEMENT
// hint so the card never covers the surface it points at (landing input, runner,
// editor, asset viewer). A `modal` step dims and blocks the studio behind it;
// every other step floats so the REAL studio underneath stays fully interactive.
// Steps that point at an area can carry a SPOTLIGHT selector: everything except
// that area is DE-EMPHASIZED (backdrop grayscale + dim + slight blur outside a
// rounded clip-path cut-out; dark = grayscale, light = desaturated) —
// purely visual (pointer-events:
// none), the studio stays fully interactive, including inside the spotlight.
// K-12 design-system tokens only — this layer never restyles the studio.

import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Where a step's card sits, chosen so it never covers the step's surface. */
export type DemoTourPlacement =
  | 'center'
  | 'beside-input' // beside the landing prompt box (bottom-center on narrow screens)
  | 'top-left' // split mode: over the conversation's OLD messages, never its tail
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
  /**
   * Preferred anchor sides for THIS card, tried in order (default:
   * below → above → right → left). Also an exclusion list: omitted sides are
   * never used — e.g. the landing card omits 'above' so it can never sit on
   * the studio logo above the prompt box.
   */
  anchorPrefer?: AnchorSide[];
}

export type AnchorSide = 'below' | 'above' | 'right' | 'left';
const DEFAULT_ANCHOR_ORDER: AnchorSide[] = ['below', 'above', 'right', 'left'];

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
function useSpotRect(selector: string | undefined): SpotRect | null {
  const [rect, setRect] = useState<SpotRect | null>(() =>
    typeof window === 'undefined' || !selector ? null : fullViewport(),
  );

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
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

  return rect;
}

function SpotlightMask({ rect, dark }: { rect: SpotRect; dark?: boolean }) {
  return (
    <div data-testid="tour-spotlight" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* DE-EMPHASIS mask (both themes): everything outside the rounded
          cut-out loses its color and sharpness (grayscale + dim + slight
          blur), so the spotlight area is the only place with full fidelity.
          Dark UIs need a deeper dim (a dark surface barely changes at 0.8);
          light UIs keep their airiness at a gentler one. The hole is a
          clip-path so the filter never touches the target; the path
          transitions with the rect in Chromium (same segment structure) and
          snaps gracefully elsewhere. */}
      <div
        data-testid="tour-spotlight-dim"
        // 1px blur: de-emphasized text stays READABLE, just soft. Light keeps
        // its hues (desaturated, not grayscale); dark drains them fully.
        className={clsx(
          'pointer-events-none absolute inset-0 backdrop-blur-[1px] transition-[clip-path] duration-500 ease-out motion-reduce:transition-none',
          dark
            ? 'backdrop-grayscale backdrop-brightness-[0.45]'
            : 'backdrop-brightness-[0.8] backdrop-saturate-[0.35]',
        )}
        style={{ clipPath: holePath(rect) }}
      />
      <div
        data-testid="tour-spotlight-ring"
        // Transition ONLY the box geometry; the de-emphasis layer above does
        // all the dimming work in both themes — the ring carries no shadow.
        className="pointer-events-none absolute rounded-[22px] border-[3px] border-brand-coral/80 transition-[left,top,width,height] duration-500 ease-out motion-reduce:transition-none"
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

/** Full-viewport region MINUS a rounded rect (the spotlight hole), as an
 *  evenodd clip-path — the de-emphasis filter only paints OUTSIDE the hole. */
function holePath(r: SpotRect): string {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const R = 22; // matches the ring's rounded-[22px]
  const x = r.left;
  const y = r.top;
  const w = Math.max(r.right - r.left, 2 * R);
  const h = Math.max(r.bottom - r.top, 2 * R);
  return (
    `path(evenodd, "M0 0 H${W} V${H} H0 Z ` +
    `M${x + R} ${y} h${w - 2 * R} a${R} ${R} 0 0 1 ${R} ${R} v${h - 2 * R} ` +
    `a${R} ${R} 0 0 1 -${R} ${R} h${-(w - 2 * R)} a${R} ${R} 0 0 1 -${R} -${R} ` +
    `v${-(h - 2 * R)} a${R} ${R} 0 0 1 ${R} -${R} Z")`
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
  // Below the split tab strip, over the OLDEST chat messages (its tail stays clear).
  'top-left': 'left-4 top-28',
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
  /** What the disabled Next reads while busy (default: Airo at work). */
  busyLabel?: string;
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
  /**
   * Workspace layout (playground only). In SPLIT mode the chat fills the left
   * region, so `bottom-left` cards would sit on the conversation's latest
   * message — they are remapped to `top-left` (over the oldest messages).
   */
  splitLayout?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function DemoTourOverlay({
  steps,
  step,
  busy,
  busyLabel,
  spotlightOverride,
  darkUi,
  splitLayout,
  onNext,
  onBack,
  onSkip,
}: DemoTourOverlayProps) {
  const current = steps[step];
  const spotlight = current ? (spotlightOverride ?? current.spotlight) : undefined;
  const spotRect = useSpotRect(current && !current.modal ? spotlight : undefined);
  // FLIP: when the card's resolved position changes (next step, layout flip,
  // split remap, spotlight anchor move), animate the move instead of
  // teleporting. The transform lives on a dedicated middle wrapper — the OUTER
  // placement wrapper may use class translates an inline transform would clobber.
  const flipRef = useRef<HTMLDivElement>(null);
  const prevRectRef = useRef<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = flipRef.current;
    if (!el) return;
    const next = el.getBoundingClientRect();
    const prev = prevRectRef.current;
    prevRectRef.current = { left: next.left, top: next.top };
    if (!prev) return;
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if ((!dx && !dy) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      el.style.transition = 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = '';
    });
  });
  // ── anchored placement: the card sits CLOSE to the spotlight area ─────────
  // Pick the first side with room (below → above → right → left), centred on
  // the target and clamped to the viewport. Skipped while the mask is still
  // ~viewport-sized (the opening sweep) and for modal/no-spotlight cards —
  // those fall back to the static placement classes.
  const [anchor, setAnchor] = useState<{ left: number; top: number; side: string } | null>(null);
  useLayoutEffect(() => {
    const el = flipRef.current;
    if (!spotRect || !el) {
      setAnchor(null);
      return;
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (spotRect.right - spotRect.left > W * 0.85 && spotRect.bottom - spotRect.top > H * 0.85) {
      setAnchor(null); // opening sweep / near-fullscreen target
      return;
    }
    const GAP = 14;
    const M = 12;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    const cx = clamp((spotRect.left + spotRect.right) / 2 - cw / 2, M, W - cw - M);
    const cy = clamp((spotRect.top + spotRect.bottom) / 2 - ch / 2, M, H - ch - M);
    const candidates: Record<AnchorSide, { fits: boolean; left: number; top: number }> = {
      below: { fits: spotRect.bottom + GAP + ch <= H - M, left: cx, top: spotRect.bottom + GAP },
      above: { fits: spotRect.top - GAP - ch >= M, left: cx, top: spotRect.top - GAP - ch },
      right: { fits: spotRect.right + GAP + cw <= W - M, left: spotRect.right + GAP, top: cy },
      left: { fits: spotRect.left - GAP - cw >= M, left: spotRect.left - GAP - cw, top: cy },
    };
    let next: { left: number; top: number; side: string } | null = null;
    for (const side of current?.anchorPrefer ?? DEFAULT_ANCHOR_ORDER) {
      const c = candidates[side];
      if (c.fits) {
        next = { left: c.left, top: c.top, side };
        break;
      }
    }
    setAnchor((prev) =>
      prev && next && prev.left === next.left && prev.top === next.top && prev.side === next.side
        ? prev
        : next,
    );
  }, [spotRect, step, current?.anchorPrefer]);

  if (!current) return null;
  let placement = current.placement ?? (current.modal ? 'center' : 'bottom-right');
  if (splitLayout && placement === 'bottom-left') placement = 'top-left';

  return (
    <div
      data-testid="demo-tour"
      data-dark-ui={darkUi || undefined}
      className="pointer-events-none fixed inset-0 z-[120]"
    >
      {current.modal && (
        <div
          data-testid="demo-tour-backdrop"
          // the modal intro de-emphasizes the whole studio the same way the
          // spotlight mask does (minus the hole) + a light tint for depth
          className={clsx(
            'pointer-events-auto absolute inset-0 backdrop-blur-[1px]',
            darkUi
              ? 'bg-black/30 backdrop-grayscale backdrop-brightness-[0.45]'
              : 'bg-ink/20 backdrop-brightness-[0.8] backdrop-saturate-[0.35]',
          )}
        />
      )}
      {!current.modal && spotRect && <SpotlightMask rect={spotRect} dark={darkUi} />}
      {/* Placement (absolute + translate) lives on the OUTER wrapper; the card
          itself remounts per step (key) with a short rise/fade entrance, so a
          placement jump reads as a new card arriving — not the old one teleporting.
          The entrance transform can't clash with the placement translate because
          they're on different elements. Reduced-motion: no animation. */}
      <div
        className={clsx(
          'pointer-events-auto absolute w-[min(420px,calc(100vw-2rem))]',
          !anchor && PLACEMENT_CLASS[placement],
        )}
        style={anchor ? { left: anchor.left, top: anchor.top } : undefined}
      >
      {/* FLIP element — transform-only, measured/animated by the hook above */}
      <div ref={flipRef}>
      <div
        key={step}
        data-testid="tour-card"
        data-placement={anchor ? 'anchored' : placement}
        data-anchored={anchor?.side}
        className={clsx(
          'animate-tour-card-in rounded-3xl p-6 shadow-2xl motion-reduce:animate-none',
          // The card matches the studio's theme but stays HIGHLY visible:
          // dark = ink surface + light text + a hairline ring lifting it off
          // the de-emphasized backdrop.
          darkUi ? 'bg-ink text-canvas ring-1 ring-white/15' : 'bg-white text-ink',
        )}
      >
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-mint">
          Step {step + 1} of {steps.length}
        </span>
        <h2
          data-testid="tour-title"
          // explicit color: a global heading rule would beat inheritance and
          // leave the title ink-on-ink on the dark card
          className={clsx(
            'mt-1.5 text-[21px] font-extrabold leading-snug',
            darkUi ? 'text-canvas' : 'text-ink',
          )}
        >
          {current.title}
        </h2>
        <p className={clsx('mt-2 text-[14px] leading-relaxed', darkUi ? 'text-canvas/75' : 'text-ink/70')}>{current.body}</p>

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
                  i === step ? 'w-5 bg-brand-coral' : darkUi ? 'w-2 bg-white/20' : 'w-2 bg-ink/15',
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
                className={clsx('min-h-11 whitespace-nowrap rounded-full px-3 text-[13px] font-bold transition-colors', darkUi ? 'text-canvas/60 hover:text-canvas' : 'text-ink/60 hover:text-ink')}
              >
                Skip tour
              </button>
            )}
            {step > 0 && (
              <button
                type="button"
                data-testid="tour-back"
                onClick={onBack}
                className={clsx('min-h-11 whitespace-nowrap rounded-full border-2 px-4 text-[13px] font-extrabold transition-colors', darkUi ? 'border-white/20 hover:bg-white/10' : 'border-ink/15 hover:bg-ink/5')}
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
              {busy ? (busyLabel ?? 'Airo is working…') : (current.nextLabel ?? 'Next →')}
            </button>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
