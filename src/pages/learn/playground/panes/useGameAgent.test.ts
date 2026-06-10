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
import { useGameAgent, type ChatItem } from './useGameAgent';

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
    classify: vi.fn(async () => ({ safeguarding: null, intent: 'code' as const })),
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
    classify: vi.fn(async () => ({ safeguarding: null, intent: 'code' as const })),
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
    expect(onApplyFiles).toHaveBeenCalledWith(FIX_TURN.files); // the repair WAS applied
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
