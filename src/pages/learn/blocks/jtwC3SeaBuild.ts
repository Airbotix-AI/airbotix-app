// Journey to the West S1/C3-P4 — the three-page sea-build contract.
//
// C3-P4 is chapter three's main Build (scene-specs JTW-S1-C3-P4). It is the
// season's first mission that spans MORE THAN ONE PAGE, so the single-page
// `StoryMissionProgramContract` in `storyMissionContracts.jtw.ts` cannot express
// it on its own: Page 2's five-block chain is the child's, while Pages 1 and 3
// keep read-only demo chains the scene forbids them to break
// ("Page 1/3示范链不可被孩子删除").
//
// Everything the studio and the Part page need to judge that lives here, so
// `storyMissionProgress.ts` grows by one delegating branch and neither it nor
// `BlocksStudioPage.tsx` (both already at or over the 1000-line hard rule in
// rules/file-organization.md) takes on chapter-three content.
//
// The contract is EXACT on purpose. The scene's assertion is "缺任一块、顺序错误、
// 参数非3或未真实运行均不通过", so a missing sound, a swapped Wait and Move, a
// `goto_page 1`/`goto_page 2`, a deleted Page 3 and a moved start each keep the
// mission open. Nothing here looks at run state — the studio's own run marker and
// the Part page's real cross-page run supply that half of the evidence.

import type { Block, BlocksProject, Character, Page, Script } from './blocksModel';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_SCENE,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_SCENE,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
  JTW_C3_SEA_WIND_SOUND_ID,
} from './jtwC3Stage';
import { decodeLegacyJtwText } from './jtwLegacyCompatibility';

export const JTW_C3_P4_LESSON_ID = 'jtw-s1-c3-p4';

/** How far each page's move block carries the raft (the shared C3 chain). */
export const JTW_C3_SEA_LEG = 4;
/** The pause the middle of the sea needs, in the Wait block's own units. */
export const JTW_C3_SEA_WAIT = 2;
/** The page the sea leg must hand over to — 彼岸山林. */
export const JTW_C3_FAR_SHORE_PAGE = 3;
/** 1-based index of the page the child owns. */
export const JTW_C3_SEA_PAGE = 2;

export const JTW_C3_P4_PAGE_IDS: readonly [string, string, string] = [
  'jtw-c3-p4-page-1',
  'jtw-c3-p4-page-2',
  'jtw-c3-p4-page-3',
];

export const JTW_C3_P4_SCRIPT_IDS = {
  /** Page 1's read-only demo: leave the home shore and hand over to Page 2. */
  depart: 'monkey-king-depart',
  /** Page 2's EMPTY slot — the child's five-block main script. */
  seaLeg: 'monkey-king-sea-leg',
  /** Page 2's raft, so §2.4's "feet on a raft" holds on open water. */
  raftCarry: 'raft-carry',
  /** Page 3's read-only demo: the preset forest clue, then a stable End. */
  arrival: 'monkey-king-arrival',
} as const;

/** The preset arrival clue Page 3 says — the same line C3-P2 already ships. */
export const JTW_C3_ARRIVAL_CLUE = "I hear singing in the forest. I'll follow it.";

/** Where Page 1's beached raft waits — exactly where the Page 1 walk ends. */
export const JTW_C3_P4_PAGE1_RAFT_CELL = {
  gx: JTW_C3_PAGE1_START_CELL.gx + JTW_C3_SEA_LEG,
  gy: JTW_C3_PAGE1_START_CELL.gy,
} as const;

/**
 * The exact Page 2 chain the scene prints:
 * `when_flag → play_sound(Whoosh) → move_right(4) → wait(2) → goto_page(3)`.
 * `goto_page` is terminal in the interpreter, so the scene's chain carries no
 * `end` — exactly as C3-P2's Page 1 and Page 2 chains do not.
 */
export const JTW_C3_SEA_TARGET: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'play_sound', n: JTW_C3_SEA_WIND_SOUND_ID },
  { op: 'move_right', n: JTW_C3_SEA_LEG },
  { op: 'wait', n: JTW_C3_SEA_WAIT },
  { op: 'goto_page', n: JTW_C3_FAR_SHORE_PAGE },
];

/** Page 1's read-only demo chain — the child may not change it. */
export const JTW_C3_DEPART_CHAIN: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: JTW_C3_SEA_LEG },
  { op: 'goto_page', n: JTW_C3_SEA_PAGE },
];

/** Page 3's read-only demo chain — the stable End the route must reach. */
export const JTW_C3_ARRIVAL_CHAIN: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'say', text: JTW_C3_ARRIVAL_CLUE },
  { op: 'end' },
];

const JTW_C3_LEGACY_ARRIVAL_CHAIN: readonly Block[] = [
  { op: 'when_flag' },
  {
    op: 'say',
    text: decodeLegacyJtwText('5c71-6797-91cc-6709-6b4c-58f0-ff0c-6211-987a-7740-5b83-8d70-3002'),
  },
  { op: 'end' },
];

/** Page 2's raft chain — the same leg, so the deck stays under his feet. */
export const JTW_C3_RAFT_CHAIN: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: JTW_C3_SEA_LEG },
  { op: 'end' },
];

// ─── shared shape helpers ────────────────────────────────────────────────────

interface StartCell {
  gx: number;
  gy: number;
}

function blocksEqual(actual: readonly Block[] | undefined, target: readonly Block[]): boolean {
  if (!actual || actual.length !== target.length) return false;
  return target.every((wanted, index) => {
    const block = actual[index];
    return (
      block?.op === wanted.op &&
      (block.n ?? null) === (wanted.n ?? null) &&
      (block.text ?? null) === (wanted.text ?? null)
    );
  });
}

