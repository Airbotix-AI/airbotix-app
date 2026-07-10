// @vitest-environment jsdom
//
// Hook-level contract for the D-HARN Phase-0 turn hygiene (useTurnHygiene):
// the ONE-message busy queue, the silent-turn watchdog (arm / delta-bump /
// clear / consume), and the per-logical-turn idempotency keys. The end-to-end
// behaviours (queue auto-send on settle, timeout copy, key reuse through
// deps.runTurn) live in useGameAgent.test.ts — this file pins the primitive.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mintTurnKey, settleBubble, useTurnHygiene } from './useTurnHygiene';
import type { ChatItem } from './useGameAgent';

function setup(watchdogMs = 5_000) {
  const onTimeout = vi.fn();
  const view = renderHook(() => useTurnHygiene<{ guided?: boolean }>({ watchdogMs, onTimeout }));
  return { ...view, onTimeout };
}

describe('useTurnHygiene — busy queue (D-HARN-03)', () => {
  it('queues exactly ONE message; later messages are ignored while the slot is taken', () => {
    const { result } = setup();
    act(() => result.current.queueMessage('first', { guided: true }));
    act(() => result.current.queueMessage('second'));
    expect(result.current.queuedMessage).toEqual({ text: 'first', opts: { guided: true } });
  });

  it('takeQueued returns the message and frees the slot', () => {
    const { result } = setup();
    act(() => result.current.queueMessage('next thing'));
    let taken: { text: string } | null = null;
    act(() => {
      taken = result.current.takeQueued();
    });
    expect(taken).toEqual({ text: 'next thing', opts: undefined });
    expect(result.current.queuedMessage).toBeNull();
    // The slot is free again.
    act(() => result.current.queueMessage('another'));
    expect(result.current.queuedMessage?.text).toBe('another');
  });

  it('cancelQueued drops the message and frees the slot', () => {
    const { result } = setup();
    act(() => result.current.queueMessage('dropped'));
    act(() => result.current.cancelQueued());
    expect(result.current.queuedMessage).toBeNull();
    let taken: unknown = 'sentinel';
    act(() => {
      taken = result.current.takeQueued();
    });
    expect(taken).toBeNull();
  });

  it('two queue calls in the SAME tick still claim only one slot (ref-mirrored)', () => {
    const { result } = setup();
    act(() => {
      result.current.queueMessage('a');
      result.current.queueMessage('b');
    });
    expect(result.current.queuedMessage?.text).toBe('a');
  });
});

describe('useTurnHygiene — silent-turn watchdog (D-HARN-03)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires onTimeout after the quiet window; consumeTimedOut reads-and-resets', () => {
    const { result, onTimeout } = setup(5_000);
    act(() => result.current.beginWatchdog());
    act(() => vi.advanceTimersByTime(4_999));
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(result.current.consumeTimedOut()).toBe(true);
    expect(result.current.consumeTimedOut()).toBe(false); // reset after the read
  });

  it('bumpWatchdog (a stream delta) defers the deadline', () => {
    const { result, onTimeout } = setup(5_000);
    act(() => result.current.beginWatchdog());
    act(() => vi.advanceTimersByTime(4_000));
    act(() => result.current.bumpWatchdog()); // sign of life at t=4s
    act(() => vi.advanceTimersByTime(4_000)); // t=8s — old deadline (5s) passed
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_000)); // t=9s — the bumped deadline
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('bumpWatchdog is a no-op when nothing is armed (a late replay delta)', () => {
    const { result, onTimeout } = setup(5_000);
    act(() => result.current.bumpWatchdog());
    act(() => vi.advanceTimersByTime(10_000));
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('clearWatchdog (turn settled) prevents the fire', () => {
    const { result, onTimeout } = setup(5_000);
    act(() => result.current.beginWatchdog());
    act(() => result.current.clearWatchdog());
    act(() => vi.advanceTimersByTime(10_000));
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('beginWatchdog resets a stale timed-out flag from a previous turn', () => {
    const { result } = setup(1_000);
    act(() => result.current.beginWatchdog());
    act(() => vi.advanceTimersByTime(1_000)); // fired → flag set
    act(() => result.current.beginWatchdog()); // a NEW turn must start clean
    expect(result.current.consumeTimedOut()).toBe(false);
    act(() => result.current.clearWatchdog());
  });
});

describe('useTurnHygiene — idempotency keys (D-HARN-02)', () => {
  it('beginTurnKey mints fresh unique keys and records the last one', () => {
    const { result } = setup();
    const k1 = result.current.beginTurnKey();
    const k2 = result.current.beginTurnKey();
    expect(k1).toBeTruthy();
    expect(k2).not.toBe(k1);
    expect(result.current.lastTurnKey()).toBe(k2);
  });

  it('reuseKeyNext pre-loads the NEXT beginTurnKey exactly once (a retry)', () => {
    const { result } = setup();
    result.current.reuseKeyNext('key-of-the-failed-turn');
    expect(result.current.beginTurnKey()).toBe('key-of-the-failed-turn');
    // Consumed — the following turn mints fresh again.
    expect(result.current.beginTurnKey()).not.toBe('key-of-the-failed-turn');
  });

  it('mintTurnKey yields unique keys', () => {
    expect(mintTurnKey()).not.toBe(mintTurnKey());
  });
});

describe('settleBubble', () => {
  const pendingChat: ChatItem[] = [
    { id: 'k1', role: 'kid', text: 'make it blue' },
    { id: 'a1', role: 'agent', text: 'Thinking…', pending: true },
  ];

  it('replaces the pending bubble with a settled agent message', () => {
    const out = settleBubble(pendingChat, 'a1', 'Done!');
    expect(out[1]).toEqual({ id: 'a1', role: 'agent', text: 'Done!' });
    expect(out[0]).toBe(pendingChat[0]); // untouched rows keep identity
  });

  it('attaches the retry payload when given', () => {
    const retry = { prompt: 'make it blue', turnKey: 'k', guided: false };
    const out = settleBubble(pendingChat, 'a1', 'oops', retry);
    expect(out[1].retry).toEqual(retry);
    expect(out[1].pending).toBeUndefined();
  });
});
