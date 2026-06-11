// The T1 v2 tour data (try-demo-mode-prd §3 v0.6): 13 cards, the PRD's arc in
// order (incl. the 3-card beautify loop: generate → remix → into the game), a
// mandatory (non-skippable) landing step beside the input, scripted steps fired
// exactly once each, and short next-labels (the overlay's Next pill must never
// overflow the card).

import { describe, expect, it } from 'vitest';

import { PLAYGROUND_DEMO_SCRIPT } from './demoScript.playground';
import { PLAYGROUND_TOUR } from './demoTour.playground';

/** Placement rules (§3 v0.5): keep labels short so the pill never overflows. */
const MAX_NEXT_LABEL_CHARS = 24;

describe('PLAYGROUND_TOUR (v2)', () => {
  it('is the 13-card PRD arc, in order', () => {
    expect(PLAYGROUND_TOUR).toHaveLength(13);
    expect(PLAYGROUND_TOUR.map((c) => c.action.kind)).toEqual([
      'landing-create', // 1 landing start
      'script', // 2 meet your game → ask 1
      'show-diff', // 3 one ask one change → diff jump
      'script', // 4 see the line → ask 2
      'script', // 5 keep score → explain-this
      'asset-generate', // 6 explain card → draw a sticker (7a)
      'asset-remix', // 7a sticker card → remix it (7b)
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

  it('fires every script step exactly once, in script order', () => {
    const fired = PLAYGROUND_TOUR.flatMap((c) => (c.action.kind === 'script' ? [c.action.step] : []));
    expect(fired).toEqual([...PLAYGROUND_DEMO_SCRIPT.steps.keys()]);
  });

  it('the diff card points at an edit step', () => {
    const diff = PLAYGROUND_TOUR.find((c) => c.action.kind === 'show-diff');
    expect(diff).toBeTruthy();
    const step = diff!.action.kind === 'show-diff' ? diff!.action.step : -1;
    expect(PLAYGROUND_DEMO_SCRIPT.steps[step]?.kind).toBe('edit');
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
});
