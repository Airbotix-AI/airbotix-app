// @vitest-environment jsdom
//
// The redesigned GeneratingScreen drives REAL progress off the streamed turn:
// 'thinking' (no file yet) → 'building' (files reveal one-by-one as they stream)
// → 'done' (the AI reply + a short beat, then handoff). This test holds the turn
// promise open, feeds `file`/`summary` events, and asserts each phase.
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { DemoModeProvider } from '@/pages/try/demoMode';
import type { AgentTurnResult, TurnEvent, VfsFile } from '../code/codeApi';
import { GeneratingScreen } from './GeneratingScreen';
import { resolveProjectFiles } from './panes/playgroundApi';

// Capture the stream's onEvent + manual resolve/reject so the test controls timing.
let capturedOnEvent: ((e: TurnEvent) => void) | undefined;
let resolveTurn: ((r: AgentTurnResult) => void) | undefined;
let rejectTurn: ((e: unknown) => void) | undefined;
let streamArgs: unknown;

vi.mock('../code/codeApi', () => ({
  streamAgentTurn: vi.fn((args: unknown, onEvent: (e: TurnEvent) => void) => {
    streamArgs = args;
    capturedOnEvent = onEvent;
    return new Promise<AgentTurnResult>((res, rej) => {
      resolveTurn = res;
      rejectTurn = rej;
    });
  }),
}));
// The fallback path must never be hit in the happy case; mock it so an accidental
// call is obvious (it would reject). Individual tests override it when they DO
// exercise the fallback (e.g. the safety-refusal path).
vi.mock('./panes/playgroundApi', () => ({
  resolveProjectFiles: vi.fn(() => Promise.reject(new Error('fallback should not run'))),
}));

const FILES: VfsFile[] = [{ path: 'main.js', content: 'x', kind: 'text', size: 1 }];
const RESULT: AgentTurnResult = {
  turn_id: 't1',
  requires_approval: false,
  plan: null,
  changes: [],
  files: FILES,
  version: 1,
  summary: 'Your platformer is ready — jump across the platforms!',
  stars_charged: 0,
  tools_fired: ['write_file:main.js'],
};

afterEach(() => {
  cleanup();
  capturedOnEvent = undefined;
  resolveTurn = undefined;
  rejectTurn = undefined;
  streamArgs = undefined;
  vi.clearAllMocks();
});

// D-WEB kind-aware chrome: the decorative build stage matches the project kind —
// the platformer vignette for games, the assembling-browser-window for websites
// (owner feedback 2026-08-12: a website build showed the game animation).
describe('GeneratingScreen — kind-aware build stage', () => {
  it('a website build shows the website stage (and website copy), never the game vignette', () => {
    render(
      <GeneratingScreen prompt="a todo site" projectId="w1" mode="lite" kind="website" onDone={vi.fn()} />,
    );
    screen.getByTestId('build-stage-website');
    expect(screen.queryByTestId('build-stage-game')).toBeNull();
    expect(screen.queryByTestId('build-stage-neutral')).toBeNull();
    screen.getByText('Dreaming up your website…');
  });

  it('a game build keeps the platformer vignette', () => {
    render(<GeneratingScreen prompt="a pong game" projectId="g1" mode="lite" onDone={vi.fn()} />);
    screen.getByTestId('build-stage-game');
    expect(screen.queryByTestId('build-stage-website')).toBeNull();
    expect(screen.queryByTestId('build-stage-neutral')).toBeNull();
  });
});

