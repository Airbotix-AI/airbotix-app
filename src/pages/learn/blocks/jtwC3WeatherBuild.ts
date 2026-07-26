// Journey to the West S1/C3-P5 — the two-branch middle-sea contract.
//
// C3-P4 gave 海中央 a story and an exit. C3-P5 (scene-specs JTW-S1-C3-P5
// "星夜和晨雾都需要观察") is the chapter's real choice: the SAME route across the
// SAME sea, expressed two different ways.
//
//   星夜版  `play_sound(Sparkle) → wait(2)`                      — 等云散开
//   晨雾版  `set_speed(1) → play_sound(Whoosh) → say(preset)`    — 放慢观察
//
// Both keep `move_right(4) → goto_page(3)` ("选择只改变节奏与表达，不改变原著关键
// 顺序或出口"), so a version that drops the Goto, points it back at 1, or only
// repaints the sea is NOT a version — it is an unfinished build.
//
// The two branches are the scene's `模板分支白名单`: each ships as its own backend
// starter (`blocks_jtw_c3_p5_starry` / `blocks_jtw_c3_p5_morning`) carrying the
// shared route and its own Page 2 artwork, so the sea the child chose is what
// the studio really paints and what the saved document really stores. Which
// branch a saved project is, is READ BACK off that document here — background
// and chain must agree, or it is neither.
//
// This module holds everything the studio and the Part page judge, so
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
  JTW_C3_SEA_WAIT,
} from './jtwC3SeaBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_MORNING_BACKGROUND,
  JTW_C3_PAGE2_MORNING_SCENE,
  JTW_C3_PAGE2_STARRY_BACKGROUND,
  JTW_C3_PAGE2_STARRY_RESOLVED_BACKGROUND,
  JTW_C3_PAGE2_RESOLVED_BACKGROUND,
  JTW_C3_PAGE2_STARRY_SCENE,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_SCENE,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
  JTW_C3_SEA_WIND_SOUND_ID,
} from './jtwC3Stage';

export const JTW_C3_P5_LESSON_ID = 'jtw-s1-c3-p5';

/** `BUILT_IN_SOUNDS` id of ✨ Sparkle — the starry sea's own sound. */
export const JTW_C3_STARLIGHT_SOUND_ID = 6;
/** `set_speed` level 1 = 🐢 slow (`SPEED_ICONS` / `SPEED_FACTORS` index 0). */
export const JTW_C3_SLOW_SPEED = 1;

/**
 * The mist version's preset line. The scene forbids asking a six-year-old to
 * type ("预设Say不得要求低龄孩子自由输入"), so the studio's Say editor offers exactly
 * this text through the mission contract's `allowedSayText` and the build
 * contract accepts nothing else.
 */
export const JTW_C3_LISTEN_CLUE = '晨雾里看不清，我先听浪声。';

export const JTW_C3_P5_PAGE_IDS: readonly [string, string, string] = [
  'jtw-c3-p5-page-1',
  'jtw-c3-p5-page-2',
  'jtw-c3-p5-page-3',
];

export const JTW_C3_P5_SCRIPT_IDS = {
  /** Page 1's read-only demo: leave the home shore, hand over to Page 2. */
  depart: 'monkey-king-depart',
  /** Page 2's slot — ships the shared route; the child adds the weather. */
  seaLeg: 'monkey-king-sea-leg',
  /** Page 2's raft, so §2.4's "feet on a raft" holds on open water. */
  raftCarry: 'raft-carry',
  /** Page 3's read-only demo: the preset forest clue, then a stable End. */
  arrival: 'monkey-king-arrival',
} as const;

/** Where Page 1's beached raft waits — exactly where the Page 1 walk ends. */
export const JTW_C3_P5_PAGE1_RAFT_CELL = {
  gx: JTW_C3_PAGE1_START_CELL.gx + JTW_C3_SEA_LEG,
  gy: JTW_C3_PAGE1_START_CELL.gy,
} as const;

/**
 * The main route both versions must keep, and exactly what the starter ships in
 * the Page 2 slot: the child adds a weather chain in FRONT of it, never around
 * it ("两版都必须保留`move_right(4) → goto_page(3)`").
 */
export const JTW_C3_P5_ROUTE_TAIL: readonly Block[] = [
  { op: 'move_right', n: JTW_C3_SEA_LEG },
  { op: 'goto_page', n: JTW_C3_FAR_SHORE_PAGE },
];

export const JTW_C3_P5_STARTER_CHAIN: readonly Block[] = [
  { op: 'when_flag' },
  ...JTW_C3_P5_ROUTE_TAIL,
];

