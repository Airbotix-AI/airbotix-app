// Tiny Star Village S1/A6 — the Bell Tower route (scene-specs §7, teaching
// script §8).
//
// Chapter six is about a three-step process: walk to the tower, hop up to the
// bell, hear it ring. Every scene in the chapter uses the same stage and the
// same three cards, so the geometry, the card set and the run-time measurement
// live here rather than being repeated per scene. It is a module of its own
// because `storyMissionProgress.ts` is at the umbrella's 1000-line ceiling
// (`rules/file-organization.md`), exactly as A5-S's `tinyStarDuet.ts` is.
//
// A6-H (this file's first consumer) is the chapter's Story Hook: the shipped
// program is `Start → Right 3 → Pop → End`, so the ringer really walks to the
// foot of the tower and the bell really rings — with nobody ever jumping up to
// touch it. The child's job is to find the card that is missing from the middle.
//
// A6-B is the Logic Build that follows: the same route, the same stage, and now
// the child puts the missing Hop card back — between the walk and the bell.
//
// A6-D is the chapter's Twist & Debug: all three cards are finally on the page,
// but the bell has slipped to the FRONT of the chain, so it rings before anybody
// has walked or jumped. The child moves that one card to the end.

import type { Block, Character, Page } from './blocksModel';

/** A6: the shared stage of scene-specs §7 — the sunset Bell Tower square. */
export const TINY_STAR_BELL_BACKGROUND = 'sunset';
export const TINY_STAR_BELL_GY = 10;

/**
 * A6: the ringer. Lumilo carried the morning light from A1 and is the friend
 * the tower has been waiting for all season, so chapter six opens with Lumi at
 * the bell. A6-S is the scene that lets the child re-cast the ringer.
 */
export const TINY_STAR_BELL_RINGER_ID = 'little-light';
export const TINY_STAR_BELL_RINGER_NAME = 'Lumilo';
export const TINY_STAR_BELL_RINGER_ASSET =
  '/story-blocks/tiny-star-village/characters/little-light/resting.svg';
/** A6: the ringer starts three spaces short of the tower (scene-specs §7). */
export const TINY_STAR_BELL_RINGER_GX = 5;

/**
 * A6: the Bell Tower target. scene-specs §1.1 records that NO bell art exists
 * yet — the tower is "背景构图＋`⭐`目标" — so it ships as a script-less `⭐`
 * proxy on the shipped `sunset` background, the same emoji-proxy shape A2's
 * Plaza Star and A4's delivery stop already use. No new asset is invented.
 */
export const TINY_STAR_BELL_TOWER_ID = 'bell-tower';
export const TINY_STAR_BELL_TOWER_NAME = 'Bell Tower';
export const TINY_STAR_BELL_TOWER_EMOJI = '⭐';
export const TINY_STAR_BELL_TOWER_GX = 8;
/** scene-specs §7 places the tower target above the walking row, at `gy=7`. */
export const TINY_STAR_BELL_TOWER_GY = 7;
export const TINY_STAR_BELL_TOWER_SIZE = 0.8;

/** A6: how many spaces the walk covers — `gx=5` to the tower foot at `gx=8`. */
export const TINY_STAR_BELL_WALK_N = TINY_STAR_BELL_TOWER_GX - TINY_STAR_BELL_RINGER_GX;

/** A6: the hop is always one space (scene-specs A6-B writes `hop 1`). */
export const TINY_STAR_BELL_HOP_N = 1;

/** A6-H: the page of the chapter's Story Hook. */
export const TINY_STAR_BELL_HOOK_PAGE_ID = 'tsv-a6-h-page';
/** A6-B: the page of the chapter's Logic Build — the same stage, one scene on. */
export const TINY_STAR_BELL_BUILD_PAGE_ID = 'tsv-a6-b-page';
/** A6-D: the page of the chapter's Twist & Debug — the same stage once more. */
export const TINY_STAR_BELL_FIX_PAGE_ID = 'tsv-a6-d-page';
/** A6: every chapter-six scene walks the SAME route, so it keeps one script id. */
export const TINY_STAR_BELL_ROUTE_SCRIPT_ID = 'little-light-bell-route';