// D-WEB-17 (neutral-first loading): the GENERIC landing mounts this screen the
// same tick as the submit, in `creating` mode with kind='neutral' — a
// kind-agnostic stage/copy while the SERVER routes game-vs-website (D-WEB-11).
// Nothing may fire until the create resolves, and NO on-screen word may say
// "game" or "website"; the stage then morphs to the kind stage in place.
describe('GeneratingScreen — neutral-first while the kind is decided (D-WEB-17)', () => {
  it('creating + kind=neutral: neutral stage + neutral copy, and NOTHING fires', () => {
    render(
      <GeneratingScreen prompt="a todo list" creating kind="neutral" mode="lite" onDone={vi.fn()} />,
    );
    screen.getByTestId('build-stage-neutral');
    expect(screen.queryByTestId('build-stage-game')).toBeNull();
    expect(screen.queryByTestId('build-stage-website')).toBeNull();
    screen.getByText('Warming up the studio…');
    // No game/website vocabulary anywhere (the prompt echo is the kid's words).
    expect(screen.queryByText(/game|website/i)).toBeNull();
    // No streamed turn and no project/scaffold load while the create is in flight.
    expect(streamArgs).toBeUndefined();
    expect(vi.mocked(resolveProjectFiles)).not.toHaveBeenCalled();
  });

  it('morphs to the WEBSITE stage in place when the routed kind arrives, then streams', () => {
    const onDone = vi.fn();
    const { rerender } = render(
      <GeneratingScreen prompt="a todo list" creating kind="neutral" mode="lite" onDone={onDone} />,
    );
    screen.getByTestId('build-stage-neutral');
    expect(streamArgs).toBeUndefined();

    // The create resolves: same screen, same mount — kind + projectId land.
    rerender(
      <GeneratingScreen prompt="a todo list" projectId="site-1" kind="website" mode="lite" onDone={onDone} />,
    );
    screen.getByTestId('build-stage-website');
    expect(screen.queryByTestId('build-stage-neutral')).toBeNull();
    // The real first turn fires now, on the created project.
    expect(streamArgs).toMatchObject({ projectId: 'site-1', prompt: 'a todo list' });
  });

  it('morphs to the GAME stage when the routing says game', () => {
    const onDone = vi.fn();
    const { rerender } = render(
      <GeneratingScreen prompt="a pong game" creating kind="neutral" mode="lite" onDone={onDone} />,
    );
    screen.getByTestId('build-stage-neutral');

    rerender(
      <GeneratingScreen prompt="a pong game" projectId="g1" kind="game" mode="lite" onDone={onDone} />,
    );
    screen.getByTestId('build-stage-game');
    expect(screen.queryByTestId('build-stage-neutral')).toBeNull();
    expect(streamArgs).toMatchObject({ projectId: 'g1' });
  });
});

