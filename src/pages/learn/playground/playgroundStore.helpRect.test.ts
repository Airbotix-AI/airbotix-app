// @vitest-environment jsdom
// Guide window spawn placement: it must never bury the conversation's latest
// messages — beside the chat when a readable column fits, otherwise a shorter
// top-anchored column that leaves the chat's input + newest replies visible.

import { describe, expect, it } from 'vitest';

import { defaultWindows, usePlaygroundStore } from './playgroundStore';

function rectsAt(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  const windows = defaultWindows();
  return { help: windows.help.rect, chat: windows.chat.rect };
}

describe('Guide window spawn vs the chat (top-left, never on the conversation)', () => {
  it('desktop + laptop: opens TOP-LEFT, fully clear of the chat column', () => {
    for (const [w, h] of [
      [2200, 1000],
      [1380, 860],
      [1280, 800],
    ]) {
      const { help, chat } = rectsAt(w, h);
      expect(help.x + help.w, `${w}px wide`).toBeLessThanOrEqual(chat.x);
      expect(help.w, `${w}px wide`).toBeGreaterThanOrEqual(250);
    }
  });

  it('tiny screens: falls back to a SHORT strip clear of the chat bottom third', () => {
    const { help, chat } = rectsAt(1000, 700);
    const chatBottomThird = chat.y + chat.h * (2 / 3);
    expect(help.y + help.h).toBeLessThanOrEqual(chatBottomThird);
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
