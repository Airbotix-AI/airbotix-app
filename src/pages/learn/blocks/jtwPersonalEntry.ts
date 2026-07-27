// Journey to the West S1/C2-P7 — "把发现变成大家的路" personal-entry design.
//
// Chapter two's Personal Ship (scene-specs JTW-S1-C2-P7). The story lock is
// fixed — 到达 → 碰到 → 回应 → 等待伙伴 — but the child owns:
//   1. WHICH BANK they enter from. The left bank is the wet-stone start the
//      chapter has used since P3; the right bank is the flowered shore on the
//      far side of the pool. They are NOT the same route mirrored: the two
//      starts sit on different rows, so the child recomputes every direction
//      AND the number of steps (five blocks from the left, six from the right).
//   2. How long the monkey waits for the friends (1 or 2 beats).
//   3. Which preset evidence line the cave says once it is revealed.
//
// Both routes end ONE cell from the door cell the curtain and the cave stand
// on, so either bank produces a real `when_bump` contact — and a route that
// stops two cells away never does (the same "刚好到达" rule C2-P4 proved).
//
// Parsing the design lives here, next to C1-P7's `jtwPersonalArrival.ts`, so
// the shared mission matcher in `storyMissionProgress.ts` stays inside the
// 1000-line hard rule in `rules/file-organization.md`.

import type { Block, Character, Page } from './blocksModel';
import {
  JTW_C2_ACTOR_FREE_BACKGROUND,
  JTW_C2_CAVE_SIZE,
  JTW_C2_CAVE_SPRITE,
  JTW_C2_CHIME_N,
  JTW_C2_CURTAIN_SIZE,
  JTW_C2_CURTAIN_SPRITE,
  JTW_C2_DOOR_CELL,
  JTW_C2_DOOR_REACH,
  JTW_MONKEY_SIZE,
  JTW_STONE_MONKEY_SPRITE,
} from './jtwC2Stage';

export const JTW_C2_P7_LESSON_ID = 'jtw-s1-c2-p7';
export const JTW_C2_P7_PAGE_ID = 'jtw-c2-p7-page';
export const JTW_C2_P7_MONKEY_ID = 'stone-monkey';
export const JTW_C2_P7_MONKEY_SCRIPT_ID = 'stone-monkey-personal-entry';
export const JTW_C2_P7_CURTAIN_ID = 'water-curtain-trigger';
export const JTW_C2_P7_CURTAIN_SCRIPT_ID = 'water-curtain-open';
export const JTW_C2_P7_CAVE_ID = 'cave-entrance';
export const JTW_C2_P7_CAVE_SCRIPT_ID = 'cave-entrance-reveal';

/** How long the monkey may hold the door open for the friends, in Wait units. */
export const JTW_C2_P7_WAIT_CHOICES = [1, 2] as const;

/**
 * The evidence line the cave says once the child's route has revealed it. The
 * first is the line C2-P5 shipped, so a child who keeps it stays continuous
 * with the discovery they already made.
 */
export const JTW_C2_P7_EVIDENCE_LINES = [
  '桥、干地、石座、清水。',
  '进来吧，里面有干地和石座。',
  '跟着我的脚印，桥是稳的。',
] as const;

export type JtwEntrySideId = 'left' | 'right';

export interface JtwEntrySide {
  id: JtwEntrySideId;
  /** Child-facing name of the bank. */
  label: string;
  /** Where the monkey stands before the run. */
  start: { gx: number; gy: number };
  /** The exact move chain this bank needs — 5 blocks left, 6 blocks right. */
  route: readonly Block[];
  /** One stop cell per move block; the last one is `knockCell`. */
  stops: readonly string[];
  /** The stone the route ends on: one cell from the door, so the bump fires. */
  knockCell: string;
  /** The cell a route one step short stops on — two cells away, no contact. */
  shortOfDoorCell: string;
}

/**
 * The left bank: the wet-stone start C2-P3 planned and C2-P4 built from, walked
 * with one-step blocks so every stop stays observable.
 */
const LEFT_SIDE: JtwEntrySide = {
  id: 'left',
  label: '左岸的湿石路（起点 2/8）',
  start: { gx: 2, gy: 8 },
  route: [
    { op: 'move_right', n: 1 },
    { op: 'move_right', n: 1 },
    { op: 'move_up', n: 1 },
    { op: 'move_right', n: 1 },
    { op: 'move_right', n: 1 },
  ],
  stops: ['3-8', '4-8', '4-7', '5-7', '6-7'],
  knockCell: '6-7',
  shortOfDoorCell: '5-7',
};

/**
 * The right bank: the flowered shore on the far side of the pool. It sits one
 * row LOWER than the left start, so the route needs its own first step upward
 * and one more block than the left one — a real recomputation, not a mirror.
 */
const RIGHT_SIDE: JtwEntrySide = {
  id: 'right',
  label: '右岸的花丛石滩（起点 12/9）',
  start: { gx: 12, gy: 9 },
  route: [
    { op: 'move_up', n: 1 },
    { op: 'move_left', n: 1 },
    { op: 'move_left', n: 1 },
    { op: 'move_up', n: 1 },
    { op: 'move_left', n: 1 },
    { op: 'move_left', n: 1 },
  ],
  stops: ['12-8', '11-8', '10-8', '10-7', '9-7', '8-7'],
  knockCell: '8-7',
  shortOfDoorCell: '9-7',
};

export const JTW_C2_P7_SIDES: readonly JtwEntrySide[] = [LEFT_SIDE, RIGHT_SIDE];