/**
 * A6-H: the shipped Story Hook route (scene-specs A6-H "Initial"). It runs to
 * the end and still misses its middle step — the walk arrives, the bell rings,
 * and nobody ever jumps up to touch it.
 */
export const TINY_STAR_BELL_HOOK_ROUTE: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: TINY_STAR_BELL_WALK_N },
  { op: 'pop' },
  { op: 'end' },
] as const;

/**
 * A6-B: where the missing Hop belongs — scene-specs A6-B asserts "Hop索引在Move
 * 与Pop之间", so the index is DERIVED from where the bell rings in the Hook
 * route rather than hand-written. If the shipped route ever changes shape, the
 * build target follows it instead of silently drifting.
 */
export const TINY_STAR_BELL_HOP_INDEX = TINY_STAR_BELL_HOOK_ROUTE.findIndex(
  (block) => block.op === 'pop',
);

/**
 * A6-B: the repaired route (scene-specs A6-B "Target") — the Hook route with
 * the chapter's missing middle card put back between the walk and the bell.
 */
export const TINY_STAR_BELL_BUILD_ROUTE: readonly Block[] = [
  ...TINY_STAR_BELL_HOOK_ROUTE.slice(0, TINY_STAR_BELL_HOP_INDEX),
  { op: 'hop', n: TINY_STAR_BELL_HOP_N },
  ...TINY_STAR_BELL_HOOK_ROUTE.slice(TINY_STAR_BELL_HOP_INDEX),
];

/** A6-D: the chapter's three cards, with the bell lifted out of the chain. */
const TINY_STAR_BELL_ROUTE_WITHOUT_POP = TINY_STAR_BELL_BUILD_ROUTE.filter(
  (block) => block.op !== 'pop',
);

/**
 * A6-D: where the shipped bug drops the bell — straight after the `when_flag`,
 * i.e. before a single step of the story has happened (scene-specs A6-D "Bug").
 */
export const TINY_STAR_BELL_POP_BUG_INDEX = 1;

/**
 * A6-D: the shipped Twist & Debug route (scene-specs A6-D "Bug") —
 * `when_flag → pop → move_right 3 → hop 1 → end`. It is DERIVED from the
 * repaired route by lifting the `pop` out and dropping it back in at the front,
 * so the bug and its repair can only ever differ by where the bell sits: exactly
 * the one move the child makes, and nothing else can silently drift.
 */
export const TINY_STAR_BELL_BUG_ROUTE: readonly Block[] = [
  ...TINY_STAR_BELL_ROUTE_WITHOUT_POP.slice(0, TINY_STAR_BELL_POP_BUG_INDEX),
  { op: 'pop' },
  ...TINY_STAR_BELL_ROUTE_WITHOUT_POP.slice(TINY_STAR_BELL_POP_BUG_INDEX),
];

/**
 * A6: chapter six's stage, in the shape `storyMissionProgress`'s contract map
 * expects. All three scenes stand on the SAME `sunset` Bell Tower square with
 * the same ringer and the same script-less tower — only the page and the route
 * differ — so the stage is written once here and spread there, exactly as the
 * chapter-one scenes share `LUMI_CONTRACT`.
 */
export const TINY_STAR_BELL_STAGE_CONTRACT = {
  background: TINY_STAR_BELL_BACKGROUND,
  characterId: TINY_STAR_BELL_RINGER_ID,
  scriptId: TINY_STAR_BELL_ROUTE_SCRIPT_ID,
  asset: TINY_STAR_BELL_RINGER_ASSET,
  start: { gx: TINY_STAR_BELL_RINGER_GX, gy: TINY_STAR_BELL_GY, size: 1, rot: 0 },
  sceneTarget: {
    id: TINY_STAR_BELL_TOWER_ID,
    name: TINY_STAR_BELL_TOWER_NAME,
    gx: TINY_STAR_BELL_TOWER_GX,
    gy: TINY_STAR_BELL_TOWER_GY,
    size: TINY_STAR_BELL_TOWER_SIZE,
  },
};

