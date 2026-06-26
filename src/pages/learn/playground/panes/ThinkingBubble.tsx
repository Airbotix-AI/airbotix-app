// Animated "thinking" bubble for the game-studio chat (chat-ux Gap B). PURELY
// PRESENTATIONAL: replaces the dull faded-italic "Thinking…" pending bubble with
// an agent-style bubble carrying a small BREATHING brand-gradient dot (reuses
// `.pg-breathe-dot`) beside SHIMMERING kid-friendly status copy (`.pg-shimmer-text`)
// that cycles for liveliness — NOT real server progress (the turn is one POST; per
// the doc's "Copy source of truth" the lines stay generic/honest). Honors
// `prefers-reduced-motion` (the breathe + shimmer + cycling are CSS/calm-line
// guarded). It never calls `useGameAgent` — wired in by AIChatPanel.

import { useEffect, useState } from 'react';

/**
 * Cycling kid-friendly status lines shown while the AI turn is in flight.
 * Exported so tests can assert the bubble cycles through exactly these.
 * These are client-side flavour only — they do NOT report real server stages.
 */
export const THINKING_LINES = [
  'Reading your game',
  'Thinking of ideas',
  'Writing the code',
  'Almost there!',
] as const;

/** How long each status line shows before advancing (ms). */
const LINE_INTERVAL_MS = 1200;

interface ThinkingBubbleProps {
  /** Optional override for the cycling copy (defaults to {@link THINKING_LINES}). */
  lines?: readonly string[];
}

/**
 * A left-aligned, agent-styled chat bubble for the in-flight ("pending") turn.
 *
 * Renders a small breathing brand-gradient dot (`.pg-breathe-dot`) beside a line
 * of shimmering status copy (`.pg-shimmer-text`) that rotates every ~1.2s through
 * {@link THINKING_LINES} for liveliness. With `prefers-reduced-motion: reduce`, the
 * dot holds still, the shimmer falls back to solid dim text, and the copy holds on
 * a single calm line (no cycling) — all guarded in `playground.css`.
 *
 * Purely presentational and props-light; safe to render whenever `item.pending`.
 */
export function ThinkingBubble({ lines = THINKING_LINES }: ThinkingBubbleProps = {}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Cycling is liveliness only — if the user prefers reduced motion, hold the
    // first calm line and don't advance.
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Index already initializes to 0 — hold the first calm line, don't advance.
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % lines.length);
    }, LINE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [lines]);

  return (
    <div className="flex justify-start">
      <div
        data-testid="thinking-bubble"
        className="flex max-w-[90%] items-center gap-2.5 rounded-2xl border border-pg-border bg-pg-text/10 px-4 py-2.5"
      >
        {/* Small breathing brand-gradient dot — same motion language as the WorkingCard. */}
        <span data-testid="thinking-dot" aria-hidden="true" className="pg-breathe-dot h-3 w-3 shrink-0" />
        <span
          key={index}
          aria-live="polite"
          className="pg-shimmer-text text-[14px] leading-relaxed"
        >
          {lines[index]}
        </span>
      </div>
    </div>
  );
}
