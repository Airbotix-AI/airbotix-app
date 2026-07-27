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
//
// A6-S closes the season: the three-step core is settled and fixed, and what is
// left is the child's — who rings the bell, and what the village does when the
// morning light comes back.

import type { Block, Character, Page } from './blocksModel';
import { TINY_STAR_DUET_CAST, tinyStarDuetFriendOf, type TinyStarDuetFriend } from './tinyStarDuet';

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
  '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png';
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
/** A6-S: the page of the season's Personal Ship — the chapter stage one last time. */
export const TINY_STAR_BELL_FINALE_PAGE_ID = 'tsv-a6-s-page';
/** A6: every chapter-six scene walks the SAME route, so it keeps one script id. */
export const TINY_STAR_BELL_ROUTE_SCRIPT_ID = 'little-light-bell-route';

/**
 * A6-S: the ringer is a SLOT, not a fixed friend — the child decides who rings
 * the bell (scene-specs A6-S "敲钟角色三选一"), so the character keeps a neutral
 * id the way A5-S's `greeter-one` / `greeter-two` do. The route it runs is the
 * chapter's, but on its own script id, so no A6-S page can impersonate the
 * scenes that came before it.
 */
export const TINY_STAR_FINALE_RINGER_ID = 'bell-ringer';
export const TINY_STAR_FINALE_RINGER_SCRIPT_ID = 'bell-ringer-finale';

/**
 * A6: every character whose executed ops chapter six measures. A6-H/A6-B/A6-D
 * ship Lumilo as the ringer; A6-S ships an uncast slot the child fills.
 */
export const TINY_STAR_BELL_RINGER_IDS: readonly string[] = [
  TINY_STAR_BELL_RINGER_ID,
  TINY_STAR_FINALE_RINGER_ID,
];

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
 * A6-S: the season's cast — the three friends the child has been building the
 * village with since A1. It is A5-S's cast, imported rather than restated, so
 * "the friend I saved this season" means the same thing in both scenes and the
 * two lists cannot drift apart. No new character art is introduced.
 */
export const TINY_STAR_BELL_CAST = TINY_STAR_DUET_CAST;

/**
 * A6-S: the uncast ringer the starter ships. Nobody is standing at the tower
 * yet — the slot is a question mark with no formal asset — so the shipped page
 * is NOT a legal finale and cannot complete itself, the same way A4-S parks the
 * delivery stop on top of the cart and A5-S casts one friend into both slots.
 */
export const TINY_STAR_FINALE_UNCAST_NAME = 'Who will ring it?';
export const TINY_STAR_FINALE_UNCAST_EMOJI = '❓';

/**
 * A6-S: the very short ending lines of teaching script §8.7 ("天亮啦" / "早上好"
 * / "我们做到啦"). They are presets, not free text: the Say block arrives with
 * the editor's own "Hi!", which is not one of them, so choosing an ending line
 * is a real decision the child makes rather than a default they inherit.
 */
export const TINY_STAR_FINALE_LINES = [
  'The sun is up!',
  'Good morning!',
  'We did it!',
] as const;

/**
 * A6-S: how big the child's ending flourish may be. scene-specs §1.2 keeps Age A
 * parameters at 1–3, and the block's own default of 2 sits inside that — so a
 * plain palette tap already lands a legal ending and the number editor is
 * optional. The size of the flourish is expressive, not a teaching point
 * (scene-specs A6-S "不引入新教学目标"), which is why it is a band and not one
 * answer; A4-S's exact number stayed exact because THERE the number was the
 * lesson.
 */
export const TINY_STAR_FINALE_ENDING_MIN_N = 1;
export const TINY_STAR_FINALE_ENDING_MAX_N = 3;

export interface TinyStarFinaleEnding {
  op: 'say' | 'hop' | 'grow';
  label: string;
  emoji: string;
}

/**
 * A6-S: what the ringer does once the morning light is back — teaching script
 * §8.7's "晨光出现后的一个动作：Hop、Grow或Say". All three are inside the season
 * whitelist (scene-specs §1.3) and all three are blocks the child can really
 * find in the shipped palette, so nothing here is offered that the product
 * cannot deliver. `pop` is deliberately NOT among them: it is `legacy: true` in
 * `BLOCK_DEFS` and appears in no child-facing palette (recorded by A5-S and
 * A6-H), and the bell the story needs already ships inside the fixed core.
 */
export const TINY_STAR_FINALE_ENDINGS: readonly TinyStarFinaleEnding[] = [
  { op: 'say', label: 'Say a last word', emoji: '💬' },
  { op: 'hop', label: 'Jump for joy', emoji: '🦘' },
  { op: 'grow', label: 'Shine bigger', emoji: '🔼' },
] as const;

/**
 * A6-S: where the child's ending block belongs — straight after the bell and
 * before the terminal `end`, i.e. at the index the `end` of the chapter's built
 * route occupies. It is DERIVED from that route, so the finale cannot drift away
 * from the story A6-B and A6-D settled. It is also exactly where a palette tap
 * lands a block, which is why this scene needs no drag: the season's last
 * mission is about choosing, not about placing.
 */
export const TINY_STAR_FINALE_ENDING_INDEX = TINY_STAR_BELL_BUILD_ROUTE.length - 1;

