// Small chat affordances for the D-HARN Phase-0 turn hygiene (rendered by
// AIChatPanel): the busy-queue pill (D-HARN-03) and the per-bubble retry chip
// (D-HARN-02/03/05). Copy + testids are harness-asserted — keep them stable.

import { Clock, X } from 'lucide-react';

import type { RetryPayload } from './useTurnHygiene';

/**
 * The ONE queued next message (D-HARN-03): shows above the composer while a turn
 * is busy, auto-sends on settle; ✕ drops it. Kid-friendly, never a silent drop.
 */
export function QueuedPill({ text, onCancel }: { text: string; onCancel?: () => void }) {
  return (
    <div
      data-testid="chat-queued-pill"
      className="mb-2 flex items-center gap-2 rounded-full border border-brand-sky/40 bg-brand-sky/10 px-3.5 py-1.5 text-[12px] font-semibold text-pg-text"
    >
      <Clock size={12} aria-hidden className="shrink-0 text-brand-sky" />
      <span className="min-w-0 flex-1 truncate">I'll do this next: {text}</span>
      <button
        type="button"
        data-testid="chat-queued-cancel"
        aria-label="Cancel the queued message"
        onClick={onCancel}
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-pg-text/20 text-pg-text-dim transition-colors hover:bg-pg-text/30 hover:text-pg-text"
      >
        <X size={11} />
      </button>
    </div>
  );
}

/**
 * A retryable failed/timed-out/flush-blocked turn (D-HARN-02/03/05): one calm
 * chip that replays THIS bubble's own turn — same prompt, SAME idempotency key
 * (the payload rides on the bubble, so a stale chip never replays a later turn).
 */
export function RetryChip({
  retry,
  busy,
  onRetryTurn,
}: {
  retry: RetryPayload;
  busy?: boolean;
  onRetryTurn?: (retry: RetryPayload) => void;
}) {
  if (!onRetryTurn) return null;
  return (
    <div className="mt-2.5">
      <button
        type="button"
        data-testid="chat-retry-chip"
        onClick={() => onRetryTurn(retry)}
        disabled={busy}
        aria-label="Try that again"
        className="inline-flex items-center rounded-full bg-grad-sky px-3.5 py-1.5 text-[12px] font-extrabold text-white shadow-brand-sky transition-opacity enabled:hover:opacity-90 disabled:opacity-40 disabled:shadow-none"
      >
        Try again ↻
      </button>
    </div>
  );
}
