// Turn-hygiene state for the playground chat (playground-agent-harness-prd
// Phase 0). Owned and driven by `useGameAgent`; extracted so the chat controller
// stays readable. Three concerns live here:
//
//   - D-HARN-02 — ONE idempotency key per LOGICAL turn: `beginTurnKey()` mints a
//     key at send() time (or consumes a `reuseKeyNext` pre-load from a retry), so
//     a retried turn replays on the backend instead of charging a second one.
//   - D-HARN-03 — the busy QUEUE (exactly ONE next message, never a silent drop)
//     and the silent-turn WATCHDOG (no sign of life for `watchdogMs` → `onTimeout`
//     fires, which aborts the in-flight fetch via the existing clean-cancel path).
//   - The retryable-bubble payload (`RetryPayload`) + `settleBubble` helper that
//     turns a pending chat bubble into a settled agent message.

import { useCallback, useRef, useState } from 'react';

import type { ChatItem } from './useGameAgent';

/**
 * The turn failed upstream/in the loop (D-HARN-02): the backend maps
 * non-HttpException turn failures to a 502 `AI_UNAVAILABLE` envelope with kid
 * copy. The FE owns ITS OWN string (never renders `err.message` verbatim) and
 * marks the settled bubble retryable — the retry chip re-sends the SAME prompt
 * with the SAME idempotency key, so the server replays the turn instead of
 * running (and charging) a second one.
 */
export const AI_UNAVAILABLE_TEXT =
  "The AI helper had a hiccup and couldn't finish that — let's try again!";
/**
 * Silent-turn watchdog copy (D-HARN-03): a turn with no sign of life for
 * `TURN_WATCHDOG_MS` is aborted via the SAME clean-cancel mechanism as "Stop
 * waiting" (the backend charges 0 Stars) and settles into this CALM copy with a
 * retry chip — never a scary error.
 */
export const TURN_TIMEOUT_TEXT = "That took too long — let's try again!";
/**
 * The pre-turn flush failed (D-HARN-05): the kid's freshest edits could NOT be
 * persisted, so the paid turn is NOT started (the agent would edit a stale VFS
 * that doesn't match what the kid sees). The bubble settles into this copy with
 * a retry chip; retry re-attempts the flush + turn with the same idempotency key.
 */
export const FLUSH_FAILED_TEXT = 'Let me save your changes first — try again in a moment.';
/**
 * How long a turn may stay silent (no stream delta, no settle) before the client
 * watchdog aborts it into calm timeout copy (D-HARN-03). Overridable per hook via
 * `UseGameAgentOptions.turnWatchdogMs` (tests).
 */
export const TURN_WATCHDOG_MS = 180_000;

/**
 * Everything the per-bubble "Try again" chip needs to replay its OWN turn
 * (D-HARN-02): the exact prompt, the SAME idempotency key, and the guided flag.
 * Carried on the retryable `ChatItem` so a stale chip can never replay a
 * DIFFERENT (later) turn's prompt/key.
 */
export interface RetryPayload {
  prompt: string;
  turnKey: string;
  guided: boolean;
}

/** The ONE next message queued while a turn is busy (D-HARN-03) — never a drop. */
export interface QueuedItem<O> {
  text: string;
  opts?: O;
}

/** Mint ONE idempotency key per LOGICAL turn (D-HARN-02). */
export function mintTurnKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Replace the pending bubble `id` with a settled agent message (+ retry chip). */
export function settleBubble(
  prev: ChatItem[],
  id: string,
  text: string,
  retry?: RetryPayload,
): ChatItem[] {
  return prev.map((it) =>
    it.id === id ? { id, role: 'agent' as const, text, ...(retry ? { retry } : {}) } : it,
  );
}

export interface UseTurnHygieneOptions {
  /** The silent-turn window (D-HARN-03); `TURN_WATCHDOG_MS` in prod. */
  watchdogMs: number;
  /** Fired when the watchdog trips — abort the in-flight fetch (clean cancel). */
  onTimeout: () => void;
}

