// Journey to the West S1/C3-P6 — the cross-page position contract.
//
// C3-P5 left chapter three with a route that runs and a weather the child chose.
// C3-P6 (scene-specs JTW-S1-C3-P6 "木筏跳了位置") is the chapter's Fix: the raft
// leaves Page 1 from the RIGHT and then appears on Page 2 from the RIGHT again,
// because Page 2's start cell ships as `gx=16 / gy=8` instead of the contract's
// `gx=2 / gy=8`. Nothing else is wrong — the exits are right, the weather chain
// the child built in C3-P5 is right, and the route still reaches Page 3.
//
//   the shipped bug   Page 2 start `16/8`   → he re-enters on the far side
//   the only repair   Page 2 start `2/8`    → the direction line closes up
//
// The scene's "正确diff只把Page 2起点改为gx=2 / gy=8。不得改Page 1出口、删除天气链、
// 加更响声音或同时改多个页面" is therefore enforced structurally: this module
// accepts a saved project ONLY when Page 2's start is exactly the contract cell
// AND every other page, chain, actor and background is still the shipped one.
//
// Two more things the scene asks for, kept apart on purpose:
//   * 精确坐标容差 — the repair is judged on EXACT integer cells. The studio's
//     own drag snaps through `Math.round`, so a child who drops the raft inside
//     the right cell lands on it exactly; there is no fuzzy "close enough" band.
//   * 视觉尺寸与碰撞/边界校准分离 — `size` stays the asset bible §2.3
//     alpha-compensation value (3.0) on every page. What C3-P6 calibrates is the
//     grid START CELL (§2.4), never the sprite's visual size.
//
// C3-P6 ships ONE lesson with TWO whitelisted starters, exactly as C3-P5 does:
// the weather version the child really chose in C3-P5 is carried forward, so the
// sea they are debugging is their own sea and their own expression chain. The
// version machinery itself is C3-P5's — this module only re-uses it.
//
// Everything the studio and the Part page judge lives here so
// `storyMissionProgress.ts` grows by one delegating branch and neither it nor
// `BlocksStudioPage.tsx` (both at or over the 1000-line hard rule in
// rules/file-organization.md) takes on chapter-three content.

import type { BlocksTemplateId } from './blocksApi';
import type { Block, BlocksProject, Character, Page, Script } from './blocksModel';
import {
  JTW_C3_ARRIVAL_CHAIN,
  JTW_C3_DEPART_CHAIN,
  JTW_C3_FAR_SHORE_PAGE,
  JTW_C3_RAFT_CHAIN,
  JTW_C3_SEA_LEG,
  JTW_C3_SEA_PAGE,
} from './jtwC3SeaBuild';
import { JTW_C3_WEATHER_VERSIONS, type JtwC3Weather } from './jtwC3WeatherBuild';
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
import type { PageFlowRunResult } from './pageFlowRun';

export const JTW_C3_P6_LESSON_ID = 'jtw-s1-c3-p6';

export const JTW_C3_P6_PAGE_IDS: readonly [string, string, string] = [
  'jtw-c3-p6-page-1',
  'jtw-c3-p6-page-2',
  'jtw-c3-p6-page-3',
];

export const JTW_C3_P6_SCRIPT_IDS = {
  /** Page 1's read-only demo: leave the home shore from the right. */
  depart: 'monkey-king-depart',
  /** Page 2's chain — C3-P5's finished weather version, shipped intact. */
  seaLeg: 'monkey-king-sea-leg',
  /** Page 2's raft, so §2.4's "feet on a raft" holds on open water. */
  raftCarry: 'raft-carry',
  /** Page 3's read-only demo: the preset forest clue, then a stable End. */
  arrival: 'monkey-king-arrival',
} as const;

/**
 * The shipped bug: Page 2's start cell (scene-specs "Page 2错误起点固定为
 * `gx=16 / gy=8`"). It is a legal stage cell — §2.4's horizontal safe band is
 * 12–88% of the stage, i.e. roughly `gx` 2.4–17.6 — so the raft really is
 * standing there, on the wrong side, rather than being clipped off screen.
 */
export const JTW_C3_P6_WRONG_START_CELL = { gx: 16, gy: 8 } as const;

/** The one legal repair — the contract's own Page 2 cell. */
export const JTW_C3_P6_TARGET_START_CELL = JTW_C3_PAGE2_START_CELL;

/** Where Page 1's beached raft waits — exactly where the Page 1 walk ends. */
export const JTW_C3_P6_PAGE1_RAFT_CELL = {
  gx: JTW_C3_PAGE1_START_CELL.gx + JTW_C3_SEA_LEG,
  gy: JTW_C3_PAGE1_START_CELL.gy,
} as const;