/** The bank the monkey is standing on right now, or null if he is off both. */
export function jtwEntrySideForStart(start: { gx: number; gy: number }): JtwEntrySide | null {
  return (
    JTW_C2_P7_SIDES.find((side) => side.start.gx === start.gx && side.start.gy === start.gy) ?? null
  );
}

export interface JtwPersonalEntryDesign {
  /** The bank the child chose, with its own route and stops. */
  side: JtwEntrySide;
  /** How many beats the monkey holds the door open (1 or 2). */
  waitN: number;
  /** The preset evidence line the cave says. */
  evidenceLine: string;
}

function sameBlock(actual: Block | undefined, expected: Block): boolean {
  return actual?.op === expected.op && (actual.n ?? null) === (expected.n ?? null);
}

function chainMatches(blocks: readonly Block[], expected: readonly Block[]): boolean {
  return blocks.length === expected.length && expected.every((b, i) => sameBlock(blocks[i], b));
}

function scriptBlocks(character: Character | undefined, scriptId: string): readonly Block[] {
  return character?.scripts.find((script) => script.id === scriptId)?.blocks ?? [];
}

/** Is a door actor untouched — right cell, right visibility, one-cell foot zone? */
function doorActorPlaced(actor: Character | undefined, size: number, visible: boolean): boolean {
  return (
    actor !== undefined &&
    actor.start.gx === JTW_C2_DOOR_CELL.gx &&
    actor.start.gy === JTW_C2_DOOR_CELL.gy &&
    actor.start.size === size &&
    actor.start.rot === 0 &&
    actor.start.reach === JTW_C2_DOOR_REACH &&
    (actor.start.visible !== false) === visible &&
    actor.scripts.length === 1
  );
}

/**
 * Parse the child's C2-P7 personal-entry design from a saved page. Returns null
 * whenever the page breaks the contract, which is what rejects every shortcut
 * the scene-specs assertions name:
 *
 * - a start that is on neither bank (dragged into the pool, or left mid-route);
 * - the WRONG bank's route (the left five blocks kept while the monkey moved to
 *   the right shore, or vice versa) — the "错误混搭" case;
 * - a route that stops short of the door, overshoots it, merges the one-step
 *   blocks into a bigger number, or reorders them;
 * - a missing Wait, a Wait outside 1–2, or a Wait placed before the walk;
 * - a deleted, shortened or re-ordered curtain/cave response chain, a revealed
 *   cave that no longer starts hidden, a moved door actor, or a free-typed
 *   evidence line.
 */
export function jtwPersonalEntryDesign(page: Page | undefined): JtwPersonalEntryDesign | null {
  if (!page || page.id !== JTW_C2_P7_PAGE_ID) return null;
  if (page.background !== JTW_C2_ACTOR_FREE_BACKGROUND) return null;
  if (page.characters.length !== 3) return null;

  const monkey = page.characters.find((actor) => actor.id === JTW_C2_P7_MONKEY_ID);
  const curtain = page.characters.find((actor) => actor.id === JTW_C2_P7_CURTAIN_ID);
  const cave = page.characters.find((actor) => actor.id === JTW_C2_P7_CAVE_ID);
  if (!monkey || monkey.asset !== JTW_STONE_MONKEY_SPRITE) return null;
  if (monkey.start.size !== JTW_MONKEY_SIZE || monkey.start.rot !== 0) return null;
  if (monkey.scripts.length !== 1) return null;

  const side = jtwEntrySideForStart(monkey.start);
  if (!side) return null;

  const walk = scriptBlocks(monkey, JTW_C2_P7_MONKEY_SCRIPT_ID);
  const wait = walk[walk.length - 2];
  const waitN = wait?.n ?? 0;
  const routeOk =
    walk.length === side.route.length + 3 &&
    walk[0]?.op === 'when_flag' &&
    chainMatches(walk.slice(1, 1 + side.route.length), side.route) &&
    wait?.op === 'wait' &&
    (JTW_C2_P7_WAIT_CHOICES as readonly number[]).includes(waitN) &&
    walk[walk.length - 1]?.op === 'end';
  if (!routeOk) return null;

  if (!doorActorPlaced(curtain, JTW_C2_CURTAIN_SIZE, true)) return null;
  if (!doorActorPlaced(cave, JTW_C2_CAVE_SIZE, false)) return null;
  if (curtain?.asset !== JTW_C2_CURTAIN_SPRITE || cave?.asset !== JTW_C2_CAVE_SPRITE) {
    return null;
  }

  const curtainChain = scriptBlocks(curtain, JTW_C2_P7_CURTAIN_SCRIPT_ID);
  const openOk = chainMatches(curtainChain, [
    { op: 'when_bump' },
    { op: 'hide' },
    { op: 'play_sound', n: JTW_C2_CHIME_N },
    { op: 'end' },
  ]);
  if (!openOk) return null;

  const caveChain = scriptBlocks(cave, JTW_C2_P7_CAVE_SCRIPT_ID);
  const say = caveChain[2];
  const evidenceLine = say?.text ?? '';
  const revealOk =
    caveChain.length === 4 &&
    caveChain[0]?.op === 'when_bump' &&
    caveChain[1]?.op === 'show' &&
    say?.op === 'say' &&
    (JTW_C2_P7_EVIDENCE_LINES as readonly string[]).includes(evidenceLine) &&
    caveChain[3]?.op === 'end';
  if (!revealOk) return null;

  return { side, waitN, evidenceLine };
}