export interface TinyStarBellCard {
  /** The choice id the Story Hook question uses. */
  id: string;
  emoji: string;
  label: string;
  /** The block op this physical card stands for. */
  op: 'move_right' | 'hop' | 'pop';
}

/**
 * A6: the three Bell Tower cards of teaching script §8.3 — the same three cards
 * the class lays on the floor before anyone touches a screen. The middle card is
 * deliberately missing from the A6-H program, which is what makes "从实体Hop卡和
 * 无关卡中找到缺失中间动作" a real question: the two cards that ARE in the
 * program are the distractors.
 */
export const TINY_STAR_BELL_CARDS: readonly TinyStarBellCard[] = [
  { id: 'walk', emoji: '🚶', label: 'Walk to the tower', op: 'move_right' },
  { id: 'hop', emoji: '🦘', label: 'Hop up to the bell', op: 'hop' },
  { id: 'ring', emoji: '🔔', label: 'Hear the bell ring', op: 'pop' },
] as const;

/** A6-H: the card the child has to find — the one the program never plays. */
export const TINY_STAR_BELL_MISSING_CARD_ID = 'hop';

/**
 * A6-H: is the Story Hook stage still exactly what the starter shipped?
 *
 * An Explore scene gives the child nothing to build or repair, so the contract
 * is "the shipped route is untouched": Lumilo on the walking row three spaces
 * from the tower, running `Start → Right 3 → Pop → End`, and the script-less
 * Bell Tower proxy still on its own square. Adding the missing Hop here (that is
 * A6-B's job), moving the tower, retuning the walk or editing the stage all make
 * the observation unprovable, so the Hook does not complete.
 */
export function tinyStarBellRouteUnchanged(page: Page | undefined): boolean {
  return bellRouteIs(page, TINY_STAR_BELL_HOOK_ROUTE);
}

/**
 * A6-B: has the child put the missing middle card back?
 *
 * The Logic Build shares the Hook's stage, so everything around the route is
 * still held fixed — the ringer's square, size and formal asset, the one script
 * it owns, the script-less Bell Tower on its own square and the two-character
 * `sunset` page. The route itself must be exactly the Hook's route plus a
 * `hop 1` between the walk and the bell: a Hop appended after the Pop (which is
 * where a palette tap lands it), a second Hop, a `hop 2` left on the block's
 * default, a retuned walk or a deleted Pop all fail.
 */
export function tinyStarBellStepAdded(page: Page | undefined): boolean {
  return bellRouteIs(page, TINY_STAR_BELL_BUILD_ROUTE);
}

/**
 * A6-D: has the child put the bell back where it belongs?
 *
 * Chapter six only has ONE correct Bell Tower story, so the repaired Fix route
 * is deliberately the same chain A6-B builds — but nothing is added here. All
 * five blocks already ship; only the `pop` is in the wrong place, and the single
 * legal edit is to move it behind the Hop (scene-specs A6-D "只移动Pop到Hop之
 * 后"). The shipped bug, a bell left anywhere before the walk or the jump, a
 * deleted or re-added block, a retuned walk or hop, a moved ringer or tower and
 * any stage edit all keep the mission open.
 */
export function tinyStarBellOrderRepaired(page: Page | undefined): boolean {
  return bellRouteIs(page, TINY_STAR_BELL_BUILD_ROUTE);
}

