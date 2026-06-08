// @vitest-environment jsdom
//
// The redesigned GeneratingScreen drives REAL progress off the streamed turn:
// 'thinking' (no file yet) → 'building' (files reveal one-by-one as they stream)
// → 'done' (the AI reply + a short beat, then handoff). This test holds the turn
// promise open, feeds `file`/`summary` events, and asserts each phase.
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AgentTurnResult, TurnEvent, VfsFile } from '../code/codeApi';
import { GeneratingScreen } from './GeneratingScreen';

// Capture the stream's onEvent + a manual resolver so the test controls timing.
let capturedOnEvent: ((e: TurnEvent) => void) | undefined;
let resolveTurn: ((r: AgentTurnResult) => void) | undefined;
let streamArgs: unknown;

vi.mock('../code/codeApi', () => ({
  streamAgentTurn: vi.fn((args: unknown, onEvent: (e: TurnEvent) => void) => {
    streamArgs = args;
    capturedOnEvent = onEvent;
    return new Promise<AgentTurnResult>((res) => {
      resolveTurn = res;
    });
  }),
}));
// The fallback path must never be hit in the happy case; mock it so an accidental
// call is obvious (it would reject).
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
  summary: 'Your platformer is ready — jump across the platforms!',
  stars_charged: 0,
  tools_fired: ['write_file:main.js'],
};

afterEach(() => {
  capturedOnEvent = undefined;
  resolveTurn = undefined;
  vi.clearAllMocks();
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
    expect(onDone).toHaveBeenCalledWith(FILES, {
      prompt: 'a platformer',
      reply: RESULT.summary,
      toolsFired: RESULT.tools_fired,
    });
  });
});