/**
 * See the module doc. All returned functions are referentially stable;
 * `queuedMessage` is React state (drives the composer pill).
 */
export function useTurnHygiene<SendOpts>({ watchdogMs, onTimeout }: UseTurnHygieneOptions) {
  // ── Busy queue (D-HARN-03). The ref mirrors the state for the synchronous
  // "only one" check — two sends landing in the same render must not both queue. ──
  const [queuedMessage, setQueuedMessage] = useState<QueuedItem<SendOpts> | null>(null);
  const queuedRef = useRef<QueuedItem<SendOpts> | null>(null);

  /** Queue the message if the ONE slot is free; further messages are ignored. */
  const queueMessage = useCallback((text: string, opts?: SendOpts) => {
    if (queuedRef.current) return;
    queuedRef.current = { text, opts };
    setQueuedMessage(queuedRef.current);
  }, []);
  /** Take (and clear) the queued message — the auto-send-on-settle consumer. */
  const takeQueued = useCallback((): QueuedItem<SendOpts> | null => {
    const q = queuedRef.current;
    queuedRef.current = null;
    setQueuedMessage(null);
    return q;
  }, []);
  /** Drop the queued message (the queued pill's ✕). */
  const cancelQueued = useCallback(() => {
    queuedRef.current = null;
    setQueuedMessage(null);
  }, []);

  // ── Silent-turn watchdog (D-HARN-03). `onTimeout` aborts via the existing
  // stop/abort mechanism; the abort handlers read `consumeTimedOut()` to settle
  // calm timeout copy instead of the "you stopped" line. ──
  const watchdogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearWatchdog = useCallback(() => {
    if (watchdogTimer.current) {
      clearTimeout(watchdogTimer.current);
      watchdogTimer.current = null;
    }
  }, []);
  const arm = useCallback(() => {
    clearWatchdog();
    watchdogTimer.current = setTimeout(() => {
      watchdogTimer.current = null;
      timedOutRef.current = true;
      onTimeoutRef.current();
    }, watchdogMs);
  }, [clearWatchdog, watchdogMs]);
  /** Arm for a fresh turn — also resets a stale timed-out flag. */
  const beginWatchdog = useCallback(() => {
    timedOutRef.current = false;
    arm();
  }, [arm]);
  /** Re-arm ONLY if armed — any stream delta is a sign of life. */
  const bumpWatchdog = useCallback(() => {
    if (watchdogTimer.current) arm();
  }, [arm]);
  /** Read-and-reset whether the watchdog (not the kid) caused the abort. */
  const consumeTimedOut = useCallback((): boolean => {
    const fired = timedOutRef.current;
    timedOutRef.current = false;
    return fired;
  }, []);

  // ── Idempotency keys (D-HARN-02). ──
  const lastTurnKeyRef = useRef<string>('');
  const reuseKeyRef = useRef<string | null>(null);

  /** Consume a retry's pre-loaded key or mint a fresh one; records it as last. */
  const beginTurnKey = useCallback((): string => {
    const key = reuseKeyRef.current ?? mintTurnKey();
    reuseKeyRef.current = null;
    lastTurnKeyRef.current = key;
    return key;
  }, []);
  /** Pre-load the NEXT `beginTurnKey()` with a retried turn's key. */
  const reuseKeyNext = useCallback((key: string) => {
    reuseKeyRef.current = key || null;
  }, []);
  /** The last logical turn's key (for the error-banner retryLast). */
  const lastTurnKey = useCallback((): string => lastTurnKeyRef.current, []);

  return {
    queuedMessage,
    queueMessage,
    takeQueued,
    cancelQueued,
    beginWatchdog,
    bumpWatchdog,
    clearWatchdog,
    consumeTimedOut,
    beginTurnKey,
    reuseKeyNext,
    lastTurnKey,
  };
}
