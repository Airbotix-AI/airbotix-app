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
import {
  useGameAgent,
  AI_UNAVAILABLE_TEXT,
  FLUSH_FAILED_TEXT,
  IMAGE_REJECT_MESSAGE,
  IMAGE_DISABLED_MESSAGE,
  IMAGE_CHECK_HICCUP_MESSAGE,
  STOPPED_TEXT,
  TURN_TIMEOUT_TEXT,
  type ChatItem,
  type SendImage,
} from './useGameAgent';

// A handle a test can resolve on demand, so `streamTurn` stays pending while we
// press Stop (which flips the `sig.aborted` flag the hook owns).
let resolveStream: (() => void) | null = null;
let lastSignal: { aborted: boolean } | undefined;

// Test-controlled connectivity (default online; hoisted so the mock factory sees it).
const net = vi.hoisted(() => ({ offline: false }));

// Keep the real module (predictionQuestion / realGameAgentDeps / tokenize, etc.)
// but a test-controlled `isOffline` + a controllable stream so we can simulate a
// mid-reveal Stop and the offline pre-check.
vi.mock('./gameAgent', async () => {
  const actual = await vi.importActual<typeof import('./gameAgent')>('./gameAgent');
  return {
    ...actual,
    isOffline: () => net.offline,
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
  version: 1,
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
    classify: vi.fn(async () => ({ safeguarding: null, intent: 'code' as const })),
    raiseHand: vi.fn(async () => {}),
    reportRuntimeErrors: vi.fn(async () => ({ attempted: false, co_debug: false, attempt: 1 })),
    resetEngine: vi.fn(async () => ({ version: 2 })),
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
    classify: vi.fn(async () => ({ safeguarding: null, intent: 'code' as const })),
    raiseHand: vi.fn(async () => {}),
    reportRuntimeErrors: vi.fn(async () => ({ attempted: false, co_debug: false, attempt: 1 })),
    resetEngine: vi.fn(async () => ({ version: 2 })),
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
    expect(onApplyFiles).toHaveBeenCalledWith(TURN.files, TURN.version);
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
    expect(onApplyFiles).toHaveBeenCalledWith(TURN.files, TURN.version);
    expect(onStarsCharged).toHaveBeenCalledTimes(1);
    expect(onStarsCharged).toHaveBeenCalledWith(2);
    const lastChat = result.current.chat[result.current.chat.length - 1];
    expect(lastChat.text).toBe(TURN.summary);
    // The turn's next-step options ride onto the settled bubble (FE1 contract).
    expect(lastChat.nextSteps).toEqual(TURN.next_steps);
  });

  it('only the latest settled turn keeps next-step chips — older bubbles are cleared (D-PAP-26)', async () => {
    resolveStream = null;
    const { result } = setup();

    // First turn settles with its next-step options.
    await act(async () => {
      void result.current.send('make it blue');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    expect(result.current.chat.at(-1)?.nextSteps).toEqual(TURN.next_steps);

    // Second turn: once it settles, the FIRST agent bubble's chips are gone — only
    // the most recent server message ever carries next-step options.
    resolveStream = null;
    await act(async () => {
      void result.current.send('add a score');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });

    const agentBubbles = result.current.chat.filter((c) => c.role === 'agent');
    expect(agentBubbles).toHaveLength(2);
    expect(agentBubbles[0].nextSteps).toBeUndefined();
    expect(agentBubbles[1].nextSteps).toEqual(TURN.next_steps);
  });
});

// D-PAP-48 — "Stop waiting" while the agent is thinking (BEFORE any reply streams).
// cancelTurn aborts the in-flight classify/runTurn fetch; the disconnect is a clean
// server-side cancel (no Stars), so the pending bubble becomes the calm STOPPED_TEXT
// (never an error) and the composer re-enables.
describe('useGameAgent stop waiting (D-PAP-48)', () => {
  it('cancelTurn aborts the in-flight turn → busy false, no error, calm stopped bubble', async () => {
    let runSignal: AbortSignal | undefined;
    let classifySignal: AbortSignal | undefined;
    // runTurn hangs until its passed signal aborts, then rejects like a real aborted
    // fetch (a DOMException named 'AbortError' — NOT an ApiError).
    const deps: GameAgentDeps = {
      runTurn: vi.fn((args: { signal?: AbortSignal }) => {
        runSignal = args.signal;
        return new Promise<AgentTurnResult>((_resolve, reject) => {
          args.signal?.addEventListener('abort', () =>
            reject(new DOMException('The user aborted a request.', 'AbortError')),
          );
        });
      }),
      approve: vi.fn(async () => TURN),
      classify: vi.fn(async (args: { signal?: AbortSignal }) => {
        classifySignal = args.signal;
        return { safeguarding: null, intent: 'code' as const };
      }),
      raiseHand: vi.fn(async () => {}),
      reportRuntimeErrors: vi.fn(async () => ({ attempted: false, co_debug: false, attempt: 1 })),
      resetEngine: vi.fn(async () => ({ version: 2 })),
    };
    const onApplyFiles = vi.fn();
    const onStarsCharged = vi.fn();
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles, onStarsCharged, projectId: 'p1', mode: 'pro', deps }),
    );

    // Fire the turn: classify resolves, runTurn is called and hangs → busy true.
    await act(async () => {
      void result.current.send('make it blue');
      await waitFor(() => expect(deps.runTurn).toHaveBeenCalled());
    });
    expect(result.current.busy).toBe(true);
    // Both fetches received the SAME controller's abort signal.
    expect(classifySignal).toBeInstanceOf(AbortSignal);
    expect(runSignal).toBeInstanceOf(AbortSignal);

    // Kid taps "Stop waiting": the fetch aborts and the turn settles calmly. The
    // rejected-fetch → state-settle chain flushes as `act` exits (asserting the
    // condition INSIDE the act would deadlock against that flush), so we assert
    // once it returns.
    await act(async () => {
      result.current.cancelTurn();
    });

    // The composer re-enabled — no error styling, calm cancel, not a failure.
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
    const agentBubble = result.current.chat.find((c) => c.role === 'agent');
    expect(agentBubble?.text).toBe(STOPPED_TEXT);
    expect(agentBubble?.pending).toBeFalsy();
    // Nothing was applied and no Stars were charged — the game is unchanged.
    expect(onApplyFiles).not.toHaveBeenCalled();
    expect(onStarsCharged).not.toHaveBeenCalled();
  });
});

