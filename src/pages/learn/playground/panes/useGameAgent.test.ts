// @vitest-environment jsdom
//
// H1 coverage gap (the streamed apply/finalize path): the e2e can't reach this
// because the DEV sandbox never streams (it runs the offline stub). This unit
// test drives the REAL Pro streaming path with a controllable `streamTurn` mock,
// so we can hold the token-reveal pending, press Stop mid-reveal, and assert the
// turn still finalizes EXACTLY once (no double-charge, no lost work).
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AgentTurnResult } from '../../code/codeApi';
import type { GameAgentDeps } from './gameAgent';
import { useGameAgent } from './useGameAgent';

// A handle a test can resolve on demand, so `streamTurn` stays pending while we
// press Stop (which flips the `sig.aborted` flag the hook owns).
let resolveStream: (() => void) | null = null;
let lastSignal: { aborted: boolean } | undefined;

// Keep the real module (predictionQuestion / realGameAgentDeps / tokenize, etc.)
// but force online + a controllable stream so we can simulate a mid-reveal Stop.
vi.mock('./gameAgent', async () => {
  const actual = await vi.importActual<typeof import('./gameAgent')>('./gameAgent');
  return {
    ...actual,
    isOffline: () => false,
    streamTurn: vi.fn(
      (_result: unknown, _onDelta: unknown, signal?: { aborted: boolean }) => {
        lastSignal = signal;
        return new Promise<void>((resolve) => {
          resolveStream = resolve;
        });
      },
    ),
  };
});

const TURN: AgentTurnResult = {
  turn_id: 't1',
  requires_approval: false,
  plan: null,
  changes: [],
  files: [{ path: 'main.js', content: 'blue', kind: 'text', size: 4 }],
  summary: 'I made it blue.',
  stars_charged: 2,
  tools_fired: ['edit_file:main.js'],
};

/** A non-approval Pro turn that applies; classify always passes (null). */
function makeDeps(): GameAgentDeps {
  return {
    runTurn: vi.fn(async () => TURN),
    approve: vi.fn(async () => TURN),
    classify: vi.fn(async () => null),
    raiseHand: vi.fn(async () => {}),
  };
}

function setup(onApplyFiles = vi.fn(), onStarsCharged = vi.fn()) {
  const deps = makeDeps();
  const view = renderHook(() =>
    useGameAgent({
      files: [],
      onApplyFiles,
      onStarsCharged,
      projectId: 'p1',
      mode: 'pro',
      deps,
    }),
  );
  return { ...view, deps, onApplyFiles, onStarsCharged };
}

describe('useGameAgent streamed apply (H1)', () => {
  it('Stop mid-stream still finalizes exactly once', async () => {
    resolveStream = null;
    lastSignal = undefined;
    const { result, onApplyFiles, onStarsCharged } = setup();

    // Fire the turn. runTurn resolves, applyResult begins, streamTurn is pending.
    await act(async () => {
      void result.current.send('make it blue');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    expect(result.current.streaming).toBe(true);

    // User presses Stop mid-reveal: the hook flips the signal; the (mocked)
    // stream then returns. The turn was already paid for, so finalize must run.
    await act(async () => {
      result.current.abort();
      expect(lastSignal?.aborted).toBe(true);
      resolveStream?.();
    });
    expect(result.current.streaming).toBe(false);

    // Applied once with the result's files; charged once with 2 — no lost work,
    // no double-charge.
    expect(onApplyFiles).toHaveBeenCalledTimes(1);
    expect(onApplyFiles).toHaveBeenCalledWith(TURN.files);
    expect(onStarsCharged).toHaveBeenCalledTimes(1);
    expect(onStarsCharged).toHaveBeenCalledWith(2);
    // The bubble settled to the full summary.
    const lastChat = result.current.chat[result.current.chat.length - 1];
    expect(lastChat.text).toBe(TURN.summary);
  });

  it('normal turn finalizes once', async () => {
    resolveStream = null;
    lastSignal = undefined;
    const { result, onApplyFiles, onStarsCharged } = setup();

    await act(async () => {
      void result.current.send('make it blue');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });

    // No abort — the reveal finishes naturally and the turn finalizes.
    await act(async () => {
      resolveStream?.();
    });
    expect(result.current.streaming).toBe(false);

    expect(onApplyFiles).toHaveBeenCalledTimes(1);
    expect(onApplyFiles).toHaveBeenCalledWith(TURN.files);
    expect(onStarsCharged).toHaveBeenCalledTimes(1);
    expect(onStarsCharged).toHaveBeenCalledWith(2);
    const lastChat = result.current.chat[result.current.chat.length - 1];
    expect(lastChat.text).toBe(TURN.summary);
  });
});
