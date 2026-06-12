// The tour engine's timing rules (try-demo-mode-prd §3 v3 jank fixes): heavy
// actions defer behind a double-rAF so the card/spotlight transition paints
// first; an after-edit restart re-fronts the panel the next card spotlights —
// two frames later, never in the same frame as the restart's game focus.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DemoStudioControls } from './demoMode';
import { PLAYGROUND_DEMO_SCRIPT } from './demoScript.playground';
import { PLAYGROUND_TOUR } from './demoTour.playground';
import {
  CHAT_SPOTLIGHT,
  afterPaint,
  cardForScriptStep,
  pendingSpotlightFor,
  restartThenRefocus,
  spotlightPanel,
} from './tourSequencing';

/** Deterministic rAF: queued callbacks run only when a frame is flushed. */
let frames: FrameRequestCallback[] = [];
const flushFrame = () => {
  const queued = frames;
  frames = [];
  for (const cb of queued) cb(0);
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockControls = (): DemoStudioControls => ({
  runGame: vi.fn(),
  focusPanel: vi.fn(),
  openFileAt: vi.fn(),
  explainSelection: vi.fn(),
  requestAssetGen: vi.fn(),
  openGuide: vi.fn(),
});

describe('afterPaint', () => {
  it('defers behind TWO frames — never the first paint frame', () => {
    const fn = vi.fn();
    afterPaint(fn);
    expect(fn).not.toHaveBeenCalled();
    flushFrame(); // frame 1: the card/spotlight transition paints
    expect(fn).not.toHaveBeenCalled();
    flushFrame(); // frame 2: now the heavy work may run
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('spotlightPanel', () => {
  it('maps window selectors to their panel', () => {
    expect(spotlightPanel('[data-window="chat"]')).toBe('chat');
    expect(spotlightPanel('[data-window="code"]')).toBe('code');
    expect(spotlightPanel('[data-window="game"]')).toBe('game');
    expect(spotlightPanel('[data-window="assets"]')).toBe('assets');
    expect(spotlightPanel('[data-window="help"]')).toBe('help');
  });

  it('the runner console lives inside the Game window', () => {
    expect(spotlightPanel('[data-testid="console-list"]')).toBe('game');
  });

  it('element-level selectors map to their HOST window (back-browsing re-fronts it)', () => {
    expect(spotlightPanel('[data-testid="explain-selection"]')).toBe('code');
    expect(spotlightPanel('[data-testid="asset-generate-prompt"]')).toBe('assets');
    expect(spotlightPanel('[data-testid="asset-remix-prompt"]')).toBe('assets');
  });

  it('landing-phase selectors and undefined map to no window', () => {
    expect(spotlightPanel('[data-testid="landing-prompt-box"]')).toBeNull();
    expect(spotlightPanel(undefined)).toBeNull();
  });
});

describe('cardForScriptStep', () => {
  it('maps every script step to exactly one firing card (chat send or explain-fire)', () => {
    for (const index of PLAYGROUND_DEMO_SCRIPT.steps.keys()) {
      const card = cardForScriptStep(index);
      expect(card, `step ${index} has a firing card`).toBeGreaterThanOrEqual(0);
      const action = PLAYGROUND_TOUR[card].action;
      expect(['script', 'explain-fire']).toContain(action.kind);
      expect((action as { step: number }).step).toBe(index);
    }
  });

  it('the explain step fires from the toolbar card (explain-fire)', () => {
    const explainIndex = PLAYGROUND_DEMO_SCRIPT.steps.findIndex((s) => s.kind === 'explain');
    expect(PLAYGROUND_TOUR[cardForScriptStep(explainIndex)].action.kind).toBe('explain-fire');
  });
});

describe('restartThenRefocus (chat re-front after an auto-restart)', () => {
  it('restarts immediately, then re-fronts the spotlighted panel two frames later', () => {
    const controls = mockControls();
    restartThenRefocus(controls, '[data-window="chat"]');
    expect(controls.runGame).toHaveBeenCalledTimes(1);
    // Never two window focuses in the same frame as the restart.
    expect(controls.focusPanel).not.toHaveBeenCalled();
    flushFrame();
    expect(controls.focusPanel).not.toHaveBeenCalled();
    flushFrame();
    expect(controls.focusPanel).toHaveBeenCalledWith('chat');
  });

  it('leaves the Game Runner fronted when the next card points at the game/console', () => {
    for (const selector of ['[data-window="game"]', '[data-testid="console-list"]', undefined]) {
      const controls = mockControls();
      restartThenRefocus(controls, selector);
      expect(controls.runGame).toHaveBeenCalledTimes(1);
      flushFrame();
      flushFrame();
      expect(controls.focusPanel).not.toHaveBeenCalled();
    }
  });

  it('no-ops without controls (workspace not mounted yet)', () => {
    expect(() => restartThenRefocus(null, '[data-window="chat"]')).not.toThrow();
  });
});

describe('pendingSpotlightFor (chat-bound actions spotlight chat BEFORE the send)', () => {
  it('returns the chat selector for scripted asks and the explain fire', () => {
    expect(pendingSpotlightFor('script')).toBe(CHAT_SPOTLIGHT);
    expect(pendingSpotlightFor('explain-fire')).toBe(CHAT_SPOTLIGHT);
  });

  it('generate and remix also spotlight chat — the conjuring + result bubble play there', () => {
    expect(pendingSpotlightFor('asset-generate')).toBe(CHAT_SPOTLIGHT);
    expect(pendingSpotlightFor('asset-remix')).toBe(CHAT_SPOTLIGHT);
  });

  it('leaves every other action on its own card spotlight', () => {
    for (const kind of [
      'landing-create',
      'show-diff',
      'explain-select',
      'asset-prompt',
      'asset-details',
      'open-guide',
      'advance',
      'finish',
    ]) {
      expect(pendingSpotlightFor(kind), kind).toBeNull();
    }
  });

  it('matches the selector the chat-discussing cards use (zero movement on advance)', () => {
    for (const card of PLAYGROUND_TOUR) {
      if (card.spotlight === CHAT_SPOTLIGHT) return; // at least one chat card exists
    }
    throw new Error('no card spotlights the chat window');
  });
});
