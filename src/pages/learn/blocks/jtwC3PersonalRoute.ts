// Journey to the West S1/C3-P7 — the personal three-page route contract.
//
// C3-P7 (scene-specs JTW-S1-C3-P7 "我的三页求师路") is chapter three's Personal
// Ship, and the first C3 Part with NO target chain at all. The scene does not
// print a program; it prints a STRUCTURE:
//
//   最低结构   三页各承担离家 / 观察 / 到达；Page 1 与 2 有有效 Goto 出口，Page 3
//              稳定 End；每页 2–4 个有意义动作，不能留下只有 Goto 的空壳。
//   主导块数   至少七块：至少两块移动、一个声音、一个 Wait 或 Speed、两个 Goto
//              和一个 End。
//   真实选择   星夜/晨雾、等待节奏、预设对白与木筏路径。
//   不变量     `1→2→3`、跨页方向连续，以及"求师而非寻宝/取经"的人物动机。
//
// So this module is a GRAMMAR, not a target: it parses a saved `BlocksProject`
// into the design the child really built, and returns null the moment the
// structure breaks. That is what makes the scene's own assertions structural
// rather than advisory — "循环、死页、空Page 2、未保存" each fail here:
//
//   循环      Page 1's exit must be 2 and Page 2's exit must be 3, so a Goto
//             pointing home is not a route, and Page 3 must END.
//   死页      every page needs 2–4 meaningful actions, so no page can be a
//             bare Goto shell.
//   空Page 2  the sea page additionally needs a move AND a Wait/Speed — 观察、
//             前进与停顿 is the job the C3 shared contract gives it.
//   动机      the Say text may only be one of the preset lines, all of which
//             keep 求师 rather than 寻宝/取经. There is no free typing to police.
//
// Two invariants are shipped by the starter rather than asked of the child, and
// checked here so an edit cannot quietly break them: the C3共享实现合同 start
// cells (3/9 · 2/8 · 2/9, which is what makes 起点连续 and 跨页方向连续 hold for
// ANY route they build) and the raft — a real actor on every page (asset bible
// §6 "木筏不烘焙进背景") whose open-sea deck must travel the leg his feet travel
// (§2.4). That is why the sea page's own walk is fixed at `JTW_C3_SEA_LEG`.
//
// Everything the studio and the Part page judge lives here so
// `storyMissionProgress.ts` grows by one delegating branch and neither it nor
// `BlocksStudioPage.tsx` (both at or over the 1000-line hard rule in
// rules/file-organization.md) takes on chapter-three content.

import type { BlocksTemplateId } from './blocksApi';
import {
  serializeProject,
  type Block,
  type BlocksProject,
  type Character,
  type Page,
  type Script,
} from './blocksModel';
import {
  JTW_C3_FAR_SHORE_PAGE,
  JTW_C3_RAFT_CHAIN,
  JTW_C3_SEA_LEG,
  JTW_C3_SEA_PAGE,
} from './jtwC3SeaBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_SCENE,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
} from './jtwC3Stage';
import { JTW_C3_WEATHER_VERSIONS, type JtwC3Weather } from './jtwC3WeatherBuild';

export const JTW_C3_P7_LESSON_ID = 'jtw-s1-c3-p7';

export const JTW_C3_P7_PAGE_IDS: readonly [string, string, string] = [
  'jtw-c3-p7-page-1',
  'jtw-c3-p7-page-2',
  'jtw-c3-p7-page-3',
];

export const JTW_C3_P7_SCRIPT_IDS = {
  /** Page 1 — 离家：走到木筏那一格，然后把故事交给下一页。 */
  depart: 'monkey-king-depart',
  /** Page 2 — 观察、前进与停顿，然后交给彼岸。 */
  seaLeg: 'monkey-king-sea-leg',
  /** Page 3 — 靠岸、山林歌声与稳定结束。 */
  arrival: 'monkey-king-arrival',
  /** The raft's open-sea deck chain — read-only, and the only chain shipped. */
  raftCarry: 'raft-carry',
} as const;

