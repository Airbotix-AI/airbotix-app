// The T1 v2 full-product-tour cards for `/try/playground` (try-demo-mode-prd §3
// v0.5 — the 11-step arc: create → play → change → understand → beautify →
// break-and-fix → help → free explore). DATA ONLY: each card carries the overlay
// copy (concise, adult-facing, journey-only — no technical/meta detail), the
// PLACEMENT hint (a card never covers the surface it points at), and the ACTION
// its "Next" fires; `TryPlaygroundPage` is the engine that runs the actions
// through the studio's real affordances. Script-step indexes refer to
// `PLAYGROUND_DEMO_SCRIPT.steps`.

import type { DemoTourStep } from './DemoTourOverlay';

/** What a card's "Next" does (executed by TryPlaygroundPage at the frontier). */
export type PlaygroundTourAction =
  | { kind: 'landing-create' } // drive the real landing submit (locked prompt)
  | { kind: 'script'; step: number } // fire script step N through the real chat
  | { kind: 'show-diff'; step: number } // editor jump+highlight on step N's change
  | { kind: 'asset-magic' } // Asset Viewer: generate + remix via the offline stubs
  | { kind: 'open-guide' } // open the in-studio Game Guide
  | { kind: 'advance' } // just move to the next card
  | { kind: 'finish' }; // drop into free explore

export interface PlaygroundTourCard extends DemoTourStep {
  action: PlaygroundTourAction;
}

/** The Asset Viewer generation the tour runs (step 7), and its remix follow-up. */
export const TOUR_ASSET_PROMPT = 'a shiny red apple sticker';
export const TOUR_REMIX_PROMPT = 'make it golden and sparkly';

export const PLAYGROUND_TOUR: PlaygroundTourCard[] = [
  {
    title: 'Every game starts with a sentence',
    body:
      'No syntax, no setup — your child describes a game in plain words and Airo, ' +
      'our teaching AI, builds it. This one is ready to go.',
    nextLabel: 'Create the game',
    placement: 'beside-input',
    hideSkip: true,
    action: { kind: 'landing-create' },
  },
  {
    title: 'Meet your game',
    body:
      'Built and already running — move the basket, catch the apples. In a lesson, ' +
      'this first playable moment lands in under a minute.',
    nextLabel: 'Ask: faster apples',
    placement: 'bottom-left',
    action: { kind: 'script', step: 0 },
  },
  {
    title: 'One ask → one change',
    body:
      'One request, one small visible change — the apples really do fall faster. ' +
      'Ask, play, repeat: that tight loop is the lesson.',
    nextLabel: 'Show me the code',
    placement: 'bottom-left',
    action: { kind: 'show-diff', step: 0 },
  },
  {
    title: 'See the line that changed',
    body:
      'Behind the friendly chat is real JavaScript — and the exact line that just ' +
      'changed is highlighted. That is the code your child learns to read.',
    nextLabel: 'Ask: score +10',
    placement: 'top-right',
    action: { kind: 'script', step: 1 },
  },
  {
    title: 'Keep score',
    body:
      'Ten points a catch — watch the number climb. Scores sneak real maths and ' +
      'cause-and-effect into every game.',
    nextLabel: 'Explain this code',
    placement: 'bottom-left',
    action: { kind: 'script', step: 2 },
  },
  {
    title: 'Code that explains itself',
    body:
      'Select any code and ask Airo to explain it — plain words, no jargon. ' +
      'Curiosity always gets an answer here.',
    nextLabel: 'Make it beautiful',
    placement: 'bottom-left',
    action: { kind: 'asset-magic' },
  },
  {
    title: 'Make it beautiful',
    body:
      'The Asset Viewer holds the game’s art — the same apples and basket on ' +
      'screen. Airo just drew a new sticker and remixed it until it sparkled.',
    nextLabel: 'Ask: “You win!” at 100',
    placement: 'bottom-right',
    action: { kind: 'script', step: 3 },
  },
  {
    title: 'Even pros hit errors',
    body:
      'That ask broke the game — and the console caught it, pointing at the exact ' +
      'line. Reading an error calmly is a superpower we teach early.',
    nextLabel: 'Ask Airo to fix it',
    placement: 'bottom-left',
    action: { kind: 'script', step: 4 },
  },
  {
    title: 'Airo reads the console and fixes it',
    body:
      'Airo found the missing piece, repaired the code, and the game restarted — ' +
      'now the win banner is ready and waiting. Debugging, demonstrated.',
    nextLabel: 'Open the Game Guide',
    placement: 'bottom-left',
    action: { kind: 'open-guide' },
  },
  {
    title: 'Stuck? The Guide knows',
    body:
      'A built-in, kid-friendly guide to game-making — searchable, with a Simple ' +
      'or More reading level. Help is always one tap away.',
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
