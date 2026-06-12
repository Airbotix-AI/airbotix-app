// The T1 v3 full-product-tour cards for `/try/playground` (try-demo-mode-prd §3
// — the arc: create → play → change → understand (select → explain) → beautify
// (describe → generate → details → remix → into the game) → break-and-fix →
// help → free explore). DATA ONLY: each card carries the overlay copy (concise,
// adult-facing, journey-only — no technical/meta detail), the PLACEMENT hint (a
// card never covers the surface it points at), the SPOTLIGHT selector (where to
// look — every card except the finale has one), and the ACTION its "Next"
// fires; `TryPlaygroundPage` is the engine that runs the actions through the
// studio's real affordances. Script-step indexes refer to
// `PLAYGROUND_DEMO_SCRIPT.steps`.

import type { DemoTourStep } from './DemoTourOverlay';

/**
 * Layout-proof spotlight selector for a studio panel: the floating window
 * (`data-window`, desktop/Window.tsx) OR the split-layout region (`data-pane`,
 * Workspace's split PanelGroup). Only one form exists in the DOM per layout
 * mode, and `querySelector` takes the first match of a selector list — so the
 * same card resolves in BOTH layouts, including after a mid-tour Windows↔Split
 * flip (the overlay's mask re-measures on its own poll).
 */
export const panelSpotlight = (id: 'chat' | 'code' | 'game' | 'assets' | 'help'): string =>
  `[data-window="${id}"], [data-pane="${id}"]`;

/** What a card's "Next" does (executed by TryPlaygroundPage at the frontier). */
export type PlaygroundTourAction =
  | { kind: 'landing-create' } // drive the real landing submit (locked prompt)
  | { kind: 'script'; step: number } // fire edit script step N through the real chat
  | { kind: 'show-diff'; step: number } // editor jump+highlight on step N's change
  | { kind: 'explain-select'; step: number } // select step N's snippet → the real ✨ toolbar pops (§3 6a)
  | { kind: 'explain-fire'; step: number } // fire the toolbar's real handler on step N (§3 6b)
  | { kind: 'asset-prompt' } // Asset Viewer: type the wish into the real generate box (§3 7a)
  | { kind: 'asset-generate' } // submit the pane's real ✨ Generate (§3 7a)
  | { kind: 'asset-details' } // open the sticker's real details + type the remix wish (§3 7b)
  | { kind: 'asset-remix' } // submit the details view's real Remix (§3 7b)
  | { kind: 'open-guide' } // open the in-studio Game Guide at the diagram doc
  | { kind: 'advance' } // just move to the next card
  | { kind: 'finish' }; // drop into free explore

export interface PlaygroundTourCard extends DemoTourStep {
  action: PlaygroundTourAction;
}