/** The two whitelisted starters — one per weather version carried from C3-P5. */
export const JTW_C3_P6_TEMPLATES: Readonly<Record<JtwC3Weather, BlocksTemplateId>> = {
  starry: 'blocks_jtw_c3_p6_starry',
  morning: 'blocks_jtw_c3_p6_morning',
};

export interface JtwC3Cell {
  gx: number;
  gy: number;
}

/** `gx-gy` — the same cell notation the page-flow runner records. */
export function jtwC3CellLabel(cell: JtwC3Cell): string {
  return `${cell.gx}-${cell.gy}`;
}

// ─── shared shape helpers (identical rules to the C3-P4/P5 contracts) ────────

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

/**
 * Position AND visual size, checked separately on purpose (asset bible §2.1):
 * `size` is the alpha-compensation number and must never drift, while the cell
 * is the calibration this Part repairs.
 */
function startedAt(actor: Character | undefined, cell: JtwC3Cell, size: number): boolean {
  return (
    actor?.start.gx === cell.gx &&
    actor.start.gy === cell.gy &&
    actor.start.size === size &&
    actor.start.rot === 0
  );
}

/** Both stage actors are present, on the given cells, with their artwork. */
function stageIntact(page: Page | undefined, monkeyCell: JtwC3Cell, raftCell: JtwC3Cell): boolean {
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
export function jtwC3JumpDepartPageIntact(page: Page | undefined): boolean {
  return (
    page?.id === JTW_C3_P6_PAGE_IDS[0] &&
    page.background === JTW_C3_PAGE1_SCENE &&
    stageIntact(page, JTW_C3_PAGE1_START_CELL, JTW_C3_P6_PAGE1_RAFT_CELL) &&
    actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length === 1 &&
    actorOf(page, JTW_C3_RAFT_ID)?.scripts.length === 0 &&
    blocksEqual(
      scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P6_SCRIPT_IDS.depart)?.blocks,
      JTW_C3_DEPART_CHAIN,
    )
  );
}

/** Page 3's demo chain, stage and background are exactly as shipped. */
export function jtwC3JumpArrivalPageIntact(page: Page | undefined): boolean {
  return (
    page?.id === JTW_C3_P6_PAGE_IDS[2] &&
    page.background === JTW_C3_PAGE3_SCENE &&
    stageIntact(page, JTW_C3_PAGE3_START_CELL, JTW_C3_PAGE3_START_CELL) &&
    actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length === 1 &&
    actorOf(page, JTW_C3_RAFT_ID)?.scripts.length === 0 &&
    blocksEqual(
      scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P6_SCRIPT_IDS.arrival)?.blocks,
      JTW_C3_ARRIVAL_CHAIN,
    )
  );
}

/**
 * Which C3-P5 weather version this Page 2 is, when BOTH stage actors stand on
 * `cell`. The sea it paints and the chain the monkey king runs must agree — the
 * same rule C3-P5 uses — so "删除天气链" and "加更响声音" are refused here, not
 * remembered somewhere. Returns null for any other page 2.
 */
export function jtwC3JumpPage2Version(
  page: Page | undefined,
  cell: JtwC3Cell,
): JtwC3Weather | null {
  if (page?.id !== JTW_C3_P6_PAGE_IDS[1]) return null;
  if (!stageIntact(page, cell, cell)) return null;
  if (actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length !== 1) return null;
  if (actorOf(page, JTW_C3_RAFT_ID)?.scripts.length !== 1) return null;
  if (
    !blocksEqual(
      scriptOf(page, JTW_C3_RAFT_ID, JTW_C3_P6_SCRIPT_IDS.raftCarry)?.blocks,
      JTW_C3_RAFT_CHAIN,
    )
  ) {
    return null;
  }
  const blocks = scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P6_SCRIPT_IDS.seaLeg)?.blocks;
  const version = JTW_C3_WEATHER_VERSIONS.find(
    (candidate) => candidate.scene === page.background && blocksEqual(blocks, candidate.chain),
  );
  return version?.id ?? null;
}

/** The two pages the repair may not touch are still the shipped ones. */
function outerPagesIntact(project: BlocksProject): boolean {
  return (
    project.lessonId === JTW_C3_P6_LESSON_ID &&
    project.pages.length === JTW_C3_P6_PAGE_IDS.length &&
    jtwC3JumpDepartPageIntact(project.pages[0]) &&
    jtwC3JumpArrivalPageIntact(project.pages[2])
  );
}

/**
 * The whole C3-P6 repair contract: three pages, both demo chains and both
 * exits untouched, the C3-P5 weather chain untouched, and Page 2's start moved
 * to EXACTLY the contract cell. Returns the version so callers can name the sea
 * without re-deriving it.
 */