/** The two whitelisted starters — 星夜/晨雾 is one of the scene's real choices. */
export const JTW_C3_P7_TEMPLATES: Readonly<Record<JtwC3Weather, BlocksTemplateId>> = {
  starry: 'blocks_jtw_c3_p7_starry',
  morning: 'blocks_jtw_c3_p7_morning',
};

/**
 * The preset lines the Say editor offers (mission contract `allowedSayText`).
 * Every one of them keeps the scene's motive lock — 求师, never 寻宝 or 取经 —
 * which is why "人物动机" needs no separate check: a six-year-old is never asked
 * to type, so no other sentence can reach the saved document.
 */
export const JTW_C3_P7_SAY_CHOICES: readonly string[] = [
  'I will remember where I started from and I will search hard for answers.',
  'I will learn more first and then tell you about my experience.',
  "The fog is thick, so I'll listen for the waves.",
  "I hear singing in the forest. I'll follow it.",
];

/** Meaningful actions a page may carry — the C3 op set minus trigger and exit. */
export const JTW_C3_P7_ACTION_OPS: readonly Block['op'][] = [
  'move_right',
  'play_sound',
  'wait',
  'set_speed',
  'say',
];

/** 每页 2–4 个有意义动作 — the scene's "不能留下只有 Goto 的空壳" band. */
export const JTW_C3_P7_MIN_ACTIONS = 2;
export const JTW_C3_P7_MAX_ACTIONS = 4;
/** 孩子必须主导至少七块 (actions + two Gotos + one End). */
export const JTW_C3_P7_MIN_CHILD_BLOCKS = 7;
/** 至少两块移动 · 一个声音 · 一个 Wait 或 Speed. */
export const JTW_C3_P7_MIN_MOVES = 2;
export const JTW_C3_P7_MIN_SOUNDS = 1;
export const JTW_C3_P7_MIN_PACE = 1;
/** How far one `move_right` block may carry him — the number tile's teaching band. */
export const JTW_C3_P7_MAX_MOVE_N = 4;
/** ⏱ Wait beats and 🐢/🚶/🐇 speed levels the studio really offers. */
export const JTW_C3_P7_MAX_WAIT_N = 3;
export const JTW_C3_P7_MAX_SPEED_N = 3;
/** `BUILT_IN_SOUNDS` ids — any of the six is a real choice. */
export const JTW_C3_P7_MAX_SOUND_N = 6;

/**
 * Page 1's walk is fixed at the leg that lands him on the beached raft, and
 * Page 2's at the leg the raft's own read-only chain carries the deck. Neither
 * is a puzzle: they are what "连续木筏/地标" (teaching script C3 Part 7) means
 * once the raft is a real actor instead of scenery.
 */
export const JTW_C3_P7_BOARD_LEG = JTW_C3_SEA_LEG;
/** Where Page 1's beached raft waits — exactly where the boarding walk ends. */
export const JTW_C3_P7_PAGE1_RAFT_CELL = {
  gx: JTW_C3_PAGE1_START_CELL.gx + JTW_C3_P7_BOARD_LEG,
  gy: JTW_C3_PAGE1_START_CELL.gy,
} as const;
/** The far shore is land, so the landing walk is free — capped, not fixed. */
export const JTW_C3_P7_MAX_ARRIVAL_WALK = JTW_C3_P7_MAX_MOVE_N;

// ─── the parsed design ───────────────────────────────────────────────────────

export interface JtwC3RoutePageDesign {
  /** 1-based page number — the number a child reads on the Page block. */
  page: number;
  /** The blocks the child placed between the shipped Start and the terminator. */
  actions: Block[];
  /** Total cells this page's moves carry him. */
  moveTotal: number;
  /** The page this page's exit hands over to; null on the page that ends. */
  exitTo: number | null;
  /** This page closes the route with a stable End. */
  ends: boolean;
}

export interface JtwC3RouteDesign {
  /** The sea the saved Page 2 really paints — one of the scene's real choices. */
  weather: JtwC3Weather;
  pages: readonly [JtwC3RoutePageDesign, JtwC3RoutePageDesign, JtwC3RoutePageDesign];
  /** Blocks the child owns across the route (actions + two Gotos + one End). */
  childBlocks: number;
  moves: number;
  sounds: number;
  /** ⏱ Wait plus 🐢 Speed — the scene counts them as one requirement. */
  paces: number;
  says: number;
}

