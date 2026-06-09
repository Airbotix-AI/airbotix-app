// @vitest-environment jsdom
//
// H1 coverage gap (the streamed apply/finalize path): the e2e can't reach this
// because the DEV sandbox never streams (it runs the offline stub). This unit
// test drives the REAL Pro streaming path with a controllable `streamTurn` mock,
// so we can hold the token-reveal pending, press Stop mid-reveal, and assert the
// turn still finalizes EXACTLY once (no double-charge, no lost work).
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
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
  next_steps: [
    { label: 'Add a score', prompt: 'add a score', tag: 'concept' },
    { label: 'Make it bounce', prompt: 'make it bounce', tag: 'fun' },
  ],
};

/** A non-approval Pro turn that applies; classify always passes (null). */
function makeDeps(): GameAgentDeps {
  return {
    runTurn: vi.fn(async () => TURN),
    approve: vi.fn(async () => TURN),
    classify: vi.fn(async () => null),
    raiseHand: vi.fn(async () => {}),
    reportRuntimeErrors: vi.fn(async () => ({ attempted: false, co_debug: false, attempt: 1 })),
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

/** Render with a `runTurn` that rejects, so we can assert the error copy. */
function setupFailing(error: unknown) {
  const deps: GameAgentDeps = {
    runTurn: vi.fn(async () => {
      throw error;
    }),
    approve: vi.fn(async () => TURN),
    classify: vi.fn(async () => null),
    raiseHand: vi.fn(async () => {}),
    reportRuntimeErrors: vi.fn(async () => ({ attempted: false, co_debug: false, attempt: 1 })),
  };
  const view = renderHook(() =>
    useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps }),
  );
  return { ...view, deps };
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
    // The turn's next-step options ride onto the settled bubble (FE1 contract).
    expect(lastChat.nextSteps).toEqual(TURN.next_steps);
  });
});

describe('useGameAgent error copy distinguishes unreachable vs server-error', () => {
  const REACH_FAIL = 'Could not reach the AI. Try again.';
  const SERVER_FAIL = 'The AI ran into a problem. Try again in a moment.';

  it('a transport failure (fetch rejected, no ApiError) reads as "could not reach"', async () => {
    const { result } = setupFailing(new TypeError('Failed to fetch'));
    await act(async () => {
      await result.current.send('make it blue');
    });
    await waitFor(() => expect(result.current.error).toBe(REACH_FAIL));
    expect(result.current.chat[result.current.chat.length - 1].text).toBe(REACH_FAIL);
  });

  it('a backend 5xx (server reached but errored) reads as a server problem', async () => {
    const { result } = setupFailing(new ApiError(500, 'INTERNAL', 'boom'));
    await act(async () => {
      await result.current.send('make it blue');
    });
    await waitFor(() => expect(result.current.error).toBe(SERVER_FAIL));
    expect(result.current.chat[result.current.chat.length - 1].text).toBe(SERVER_FAIL);
  });

  it('a gateway-down 503 keeps the "could not reach" copy', async () => {
    const { result } = setupFailing(new ApiError(503, 'HTTP_503', 'unavailable'));
    await act(async () => {
      await result.current.send('make it blue');
    });
    await waitFor(() => expect(result.current.error).toBe(REACH_FAIL));
  });
});
