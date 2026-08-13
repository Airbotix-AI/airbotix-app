// @vitest-environment jsdom
// Guide window spawn placement (D-WEB-21): it launches wide enough that BOTH the
// pillar sidebar AND the content column show from the first open (game AND website
// projects), while still never burying the conversation's latest messages —
// beside the chat when a two-pane-wide column fits there, otherwise a wide top
// strip that leaves the chat's input + newest replies visible below it.

import { describe, expect, it } from 'vitest';

import { GUIDE_MIN_W, defaultWindows, usePlaygroundStore } from './playgroundStore';

function rectsAt(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  const windows = defaultWindows();
  return { help: windows.help.rect, chat: windows.chat.rect };
}

/** The "never bury the chat" contract: fully beside the chat, OR a top strip that
 *  leaves the chat's bottom third (its input + latest replies) clear. */
function clearOfConversation(help: { x: number; y: number; w: number; h: number }, chat: { x: number; y: number; w: number; h: number }): boolean {
  const beside = help.x + help.w <= chat.x;
  const clearOfLatest = help.y + help.h <= chat.y + (chat.h * 2) / 3;
  return beside || clearOfLatest;
}

describe('Guide window spawn: sidebar + content both visible, never on the conversation', () => {
  it('typical viewports: opens at least two-pane wide, on screen, clear of the chat', () => {
    for (const [w, h] of [
      [2200, 1000],
      [1380, 860],
      [1280, 800],
    ]) {
      const { help, chat } = rectsAt(w, h);
      // Wide enough to show the pillar sidebar AND the content column.
      expect(help.w, `${w}px: two-pane floor`).toBeGreaterThanOrEqual(GUIDE_MIN_W);
      // Fully on screen.
      expect(help.x, `${w}px: on-screen left`).toBeGreaterThanOrEqual(0);
      expect(help.x + help.w, `${w}px: on-screen right`).toBeLessThanOrEqual(w);
      // Never buries the conversation's latest messages.
      expect(clearOfConversation(help, chat), `${w}px: clear of chat`).toBe(true);
    }
  });

  it('very wide screens: a two-pane column fits fully LEFT of the chat', () => {
    const { help, chat } = rectsAt(3200, 1200);
    expect(help.w).toBeGreaterThanOrEqual(GUIDE_MIN_W);
    expect(help.x + help.w).toBeLessThanOrEqual(chat.x); // beside, not overlapping
  });

  it('narrow viewports: clamps the strip to the screen (still fully visible)', () => {
    const { help, chat } = rectsAt(900, 700);
    expect(help.x).toBeGreaterThanOrEqual(0);
    expect(help.x + help.w).toBeLessThanOrEqual(900);
    // Even clamped, it stays clear of the chat's newest messages.
    expect(clearOfConversation(help, chat)).toBe(true);
  });
});

describe('layout flip repositions an overlapping Guide (split → window)', () => {
  it('moves the open Guide off the chat, relative to where the chat actually is', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1380 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 860 });
    // reseed under THESE dims (the store seeded at module-load jsdom defaults;
    // a real browser's seed + flip always share one viewport)
    usePlaygroundStore.setState({ windows: defaultWindows() });
    const st = usePlaygroundStore.getState();
    // open the guide ON TOP of the chat (e.g. dragged there / legacy rect)
    const chat = usePlaygroundStore.getState().windows.chat.rect;
    usePlaygroundStore.setState((s) => ({
      windows: {
        ...s.windows,
        help: { ...s.windows.help, open: true, rect: { ...chat } },
      },
    }));
    st.setLayoutMode('split');
    st.setLayoutMode('window');
    const { help } = usePlaygroundStore.getState().windows;
    const c = usePlaygroundStore.getState().windows.chat.rect;
    const overlap = help.rect.x < c.x + c.w && c.x < help.rect.x + help.rect.w &&
      help.rect.y < c.y + c.h && c.y < help.rect.y + help.rect.h;
    // The contract: fully beside the chat, OR (narrow fallback) a short strip
    // that leaves the chat's bottom third — input + latest replies — clear.
    const clearOfLatest = help.rect.y + help.rect.h <= c.y + (c.h * 2) / 3;
    expect(overlap === false || clearOfLatest).toBe(true);
  });

  it('leaves a non-overlapping or closed Guide untouched', () => {
    usePlaygroundStore.setState({ windows: defaultWindows() });
    const before = usePlaygroundStore.getState().windows.help.rect;
    usePlaygroundStore.getState().setLayoutMode('split');
    usePlaygroundStore.getState().setLayoutMode('window');
    expect(usePlaygroundStore.getState().windows.help.rect).toEqual(before);
  });
});