/** 星夜版 expression — the stars sound, then the pause the clouds need. */
export const JTW_C3_STARRY_EXPRESSION: readonly Block[] = [
  { op: 'play_sound', n: JTW_C3_STARLIGHT_SOUND_ID },
  { op: 'wait', n: JTW_C3_SEA_WAIT },
];

/** 晨雾版 expression — slow down, the sea wind, then say what he listens for. */
export const JTW_C3_MORNING_EXPRESSION: readonly Block[] = [
  { op: 'set_speed', n: JTW_C3_SLOW_SPEED },
  { op: 'play_sound', n: JTW_C3_SEA_WIND_SOUND_ID },
  { op: 'say', text: JTW_C3_LISTEN_CLUE },
];

/** The two weather versions the scene declares valid. */
export type JtwC3Weather = 'starry' | 'morning';

export interface JtwC3WeatherVersion {
  id: JtwC3Weather;
  /** Child-facing name of the weather card. */
  label: string;
  /** Backend starter that seeds this branch (the scene's 模板分支白名单). */
  templateId: BlocksTemplateId;
  /** Stable scene id this branch's Page 2 stores as its background. */
  scene: string;
  /** The `before` artwork this branch's middle sea really shows. */
  background: string;
  /** The same camera after the version has really run. */
  resolvedBackground: string;
  /** Alt text for the resolved artwork. */
  resolvedAlt: string;
  /** The 2–3 blocks the child adds in front of the shared route. */
  expression: readonly Block[];
  /** The whole Page 2 chain a finished build of this branch must carry. */
  chain: readonly Block[];
  /** What the audience hears — used by the peer prediction and the run panel. */
  soundLabel: string;
  /** How this version reads with the sound turned off (scene: 静音模式). */
  mutedEvidence: string;
}

const STARRY: JtwC3WeatherVersion = {
  id: 'starry',
  label: '🌙 星夜海面',
  templateId: 'blocks_jtw_c3_p5_starry',
  scene: JTW_C3_PAGE2_STARRY_SCENE,
  background: JTW_C3_PAGE2_STARRY_BACKGROUND,
  resolvedBackground: JTW_C3_PAGE2_STARRY_RESOLVED_BACKGROUND,
  resolvedAlt: '星夜的海：云退开了，一条亮着的海路从这边一直连到对岸的灯',
  expression: JTW_C3_STARRY_EXPRESSION,
  chain: [{ op: 'when_flag' }, ...JTW_C3_STARRY_EXPRESSION, ...JTW_C3_P5_ROUTE_TAIL],
  soundLabel: '✨ Sparkle',
  mutedEvidence:
    '把声音关掉也读得出来：⏱ Wait 2 那一下停顿看得见，画面上的云要退开、月光要落到海面，木筏才动。',
};

const MORNING: JtwC3WeatherVersion = {
  id: 'morning',
  label: '🌫 晨雾海面',
  templateId: 'blocks_jtw_c3_p5_morning',
  scene: JTW_C3_PAGE2_MORNING_SCENE,
  background: JTW_C3_PAGE2_MORNING_BACKGROUND,
  resolvedBackground: JTW_C3_PAGE2_RESOLVED_BACKGROUND,
  resolvedAlt: '晨雾的海：雾散开一条路，海面上画出一条能走的海路',
  expression: JTW_C3_MORNING_EXPRESSION,
  chain: [{ op: 'when_flag' }, ...JTW_C3_MORNING_EXPRESSION, ...JTW_C3_P5_ROUTE_TAIL],
  soundLabel: '💨 Whoosh',
  mutedEvidence:
    '把声音关掉也读得出来：🐢 Speed 把木筏放慢是看得见的，💬 那句话也写在画面上，雾里他确实先听再走。',
};

/** Both valid versions, in the order the scene names them (星夜 then 晨雾). */
export const JTW_C3_WEATHER_VERSIONS: readonly JtwC3WeatherVersion[] = [STARRY, MORNING];

export function jtwC3WeatherVersion(id: JtwC3Weather): JtwC3WeatherVersion {
  return id === 'starry' ? STARRY : MORNING;
}

/** Narrow an arbitrary stored string back to a weather id, or null. */
export function jtwC3ParseWeather(value: string | null | undefined): JtwC3Weather | null {
  return JTW_C3_WEATHER_VERSIONS.some((version) => version.id === value)
    ? (value as JtwC3Weather)
    : null;
}