// Teacher live read-only viewer (teacher-live-project-view-prd D-LV-6): every AI
// turn entry point is a hard no-op so a teacher can never run a turn or mutate the
// kid's VFS.
describe('useGameAgent read-only (teacher viewer)', () => {
  function setupReadOnly() {
    const deps = makeDeps();
    const onApplyFiles = vi.fn();
    const view = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles, projectId: 'p1', mode: 'pro', deps, readOnly: true }),
    );
    return { ...view, deps, onApplyFiles };
  }

  it('send / requestAssetGen / raiseHand are no-ops — no turn runs, nothing applies', async () => {
    const { result, deps, onApplyFiles } = setupReadOnly();

    await act(async () => {
      void result.current.send('make it blue');
      void result.current.requestAssetGen('a dragon');
      result.current.raiseHand();
    });

    expect(deps.runTurn).not.toHaveBeenCalled();
    expect(deps.classify).not.toHaveBeenCalled();
    expect(deps.raiseHand).not.toHaveBeenCalled();
    expect(onApplyFiles).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
    expect(result.current.handRaised).toBe(false);
    // No kid bubble was ever appended — the chat stays empty.
    expect(result.current.chat).toHaveLength(0);
  });
});

describe('useGameAgent pre-turn flush gate (D-HARN-05 — the flush must succeed)', () => {
  it('awaits flushSave BEFORE runTurn so the agent reads the kid latest edits', async () => {
    resolveStream = null;
    const order: string[] = [];
    const deps = makeDeps();
    deps.runTurn = vi.fn(async () => {
      order.push('runTurn');
      return TURN;
    });
    const flushSave = vi.fn(async () => {
      order.push('flushSave');
      return { status: 'saved' as const, version: 3 };
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps, flushSave }),
    );

    await act(async () => {
      void result.current.send('make the background blue');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });

    expect(flushSave).toHaveBeenCalledTimes(1);
    // The persist MUST complete before the turn reads the server VFS.
    expect(order).toEqual(['flushSave', 'runTurn']);
  });

  it('a stop MID-CLASSIFY never flushes — a clean cancel must not bump vfs_version', async () => {
    // Regression for the harness `kid-game-stop-turn` journey: the flush gate
    // sits AFTER the free classify, so stopping a slow classify leaves the
    // server VFS untouched (the pre-turn autosave PUT never fires).
    const deps = makeDeps();
    deps.classify = vi.fn(
      (args: { signal?: AbortSignal }) =>
        new Promise<{ safeguarding: null; intent: 'code' }>((_resolve, reject) => {
          args.signal?.addEventListener('abort', () =>
            reject(new DOMException('The user aborted a request.', 'AbortError')),
          );
        }),
    );
    const flushSave = vi.fn(async () => ({ status: 'saved' as const, version: 3 }));
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps, flushSave }),
    );

    await act(async () => {
      void result.current.send('make it blue');
      await waitFor(() => expect(deps.classify).toHaveBeenCalled());
    });
    await act(async () => {
      result.current.cancelTurn();
    });

    expect(flushSave).not.toHaveBeenCalled();
    expect(deps.runTurn).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
    expect(result.current.chat.at(-1)?.text).toBe(STOPPED_TEXT);
  });

  it('a FAILED flush stops the PAID turn: no runTurn, retryable "save first" copy', async () => {
    const deps = makeDeps();
    const flushSave = vi.fn(async () => {
      throw new Error('save hiccup');
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps, flushSave }),
    );

    await act(async () => {
      await result.current.send('add a score');
    });

    expect(flushSave).toHaveBeenCalledTimes(1);
    // The free, non-metered classify MAY run — the flush gate sits AFTER it,
    // immediately before the paid POST, so a turn stopped mid-classify never
    // writes the VFS. The PAID turn must not fire (D-HARN-05).
    expect(deps.classify).toHaveBeenCalledTimes(1);
    expect(deps.runTurn).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
    const bubble = result.current.chat.at(-1);
    expect(bubble?.text).toBe(FLUSH_FAILED_TEXT);
    // The retry payload carries THIS turn's own prompt + minted key (D-HARN-02).
    expect(bubble?.retry).toMatchObject({ prompt: 'add a score', guided: false });
    expect(bubble?.retry?.turnKey).toBeTruthy();
    expect(bubble?.pending).toBeFalsy();
  });

  it('a FAILED flush on the acknowledged-warn confirm also stops the turn (D-HARN-05)', async () => {
    const deps = makeDeps();
    let failFlush = false;
    const flushSave = vi.fn(async () => {
      if (failFlush) throw new Error('save hiccup');
      return { status: 'saved' as const, version: 3 };
    });
    deps.runTurn = vi.fn(async () => {
      throw new ApiError(422, 'MODERATION_WARN', 'Just checking — no personal stuff, okay?', {
        kind: 'pii_warn',
      });
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps, flushSave }),
    );

    // 1) The send hits the warn gate → the kid must acknowledge.
    await act(async () => {
      await result.current.send('my name is Sam, add a score');
    });
    expect(result.current.warnPending).not.toBeNull();
    expect(deps.runTurn).toHaveBeenCalledTimes(1);

    // 2) The save breaks; the kid confirms → the FRESH paid turn must NOT run.
    failFlush = true;
    await act(async () => {
      await result.current.confirmWarn();
    });
    expect(deps.runTurn).toHaveBeenCalledTimes(1); // no second (acknowledged) POST
    expect(result.current.busy).toBe(false);
    const bubble = result.current.chat.at(-1);
    expect(bubble?.text).toBe(FLUSH_FAILED_TEXT);
    expect(bubble?.retry).toMatchObject({ prompt: 'my name is Sam, add a score' });
  });

  it('retry re-attempts the flush and proceeds once the save succeeds', async () => {
    resolveStream = null;
    const deps = makeDeps();
    let failFlush = true;
    const flushSave = vi.fn(async () => {
      if (failFlush) throw new Error('save hiccup');
      return { status: 'saved' as const, version: 3 };
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps, flushSave }),
    );

    await act(async () => {
      await result.current.send('add a score');
    });
    expect(deps.runTurn).not.toHaveBeenCalled();

    // The kid taps the retry chip once the save can work again → the SAME prompt
    // re-flushes and the turn proceeds.
    failFlush = false;
    await act(async () => {
      result.current.retryLast();
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });

    expect(flushSave).toHaveBeenCalledTimes(2);
    expect(deps.runTurn).toHaveBeenCalledTimes(1);
    expect(deps.runTurn).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'add a score' }));
    expect(result.current.chat.at(-1)?.text).toBe(TURN.summary);
  });
});