export function jtwC3JumpFixVersion(project: BlocksProject): JtwC3Weather | null {
  if (!outerPagesIntact(project)) return null;
  return jtwC3JumpPage2Version(project.pages[1], JTW_C3_P6_TARGET_START_CELL);
}

/** The project is still exactly the shipped bug — used for the honest diff. */
export function jtwC3JumpBugVersion(project: BlocksProject): JtwC3Weather | null {
  if (!outerPagesIntact(project)) return null;
  return jtwC3JumpPage2Version(project.pages[1], JTW_C3_P6_WRONG_START_CELL);
}

/** Used by `storyMissionProgramMatches` — the repaired project completes it. */
export function jtwC3JumpFixComplete(project: BlocksProject): boolean {
  return jtwC3JumpFixVersion(project) !== null;
}

/**
 * The cell Page 2's two actors really share on the saved document, or null when
 * they no longer stand on the same cell (which the contract above refuses).
 */
export function jtwC3JumpSavedStartCell(project: BlocksProject): JtwC3Cell | null {
  const page = project.pages[JTW_C3_SEA_PAGE - 1];
  const monkey = actorOf(page, JTW_C3_MONKEY_KING_ID)?.start;
  const raft = actorOf(page, JTW_C3_RAFT_ID)?.start;
  if (!monkey || !raft) return null;
  if (monkey.gx !== raft.gx || monkey.gy !== raft.gy) return null;
  return { gx: monkey.gx, gy: monkey.gy };
}

/**
 * The honest position diff, shipped bug → saved document: one row, because the
 * scene's repair is ONE position ("单一位置diff"). Empty while the saved page is
 * still on the bug cell, and empty when the two actors disagree (there is no
 * single position to report then).
 */
export function jtwC3JumpStartDiff(project: BlocksProject): string[] {
  const saved = jtwC3JumpSavedStartCell(project);
  if (!saved) return [];
  if (saved.gx === JTW_C3_P6_WRONG_START_CELL.gx && saved.gy === JTW_C3_P6_WRONG_START_CELL.gy) {
    return [];
  }
  return [
    `page${JTW_C3_SEA_PAGE}-start:${jtwC3CellLabel(JTW_C3_P6_WRONG_START_CELL)}->${jtwC3CellLabel(saved)}`,
  ];
}

// ─── cross-page continuity, measured off a real page-flow run ────────────────

/** One page boundary as the child reads it: he left there, he arrived here. */
export interface JtwC3Boundary {
  /** 1-based page he left. */
  from: number;
  /** 1-based page he arrived on. */
  to: number;
  /** Cell he left `from` on, `gx-gy`. */
  exitCell: string;
  /** Cell he arrived on `to` at, `gx-gy`. */
  enterCell: string;
  /**
   * The direction line is unbroken across this boundary: he walks rightwards
   * all journey, so the next page has to pick him up further LEFT than the last
   * page put him down. Entering further right means he jumped forward past the
   * edge of the story — the scene's 不连续.
   */
  continuous: boolean;
}

const CELL = /^(\d+)-(\d+)$/;

function gxOf(cell: string | null): number | null {
  const match = cell === null ? null : CELL.exec(cell);
  return match ? Number(match[1]) : null;
}

/** Every page boundary a real run crossed, in run order. */
export function jtwC3JumpBoundaries(run: PageFlowRunResult | null): JtwC3Boundary[] {
  if (!run) return [];
  const boundaries: JtwC3Boundary[] = [];
  for (let index = 0; index + 1 < run.visits.length; index += 1) {
    const left = run.visits[index];
    const arrived = run.visits[index + 1];
    const exitGx = gxOf(left.exitCell);
    const enterGx = gxOf(arrived.enterCell);
    boundaries.push({
      from: left.page,
      to: arrived.page,
      exitCell: left.exitCell ?? '?',
      enterCell: arrived.enterCell ?? '?',
      continuous: exitGx !== null && enterGx !== null && enterGx < exitGx,
    });
  }
  return boundaries;
}

/** The first boundary the picture broke at, or null when none did. */
export function jtwC3JumpFirstBreak(run: PageFlowRunResult | null): JtwC3Boundary | null {
  return jtwC3JumpBoundaries(run).find((boundary) => !boundary.continuous) ?? null;
}

/** Every boundary this run crossed reads as one unbroken direction line. */
export function jtwC3JumpContinuous(run: PageFlowRunResult | null): boolean {
  const boundaries = jtwC3JumpBoundaries(run);
  return boundaries.length > 0 && boundaries.every((boundary) => boundary.continuous);
}

/** Boundaries → stored evidence rows (`page1->page2:7-9:2-8:ok`). */
export function jtwC3JumpEncodeBoundaries(boundaries: readonly JtwC3Boundary[]): string[] {
  return boundaries.map(
    (boundary) =>
      `page${boundary.from}->page${boundary.to}:${boundary.exitCell}:${boundary.enterCell}:${
        boundary.continuous ? 'ok' : 'break'
      }`,
  );
}

