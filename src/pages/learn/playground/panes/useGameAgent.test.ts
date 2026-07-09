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
  IMAGE_REJECT_MESSAGE,
  IMAGE_DISABLED_MESSAGE,
  IMAGE_CHECK_HICCUP_MESSAGE,
  type ChatItem,
  type SendImage,
} from './useGameAgent';

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

describe('useGameAgent flushes the save before a turn (agent reads the kid latest VFS)', () => {
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

  it('still runs the turn when flushSave throws (best-effort — never trap a paid turn)', async () => {
    resolveStream = null;
    const deps = makeDeps();
    const flushSave = vi.fn(async () => {
      throw new Error('save hiccup');
    });
    const { result } = renderHook(() =>
      useGameAgent({ files: [], onApplyFiles: vi.fn(), projectId: 'p1', mode: 'pro', deps, flushSave }),
    );

    await act(async () => {
      void result.current.send('add a score');
      await waitFor(() => expect(resolveStream).not.toBeNull());
    });

    expect(flushSave).toHaveBeenCalledTimes(1);
    expect(deps.runTurn).toHaveBeenCalledTimes(1);
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