describe('useGameAgent guided chip loop + sticky chips (D-PAP-26 #1/#3)', () => {
  it('a guided send (chip tap) forwards guided:true to the backend turn (#1)', async () => {
    resolveStream = null;
    const { result, deps } = setup();

    await act(async () => {
      void result.current.send('make the player move', { guided: true });
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });

    expect(deps.runTurn).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'make the player move', guided: true }),
    );
  });

  it('a free-typed send is NOT guided (#1)', async () => {
    resolveStream = null;
    const { result, deps } = setup();

    await act(async () => {
      void result.current.send('add a score');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });

    expect(deps.runTurn).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'add a score', guided: false }),
    );
  });

  it('a successful auto-fix applies SILENTLY — no extra message, chips stay (one-message)', async () => {
    resolveStream = null;
    const FIX_TURN: AgentTurnResult = {
      ...TURN,
      turn_id: 'fix1',
      summary: 'Fixed the bug.',
      next_steps: [],
      files: [{ path: 'main.js', content: 'fixed', kind: 'text', size: 5 }],
      stars_charged: 0,
    };
    const deps = makeDeps();
    deps.reportRuntimeErrors = vi.fn(async () => ({ attempted: true, co_debug: false, attempt: 1, turn: FIX_TURN }));
    const onApplyFiles = vi.fn();
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles, projectId: 'p1', mode: 'pro', deps }),
    );

    // 1) A normal build settles with its next-step chips.
    await act(async () => {
      void result.current.send('make it blue');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    expect(result.current.chat.at(-1)?.nextSteps).toEqual(TURN.next_steps);
    const agentsBefore = result.current.chat.filter((c) => c.role === 'agent').length;
    onApplyFiles.mockClear();

    // 2) Runtime glitch → auto-fix runs. It applies SILENTLY: no streamTurn replay,
    //    no new message bubble, and the build bubble keeps its still-unused chips.
    resolveStream = null;
    await act(async () => {
      await result.current.autoFixFromErrors(['TypeError: boom']);
    });

    expect(deps.reportRuntimeErrors).toHaveBeenCalled();
    expect(resolveStream).toBeNull(); // no replay → no fix bubble typed out
    expect(onApplyFiles).toHaveBeenCalledWith(FIX_TURN.files, FIX_TURN.version); // the repair WAS applied
    const agents = result.current.chat.filter((c) => c.role === 'agent');
    expect(agents.length).toBe(agentsBefore); // no extra message
    expect(agents.at(-1)?.nextSteps).toEqual(TURN.next_steps); // chips intact
  });

  it('an auto-fix that can’t fix it hands off with ONE warm message (co_debug)', async () => {
    resolveStream = null;
    const deps = makeDeps();
    deps.reportRuntimeErrors = vi.fn(async () => ({
      attempted: false,
      co_debug: true,
      attempt: 3,
      message: "Let's fix this together! 🔧",
    }));
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps }),
    );
    await act(async () => {
      await result.current.autoFixFromErrors(['TypeError: boom']);
    });
    const agents = result.current.chat.filter((c) => c.role === 'agent');
    expect(agents).toHaveLength(1);
    expect(agents[0].text).toContain('fix this together');
    expect(result.current.progress).toBeNull();
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

// J9 resume: the conversation is restored from saved history, and a blank prompt
// (a resume) never re-injects the canned "your game starter is ready" starter.
describe('useGameAgent chat seed + restore (J9 resume)', () => {
  const restored: ChatItem[] = [
    { id: 'k1', role: 'kid', text: 'make chess' },
    { id: 'a1', role: 'agent', text: 'I made a chess board.' },
    { id: 'k2', role: 'kid', text: 'add turns' },
    { id: 'a2', role: 'agent', text: 'Added click-to-move turns.' },
  ];

  it('restored initialChat takes precedence over the intro seed', () => {
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), introPrompt: 'make chess', initialChat: restored }),
    );
    expect(result.current.chat).toHaveLength(4);
    expect(result.current.chat.some((c) => c.text.includes('game starter is ready'))).toBe(false);
    expect(result.current.chat.at(-1)?.text).toBe('Added click-to-move turns.');
  });

  it('a blank introPrompt (resume) does NOT seed the canned starter', () => {
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), introPrompt: '' }),
    );
    expect(result.current.chat).toEqual([]);
  });

  it('a real introPrompt still seeds the starter for a brand-new project', () => {
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), introPrompt: 'make a maze' }),
    );
    const agent = result.current.chat.find((c) => c.role === 'agent');
    expect(agent?.text).toContain('game starter is ready');
  });

  it('persists via onChatChange on the seed (so an immediate exit still saves)', () => {
    const onChatChange = vi.fn();
    renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), initialChat: restored, onChatChange }),
    );
    expect(onChatChange).toHaveBeenCalledWith(restored);
  });

  it('blockedSeed seeds an explanation bubble + tappable gentler suggestions', () => {
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), introPrompt: 'airplane shooting people', blockedSeed: true }),
    );
    expect(result.current.chat).toHaveLength(1);
    const bubble = result.current.chat[0];
    expect(bubble.role).toBe('agent');
    expect(bubble.text.toLowerCase()).toContain('safety');
    // Gentle, ready-to-tap ideas that will pass moderation (move the kid forward).
    expect((bubble.nextSteps ?? []).length).toBeGreaterThanOrEqual(2);
    expect((bubble.nextSteps ?? []).every((s) => s.prompt.length > 0)).toBe(true);
    // The canned "game starter is ready" must NOT appear on a blocked build.
    expect(bubble.text.includes('game starter is ready')).toBe(false);
  });

  it('a real first turn / restored history still wins over blockedSeed', () => {
    const ft = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), blockedSeed: true, firstTurn: { prompt: 'maze', reply: 'Made a maze.' } }),
    );
    expect(ft.result.current.chat.some((c) => c.text === 'Made a maze.')).toBe(true);
    expect(ft.result.current.chat.some((c) => c.text.toLowerCase().includes('safety helper'))).toBe(false);
  });
});

