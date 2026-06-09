// Animated "thinking" bubble for the game-studio chat (chat-ux Gap B). PURELY
// PRESENTATIONAL: replaces the dull faded-italic "Thinking…" pending bubble with
// an agent-style bubble carrying a small spinning brand orb (reuses `.pg-orb-spin`)
// beside rotating kid-friendly status copy that cycles for liveliness — NOT real
// server progress (the turn is one POST; per the doc's "Copy source of truth" the
// lines stay generic/honest). Honors `prefers-reduced-motion` (orb spin + cycling
// are CSS/calm-line guarded). It never calls `useGameAgent` — wired in by AIChatPanel.

import { useEffect, useState } from 'react';

/**
 * Cycling kid-friendly status lines shown while the AI turn is in flight.
 * Exported so tests can assert the bubble cycles through exactly these.
 * These are client-side flavour only — they do NOT report real server stages.
 */
export const THINKING_LINES = [
  'Reading your game 👀',
  'Thinking of ideas 💡',
  'Writing the code ✍️',
  'Almost there! 🚀',
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
 * Renders a small spinning brand orb (reusing `.pg-orb-spin`) beside a line of
 * status copy that rotates every ~1.2s through {@link THINKING_LINES} for
 * liveliness. With `prefers-reduced-motion: reduce`, the orb stops spinning and
 * the copy holds on a single calm line (no cycling) — both guarded in
 * `playground.css`, matching how `.pg-orb-spin` already protects itself.
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
        {/* Small spinning brand orb — same motion language as GeneratingScreen. */}
        <svg
          viewBox="0 0 160 160"
          className="pg-orb-spin h-5 w-5 shrink-0"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="pg-thinking-orb" x1="0" y1="0" x2="1" y2="1">
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
            strokeWidth="12"
          />
          <path
            d="M 80 16 A 64 64 0 1 1 16 80"
            fill="none"
            stroke="url(#pg-thinking-orb)"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </svg>
        <span
          key={index}
          aria-live="polite"
          className="pg-thinking-line text-[14px] leading-relaxed text-pg-text-dim"
        >
          {lines[index]}
        </span>
      </div>
    </div>
  );
}