export const PLAYGROUND_TOUR: PlaygroundTourCard[] = [
  {
    title: 'Every game starts with a sentence',
    spotlight: '[data-testid="landing-prompt-box"]',
    body:
      'No syntax, no setup — your child describes a game in plain words and Airo, ' +
      'our teaching AI, builds it. This one is ready to go.',
    nextLabel: 'Create the game',
    placement: 'beside-input',
    // LEFT of the prompt box ONLY (user call): when a full card doesn't fit
    // left, the beside-input fallback renders a narrower left-column card —
    // still left, never stacked under the box, never over the logo above it.
    anchorPrefer: ['left'],
    hideSkip: true,
    action: { kind: 'landing-create' },
  },
  {
    title: 'Meet your game',
    spotlight: panelSpotlight('game'),
    body:
      'Built and already running — move the basket, catch the apples. In a lesson, ' +
      'this first playable moment lands in under a minute.',
    nextLabel: 'Ask: faster apples',
    placement: 'bottom-left',
    action: { kind: 'script', step: 0 },
  },
  {
    title: 'One ask → one change',
    spotlight: panelSpotlight('chat'),
    body:
      'One request in the chat, one small visible change — the apples really do ' +
      'fall faster. Ask, play, repeat: that tight loop is the lesson.',
    nextLabel: 'Show me the code',
    placement: 'bottom-left',
    action: { kind: 'show-diff', step: 0 },
  },
  {
    title: 'See the line that changed',
    spotlight: panelSpotlight('code'),
    body:
      'Behind the friendly chat is real JavaScript — and the exact line that just ' +
      'changed is highlighted. That is the code your child learns to read.',
    nextLabel: 'Ask: score +10',
    placement: 'top-right',
    action: { kind: 'script', step: 1 },
  },
  {
    title: 'Keep score',
    spotlight: panelSpotlight('chat'),
    body:
      'Airo confirmed it in the chat: ten points a catch, and the number in the ' +
      'corner climbs. Scores sneak real maths into every game.',
    nextLabel: 'Select the code',
    placement: 'bottom-left',
    action: { kind: 'explain-select', step: 2 },
  },
  {
    title: 'A ✨ button appears',
    spotlight: '[data-testid="explain-selection"]',
    body:
      'The scoring lines are selected, and the ✨ Explain this button pops up ' +
      'right over them — your child can do this with any code that looks mysterious.',
    nextLabel: 'Explain the code',
    placement: 'top-right',
    action: { kind: 'explain-fire', step: 2 },
  },
  {
    title: 'Code that explains itself',
    spotlight: panelSpotlight('chat'),
    body:
      'Airo explains the selected lines in plain words, right in the conversation — ' +
      'no jargon. Curiosity always gets an answer.',
    nextLabel: 'Draw a new apple',
    placement: 'bottom-left',
    action: { kind: 'asset-prompt' },
  },
  {
    title: 'Describe it, Airo draws it',
    spotlight: '[data-testid="asset-generate-prompt"]',
    body:
      'The Asset Viewer holds the game’s art, and its magic box already has the ' +
      'wish typed in: a shiny red apple sticker. One sentence is all it takes.',
    nextLabel: 'Generate ✨',
    placement: 'bottom-right',
    action: { kind: 'asset-generate' },
  },
  {
    title: 'Airo can draw, too',
    spotlight: panelSpotlight('assets'),
    body:
      'A brand-new apple sticker just landed next to the game’s own art. ' +
      'Let’s open it up and have a closer look.',
    nextLabel: 'Open the sticker',
    placement: 'bottom-right',
    action: { kind: 'asset-details' },
  },
  {
    title: 'Same sticker, new twist',
    spotlight: '[data-testid="asset-remix-prompt"]',
    body:
      'Every sticker has its own page — and a Remix box, already filled in: make ' +
      'it golden and sparkly. Not quite right is never the end.',
    nextLabel: 'Remix it: gold ✨',
    placement: 'bottom-right',
    action: { kind: 'asset-remix' },
  },
  {
    title: 'Remix until it sparkles',
    spotlight: panelSpotlight('assets'),
    body:
      'Golden and sparkly it is — same apple, new shine, saved beside the ' +
      'original. As many tries as it takes.',
    nextLabel: 'Use it in the game',
    placement: 'bottom-right',
    action: { kind: 'script', step: 3 },
  },
  {
    title: 'Your art, in your game',
    spotlight: panelSpotlight('game'),
    body:
      'The remixed sticker just became the real apple — look at the game: golden ' +
      'apples are falling. Imagine, draw, play: the whole loop in one place.',
    nextLabel: 'Ask: “You win!” at 100',
    placement: 'bottom-left',
    action: { kind: 'script', step: 4 },
  },
  {
    title: 'Even pros hit errors',
    spotlight: '[data-testid="console-list"]',
    body:
      'That ask broke the game — and the console caught it, pointing at the exact ' +
      'line. Reading an error calmly is a superpower we teach early.',
    nextLabel: 'Ask Airo to fix it',
    placement: 'bottom-left',
    action: { kind: 'script', step: 5 },
  },
  {
    title: 'Airo reads the console and fixes it',
    spotlight: panelSpotlight('game'),
    body:
      'Airo found the missing piece, repaired the code, and the game restarted — ' +
      'now the win banner is ready and waiting. Debugging, demonstrated.',
    nextLabel: 'Open the Game Guide',
    placement: 'bottom-left',
    action: { kind: 'open-guide' },
  },
  {
    title: 'Stuck? The Guide knows',
    spotlight: panelSpotlight('help'),
    body:
      'The same guide your child reads in lessons — searchable, diagram-rich, with ' +
      'a Simple or More reading level. Help is always one tap away.',
    nextLabel: 'Last step',
    placement: 'bottom-right',
    action: { kind: 'advance' },
  },
  {
    title: 'Now it’s all yours',
    body:
      'Edit the code, run it, undo, rearrange the windows — it’s all live. ' +
      'Questions? Contact us from the banner above.',
    nextLabel: 'Explore freely ✨',
    placement: 'bottom-right',
    action: { kind: 'finish' },
  },
];