// ─── shared shape helpers (identical rules to the C3-P4/P5/P6 contracts) ─────

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

/** Position AND visual size, kept apart on purpose (asset bible §2.1). */
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

// ─── the action grammar ──────────────────────────────────────────────────────

/** One placed block really is a meaningful action with a legal parameter. */
function actionOk(block: Block | undefined): boolean {
  if (!block) return false;
  const n = block.n ?? 0;
  switch (block.op) {
    case 'move_right':
      return n >= 1 && n <= JTW_C3_P7_MAX_MOVE_N;
    case 'play_sound':
      return n >= 1 && n <= JTW_C3_P7_MAX_SOUND_N;
    case 'wait':
      return n >= 1 && n <= JTW_C3_P7_MAX_WAIT_N;
    case 'set_speed':
      return n >= 1 && n <= JTW_C3_P7_MAX_SPEED_N;
    case 'say':
      // 预设对白 only — no free typing reaches a saved document.
      return JTW_C3_P7_SAY_CHOICES.includes(block.text ?? '');
    default:
      // Anything outside the C3 op set (or a second Goto / End mid-page).
      return false;
  }
}

function moveTotalOf(actions: readonly Block[]): number {
  return actions
    .filter((block) => block.op === 'move_right')
    .reduce((total, block) => total + (block.n ?? 0), 0);
}

function countOp(actions: readonly Block[], op: Block['op']): number {
  return actions.filter((block) => block.op === op).length;
}

/**
 * Parse ONE page's script: a shipped Start, 2–4 legal actions, then the
 * terminator this page owes the route. `exitTo` is the page number an exit must
 * name, or null for the page that has to End instead.
 */
function pageDesign(
  page: Page | undefined,
  pageNumber: number,
  scriptId: string,
  exitTo: number | null,
): JtwC3RoutePageDesign | null {
  const blocks = scriptOf(page, JTW_C3_MONKEY_KING_ID, scriptId)?.blocks;
  if (!blocks || blocks.length < 2) return null;
  if (actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length !== 1) return null;
  if (blocks[0]?.op !== 'when_flag') return null;

  const terminator = blocks[blocks.length - 1];
  if (exitTo === null) {
    // 稳定 End — the route closes here rather than asking for another page.
    if (terminator?.op !== 'end') return null;
  } else if (terminator?.op !== 'goto_page' || terminator.n !== exitTo) {
    return null;
  }

  const actions = blocks.slice(1, blocks.length - 1);
  if (actions.length < JTW_C3_P7_MIN_ACTIONS || actions.length > JTW_C3_P7_MAX_ACTIONS) return null;
  if (!actions.every(actionOk)) return null;

  return {
    page: pageNumber,
    actions,
    moveTotal: moveTotalOf(actions),
    exitTo,
    ends: exitTo === null,
  };
}

/** The sea a saved Page 2 paints, whatever the chain on it says. */
export function jtwC3RouteSavedWeather(project: BlocksProject): JtwC3Weather | null {
  const background = project.pages[JTW_C3_SEA_PAGE - 1]?.background ?? null;
  return JTW_C3_WEATHER_VERSIONS.find((version) => version.scene === background)?.id ?? null;
}

/**
 * The whole C3-P7 structure contract. Returns the design the child really built,
 * or null the moment any rule breaks — which is what makes the scene's "循环、
 * 死页、空Page 2 … 均不通过" measured instead of promised.
 */
