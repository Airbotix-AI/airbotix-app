// Sequencing helpers for the `/try/playground` tour engine (try-demo-mode-prd
// §3 v3). Extracted from `TryPlaygroundPage` so the timing-critical rules are
// unit-testable: (a) heavy actions run only AFTER the card/spotlight transition
// has painted, and (b) the after-edit auto-restart never leaves the Game Runner
// fronted over the surface the next card discusses (usually the chat).

import type { DemoStudioControls } from './demoMode';
import { PLAYGROUND_TOUR } from './demoTour.playground';

/** Window-mode panels the tour can focus. */
export type SpotlightPanelId = 'chat' | 'code' | 'game' | 'assets' | 'help';

/**
 * Run `fn` two frames from now — after the current visual change (card swap +
 * spotlight retarget) has painted. Heavy work (Monaco jumps, chat sends, window
 * focus) must never block a transition's first frames; this is also the
 * "two frames apart" spacer between two window-focus changes (never focus two
 * windows in the same frame).
 */
export function afterPaint(fn: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

/** The studio panel a card's spotlight selector points at: `[data-window="…"]`
 *  → that window; the runner-console selector lives inside the Game window.
 *  Element-level selectors (toolbar, prompt boxes) map to no panel — the action
 *  that fired them already surfaced the right window. */
export function spotlightPanel(selector: string | undefined): SpotlightPanelId | null {
  if (!selector) return null;
  const win = selector.match(/data-window="(chat|code|game|assets|help)"/)?.[1];
  if (win) return win as SpotlightPanelId;
  if (selector.includes('console')) return 'game';
  return null;
}

/** The tour card whose Next fires script step `index` — a chat-send card or the
 *  explain toolbar's fire card (both settle through `onStepApplied`). */
export function cardForScriptStep(index: number): number {
  return PLAYGROUND_TOUR.findIndex(
    (c) =>
      (c.action.kind === 'script' || c.action.kind === 'explain-fire') &&
      c.action.step === index,
  );
}

/**
 * §3 after-edit beat: restart the running game through the real ▶ Play path
 * (which fronts the Game Runner), then — two frames later, never in the same
 * frame — bring the panel the NEXT card spotlights back on top, so the surface
 * the card discusses (e.g. the conversation) is what the user actually sees.
 */
export function restartThenRefocus(
  controls: DemoStudioControls | null,
  nextSpotlight: string | undefined,
): void {
  if (!controls) return;
  controls.runGame();
  const panel = spotlightPanel(nextSpotlight);
  if (panel && panel !== 'game') afterPaint(() => controls.focusPanel(panel));
}