// Image input for the playground chat (D-PAP-33..37). Images are uploaded by the
// composer, then passed to `send`; only the S3 refs reach the backend turn body,
// the local preview rides into the kid bubble.
describe('useGameAgent image input (D-PAP-33..37)', () => {
  const IMG: SendImage = { s3_key: 'chat-input/p1/abc', mime: 'image/png', previewUrl: 'blob:preview-1' };

  it('forwards the S3 refs (NOT the preview URLs) to deps.runTurn', async () => {
    resolveStream = null;
    const { result, deps } = setup();

    await act(async () => {
      void result.current.send('use this picture', { images: [IMG] });
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });

    expect(deps.runTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'use this picture',
        images: [{ s3_key: 'chat-input/p1/abc', mime: 'image/png' }],
      }),
    );
    // The kid bubble carries the LOCAL preview (never the S3 key).
    const kid = result.current.chat.find((c) => c.role === 'kid');
    expect(kid?.images).toEqual([{ previewUrl: 'blob:preview-1' }]);
    await act(async () => {
      resolveStream?.();
    });
  });

  it('an image-only message (no text) still sends and SKIPS the text classify', async () => {
    resolveStream = null;
    const { result, deps } = setup();

    await act(async () => {
      void result.current.send('', { images: [IMG] });
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });

    // No words to screen → classify never runs; the turn still fires with the image.
    expect(deps.classify).not.toHaveBeenCalled();
    expect(deps.runTurn).toHaveBeenCalledWith(
      expect.objectContaining({ images: [{ s3_key: 'chat-input/p1/abc', mime: 'image/png' }] }),
    );
    await act(async () => {
      resolveStream?.();
    });
  });

  it('a rejected image shows image-specific copy, charges 0 Stars, and clears the staged image', async () => {
    const onStarsCharged = vi.fn();
    const onApplyFiles = vi.fn();
    const deps = makeDeps();
    deps.runTurn = vi.fn(async () => {
      throw new ApiError(422, 'MODERATION_REJECTED', 'nope', {
        modality: 'image',
        reason: 'image_nsfw',
        stage: 'input',
      });
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles, onStarsCharged, projectId: 'p1', mode: 'pro', deps }),
    );
    const nonceBefore = result.current.imageRejectNonce;

    await act(async () => {
      await result.current.send('here', { images: [IMG] });
    });

    await waitFor(() => expect(result.current.error).toBe(IMAGE_REJECT_MESSAGE));
    // 0 Stars (the throw is before propose) and nothing applied to the VFS.
    expect(onStarsCharged).not.toHaveBeenCalled();
    expect(onApplyFiles).not.toHaveBeenCalled();
    // The composer is told to clear the rejected image (nonce bumped).
    expect(result.current.imageRejectNonce).toBeGreaterThan(nonceBefore);
    // The flag is NOT disabled (a reject ≠ feature-off).
    expect(result.current.imagesDisabled).toBe(false);
  });

  it('a screen OUTAGE (MODERATION_UNAVAILABLE) shows the hiccup copy and KEEPS the staged image (D-PAP-46)', async () => {
    const onStarsCharged = vi.fn();
    const onApplyFiles = vi.fn();
    const deps = makeDeps();
    deps.runTurn = vi.fn(async () => {
      throw new ApiError(422, 'MODERATION_UNAVAILABLE', 'try again', {
        modality: 'image',
        stage: 'input',
        system_error: true,
      });
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles, onStarsCharged, projectId: 'p1', mode: 'pro', deps }),
    );
    const nonceBefore = result.current.imageRejectNonce;

    await act(async () => {
      await result.current.send('here', { images: [IMG] });
    });

    // The picture was never judged — the copy must NOT blame it …
    await waitFor(() => expect(result.current.error).toBe(IMAGE_CHECK_HICCUP_MESSAGE));
    expect(onStarsCharged).not.toHaveBeenCalled();
    expect(onApplyFiles).not.toHaveBeenCalled();
    // … no reject-clear fires, the affordance stays available …
    expect(result.current.imageRejectNonce).toBe(nonceBefore);
    expect(result.current.imagesDisabled).toBe(false);
    // … and the SAME uploaded refs are handed back for re-staging (submit had
    // cleared the composer), so one tap retries without a re-upload.
    expect(result.current.imageRestore.nonce).toBeGreaterThan(0);
    expect(result.current.imageRestore.images).toEqual([IMG]);
  });

  it('a TEXT moderation reject keeps the generic copy (not the image copy)', async () => {
    const { result } = setupFailing(new ApiError(422, 'MODERATION_REJECTED', 'nope', { modality: 'text' }));
    await act(async () => {
      await result.current.send('something');
    });
    await waitFor(() => expect(result.current.error).not.toBe(IMAGE_REJECT_MESSAGE));
    expect(result.current.error).toContain('kind and safe');
  });

  it('IMAGE_INPUT_DISABLED (flag off) shows the "not available" copy, charges 0 Stars, and hides the affordance', async () => {
    const onStarsCharged = vi.fn();
    const deps = makeDeps();
    deps.runTurn = vi.fn(async () => {
      throw new ApiError(400, 'IMAGE_INPUT_DISABLED', 'off');
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), onStarsCharged, projectId: 'p1', mode: 'pro', deps }),
    );

    await act(async () => {
      await result.current.send('look', { images: [IMG] });
    });

    await waitFor(() => expect(result.current.error).toBe(IMAGE_DISABLED_MESSAGE));
    expect(onStarsCharged).not.toHaveBeenCalled();
    // Latched off for the session so the composer hides the picture button.
    expect(result.current.imagesDisabled).toBe(true);
    expect(result.current.imageRejectNonce).toBeGreaterThan(0);
  });
});