export function jtwC3RouteDesign(project: BlocksProject): JtwC3RouteDesign | null {
  if (project.lessonId !== JTW_C3_P7_LESSON_ID) return null;
  if (project.pages.length !== JTW_C3_P7_PAGE_IDS.length) return null;
  if (!project.pages.every((page, index) => page.id === JTW_C3_P7_PAGE_IDS[index])) return null;

  const [home, sea, shore] = project.pages;
  const weather = jtwC3RouteSavedWeather(project);
  if (!weather) return null;
  if (home.background !== JTW_C3_PAGE1_SCENE) return null;
  if (shore.background !== JTW_C3_PAGE3_SCENE) return null;

  // The stage the starter fixes: contract cells on every page, and the raft as
  // a real actor whose open-sea deck carries the same leg his feet do.
  if (!stageIntact(home, JTW_C3_PAGE1_START_CELL, JTW_C3_P7_PAGE1_RAFT_CELL)) return null;
  if (!stageIntact(sea, JTW_C3_PAGE2_START_CELL, JTW_C3_PAGE2_START_CELL)) return null;
  if (!stageIntact(shore, JTW_C3_PAGE3_START_CELL, JTW_C3_PAGE3_START_CELL)) return null;
  if (actorOf(home, JTW_C3_RAFT_ID)?.scripts.length !== 0) return null;
  if (actorOf(shore, JTW_C3_RAFT_ID)?.scripts.length !== 0) return null;
  if (actorOf(sea, JTW_C3_RAFT_ID)?.scripts.length !== 1) return null;
  if (
    !blocksEqual(
      scriptOf(sea, JTW_C3_RAFT_ID, JTW_C3_P7_SCRIPT_IDS.raftCarry)?.blocks,
      JTW_C3_RAFT_CHAIN,
    )
  ) {
    return null;
  }

  // 三页各承担离家 / 观察 / 到达，Page 1 与 2 有有效 Goto 出口，Page 3 稳定 End.
  const homeDesign = pageDesign(home, 1, JTW_C3_P7_SCRIPT_IDS.depart, JTW_C3_SEA_PAGE);
  const seaDesign = pageDesign(
    sea,
    JTW_C3_SEA_PAGE,
    JTW_C3_P7_SCRIPT_IDS.seaLeg,
    JTW_C3_FAR_SHORE_PAGE,
  );
  const shoreDesign = pageDesign(shore, JTW_C3_FAR_SHORE_PAGE, JTW_C3_P7_SCRIPT_IDS.arrival, null);
  if (!homeDesign || !seaDesign || !shoreDesign) return null;

  // 页面职责 (C3共享实现合同): he must walk onto the raft that is really beached
  // on Page 1, the deck under him must travel exactly the leg it carries, the
  // middle of the sea must observe as well as move, and the far shore must speak.
  if (homeDesign.moveTotal !== JTW_C3_P7_BOARD_LEG) return null;
  if (seaDesign.moveTotal !== JTW_C3_SEA_LEG) return null;
  if (countOp(seaDesign.actions, 'wait') + countOp(seaDesign.actions, 'set_speed') < 1) return null;
  if (countOp(shoreDesign.actions, 'say') < 1) return null;
  if (shoreDesign.moveTotal > JTW_C3_P7_MAX_ARRIVAL_WALK) return null;

  const pages = [homeDesign, seaDesign, shoreDesign] as const;
  const actions = pages.flatMap((design) => design.actions);
  const moves = countOp(actions, 'move_right');
  const sounds = countOp(actions, 'play_sound');
  const paces = countOp(actions, 'wait') + countOp(actions, 'set_speed');
  const says = countOp(actions, 'say');
  // Two Gotos and one End are the child's too — that is the scene's own count.
  const childBlocks = actions.length + pages.length;

  if (moves < JTW_C3_P7_MIN_MOVES) return null;
  if (sounds < JTW_C3_P7_MIN_SOUNDS) return null;
  if (paces < JTW_C3_P7_MIN_PACE) return null;
  if (childBlocks < JTW_C3_P7_MIN_CHILD_BLOCKS) return null;

  return { weather, pages, childBlocks, moves, sounds, paces, says };
}

/** Used by `storyMissionProgramMatches` — any valid personal route completes it. */
export function jtwC3RouteComplete(project: BlocksProject): boolean {
  return jtwC3RouteDesign(project) !== null;
}

// ─── evidence encodings ──────────────────────────────────────────────────────

/** One row per placed action: `page1:move_right:4`, `page3:say:-`. */
export function jtwC3RouteEncodeOps(design: JtwC3RouteDesign): string[] {
  return design.pages.flatMap((page) =>
    page.actions.map((block) => `page${page.page}:${block.op}:${block.n ?? '-'}`),
  );
}