function scriptOf(
  page: Page | undefined,
  characterId: string,
  scriptId: string,
): Script | undefined {
  return page?.characters
    .find((character) => character.id === characterId)
    ?.scripts.find((script) => script.id === scriptId);
}

function actorOf(page: Page | undefined, characterId: string): Character | undefined {
  return page?.characters.find((character) => character.id === characterId);
}

function startedAt(actor: Character | undefined, cell: StartCell, size: number): boolean {
  return (
    actor?.start.gx === cell.gx &&
    actor.start.gy === cell.gy &&
    actor.start.size === size &&
    actor.start.rot === 0
  );
}

/** Both stage actors are present, on their contract cells, with their artwork. */
function stageIntact(page: Page | undefined, monkeyCell: StartCell, raftCell: StartCell): boolean {
  const monkey = actorOf(page, JTW_C3_MONKEY_KING_ID);
  const raft = actorOf(page, JTW_C3_RAFT_ID);
  return (
    page?.characters.length === 2 &&
    monkey?.asset === JTW_C3_MONKEY_KING_SPRITE &&
    raft?.asset === JTW_C3_RAFT_SPRITE &&
    startedAt(monkey, monkeyCell, JTW_C3_MONKEY_KING_SIZE) &&
    startedAt(raft, raftCell, JTW_C3_RAFT_SIZE)
  );
}

// ─── the three page-level rules ──────────────────────────────────────────────

/** Page 1's demo chain, stage and background are exactly as shipped. */
export function jtwC3DepartPageIntact(page: Page | undefined): boolean {
  return (
    page?.id === JTW_C3_P4_PAGE_IDS[0] &&
    page.background === JTW_C3_PAGE1_SCENE &&
    stageIntact(page, JTW_C3_PAGE1_START_CELL, JTW_C3_P4_PAGE1_RAFT_CELL) &&
    actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length === 1 &&
    actorOf(page, JTW_C3_RAFT_ID)?.scripts.length === 0 &&
    blocksEqual(
      scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P4_SCRIPT_IDS.depart)?.blocks,
      JTW_C3_DEPART_CHAIN,
    )
  );
}

/** Page 3's demo chain, stage and background are exactly as shipped. */
export function jtwC3ArrivalPageIntact(page: Page | undefined): boolean {
  return (
    page?.id === JTW_C3_P4_PAGE_IDS[2] &&
    page.background === JTW_C3_PAGE3_SCENE &&
    stageIntact(page, JTW_C3_PAGE3_START_CELL, JTW_C3_PAGE3_START_CELL) &&
    actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length === 1 &&
    actorOf(page, JTW_C3_RAFT_ID)?.scripts.length === 0 &&
    (() => {
      const blocks = scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P4_SCRIPT_IDS.arrival)?.blocks;
      return (
        blocksEqual(blocks, JTW_C3_ARRIVAL_CHAIN) ||
        blocksEqual(blocks, JTW_C3_LEGACY_ARRIVAL_CHAIN)
      );
    })()
  );
}

/**
 * Page 2 carries the child's finished five-block chain, and nothing else about
 * the middle of the sea has moved: the raft still carries him the same leg, the
 * monkey king still starts on the contract's `2/8`, and he owns exactly one
 * script (a second flag script would run beside the main one).
 */
export function jtwC3SeaPageBuilt(page: Page | undefined): boolean {
  return (
    page?.id === JTW_C3_P4_PAGE_IDS[1] &&
    page.background === JTW_C3_PAGE2_SCENE &&
    stageIntact(page, JTW_C3_PAGE2_START_CELL, JTW_C3_PAGE2_START_CELL) &&
    actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length === 1 &&
    actorOf(page, JTW_C3_RAFT_ID)?.scripts.length === 1 &&
    blocksEqual(
      scriptOf(page, JTW_C3_RAFT_ID, JTW_C3_P4_SCRIPT_IDS.raftCarry)?.blocks,
      JTW_C3_RAFT_CHAIN,
    ) &&
    blocksEqual(
      scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P4_SCRIPT_IDS.seaLeg)?.blocks,
      JTW_C3_SEA_TARGET,
    )
  );
}

/**
 * The whole C3-P4 contract: three pages, the two demo chains untouched and the
 * sea leg built exactly. Used by `storyMissionProgramMatches` (which decides
 * whether the studio may record a run marker) and by the Part page (which reads
 * the SAVED project back before it lets the Part complete).
 */
export function jtwC3SeaBuildComplete(project: BlocksProject): boolean {
  return (
    project.lessonId === JTW_C3_P4_LESSON_ID &&
    project.pages.length === JTW_C3_P4_PAGE_IDS.length &&
    jtwC3DepartPageIntact(project.pages[0]) &&
    jtwC3SeaPageBuilt(project.pages[1]) &&
    jtwC3ArrivalPageIntact(project.pages[2])
  );
}

/** The blocks the child placed on Page 2 (everything after the shipped Start). */
export function jtwC3SeaPlacedBlocks(project: BlocksProject): Block[] {
  const blocks =
    scriptOf(project.pages[1], JTW_C3_MONKEY_KING_ID, JTW_C3_P4_SCRIPT_IDS.seaLeg)?.blocks ?? [];
  return blocks.filter((block) => block.op !== 'when_flag');
}

/** The page number the saved Page block really points at, or null when absent. */
export function jtwC3SeaExitTarget(project: BlocksProject): number | null {
  const blocks =
    scriptOf(project.pages[1], JTW_C3_MONKEY_KING_ID, JTW_C3_P4_SCRIPT_IDS.seaLeg)?.blocks ?? [];
  return blocks.find((block) => block.op === 'goto_page')?.n ?? null;
}
