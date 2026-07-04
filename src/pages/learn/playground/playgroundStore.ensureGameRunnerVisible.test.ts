// @vitest-environment jsdom
// Verification runs need a LIVE GameFrame (D-PAP-40): the Game window launches
// CLOSED (chat-first), so the verification loop's restart must open it — but a
// silent fix beat must never yank an already-visible window forward (no focus
// steal), and split mode (Game pane always visible) needs no window at all.

import { beforeEach, describe, expect, it } from 'vitest';

import { defaultWindows, ensureGameRunnerVisible, usePlaygroundStore } from './playgroundStore';

describe('ensureGameRunnerVisible (verification restart, D-PAP-40)', () => {
  beforeEach(() => {
    usePlaygroundStore.setState({ windows: defaultWindows(), layoutMode: 'window' });
  });

  it('opens the CLOSED game window in window mode (the chat-first launch default)', () => {
    expect(usePlaygroundStore.getState().windows.game.open).toBe(false);
    ensureGameRunnerVisible();
    const game = usePlaygroundStore.getState().windows.game;
    expect(game.open).toBe(true);
    expect(game.minimized).toBe(false);
  });

  it('opens WITHOUT raising: the chat stays on top where the two windows overlap', () => {
    // The default game rect overlaps the chat's right edge — raising the game
    // on open used to sit its stage OVER the chat's send button (the kid could
    // not click Send). Verification needs a MOUNTED runner, never focus.
    const chatZ = usePlaygroundStore.getState().windows.chat.zIndex;
    const gameZBefore = usePlaygroundStore.getState().windows.game.zIndex;
    ensureGameRunnerVisible();
    const game = usePlaygroundStore.getState().windows.game;
    expect(game.zIndex).toBe(gameZBefore);
    expect(game.zIndex).toBeLessThan(chatZ);
  });

  it('restores a MINIMIZED game window (it renders nothing while minimized)', () => {
    usePlaygroundStore.getState().openOrFocus('game');
    usePlaygroundStore.getState().minimize('game');
    ensureGameRunnerVisible();
    const game = usePlaygroundStore.getState().windows.game;
    expect(game.open).toBe(true);
    expect(game.minimized).toBe(false);
  });

  it('does NOT re-focus a game window already on screen (silent fix beat, no z bump)', () => {
    usePlaygroundStore.getState().openOrFocus('game');
    const zBefore = usePlaygroundStore.getState().windows.game.zIndex;
    const topZBefore = usePlaygroundStore.getState().topZ;
    ensureGameRunnerVisible();
    expect(usePlaygroundStore.getState().windows.game.zIndex).toBe(zBefore);
    expect(usePlaygroundStore.getState().topZ).toBe(topZBefore);
  });

  it('no-ops entirely in split mode (the Game pane is always visible there)', () => {
    usePlaygroundStore.setState({ layoutMode: 'split' });
    ensureGameRunnerVisible();
    expect(usePlaygroundStore.getState().windows.game.open).toBe(false);
  });
});
