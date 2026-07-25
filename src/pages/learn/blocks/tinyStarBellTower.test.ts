import { describe, expect, it } from 'vitest';

import type { Block, Page } from './blocksModel';
import {
  TINY_STAR_BELL_BACKGROUND,
  TINY_STAR_BELL_CARDS,
  TINY_STAR_BELL_GY,
  TINY_STAR_BELL_HOOK_SCRIPT_ID,
  TINY_STAR_BELL_HOP_N,
  TINY_STAR_BELL_MISSING_CARD_ID,
  TINY_STAR_BELL_RINGER_ASSET,
  TINY_STAR_BELL_RINGER_GX,
  TINY_STAR_BELL_RINGER_ID,
  TINY_STAR_BELL_RINGER_NAME,
  TINY_STAR_BELL_TOWER_EMOJI,
  TINY_STAR_BELL_TOWER_GX,
  TINY_STAR_BELL_TOWER_GY,
  TINY_STAR_BELL_TOWER_ID,
  TINY_STAR_BELL_TOWER_NAME,
  TINY_STAR_BELL_TOWER_SIZE,
  TINY_STAR_BELL_WALK_N,
  tinyStarBellRangWithoutHop,
  tinyStarBellRouteUnchanged,
} from './tinyStarBellTower';

const SHIPPED_ROUTE: Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: TINY_STAR_BELL_WALK_N },
  { op: 'pop' },
  { op: 'end' },
];

function bellTowerPage(route: Block[] = SHIPPED_ROUTE): Page {
  return {
    id: 'tsv-a6-h-page',
    background: TINY_STAR_BELL_BACKGROUND,
    characters: [
      {
        id: TINY_STAR_BELL_RINGER_ID,
        name: TINY_STAR_BELL_RINGER_NAME,
        emoji: '⭐',
        asset: TINY_STAR_BELL_RINGER_ASSET,
        start: { gx: TINY_STAR_BELL_RINGER_GX, gy: TINY_STAR_BELL_GY, size: 1, rot: 0 },
        scripts: [{ id: TINY_STAR_BELL_HOOK_SCRIPT_ID, blocks: route.map((block) => ({ ...block })) }],
      },
      {
        id: TINY_STAR_BELL_TOWER_ID,
        name: TINY_STAR_BELL_TOWER_NAME,
        emoji: TINY_STAR_BELL_TOWER_EMOJI,
        start: {
          gx: TINY_STAR_BELL_TOWER_GX,
          gy: TINY_STAR_BELL_TOWER_GY,
          size: TINY_STAR_BELL_TOWER_SIZE,
          rot: 0,
        },
        scripts: [],
      },
    ],
  };
}

describe('tinyStarBellTower geometry', () => {
  it('keeps the walk equal to the distance between the ringer and the tower', () => {
    // scene-specs §7 puts the ringer at gx=5 and the tower target at gx=8, so
    // the shipped `Right 3` is derived, never hand-written — and it stays inside
    // the 1–3 movement range §1.2 allows for Age A.
    expect(TINY_STAR_BELL_WALK_N).toBe(TINY_STAR_BELL_TOWER_GX - TINY_STAR_BELL_RINGER_GX);
    expect(TINY_STAR_BELL_WALK_N).toBeGreaterThanOrEqual(1);
    expect(TINY_STAR_BELL_WALK_N).toBeLessThanOrEqual(3);
    expect(TINY_STAR_BELL_HOP_N).toBe(1);
  });

  it('offers exactly the three physical Bell Tower cards, with Hop the missing one', () => {
    expect(TINY_STAR_BELL_CARDS.map((card) => card.id)).toEqual(['walk', 'hop', 'ring']);
    expect(TINY_STAR_BELL_CARDS.map((card) => card.op)).toEqual(['move_right', 'hop', 'pop']);
    const missing = TINY_STAR_BELL_CARDS.find((card) => card.id === TINY_STAR_BELL_MISSING_CARD_ID);
    expect(missing?.op).toBe('hop');
    // The two cards that ARE in the shipped route are the distractors.
    const played = SHIPPED_ROUTE.map((block) => block.op);
    expect(played).not.toContain(missing?.op);
    for (const card of TINY_STAR_BELL_CARDS) {
      if (card.id !== TINY_STAR_BELL_MISSING_CARD_ID) expect(played).toContain(card.op);
    }
  });
});