describe('GeneratingScreen (real streamed progress)', () => {
  it('thinking → builds files as they stream → ready reveal → handoff', async () => {
    const onDone = vi.fn();
    render(<GeneratingScreen prompt="a platformer" projectId="p1" mode="pro" onDone={onDone} />);

    // Fired the streaming turn once, with the project + prompt + tier.
    expect(streamArgs).toMatchObject({ projectId: 'p1', prompt: 'a platformer', mode: 'pro' });

    // 'thinking': no file yet → the playful waiting copy, no file list.
    // (getByText throws if absent, so the call itself asserts presence.)
    screen.getByText('Dreaming up your game…');
    expect(screen.queryByText('main.js')).toBeNull();

    // Files stream in a burst (as gpt-4o-mini actually delivers them); the screen
    // reveals them one-by-one → 'building'. (findBy waits for the reveal interval.)
    act(() => {
      capturedOnEvent?.({ type: 'file', path: 'main.js' });
      capturedOnEvent?.({ type: 'file', path: 'src/scenes/Game.js' });
    });
    await screen.findByText('Building your game');
    await screen.findByText('main.js');
    await screen.findByText('Game.js');

    // Turn resolves → once the queue drains, the celebratory reveal shows the reply.
    await act(async () => {
      resolveTurn?.(RESULT);
    });
    await screen.findByText('Your game is ready!', undefined, { timeout: 2000 });
    expect(screen.getByTestId('generating-stream').textContent).toMatch(/jump across the platforms/);

    // After the short done beat, hands off the finished VFS + the first-turn seed.
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onDone).toHaveBeenCalledWith(
      FILES,
      {
        prompt: 'a platformer',
        reply: RESULT.summary,
        toolsFired: RESULT.tools_fired,
      },
      // A successful build is not blocked (3rd arg added for the safety-refusal path).
      undefined,
    );
  });

  it('a safety-refused first turn → opens the scaffold flagged as blocked (no silent empty)', async () => {
    // The safety check refuses the idea; the screen must NOT trap the kid — it
    // loads the empty scaffold and flags `blocked` so the workspace explains it.
    vi.mocked(resolveProjectFiles).mockResolvedValueOnce(FILES);
    const onDone = vi.fn();
    render(<GeneratingScreen prompt="something too rough" projectId="p1" mode="lite" onDone={onDone} />);

    await act(async () => {
      rejectTurn?.(new ApiError(400, 'MODERATION_REJECTED', "That topic isn't allowed at your age."));
    });

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onDone).toHaveBeenCalledWith(FILES, undefined, true);
  });

  it('an unavailable safety/AI service → general error page (not the safety deflection)', async () => {
    // SAFETY_UNAVAILABLE means the gate could NOT run (outage / unconfigured LLM),
    // not that the idea was unsafe. The screen must surface a general error
    // (onError('service')) — NOT open the workspace with the "too rough" block.
    const onDone = vi.fn();
    const onError = vi.fn();
    render(
      <GeneratingScreen
        prompt="a calm garden game"
        projectId="p1"
        mode="lite"
        onDone={onDone}
        onError={onError}
      />,
    );

    await act(async () => {
      rejectTurn?.(new ApiError(503, 'SAFETY_UNAVAILABLE', 'Something went wrong on our end.'));
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith('service'), { timeout: 3000 });
    expect(onDone).not.toHaveBeenCalled();
    // The fallback scaffold loader must NOT run on this path (it would open the studio).
    expect(vi.mocked(resolveProjectFiles)).not.toHaveBeenCalled();
  });

  // Try-demo (try-demo-mode-prd §3 step 1→2): NO backend, NO streamed turn —
  // the bundled starter plays through the SAME thinking → building (file-by-
  // file) → done arc, and the canned reply seeds the chat like a real first turn.
  it('a demo build streams the bundled starter through the real progress UI', async () => {
    const DEMO_FILES: VfsFile[] = [
      { path: 'main.js', content: 'x', kind: 'text', size: 1 },
      { path: 'src/scenes/Game.js', content: 'y', kind: 'text', size: 1 },
    ];
    vi.mocked(resolveProjectFiles).mockResolvedValueOnce(DEMO_FILES);
    const onDone = vi.fn();
    render(
      <DemoModeProvider value={{ surface: 'playground', firstTurnReply: 'Your catcher is ready!' }}>
        <GeneratingScreen prompt="a fruit catcher" onDone={onDone} />
      </DemoModeProvider>,
    );

    // No projectId → streamAgentTurn must NOT fire; the demo arc still shows
    // the REAL activity UI: thinking first…
    expect(streamArgs).toBeUndefined();
    screen.getByText('Dreaming up your game…');

    // …then the starter's files reveal one-by-one (after the thinking beat)…
    await screen.findByText('Building your game', undefined, { timeout: 3000 });
    await screen.findByText('main.js');
    await screen.findByText('Game.js', undefined, { timeout: 2000 });

    // …then the canned reply plays the done beat and seeds the first turn.
    await screen.findByText('Your game is ready!', undefined, { timeout: 3000 });
    expect(screen.getByTestId('generating-stream').textContent).toMatch(/catcher is ready/);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onDone).toHaveBeenCalledWith(
      DEMO_FILES,
      {
        prompt: 'a fruit catcher',
        reply: 'Your catcher is ready!',
        toolsFired: ['write_file:main.js', 'write_file:src/scenes/Game.js'],
        nextSteps: undefined,
        fileNotes: undefined,
      },
      undefined,
    );
  });
});