describe('engine switch (D-3D-08 — confirm before rebuilding 2D⇄3D)', () => {
  it('stages a confirm (no turn) then flips the engine + rebuilds on confirm', async () => {
    resolveStream = null;
    const deps = makeDeps();
    const onEngineChange = vi.fn();
    const onApplyFiles = vi.fn();
    const { result } = renderHook(() =>
      useGameAgent({
        files: [],
        onApplyFiles,
        projectId: 'p1',
        mode: 'lite',
        engine: 'phaser',
        onEngineChange,
        deps,
      }),
    );

    // A switch request must NOT auto-run a turn — it stages an engine-switch confirm.
    await act(async () => {
      await result.current.send('make the game 3D');
    });
    expect(result.current.pending?.kind).toBe('engine-switch');
    expect(result.current.pending?.engine).toBe('three');
    expect(deps.resetEngine).not.toHaveBeenCalled();
    expect(deps.runTurn).not.toHaveBeenCalled();

    // Confirm → reset to the clean 3D starter (engine flip + VFS replace), notify the
    // runner, then rebuild via the agent.
    await act(async () => {
      void result.current.confirmPending();
      await waitFor(() =>
        expect(deps.resetEngine).toHaveBeenCalledWith(
          expect.objectContaining({ projectId: 'p1', engine: 'three' }),
        ),
      );
    });
    expect(onEngineChange).toHaveBeenCalledWith('three');
    // The clean 3D starter is shown immediately (no old 2D files under the 3D engine).
    expect(onApplyFiles).toHaveBeenCalled();
    // The rebuild prompt is a port instruction, NOT the raw "make it 3D".
    await waitFor(() => expect(deps.runTurn).toHaveBeenCalled());
    const runArg = (deps.runTurn as ReturnType<typeof vi.fn>).mock.calls[0][0] as { prompt: string };
    expect(runArg.prompt).toMatch(/3D/);
    expect(runArg.prompt).not.toBe('make the game 3D');
    await act(async () => {
      resolveStream?.();
    });
  });

  it('preserves the kid uploaded assets (e.g. an imported .glb) across the rebuild', async () => {
    resolveStream = null;
    const deps = makeDeps();
    const onApplyFiles = vi.fn();
    // A 2D game with an imported 3D model + a sound the kid uploaded, alongside code.
    const glb = { path: 'assets/imported/spin.glb', content: 'data:model/gltf-binary;base64,AA==', kind: 'asset' as const, size: 2 };
    const sfx = { path: 'assets/imported/boing.wav', content: 'data:audio/wav;base64,BB==', kind: 'asset' as const, size: 2 };
    const code = { path: 'main.js', content: 'phaser code', kind: 'text' as const, size: 11 };
    const { result } = renderHook(() =>
      useGameAgent({
        files: [code, glb, sfx],
        onApplyFiles,
        projectId: 'p1',
        mode: 'lite',
        engine: 'phaser',
        onEngineChange: vi.fn(),
        deps,
      }),
    );

    await act(async () => {
      await result.current.send('make the game 3D');
    });
    await act(async () => {
      void result.current.confirmPending();
      await waitFor(() => expect(deps.resetEngine).toHaveBeenCalled());
    });

    // The reset VFS = the clean 3D starter PLUS the carried-over assets, and NOT the
    // old 2D code (main.js is the starter's, replaced — never the phaser one).
    const resetArg = (deps.resetEngine as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      files: { path: string; content: string }[];
    };
    const paths = resetArg.files.map((f) => f.path);
    expect(paths).toContain('assets/imported/spin.glb');
    expect(paths).toContain('assets/imported/boing.wav');
    expect(paths).toContain('main.js'); // the 3D starter's main.js
    expect(resetArg.files.find((f) => f.path === 'main.js')?.content).not.toBe('phaser code');
    // The clean apply shows the same preserved-assets VFS (no lost uploads).
    expect((onApplyFiles.mock.calls[0][0] as { path: string }[]).map((f) => f.path)).toEqual(
      expect.arrayContaining(['assets/imported/spin.glb', 'assets/imported/boing.wav']),
    );

    // The rebuild prompt names the preserved assets so the agent can wire the model in.
    await waitFor(() => expect(deps.runTurn).toHaveBeenCalled());
    const runArg = (deps.runTurn as ReturnType<typeof vi.fn>).mock.calls[0][0] as { prompt: string };
    expect(runArg.prompt).toContain('assets/imported/spin.glb');
    await act(async () => {
      resolveStream?.();
    });
  });

  it('cancel keeps the current engine and changes nothing', async () => {
    const deps = makeDeps();
    const onEngineChange = vi.fn();
    const { result } = renderHook(() =>
      useGameAgent({
        files: [],
        onApplyFiles: vi.fn(),
        projectId: 'p1',
        mode: 'lite',
        engine: 'phaser',
        onEngineChange,
        deps,
      }),
    );
    await act(async () => {
      await result.current.send('switch to 3d');
    });
    expect(result.current.pending?.kind).toBe('engine-switch');
    await act(async () => {
      await result.current.cancelPending();
    });
    expect(result.current.pending).toBeNull();
    expect(deps.resetEngine).not.toHaveBeenCalled();
    expect(onEngineChange).not.toHaveBeenCalled();
    expect(deps.runTurn).not.toHaveBeenCalled();
  });

  it('an ordinary edit on a 2D game does NOT trigger the switch confirm', async () => {
    resolveStream = null;
    const deps = makeDeps();
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'lite', engine: 'phaser', deps }),
    );
    await act(async () => {
      void result.current.send('add 3D-looking shadows');
      await waitFor(() => expect(deps.runTurn).toHaveBeenCalled());
    });
    expect(result.current.pending?.kind).not.toBe('engine-switch');
    await act(async () => {
      resolveStream?.();
    });
  });
});

