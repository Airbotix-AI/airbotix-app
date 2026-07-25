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

import type { Character, Page } from './blocksModel';

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

/** A6-H: the scene ids of the chapter's Story Hook. */
export const TINY_STAR_BELL_HOOK_PAGE_ID = 'tsv-a6-h-page';
export const TINY_STAR_BELL_HOOK_SCRIPT_ID = 'little-light-bell-route';

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
  if (!page || page.background !== TINY_STAR_BELL_BACKGROUND) return false;
  if (page.characters.length !== 2) return false;
  const ringer = page.characters.find((candidate) => candidate.id === TINY_STAR_BELL_RINGER_ID);
  const tower = page.characters.find((candidate) => candidate.id === TINY_STAR_BELL_TOWER_ID);
  return bellRingerUnchanged(ringer) && bellTowerUnchanged(tower);
}

function bellRingerUnchanged(ringer: Character | undefined): boolean {
  if (!ringer || ringer.asset !== TINY_STAR_BELL_RINGER_ASSET) return false;
  if (ringer.scripts.length !== 1) return false;
  if (ringer.start.gx !== TINY_STAR_BELL_RINGER_GX || ringer.start.gy !== TINY_STAR_BELL_GY) {
    return false;
  }
  if (ringer.start.size !== 1 || ringer.start.rot !== 0) return false;
  const script = ringer.scripts[0];
  if (script.id !== TINY_STAR_BELL_HOOK_SCRIPT_ID) return false;
  const blocks = script.blocks;
  return (
    blocks.length === 4 &&
    blocks[0]?.op === 'when_flag' &&
    blocks[1]?.op === 'move_right' &&
    blocks[1].n === TINY_STAR_BELL_WALK_N &&
    blocks[2]?.op === 'pop' &&
    blocks[3]?.op === 'end'
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
 * `playedOps` is the set of block ops the ringer's script actually reached in
 * this run, recorded by the studio from the interpreter's own `onStep` host
 * callback — so this is a measurement of the runtime, never a page flag. The
 * scene's whole claim is "the bell rang, but the hop never happened", and that
 * is exactly what is asserted here: a Pop was played and no Hop was.
 */
export function tinyStarBellRangWithoutHop(playedOps: ReadonlySet<string>): boolean {
  return playedOps.has('pop') && !playedOps.has('hop');
}
