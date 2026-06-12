// @vitest-environment jsdom
// Guide window spawn placement: it must never bury the conversation's latest
// messages — beside the chat when a readable column fits, otherwise a shorter
// top-anchored column that leaves the chat's input + newest replies visible.

import { describe, expect, it } from 'vitest';

import { defaultWindows } from './playgroundStore';

function rectsAt(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  const windows = defaultWindows();
  return { help: windows.help.rect, chat: windows.chat.rect };
}

describe('Guide window spawn vs the chat', () => {
  it('wide screens: opens BESIDE the chat (no horizontal overlap)', () => {
    const { help, chat } = rectsAt(2200, 1000);
    expect(help.x).toBeGreaterThanOrEqual(chat.x + chat.w);
    expect(help.w).toBeGreaterThanOrEqual(480);
  });

  it('laptop screens: opens as a SHORT column clear of the chat bottom third', () => {
    const { help, chat } = rectsAt(1380, 860);
    const chatBottomThird = chat.y + chat.h * (2 / 3);
    expect(help.y + help.h).toBeLessThanOrEqual(chatBottomThird);
  });
});