const BOUNDARY_ROW = /^page(\d+)->page(\d+):([\w-]+):([\w-]+):(ok|break)$/;

/** Stored rows → boundaries. Malformed rows are dropped, never guessed. */
export function jtwC3JumpDecodeBoundaries(rows: readonly string[]): JtwC3Boundary[] {
  const boundaries: JtwC3Boundary[] = [];
  for (const row of rows) {
    const match = BOUNDARY_ROW.exec(row);
    if (!match) continue;
    boundaries.push({
      from: Number(match[1]),
      to: Number(match[2]),
      exitCell: match[3],
      enterCell: match[4],
      continuous: match[5] === 'ok',
    });
  }
  return boundaries;
}

/** Restored boundaries read as one unbroken direction line. */
export function jtwC3JumpBoundariesContinuous(boundaries: readonly JtwC3Boundary[]): boolean {
  return boundaries.length > 0 && boundaries.every((boundary) => boundary.continuous);
}

// ─── the shipped three-page program (frontend copy of the starters) ──────────

function monkeyKing(cell: JtwC3Cell, scriptId: string, blocks: readonly Block[]): Character {
  return {
    id: JTW_C3_MONKEY_KING_ID,
    name: 'Monkey King',
    emoji: '🐵',
    asset: JTW_C3_MONKEY_KING_SPRITE,
    start: { gx: cell.gx, gy: cell.gy, size: JTW_C3_MONKEY_KING_SIZE, rot: 0 },
    scripts: [{ id: scriptId, blocks: [...blocks] }],
  };
}

function raftActor(cell: JtwC3Cell, blocks: readonly Block[] | null): Character {
  return {
    id: JTW_C3_RAFT_ID,
    name: 'Raft',
    emoji: '🛶',
    asset: JTW_C3_RAFT_SPRITE,
    start: { gx: cell.gx, gy: cell.gy, size: JTW_C3_RAFT_SIZE, rot: 0 },
    scripts: blocks ? [{ id: JTW_C3_P6_SCRIPT_IDS.raftCarry, blocks: [...blocks] }] : [],
  };
}

/**
 * One branch of the C3-P6 program, with Page 2's two actors on `page2Cell`.
 * `JTW_C3_P6_WRONG_START_CELL` reproduces the starter the backend really seeds
 * (the Part page runs THAT, read-only, so the bug is watched rather than
 * narrated); `JTW_C3_P6_TARGET_START_CELL` is the repaired shape the contract
 * above accepts, which is what the unit tests compare against.
 */
export function jtwC3JumpProject(version: JtwC3Weather, page2Cell: JtwC3Cell): BlocksProject {
  const weather = JTW_C3_WEATHER_VERSIONS.find((candidate) => candidate.id === version);
  if (!weather) throw new Error(`jtwC3JumpProject: unknown weather version ${version}`);
  return {
    version: 1,
    name: 'Journey to the West · C3 — The Raft Jumped Sides',
    lessonId: JTW_C3_P6_LESSON_ID,
    pages: [
      {
        id: JTW_C3_P6_PAGE_IDS[0],
        background: JTW_C3_PAGE1_SCENE,
        characters: [
          monkeyKing(JTW_C3_PAGE1_START_CELL, JTW_C3_P6_SCRIPT_IDS.depart, JTW_C3_DEPART_CHAIN),
          raftActor(JTW_C3_P6_PAGE1_RAFT_CELL, null),
        ],
      },
      {
        id: JTW_C3_P6_PAGE_IDS[1],
        background: weather.scene,
        characters: [
          monkeyKing(page2Cell, JTW_C3_P6_SCRIPT_IDS.seaLeg, weather.chain),
          raftActor(page2Cell, JTW_C3_RAFT_CHAIN),
        ],
      },
      {
        id: JTW_C3_P6_PAGE_IDS[2],
        background: JTW_C3_PAGE3_SCENE,
        characters: [
          monkeyKing(JTW_C3_PAGE3_START_CELL, JTW_C3_P6_SCRIPT_IDS.arrival, JTW_C3_ARRIVAL_CHAIN),
          raftActor(JTW_C3_PAGE3_START_CELL, null),
        ],
      },
    ],
  };
}

/** The exact program the whitelisted starter seeds — the bug, reproducible. */
export function jtwC3JumpBugProject(version: JtwC3Weather): BlocksProject {
  return jtwC3JumpProject(version, JTW_C3_P6_WRONG_START_CELL);
}

/** The page the sea leg still hands over to, whichever side it started on. */
export const JTW_C3_P6_EXIT_PAGE = JTW_C3_FAR_SHORE_PAGE;