/** One row per page terminator: `page1:2`, `page2:3`, `page3:end`. */
export function jtwC3RouteEncodeExits(design: JtwC3RouteDesign): string[] {
  return design.pages.map((page) => `page${page.page}:${page.ends ? 'end' : String(page.exitTo)}`);
}

/** The 至少七块 ledger, as stored evidence rows. */
export function jtwC3RouteEncodeLedger(design: JtwC3RouteDesign): string[] {
  return [
    `blocks:${design.childBlocks}`,
    `moves:${design.moves}`,
    `sounds:${design.sounds}`,
    `pace:${design.paces}`,
    `gotos:${design.pages.filter((page) => !page.ends).length}`,
    `ends:${design.pages.filter((page) => page.ends).length}`,
  ];
}

/**
 * The saved document, byte for byte — what "重开后 JSON 一致" is checked on.
 * It is the canonical serialization the VFS itself stores, so comparing two
 * loads compares the real file rather than a summary of it.
 */
export function jtwC3RouteFingerprint(project: BlocksProject): string {
  return serializeProject(project);
}

// ─── the shipped starter (frontend copy of the two whitelisted branches) ─────

function monkeyKing(cell: StartCell, scriptId: string, blocks: readonly Block[]): Character {
  return {
    id: JTW_C3_MONKEY_KING_ID,
    name: 'Monkey King',
    emoji: '🐵',
    asset: JTW_C3_MONKEY_KING_SPRITE,
    start: { gx: cell.gx, gy: cell.gy, size: JTW_C3_MONKEY_KING_SIZE, rot: 0 },
    scripts: [{ id: scriptId, blocks: [...blocks] }],
  };
}

function raftActor(cell: StartCell, blocks: readonly Block[] | null): Character {
  return {
    id: JTW_C3_RAFT_ID,
    name: 'Raft',
    emoji: '🛶',
    asset: JTW_C3_RAFT_SPRITE,
    start: { gx: cell.gx, gy: cell.gy, size: JTW_C3_RAFT_SIZE, rot: 0 },
    scripts: blocks ? [{ id: JTW_C3_P7_SCRIPT_IDS.raftCarry, blocks: [...blocks] }] : [],
  };
}

/**
 * The exact program `blocks_jtw_c3_p7_<weather>` seeds: the stage, the raft, and
 * three slots holding nothing but a Start. The Part page shows it so a child can
 * compare "发下来的样子" with what they built, and the unit tests build every
 * valid and invalid route on top of it.
 */
export function jtwC3RouteStarterProject(weather: JtwC3Weather): BlocksProject {
  const version = JTW_C3_WEATHER_VERSIONS.find((candidate) => candidate.id === weather);
  if (!version) throw new Error(`jtwC3RouteStarterProject: unknown weather version ${weather}`);
  const emptySlot: readonly Block[] = [{ op: 'when_flag' }];
  return {
    version: 1,
    name: 'Journey to the West · C3 — Across the Sea to Learn',
    lessonId: JTW_C3_P7_LESSON_ID,
    pages: [
      {
        id: JTW_C3_P7_PAGE_IDS[0],
        background: JTW_C3_PAGE1_SCENE,
        characters: [
          monkeyKing(JTW_C3_PAGE1_START_CELL, JTW_C3_P7_SCRIPT_IDS.depart, emptySlot),
          raftActor(JTW_C3_P7_PAGE1_RAFT_CELL, null),
        ],
      },
      {
        id: JTW_C3_P7_PAGE_IDS[1],
        background: version.scene,
        characters: [
          monkeyKing(JTW_C3_PAGE2_START_CELL, JTW_C3_P7_SCRIPT_IDS.seaLeg, emptySlot),
          raftActor(JTW_C3_PAGE2_START_CELL, JTW_C3_RAFT_CHAIN),
        ],
      },
      {
        id: JTW_C3_P7_PAGE_IDS[2],
        background: JTW_C3_PAGE3_SCENE,
        characters: [
          monkeyKing(JTW_C3_PAGE3_START_CELL, JTW_C3_P7_SCRIPT_IDS.arrival, emptySlot),
          raftActor(JTW_C3_PAGE3_START_CELL, null),
        ],
      },
    ],
  };
}
