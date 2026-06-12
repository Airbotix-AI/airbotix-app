// Sequencing helpers for the `/try/playground` tour engine (try-demo-mode-prd
// §3 v3). Extracted from `TryPlaygroundPage` so the timing-critical rules are
// unit-testable: (a) heavy actions run only AFTER the card/spotlight transition
// has painted, and (b) the after-edit auto-restart never leaves the Game Runner
// fronted over the surface the next card discusses (usually the chat).

import type { DemoStudioControls } from './demoMode';
import { PLAYGROUND_TOUR, panelSpotlight } from './demoTour.playground';

/** Studio panels the tour can focus (floating window OR split tab/region). */
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

/** The studio panel a card's spotlight selector points at: a `data-window`/
 *  `data-pane` selector (either form, incl. the layout-proof comma pair from
 *  `panelSpotlight`) → that panel; element-level selectors map to the panel
 *  that HOSTS them (console → Game, ✨ explain toolbar → Code Editor,
 *  generate/remix prompts → Asset Viewer) so revealing a card — including
 *  browsing BACK to it — always re-fronts the surface it discusses.
 *  Landing-phase selectors have no panel. */
export function spotlightPanel(selector: string | undefined): SpotlightPanelId | null {
  if (!selector) return null;
  const win = selector.match(/data-(?:window|pane)="(chat|code|game|assets|help)"/)?.[1];
  if (win) return win as SpotlightPanelId;
  if (selector.includes('console')) return 'game';
  if (selector.includes('explain-selection')) return 'code';
  if (selector.includes('asset-generate-prompt') || selector.includes('asset-remix-prompt')) return 'assets';
  return null;
}

/** The selector of the Chat panel — where every conversation turn plays.
 *  Layout-proof (window OR split pane), same form the chat cards use. */
export const CHAT_SPOTLIGHT = panelSpotlight('chat');

/**
 * The spotlight to show WHILE a card's action is in flight: the surface where
 * the action is HAPPENING, from the moment Next is clicked. Everything that
 * talks — the scripted asks, the explain fire, AND asset generate/remix (the
 * "Conjuring…" progress and the finished sticker bubble play in the chat) —
 * spotlights the Chat window before the send. After an asset lands, the engine
 * holds a beat on the chat (so the new art is SEEN) and only then surfaces
 * My Assets with the card swap. Other actions keep the card's own spotlight.
 */
export function pendingSpotlightFor(kind: string): string | null {
  return kind === 'script' || kind === 'explain-fire' || kind === 'asset-generate' || kind === 'asset-remix'
    ? CHAT_SPOTLIGHT
    : null;
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

/**
 * The Guide rect the DEMO opens with (window mode): wide enough for the
 * pane's TWO-COLUMN layout (topics + content together — its single-column
 * collapse kicks in under 480px), placed right of the dock. Covering the
 * chat is fine at this step: the tour has it de-emphasized, and this is the
 * same resize a user could do by dragging.
 */
export function demoGuideRect(W: number, H: number): { x: number; y: number; w: number; h: number } {
  const DOCK = 132;
  const w = Math.max(560, Math.min(720, W - DOCK - 32));
  return { x: DOCK, y: Math.round(H * 0.06), w, h: Math.round(H * 0.84) };
}