// D-HARN-02 (playground-agent-harness-prd) — kid-safe failure taxonomy + idempotent
// retry: an AI_UNAVAILABLE turn failure shows FE-owned kid copy (never the raw
// message) with a retryable bubble, and retryLast re-sends the SAME idempotency key
// so the backend replays the turn instead of charging a second one.
describe('useGameAgent AI_UNAVAILABLE taxonomy + idempotent retry (D-HARN-02)', () => {
  it('an AI_UNAVAILABLE failure shows the kid copy on a retryable bubble (raw message never leaks)', async () => {
    const { result } = setupFailing(new ApiError(502, 'AI_UNAVAILABLE', 'DEEPROUTER_500: upstream exploded'));
    await act(async () => {
      await result.current.send('make it blue');
    });
    await waitFor(() => expect(result.current.error).toBe(AI_UNAVAILABLE_TEXT));
    const bubble = result.current.chat.at(-1);
    expect(bubble?.text).toBe(AI_UNAVAILABLE_TEXT);
    expect(bubble?.text).not.toContain('DEEPROUTER');
    // The bubble carries ITS OWN replay payload (prompt + key, D-HARN-02).
    expect(bubble?.retry).toMatchObject({ prompt: 'make it blue' });
    expect(bubble?.retry?.turnKey).toBeTruthy();
  });

  it('retryLast reuses the SAME idempotency key; a fresh send mints a different one', async () => {
    resolveStream = null;
    const keys: (string | undefined)[] = [];
    const deps = makeDeps();
    let fail = true;
    deps.runTurn = vi.fn(async (args: { idempotencyKey?: string }) => {
      keys.push(args.idempotencyKey);
      if (fail) {
        fail = false;
        throw new ApiError(502, 'AI_UNAVAILABLE', 'boom');
      }
      return TURN;
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps }),
    );

    await act(async () => {
      await result.current.send('make it blue');
    });
    await waitFor(() => expect(result.current.error).toBe(AI_UNAVAILABLE_TEXT));
    expect(keys[0]).toBeTruthy();

    // The retry replays the SAME logical turn: same prompt, SAME key (the backend
    // dedupes by key — no double charge).
    await act(async () => {
      result.current.retryLast();
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    expect((deps.runTurn as ReturnType<typeof vi.fn>).mock.calls[1][0]).toEqual(
      expect.objectContaining({ prompt: 'make it blue' }),
    );

    // A brand-new send is a NEW logical turn → a fresh key.
    resolveStream = null;
    await act(async () => {
      void result.current.send('add a score');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    expect(keys).toHaveLength(3);
    expect(keys[2]).toBeTruthy();
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('a STALE bubble chip (retryTurn) replays ITS OWN turn — not the latest one', async () => {
    resolveStream = null;
    const calls: { prompt: string; idempotencyKey?: string }[] = [];
    const deps = makeDeps();
    let failFirst = true;
    deps.runTurn = vi.fn(async (args: { prompt: string; idempotencyKey?: string }) => {
      calls.push({ prompt: args.prompt, idempotencyKey: args.idempotencyKey });
      if (failFirst) {
        failFirst = false;
        throw new ApiError(502, 'AI_UNAVAILABLE', 'boom');
      }
      return TURN;
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps }),
    );

    // Turn A fails → its bubble carries A's payload.
    await act(async () => {
      await result.current.send('turn A');
    });
    const bubbleA = result.current.chat.find((c) => c.text === AI_UNAVAILABLE_TEXT);
    expect(bubbleA?.retry).toMatchObject({ prompt: 'turn A', turnKey: calls[0].idempotencyKey });

    // Turn B (a different prompt) succeeds afterwards — the "last" turn is now B.
    resolveStream = null;
    await act(async () => {
      void result.current.send('turn B');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    expect(calls[1].prompt).toBe('turn B');

    // Tapping A's (stale) chip replays A — A's prompt, A's key. Never B's.
    resolveStream = null;
    await act(async () => {
      result.current.retryTurn(bubbleA!.retry!);
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    expect(calls[2].prompt).toBe('turn A');
    expect(calls[2].idempotencyKey).toBe(calls[0].idempotencyKey);
    expect(calls[2].idempotencyKey).not.toBe(calls[1].idempotencyKey);
  });
});

// D-HARN-03 — no silent input drops: a send while a turn is busy queues exactly ONE
// message ("I'll do this next") that auto-sends when the turn settles; further sends
// are ignored while the slot is taken; ✕ cancels the queued message.
describe('useGameAgent busy queue (D-HARN-03 — no silent drops)', () => {
  function setupHanging() {
    const deps = makeDeps();
    let resolveTurn: ((r: AgentTurnResult) => void) | null = null;
    deps.runTurn = vi.fn(
      () =>
        new Promise<AgentTurnResult>((resolve) => {
          resolveTurn = resolve;
        }),
    );
    const view = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps }),
    );
    return { ...view, deps, resolveTurn: () => resolveTurn };
  }

  it('queues ONE message while busy, ignores further sends, and auto-sends it on settle', async () => {
    resolveStream = null;
    const { result, deps, resolveTurn } = setupHanging();

    // Turn 1 is in flight (runTurn hangs) → busy.
    await act(async () => {
      void result.current.send('first');
      await waitFor(() => expect(deps.runTurn).toHaveBeenCalledTimes(1));
    });
    expect(result.current.busy).toBe(true);

    // A second message while busy is QUEUED — never dropped, never a second turn.
    await act(async () => {
      void result.current.send('second');
    });
    expect(result.current.queuedMessage?.text).toBe('second');
    expect(deps.runTurn).toHaveBeenCalledTimes(1);

    // A third message is ignored — only ONE can queue.
    await act(async () => {
      void result.current.send('third');
    });
    expect(result.current.queuedMessage?.text).toBe('second');

    // Turn 1 settles → the queued message auto-sends as its own turn.
    await act(async () => {
      resolveTurn()?.(TURN);
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    await waitFor(() => expect(deps.runTurn).toHaveBeenCalledTimes(2));
    expect((deps.runTurn as ReturnType<typeof vi.fn>).mock.calls[1][0]).toEqual(
      expect.objectContaining({ prompt: 'second' }),
    );
    // The slot is free again (the pill is gone).
    expect(result.current.queuedMessage).toBeNull();
    // The queued message shows as a normal kid bubble once it fires.
    expect(result.current.chat.some((c) => c.role === 'kid' && c.text === 'second')).toBe(true);
  });

  it('cancelQueued drops the queued message — nothing auto-sends on settle', async () => {
    resolveStream = null;
    const { result, deps, resolveTurn } = setupHanging();

    await act(async () => {
      void result.current.send('first');
      await waitFor(() => expect(deps.runTurn).toHaveBeenCalledTimes(1));
    });
    await act(async () => {
      void result.current.send('second');
    });
    expect(result.current.queuedMessage?.text).toBe('second');

    // The kid taps ✕ on the pill.
    await act(async () => {
      result.current.cancelQueued();
    });
    expect(result.current.queuedMessage).toBeNull();

    // Turn 1 settles → NO auto-send fires.
    await act(async () => {
      resolveTurn()?.(TURN);
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });
    await act(async () => {
      resolveStream?.();
    });
    expect(result.current.busy).toBe(false);
    expect(deps.runTurn).toHaveBeenCalledTimes(1);
  });
});

// D-HARN-03 — the offline pre-check must never silently eat a message (it also
// serves the queue's auto-send, whose text has already left the composer): the kid
// bubble + a retryable offline bubble land in the chat, not just a banner.
describe('useGameAgent offline pre-check keeps the message visible (D-HARN-03)', () => {
  it('posts the kid bubble + a retryable offline bubble; the chip replays once online', async () => {
    resolveStream = null;
    const { result, deps } = setup();
    net.offline = true;
    try {
      await act(async () => {
        await result.current.send('make it rain');
      });
      expect(deps.runTurn).not.toHaveBeenCalled();
      // The message is VISIBLE (kid bubble) with a calm retryable answer.
      expect(result.current.chat.some((c) => c.role === 'kid' && c.text === 'make it rain')).toBe(true);
      const bubble = result.current.chat.at(-1);
      expect(bubble?.text).toBe('Internet hiccup — your work is safe. Try again in a moment.');
      expect(bubble?.retry).toMatchObject({ prompt: 'make it rain' });

      // Back online → the bubble's chip replays the SAME turn (same key).
      net.offline = false;
      const keyBefore = bubble!.retry!.turnKey;
      await act(async () => {
        result.current.retryTurn(bubble!.retry!);
        await waitFor(() => expect(resolveStream).not.toBeNull());
      });
      await act(async () => {
        resolveStream?.();
      });
      expect(deps.runTurn).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'make it rain', idempotencyKey: keyBefore }),
      );
    } finally {
      net.offline = false;
    }
  });
});

// D-HARN-03 — silent-turn watchdog: a turn with no sign of life for the watchdog
// window is aborted through the EXISTING clean-cancel path (backend charges 0 Stars)
// and settles into CALM timeout copy + a retry chip — never a scary error. The retry
// reuses the same idempotency key (D-HARN-02).
describe('useGameAgent silent-turn watchdog (D-HARN-03)', () => {
  it('fires after the quiet window: clean abort, calm timeout copy + retry with the SAME key', async () => {
    vi.useFakeTimers();
    try {
      const keys: (string | undefined)[] = [];
      const deps = makeDeps();
      let hang = true;
      deps.runTurn = vi.fn((args: { idempotencyKey?: string; signal?: AbortSignal }) => {
        keys.push(args.idempotencyKey);
        if (hang) {
          // Hangs like a dead upstream; rejects only when the client aborts —
          // exactly what a real aborted fetch does (DOMException AbortError).
          return new Promise<AgentTurnResult>((_resolve, reject) => {
            args.signal?.addEventListener('abort', () =>
              reject(new DOMException('The user aborted a request.', 'AbortError')),
            );
          });
        }
        return Promise.resolve(TURN);
      });
      const onApplyFiles = vi.fn();
      const onStarsCharged = vi.fn();
      const { result } = renderHook(() =>
        useGameAgent({
          files: [],
          onApplyFiles,
          onStarsCharged,
          projectId: 'p1',
          mode: 'pro',
          deps,
          turnWatchdogMs: 5_000,
        }),
      );

      await act(async () => {
        void result.current.send('make it blue');
      });
      expect(deps.runTurn).toHaveBeenCalledTimes(1);
      expect(result.current.busy).toBe(true);

      // 5s (the overridden watchdog window) of total silence → the watchdog aborts
      // the in-flight turn via the existing stop mechanism (clean cancel, 0 Stars).
      await act(async () => {
        vi.advanceTimersByTime(5_000);
      });

      expect(result.current.busy).toBe(false);
      // CALM: never an error banner, and the game is untouched.
      expect(result.current.error).toBeNull();
      expect(onApplyFiles).not.toHaveBeenCalled();
      expect(onStarsCharged).not.toHaveBeenCalled();
      const bubble = result.current.chat.at(-1);
      expect(bubble?.text).toBe(TURN_TIMEOUT_TEXT);
      // The timeout bubble carries the turn's OWN replay payload.
      expect(bubble?.retry).toMatchObject({ prompt: 'make it blue', turnKey: keys[0] });
      expect(bubble?.pending).toBeFalsy();

      // The retry chip replays the SAME logical turn — same prompt, SAME key.
      hang = false;
      resolveStream = null;
      await act(async () => {
        result.current.retryLast();
      });
      await act(async () => {
        resolveStream?.();
      });
      expect(deps.runTurn).toHaveBeenCalledTimes(2);
      expect(keys[1]).toBe(keys[0]);
      expect(result.current.chat.at(-1)?.text).toBe(TURN.summary);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a kid "Stop waiting" still reads as STOPPED (the watchdog copy is timeout-only)', async () => {
    vi.useFakeTimers();
    try {
      const deps = makeDeps();
      deps.runTurn = vi.fn(
        (args: { signal?: AbortSignal }) =>
          new Promise<AgentTurnResult>((_resolve, reject) => {
            args.signal?.addEventListener('abort', () =>
              reject(new DOMException('The user aborted a request.', 'AbortError')),
            );
          }),
      );
      const { result } = renderHook(() =>
        useGameAgent({
          files: [],
          onApplyFiles: vi.fn(),
          projectId: 'p1',
          mode: 'pro',
          deps,
          turnWatchdogMs: 5_000,
        }),
      );

      await act(async () => {
        void result.current.send('make it blue');
      });
      // The kid stops BEFORE the watchdog window elapses.
      await act(async () => {
        vi.advanceTimersByTime(1_000);
        result.current.cancelTurn();
      });

      const bubble = result.current.chat.at(-1);
      expect(bubble?.text).toBe(STOPPED_TEXT);
      expect(bubble?.retry).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('guards the engine-switch REBUILD too: timeout settles calm copy + a port-prompt retry', async () => {
    vi.useFakeTimers();
    try {
      const deps = makeDeps();
      let portArgs: { prompt: string; idempotencyKey?: string } | undefined;
      deps.runTurn = vi.fn(
        (args: { prompt: string; idempotencyKey?: string; signal?: AbortSignal }) => {
          portArgs = args;
          return new Promise<AgentTurnResult>((_resolve, reject) => {
            args.signal?.addEventListener('abort', () =>
              reject(new DOMException('The user aborted a request.', 'AbortError')),
            );
          });
        },
      );
      const { result } = renderHook(() =>
        useGameAgent({
          files: [],
          onApplyFiles: vi.fn(),
          projectId: 'p1',
          mode: 'lite',
          engine: 'phaser',
          onEngineChange: vi.fn(),
          deps,
          turnWatchdogMs: 5_000,
        }),
      );

      await act(async () => {
        await result.current.send('make the game 3D');
      });
      expect(result.current.pending?.kind).toBe('engine-switch');

      // Confirm → reset + rebuild; the rebuild's runTurn hangs silently.
      await act(async () => {
        void result.current.confirmPending();
        await Promise.resolve();
      });
      expect(deps.resetEngine).toHaveBeenCalled();
      expect(deps.runTurn).toHaveBeenCalledTimes(1);
      expect(portArgs?.idempotencyKey).toBeTruthy();

      await act(async () => {
        vi.advanceTimersByTime(5_000);
      });

      expect(result.current.busy).toBe(false);
      expect(result.current.error).toBeNull();
      const bubble = result.current.chat.at(-1);
      expect(bubble?.text).toBe(TURN_TIMEOUT_TEXT);
      // The retry payload replays the PORT prompt with the rebuild's own key.
      expect(bubble?.retry?.prompt).toContain('Rebuild this as a 3D game');
      expect(bubble?.retry?.turnKey).toBe(portArgs?.idempotencyKey);
    } finally {
      vi.useRealTimers();
    }
  });

  it('guards plan-APPROVE: timeout settles calm copy, the confirm card stays as the retry', async () => {
    vi.useFakeTimers();
    try {
      const deps = makeDeps();
      // 1st runTurn (send) → warn gate; 2nd (acknowledged) → a plan needing approval.
      let warned = false;
      deps.runTurn = vi.fn(async () => {
        if (!warned) {
          warned = true;
          throw new ApiError(422, 'MODERATION_WARN', 'Just checking!', { kind: 'pii_warn' });
        }
        return { ...TURN, requires_approval: true };
      });
      let approveSignal: AbortSignal | undefined;
      deps.approve = vi.fn(
        (args: { signal?: AbortSignal }) =>
          new Promise<AgentTurnResult>((_resolve, reject) => {
            approveSignal = args.signal;
            args.signal?.addEventListener('abort', () =>
              reject(new DOMException('The user aborted a request.', 'AbortError')),
            );
          }),
      );
      const { result } = renderHook(() =>
        useGameAgent({
          files: [],
          onApplyFiles: vi.fn(),
          projectId: 'p1',
          mode: 'pro',
          deps,
          turnWatchdogMs: 5_000,
        }),
      );

      await act(async () => {
        await result.current.send('add lasers');
      });
      await act(async () => {
        await result.current.confirmWarn();
      });
      expect(result.current.pending?.kind).toBe('plan');

      // Approve hangs silently → the watchdog aborts it (the signal IS wired).
      await act(async () => {
        void result.current.confirmPending();
        await Promise.resolve();
      });
      expect(deps.approve).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'approve' }),
      );
      expect(approveSignal).toBeInstanceOf(AbortSignal);

      await act(async () => {
        vi.advanceTimersByTime(5_000);
      });

      expect(result.current.busy).toBe(false);
      const bubble = result.current.chat.at(-1);
      expect(bubble?.text).toBe(TURN_TIMEOUT_TEXT);
      // No chip here: the plan card is still up — re-tapping Approve IS the retry.
      expect(bubble?.retry).toBeUndefined();
      expect(result.current.pending?.kind).toBe('plan');
    } finally {
      vi.useRealTimers();
    }
  });
});
