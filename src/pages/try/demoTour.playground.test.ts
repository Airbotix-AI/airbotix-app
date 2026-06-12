// The T1 v3 tour data (try-demo-mode-prd §3): 16 cards, the PRD's arc in order
// (incl. the split explain pair: select → fire, and the 5-card beautify loop:
// describe → generate → details → remix → into the game), a mandatory
// (non-skippable) landing step beside the input, scripted steps fired exactly
// once each, and short next-labels (the overlay's Next pill must never overflow
// the card).

import { describe, expect, it } from 'vitest';

import { PLAYGROUND_DEMO_SCRIPT } from './demoScript.playground';
import { PLAYGROUND_TOUR } from './demoTour.playground';

/** Placement rules (§3 v0.5): keep labels short so the pill never overflows. */
const MAX_NEXT_LABEL_CHARS = 24;

describe('PLAYGROUND_TOUR (v3)', () => {
  it('is the 16-card PRD arc, in order', () => {
    expect(PLAYGROUND_TOUR).toHaveLength(16);
    expect(PLAYGROUND_TOUR.map((c) => c.action.kind)).toEqual([
      'landing-create', // 1 landing start
      'script', // 2 meet your game → ask 1
      'show-diff', // 3 one ask one change → diff jump
      'script', // 4 see the line → ask 2
      'explain-select', // 5 keep score → select the snippet (6a)
      'explain-fire', // 6a toolbar card → fire the real ✨ handler (6b)
      'asset-prompt', // 6b explain card → type the wish into the real box (7a)
      'asset-generate', // 7a prompt-box card → submit the real Generate
      'asset-details', // 7a sticker card → open its real details (7b)
      'asset-remix', // 7b details card → submit the real Remix
      'script', // 7b remix card → wire it into the game (7c)
      'script', // 7c in-game card → bug ask
      'script', // 8 error card → fix ask
      'open-guide', // 9 fixed card → guide
      'advance', // 10 guide card
      'finish', // 11 free explore
    ]);
  });

  it('step 1 is mandatory, beside the input, and creates the game', () => {
    const first = PLAYGROUND_TOUR[0];
    expect(first.hideSkip).toBe(true);
    expect(first.placement).toBe('beside-input');
    expect(first.nextLabel).toBe('Create the game');
    // Only the landing step is non-skippable.
    expect(PLAYGROUND_TOUR.filter((c) => c.hideSkip)).toHaveLength(1);
  });

  it('fires every script step exactly once, in script order (explain via explain-fire)', () => {
    const fired = PLAYGROUND_TOUR.flatMap((c) =>
      c.action.kind === 'script' || c.action.kind === 'explain-fire' ? [c.action.step] : [],
    );
    expect(fired).toEqual([...PLAYGROUND_DEMO_SCRIPT.steps.keys()]);
  });

  it('the explain pair selects then fires the SAME explain step, back to back', () => {
    const select = PLAYGROUND_TOUR.findIndex((c) => c.action.kind === 'explain-select');
    const fire = PLAYGROUND_TOUR.findIndex((c) => c.action.kind === 'explain-fire');
    expect(fire).toBe(select + 1);
    const selectStep =
      PLAYGROUND_TOUR[select].action.kind === 'explain-select'
        ? (PLAYGROUND_TOUR[select].action as { step: number }).step
        : -1;
    const fireStep =
      PLAYGROUND_TOUR[fire].action.kind === 'explain-fire'
        ? (PLAYGROUND_TOUR[fire].action as { step: number }).step
        : -2;
    expect(selectStep).toBe(fireStep);
    expect(PLAYGROUND_DEMO_SCRIPT.steps[selectStep]?.kind).toBe('explain');
    // The toolbar card spotlights the REAL toolbar the selection popped.
    expect(PLAYGROUND_TOUR[fire].spotlight).toBe('[data-testid="explain-selection"]');
  });

  it('the beautify loop drives the pane UI: prompt-fill → generate, details-fill → remix', () => {
    const kinds = PLAYGROUND_TOUR.map((c) => c.action.kind);
    const prompt = kinds.indexOf('asset-prompt');
    expect(kinds.indexOf('asset-generate')).toBe(prompt + 1);
    expect(kinds.indexOf('asset-details')).toBe(prompt + 2);
    expect(kinds.indexOf('asset-remix')).toBe(prompt + 3);
    // The fill cards spotlight the REAL inputs the engine types into.
    expect(PLAYGROUND_TOUR[prompt + 1].spotlight).toBe('[data-testid="asset-generate-prompt"]');
    expect(PLAYGROUND_TOUR[prompt + 3].spotlight).toBe('[data-testid="asset-remix-prompt"]');
  });

  it('the diff card points at an edit step', () => {
    const diff = PLAYGROUND_TOUR.find((c) => c.action.kind === 'show-diff');
    expect(diff).toBeTruthy();
    const step = diff!.action.kind === 'show-diff' ? diff!.action.step : -1;
    expect(PLAYGROUND_DEMO_SCRIPT.steps[step]?.kind).toBe('edit');
  });

  it('cards that discuss a conversation beat spotlight the chat window', () => {
    // §3 v3 fixes 1–2: after an auto-restarting edit, the next card talks about
    // the ask/answer — it must point at the chat, not the game.
    for (const title of ['One ask → one change', 'Keep score', 'Code that explains itself']) {
      const card = PLAYGROUND_TOUR.find((c) => c.title === title);
      expect(card?.spotlight, title).toBe('[data-window="chat"]');
    }
  });

  it('every card has a placement and a short next-label (overlay placement rules)', () => {
    for (const card of PLAYGROUND_TOUR) {
      expect(card.placement, card.title).toBeTruthy();
      expect(card.nextLabel, card.title).toBeTruthy();
      expect(card.nextLabel!.length, `"${card.nextLabel}" too long`).toBeLessThanOrEqual(
        MAX_NEXT_LABEL_CHARS,
      );
      // Journey-only guidance: no technical/meta detail in the copy.
      expect(`${card.title} ${card.body}`).not.toMatch(
        /scripted|mock-?up|nothing is saved|prompt is locked|demo locks/i,
      );
    }
  });

  it('every card except the free-explore finale spotlights where to look', () => {
    const last = PLAYGROUND_TOUR[PLAYGROUND_TOUR.length - 1];
    expect(last.action.kind).toBe('finish');
    expect(last.spotlight).toBeUndefined(); // the whole studio is theirs
    for (const card of PLAYGROUND_TOUR.slice(0, -1)) {
      expect(card.spotlight, `"${card.title}" needs a spotlight`).toMatch(/^\[data-/);
    }
  });
});