/** A6: the chapter's shared stage plus one exact route on the ringer. */
function bellRouteIs(page: Page | undefined, route: readonly Block[]): boolean {
  if (!page || page.background !== TINY_STAR_BELL_BACKGROUND) return false;
  if (page.characters.length !== 2) return false;
  const ringer = page.characters.find((candidate) => candidate.id === TINY_STAR_BELL_RINGER_ID);
  const tower = page.characters.find((candidate) => candidate.id === TINY_STAR_BELL_TOWER_ID);
  return bellRingerRuns(ringer, route) && bellTowerUnchanged(tower);
}

function bellRingerRuns(ringer: Character | undefined, route: readonly Block[]): boolean {
  if (!ringer || ringer.asset !== TINY_STAR_BELL_RINGER_ASSET) return false;
  if (ringer.scripts.length !== 1) return false;
  if (ringer.start.gx !== TINY_STAR_BELL_RINGER_GX || ringer.start.gy !== TINY_STAR_BELL_GY) {
    return false;
  }
  if (ringer.start.size !== 1 || ringer.start.rot !== 0) return false;
  const script = ringer.scripts[0];
  if (script.id !== TINY_STAR_BELL_ROUTE_SCRIPT_ID) return false;
  const blocks = script.blocks;
  return (
    blocks.length === route.length &&
    route.every(
      (target, index) =>
        blocks[index]?.op === target.op &&
        blocks[index]?.n === target.n &&
        blocks[index]?.text === target.text,
    )
  );
}

function bellTowerUnchanged(tower: Character | undefined): boolean {
  return (
    tower !== undefined &&
    tower.scripts.length === 0 &&
    tower.name === TINY_STAR_BELL_TOWER_NAME &&
    tower.emoji === TINY_STAR_BELL_TOWER_EMOJI &&
    tower.start.gx === TINY_STAR_BELL_TOWER_GX &&
    tower.start.gy === TINY_STAR_BELL_TOWER_GY &&
    tower.start.size === TINY_STAR_BELL_TOWER_SIZE
  );
}

/**
 * A6-H: did THIS run really ring the bell without anyone hopping?
 *
 * `playedOps` is the block ops the ringer's script actually reached in this run,
 * IN THE ORDER the interpreter reached them, recorded by the studio from its own
 * `onStep` host callback — so this is a measurement of the runtime, never a page
 * flag. The scene's whole claim is "the bell rang, but the hop never happened",
 * and that is exactly what is asserted here: a Pop was played and no Hop was.
 */
export function tinyStarBellRangWithoutHop(playedOps: readonly string[]): boolean {
  return playedOps.includes('pop') && !playedOps.includes('hop');
}

/**
 * A6-B: did THIS run play the three steps in the story's order?
 *
 * The build target already pins the block order on the page, but the scene's
 * claim is about what the village SAW — the ringer reached the tower, jumped,
 * and only then did the bell ring. Reading that back off the same ordered
 * `onStep` record keeps the evidence in the runtime: a saved chain the child
 * never ran, or a run that rang before the hop, does not complete the mission.
 */
export function tinyStarBellRangAfterHop(playedOps: readonly string[]): boolean {
  const hopAt = playedOps.indexOf('hop');
  const popAt = playedOps.indexOf('pop');
  return hopAt >= 0 && popAt >= 0 && hopAt < popAt;
}

/**
 * A6-D: did THIS run reproduce the shipped bug — the bell ringing first?
 *
 * The Fix scene may not be repaired from the story card alone: like A2-D, A4-D
 * and A5-D, the child has to watch the wrong thing happen before the editor
 * opens. Read off the same ordered `onStep` record, so it is a measurement of
 * the runtime and not a page flag: this run really did play the `pop` before it
 * ever reached the `hop` (a run with no hop at all counts too — the bell still
 * rang without anybody touching it).
 */
export function tinyStarBellRangBeforeHop(playedOps: readonly string[]): boolean {
  const hopAt = playedOps.indexOf('hop');
  const popAt = playedOps.indexOf('pop');
  return popAt >= 0 && (hopAt < 0 || popAt < hopAt);
}