/**
 * A6-S: one legal finished finale, for tooling that wants a concrete `target`
 * (the real contract is `tinyStarFinaleDesign`, because the ringer and the
 * ending are the child's).
 */
export const TINY_STAR_BELL_FINALE_TARGET: readonly Block[] = [
  ...TINY_STAR_BELL_BUILD_ROUTE.slice(0, TINY_STAR_FINALE_ENDING_INDEX),
  { op: 'say', text: TINY_STAR_FINALE_LINES[0] },
  ...TINY_STAR_BELL_BUILD_ROUTE.slice(TINY_STAR_FINALE_ENDING_INDEX),
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

/** A6-S: which ending a saved block is, or null if it is not one of the three. */
export function tinyStarFinaleEndingOf(block: Block | undefined): TinyStarFinaleEnding | null {
  if (!block) return null;
  if (block.op === 'say') {
    const chosen = (TINY_STAR_FINALE_LINES as readonly string[]).includes(block.text ?? '');
    return chosen ? (TINY_STAR_FINALE_ENDINGS[0] ?? null) : null;
  }
  if (block.op !== 'hop' && block.op !== 'grow') return null;
  const n = block.n ?? 0;
  if (n < TINY_STAR_FINALE_ENDING_MIN_N || n > TINY_STAR_FINALE_ENDING_MAX_N) return null;
  return TINY_STAR_FINALE_ENDINGS.find((ending) => ending.op === block.op) ?? null;
}

export interface TinyStarFinaleDesign {
  /** The friend the child sent to the tower. */
  ringer: TinyStarDuetFriend;
  /** What that friend does once the morning light is back. */
  ending: TinyStarFinaleEnding;
}

/**
 * A6-S: parse the child's season finale off the saved page. Returns null while
 * the work is not a finished finale — which the starter deliberately is not: it
 * ships the chapter's settled three-step core with NOBODY cast as the ringer and
 * no ending at all, so neither of the child's two decisions can be inherited.
 *
 * A finished finale is: chapter six's untouched `sunset` stage (the ringer on
 * its shipped square with one script, the script-less `⭐` Bell Tower on its own
 * square, two characters and nothing else), one of the three season friends cast
 * as the ringer, the fixed core `Start → Right 3 → Hop 1 → Pop` exactly as A6-B
 * and A6-D left it, and then ONE ending block before the terminal `end`.
 *
 * A retuned walk or jump, a bell moved back to the front, a missing ending, two
 * endings, an ending placed before the bell, a free-typed line, an ending
 * outside the Age A band and an uncast ringer all keep the mission open.
 */
export function tinyStarFinaleDesign(page: Page | undefined): TinyStarFinaleDesign | null {
  if (!page || page.background !== TINY_STAR_BELL_BACKGROUND) return null;
  if (page.characters.length !== 2) return null;
  const tower = page.characters.find((candidate) => candidate.id === TINY_STAR_BELL_TOWER_ID);
  if (!bellTowerUnchanged(tower)) return null;

  const actor = page.characters.find((candidate) => candidate.id === TINY_STAR_FINALE_RINGER_ID);
  const ringer = tinyStarDuetFriendOf(actor);
  if (!actor || !ringer || actor.scripts.length !== 1) return null;
  if (actor.start.gx !== TINY_STAR_BELL_RINGER_GX || actor.start.gy !== TINY_STAR_BELL_GY) {
    return null;
  }
  if (actor.start.size !== 1 || actor.start.rot !== 0) return null;
  const script = actor.scripts[0];
  if (script.id !== TINY_STAR_FINALE_RINGER_SCRIPT_ID) return null;

  const blocks = script.blocks;
  if (blocks.length !== TINY_STAR_BELL_BUILD_ROUTE.length + 1) return null;
  // The core is fixed: every block up to the bell is the chapter's own route.
  const coreOk = TINY_STAR_BELL_BUILD_ROUTE.slice(0, TINY_STAR_FINALE_ENDING_INDEX).every(
    (target, index) =>
      blocks[index]?.op === target.op &&
      blocks[index]?.n === target.n &&
      blocks[index]?.text === target.text,
  );
  if (!coreOk) return null;
  if (blocks[blocks.length - 1]?.op !== 'end') return null;

  const ending = tinyStarFinaleEndingOf(blocks[TINY_STAR_FINALE_ENDING_INDEX]);
  return ending ? { ringer, ending } : null;
}

/**
 * A6-S: did THIS run tell the whole season's story?
 *
 * Read off the same ordered `onStep` record the rest of chapter six uses, so it
 * is a measurement of the runtime and never a page flag: the ringer reached the
 * jump before the bell (the three-step core really played in order) and the
 * child's own ending really happened AFTER the bell rang. A finale that was only
 * ever saved, or one whose ending played before the morning light came back,
 * does not complete the season.
 */
export function tinyStarFinaleEndedAfterBell(
  playedOps: readonly string[],
  ending: TinyStarFinaleEnding,
): boolean {
  if (!tinyStarBellRangAfterHop(playedOps)) return false;
  const popAt = playedOps.indexOf('pop');
  return playedOps.lastIndexOf(ending.op) > popAt;
}