// ─── shared shape helpers (same rules as the C3-P4 contract) ─────────────────

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
export function jtwC3P5DepartPageIntact(page: Page | undefined): boolean {
  return (
    page?.id === JTW_C3_P5_PAGE_IDS[0] &&
    page.background === JTW_C3_PAGE1_SCENE &&
    stageIntact(page, JTW_C3_PAGE1_START_CELL, JTW_C3_P5_PAGE1_RAFT_CELL) &&
    actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length === 1 &&
    actorOf(page, JTW_C3_RAFT_ID)?.scripts.length === 0 &&
    blocksEqual(
      scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P5_SCRIPT_IDS.depart)?.blocks,
      JTW_C3_DEPART_CHAIN,
    )
  );
}

/** Page 3's demo chain, stage and background are exactly as shipped. */
export function jtwC3P5ArrivalPageIntact(page: Page | undefined): boolean {
  return (
    page?.id === JTW_C3_P5_PAGE_IDS[2] &&
    page.background === JTW_C3_PAGE3_SCENE &&
    stageIntact(page, JTW_C3_PAGE3_START_CELL, JTW_C3_PAGE3_START_CELL) &&
    actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length === 1 &&
    actorOf(page, JTW_C3_RAFT_ID)?.scripts.length === 0 &&
    blocksEqual(
      scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P5_SCRIPT_IDS.arrival)?.blocks,
      JTW_C3_ARRIVAL_CHAIN,
    )
  );
}

/**
 * Which weather version this Page 2 IS, or null when it is not a finished
 * version. Both halves have to agree: the sea the page paints AND the chain the
 * monkey king runs. That is what makes "只换背景不通过" structural — repainting the
 * page starry while the chain is still the bare shipped route matches neither
 * branch, and so does a starry chain saved on the mist sea.
 */
export function jtwC3WeatherPageVersion(page: Page | undefined): JtwC3Weather | null {
  if (page?.id !== JTW_C3_P5_PAGE_IDS[1]) return null;
  if (!stageIntact(page, JTW_C3_PAGE2_START_CELL, JTW_C3_PAGE2_START_CELL)) return null;
  if (actorOf(page, JTW_C3_MONKEY_KING_ID)?.scripts.length !== 1) return null;
  if (actorOf(page, JTW_C3_RAFT_ID)?.scripts.length !== 1) return null;
  if (
    !blocksEqual(
      scriptOf(page, JTW_C3_RAFT_ID, JTW_C3_P5_SCRIPT_IDS.raftCarry)?.blocks,
      JTW_C3_RAFT_CHAIN,
    )
  ) {
    return null;
  }
  const blocks = scriptOf(page, JTW_C3_MONKEY_KING_ID, JTW_C3_P5_SCRIPT_IDS.seaLeg)?.blocks;
  const version = JTW_C3_WEATHER_VERSIONS.find(
    (candidate) => candidate.scene === page.background && blocksEqual(blocks, candidate.chain),
  );
  return version?.id ?? null;
}

/**
 * The whole C3-P5 contract: three pages, the two demo chains untouched, and a
 * Page 2 that really is one of the two valid versions. Returns the version so
 * the Part page can name it without re-deriving it.
 */
export function jtwC3WeatherBuildVersion(project: BlocksProject): JtwC3Weather | null {
  if (project.lessonId !== JTW_C3_P5_LESSON_ID) return null;
  if (project.pages.length !== JTW_C3_P5_PAGE_IDS.length) return null;
  if (!jtwC3P5DepartPageIntact(project.pages[0])) return null;
  if (!jtwC3P5ArrivalPageIntact(project.pages[2])) return null;
  return jtwC3WeatherPageVersion(project.pages[1]);
}

/** Used by `storyMissionProgramMatches` — either valid version completes it. */
export function jtwC3WeatherBuildComplete(project: BlocksProject): boolean {
  return jtwC3WeatherBuildVersion(project) !== null;
}

/** The blocks on Page 2 after the shipped Start, straight off the saved doc. */
export function jtwC3WeatherPlacedBlocks(project: BlocksProject): Block[] {
  const blocks =
    scriptOf(project.pages[1], JTW_C3_MONKEY_KING_ID, JTW_C3_P5_SCRIPT_IDS.seaLeg)?.blocks ?? [];
  return blocks.filter((block) => block.op !== 'when_flag');
}

/** The page number the saved Page block really points at, or null when absent. */
export function jtwC3WeatherExitTarget(project: BlocksProject): number | null {
  const blocks =
    scriptOf(project.pages[1], JTW_C3_MONKEY_KING_ID, JTW_C3_P5_SCRIPT_IDS.seaLeg)?.blocks ?? [];
  return blocks.find((block) => block.op === 'goto_page')?.n ?? null;
}

/** The sea the saved document really paints on Page 2, whatever the chain says. */
export function jtwC3WeatherSavedScene(project: BlocksProject): string | null {
  return project.pages[JTW_C3_SEA_PAGE - 1]?.background ?? null;
}