describe('tinyStarBellRouteUnchanged', () => {
  it('accepts the shipped Explore stage', () => {
    expect(tinyStarBellRouteUnchanged(bellTowerPage())).toBe(true);
  });

  it('rejects the A6-B repair — adding the missing Hop is the NEXT scene', () => {
    const built = bellTowerPage();
    built.characters[0].scripts[0].blocks.splice(2, 0, { op: 'hop', n: TINY_STAR_BELL_HOP_N });
    expect(tinyStarBellRouteUnchanged(built)).toBe(false);
  });

  it('rejects every other edit to the shipped route', () => {
    const silenced = bellTowerPage();
    silenced.characters[0].scripts[0].blocks.splice(2, 1);
    expect(tinyStarBellRouteUnchanged(silenced)).toBe(false);

    const retuned = bellTowerPage();
    retuned.characters[0].scripts[0].blocks[1] = { op: 'move_right', n: 1 };
    expect(tinyStarBellRouteUnchanged(retuned)).toBe(false);

    const reversed = bellTowerPage();
    reversed.characters[0].scripts[0].blocks[1] = { op: 'move_left', n: TINY_STAR_BELL_WALK_N };
    expect(tinyStarBellRouteUnchanged(reversed)).toBe(false);

    const reordered = bellTowerPage([
      { op: 'when_flag' },
      { op: 'pop' },
      { op: 'move_right', n: TINY_STAR_BELL_WALK_N },
      { op: 'end' },
    ]);
    expect(tinyStarBellRouteUnchanged(reordered)).toBe(false);

    const renamedScript = bellTowerPage();
    renamedScript.characters[0].scripts[0].id = 'little-light-flag';
    expect(tinyStarBellRouteUnchanged(renamedScript)).toBe(false);

    const secondScript = bellTowerPage();
    secondScript.characters[0].scripts.push({
      id: 'little-light-extra',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(tinyStarBellRouteUnchanged(secondScript)).toBe(false);
  });

  it('rejects a moved ringer, a moved tower and a scripted tower', () => {
    const walked = bellTowerPage();
    walked.characters[0].start.gx = TINY_STAR_BELL_TOWER_GX;
    expect(tinyStarBellRouteUnchanged(walked)).toBe(false);

    const lifted = bellTowerPage();
    lifted.characters[0].start.gy = TINY_STAR_BELL_TOWER_GY;
    expect(tinyStarBellRouteUnchanged(lifted)).toBe(false);

    const resized = bellTowerPage();
    resized.characters[0].start.size = 1.2;
    expect(tinyStarBellRouteUnchanged(resized)).toBe(false);

    const draggedTower = bellTowerPage();
    draggedTower.characters[1].start.gx = TINY_STAR_BELL_RINGER_GX;
    expect(tinyStarBellRouteUnchanged(draggedTower)).toBe(false);

    const scriptedTower = bellTowerPage();
    scriptedTower.characters[1].scripts.push({
      id: 'bell-tower-tap',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(tinyStarBellRouteUnchanged(scriptedTower)).toBe(false);

    const renamedTower = bellTowerPage();
    renamedTower.characters[1].name = 'Plaza Star';
    expect(tinyStarBellRouteUnchanged(renamedTower)).toBe(false);
  });

  it('rejects a changed stage, a changed asset and a missing page', () => {
    const restaged = bellTowerPage();
    restaged.background = 'candy';
    expect(tinyStarBellRouteUnchanged(restaged)).toBe(false);

    const reskinned = bellTowerPage();
    reskinned.characters[0].asset = '/unapproved.svg';
    expect(tinyStarBellRouteUnchanged(reskinned)).toBe(false);

    const crowded = bellTowerPage();
    crowded.characters.push({
      id: 'tuan-tuan',
      name: 'Tuan Tuan',
      emoji: '🐻',
      start: { gx: 2, gy: TINY_STAR_BELL_GY, size: 1, rot: 0 },
      scripts: [],
    });
    expect(tinyStarBellRouteUnchanged(crowded)).toBe(false);

    const alone = bellTowerPage();
    alone.characters.pop();
    expect(tinyStarBellRouteUnchanged(alone)).toBe(false);

    expect(tinyStarBellRouteUnchanged(undefined)).toBe(false);
  });
});

describe('tinyStarBellRangWithoutHop', () => {
  it('accepts a run that played the bell and never reached a Hop', () => {
    expect(tinyStarBellRangWithoutHop(new Set(['move_right', 'pop', 'end']))).toBe(true);
  });

  it('rejects a run in which the ringer hopped, or never rang at all', () => {
    expect(tinyStarBellRangWithoutHop(new Set(['move_right', 'hop', 'pop', 'end']))).toBe(false);
    expect(tinyStarBellRangWithoutHop(new Set(['move_right', 'end']))).toBe(false);
    expect(tinyStarBellRangWithoutHop(new Set())).toBe(false);
  });
});
