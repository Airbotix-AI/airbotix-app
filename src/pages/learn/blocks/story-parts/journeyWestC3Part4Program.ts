// Journey to the West · C3-P4 "让海中央既有故事又有出口" — chapter three's main
// Build (scene-specs JTW-S1-C3-P4, teaching script C3 Part 4 · Build 1).
//
// C3-P3 proved the exit number is an address. C3-P4 is where the child finally
// OWNS a page: 海中央 gets a sound, a move, a pause and an exit, and only then
// does the three-page route really reach 彼岸山林.
//
// The build itself happens in the real Blocks Studio on a `blocks_jtw_c3_p4`
// project. This module holds everything the Part page judges: the story screens,
// the four block roles, the exit-cell prediction, and — because the studio's own
// runner only ever runs ONE page — the contract a REAL cross-page run of the
// SAVED project has to satisfy (`1 → 2 → 3`, stopped because Page 3 ended).
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` and `BlocksStudioPage.tsx`
// are already over it, so no chapter-three content is added to either).

import type { Block } from '../blocksModel';
import type { PageFlowRunResult } from '../pageFlowRun';
import type { JtwEvidenceOption } from './journeyWestSeason1';
import {
  JTW_C3_FAR_SHORE_PAGE,
  JTW_C3_SEA_LEG,
  JTW_C3_SEA_PAGE,
  JTW_C3_SEA_TARGET,
  JTW_C3_SEA_WAIT,
} from '../jtwC3SeaBuild';
import { JTW_C3_PAGE2_START_CELL, JTW_C3_SEA_WIND_SOUND_ID } from '../jtwC3Stage';

export const C3_P4_LESSON_ID = 'jtw-s1-c3-p4';
export const C3_P4_PART_ID = 'jtw-s1-c3-p4';
export const C3_P4_NEXT_PART_ID = 'jtw-s1-c3-p5';
export const C3_P4_TEMPLATE_ID = 'blocks_jtw_c3_p4';
export const C3_P4_PROJECT_TITLE =
  'Journey to the West · Let the middle of the sea have both a story and an outlet';

/** How many recent projects the part page scans for the child's build. */
export const C3_P4_RECENT_PROJECTS_TO_SCAN = 8;

/** The route the finished build must really walk. */
export const C3_P4_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

// ─── story_before — teaching script C3 Part 4 · Build 1, IN FULL ─────────────

export const C3_P4_STORY_SCREENS: readonly [string, string] = [
  'Page 2 It starts with a raft, a sea background, and an empty script slot. You need to select and arrange four blocks yourself: sea breeze, forward, pause and exit, and then select 3 in the Page target; when running, check whether the wind sound, movement, pause and transition all appear. Keep short demonstration links for Page 1 and Page 3, allowing you to compare the story roles each of the three pages plays.',
  'What you actually do: select 4 tiles, arrange 4 tiles, set 1 page goal, predict where on Page 2 the raft will leave, and do the full run from Page 1. Success does not mean "looking good", but: Page 2 is no longer an empty cutscene, the actual trajectory is 1 → 2 → 3, and Page 3 ends stably.',
];
export const C3_P4_SCREEN_IDS: readonly [string, string] = [
  'part-4-build-brief',
  'part-4-workload',
];
export const C3_P4_NEXT_SCREEN_LABEL = 'Read the next paragraph';
export const C3_P4_PREV_SCREEN_LABEL = 'Go back to the previous paragraph';

/** 原著小卡片 — 三页仍是教学压缩，不是原著只有三片海。 */
export const C3_P4_CLASSIC_CARD =
  'In the first chapter of the original work, the Monkey King traveled across the ocean to seek guidance for a long time, crossing the sea, visiting the world, and then crossing the sea again. The course divides this section into three pages; "Middle of the Sea" is the name we gave to the middle section, and there are no page numbers in the original work.';

/** 故事—程序桥（teaching script C3）。 */
export const C3_P4_STORY_BRIDGE =
  'The three Pages represent the three readable stages of the journey; the actions, waits, and sounds of each page give the location content, and the Page goal connects the next paragraph. With only an exit but no content, this page is just an empty cutscene.';

// ─── 四块的不同职责（"辨认声音、移动、停顿和出口的不同职责"） ────────────────

/** One placed block and the story job it is doing on this page. */
export interface C3P4RoleSlot {
  id: string;
  /** The block the child must recognise, as it appears in the saved chain. */
  block: Block;
  /** Child-facing name of the block, for the row label. */
  blockLabel: string;
  /** The role option id that is right for this block. */
  roleId: string;
}

/** The four jobs, offered for every row — so a row is a real choice, not a lid. */
export const C3_P4_ROLE_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'role-sea-wind', label: 'Let the audience hear that this is a windy sea', correct: true },
  { id: 'role-forward', label: 'Let the raft really move forward for a while', correct: true },
  { id: 'role-pause', label: 'Ask him to stop and look at the direction', correct: true },
  { id: 'role-exit', label: 'Pass this paragraph to the next page', correct: true },
];

export const C3_P4_ROLE_SLOTS: readonly C3P4RoleSlot[] = [
  {
    id: 'slot-sound',
    block: { op: 'play_sound', n: JTW_C3_SEA_WIND_SOUND_ID },
    blockLabel: '💨 Whoosh',
    roleId: 'role-sea-wind',
  },
  {
    id: 'slot-move',
    block: { op: 'move_right', n: JTW_C3_SEA_LEG },
    blockLabel: `➡️ Right ${JTW_C3_SEA_LEG}`,
    roleId: 'role-forward',
  },
  {
    id: 'slot-wait',
    block: { op: 'wait', n: JTW_C3_SEA_WAIT },
    blockLabel: `⏱ Wait ${JTW_C3_SEA_WAIT}`,
    roleId: 'role-pause',
  },
  {
    id: 'slot-exit',
    block: { op: 'goto_page', n: JTW_C3_FAR_SHORE_PAGE },
    blockLabel: `📄 Page ${JTW_C3_FAR_SHORE_PAGE}`,
    roleId: 'role-exit',
  },
];

export const C3_P4_ROLE_TITLE =
  'What are these four blocks doing? Choose a responsibility for each piece.';
export const C3_P4_ROLE_RETRY_HINT =
  'Think about it again: the sound is only heard, the position is changed when moving, Wait does not change anything and only lets time pass, and the number on Page determines the next page.';

/** Every slot answered? */
export function c3p4RolesAnswered(roles: Readonly<Record<string, string>>): boolean {
  return C3_P4_ROLE_SLOTS.every((slot) => Boolean(roles[slot.id]));
}

/** Every slot matched to the job that block really does. */
export function c3p4RolesCorrect(roles: Readonly<Record<string, string>>): boolean {
  return C3_P4_ROLE_SLOTS.every((slot) => roles[slot.id] === slot.roleId);
}

/** Roles → stored evidence rows (`slot-sound:role-sea-wind`). */
export function c3p4EncodeRoles(roles: Readonly<Record<string, string>>): string[] {
  return C3_P4_ROLE_SLOTS.filter((slot) => roles[slot.id]).map(
    (slot) => `${slot.id}:${roles[slot.id]}`,
  );
}

const ROLE_ROW = /^([\w-]+):([\w-]+)$/;

/** Stored evidence rows → roles. Malformed rows are dropped, not guessed. */
export function c3p4DecodeRoles(rows: readonly string[]): Record<string, string> {
  const roles: Record<string, string> = {};
  for (const row of rows) {
    const match = ROLE_ROW.exec(row);
    if (!match) continue;
    if (!C3_P4_ROLE_SLOTS.some((slot) => slot.id === match[1])) continue;
    roles[match[1]] = match[2];
  }
  return roles;
}

// ─── 预测：木筏在 Page 2 的哪一格离开 ────────────────────────────────────────

/** Where `move_right(4)` from the contract's 2/8 start really leaves him. */
export const C3_P4_EXIT_CELL = `${JTW_C3_PAGE2_START_CELL.gx + JTW_C3_SEA_LEG}-${JTW_C3_PAGE2_START_CELL.gy}`;
export const C3_P4_START_CELL = `${JTW_C3_PAGE2_START_CELL.gx}-${JTW_C3_PAGE2_START_CELL.gy}`;

export const C3_P4_PREDICTION_QUESTION =
  "Let's be clear before you press Go: Where in the middle of the ocean will the raft leave this page?";
export const C3_P4_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'predict-exit-6-8',
    label: `${C3_P4_EXIT_CELL}--from ${C3_P4_START_CELL} Go right 4 spaces`,
    correct: true,
  },
  {
    id: 'predict-exit-2-8',
    label: `${C3_P4_START_CELL}——He waited for the wind to subside.`,
    correct: false,
  },
  {
    id: 'predict-exit-far-edge',
    label: '19-8 - The raft will rush all the way to the far right of the screen',
    correct: false,
  },
];
export const C3_P4_PREDICTION_RETRY_HINT = `raft from ${C3_P4_START_CELL} Let's go, Right ${JTW_C3_SEA_LEG} Just to the right ${JTW_C3_SEA_LEG} Grid; Wait only lets time pass without moving a single grid.`;

export function c3p4PredictionDone(prediction: string | null): boolean {
  return C3_P4_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
}

export function c3p4StoryRead(screens: readonly string[]): boolean {
  return C3_P4_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

// ─── 工作区文案 ──────────────────────────────────────────────────────────────

export const C3_P4_BUILD_TITLE =
  'Go to the real workspace and build this page in the middle of the sea';
export const C3_P4_BUILD_NOTE =
  'There is only one Start in the script slot of Page 2. You have to select the four pieces from the building block tray, connect them in order, and then click the number on the 📄 Page to 3 - there is no "auto-assemble" button. The demonstration chain on Page 1 and Page 3 can only be viewed. If you delete any piece, the Part will not be considered complete.';
export const C3_P4_OPEN_STUDIO_NEW = 'Start building →';
export const C3_P4_OPEN_STUDIO_RESUME = 'Continue building →';
export const C3_P4_OPEN_STUDIO_DONE = 'Look at my sea route again';
export const C3_P4_OPEN_STUDIO_BUSY = 'Three pages of sea routes are being prepared...';
export const C3_P4_BUILD_DONE_LABEL =
  '✓ Five main scripts have been set up and actually run in the workspace';
export const C3_P4_BUILD_PENDING_LABEL =
  'The chain has not been set up accurately, or Go has not been pressed in the workspace and saved.';
export const C3_P4_TARGET_CHAIN_TITLE = 'Target: Five blocks of main script for Page 2';
export const C3_P4_SAVED_CHAIN_TITLE =
  'The main script of Page 2 you saved (read from the work, not guessed by the page)';
export const C3_P4_DEMO_TITLE =
  'Each of the three pages does their own thing (Page 1 / Page 3 are read-only demonstration links)';

/** The chain a finished build must carry, for the read-only "target" strip. */
export const C3_P4_TARGET_CHAIN: readonly Block[] = JTW_C3_SEA_TARGET;

// ─── 跨页运行（studio 的 runner 一次只跑一页，所以这一段在 Part 页面上跑） ────

export const C3_P4_RUN_TITLE = 'From Page 1 Really run a three-page route';
export const C3_P4_RUN_NOTE =
  'Go in the workspace only runs one page at a time. Here, use the same interpreter to run the work you saved from Page 1 page by page, and measure the actual entry grid, exit grid, and exit page number of each page - this Part is not considered complete as long as it is set correctly in the editor and has not been actually run.';
export const C3_P4_RUN_LABEL = '▶ Run from Page 1 to Page 3';
export const C3_P4_RUN_AGAIN_LABEL = 'run again';
export const C3_P4_RUN_BUSY_LABEL = 'The raft is going…';
export const C3_P4_RUN_LOCKED_HINT =
  'You must first build the five pieces of Page 2 and save them in the workspace before you can run this complete route.';
export const C3_P4_EXPECTED_TRACE_TITLE = 'intended route';
export const C3_P4_ACTUAL_TRACE_TITLE = 'actual footprints';
export const C3_P4_TRACE_MISMATCH_HINT =
  'This time it didn’t go 1 → 2 → 3. Go back to the workspace and check the exit numbers for Page 2 and run again.';

/**
 * Did a REAL cross-page run of the SAVED project reach the far shore? The trace
 * must be exactly `1 → 2 → 3` AND the run must have stopped because the last
 * page ENDED — never because the route looped or ran out of teaching budget
 * ("运行轨迹`1→2→3`、Page 3稳定End").
 */
export function c3p4RunReachedFarShore(run: PageFlowRunResult | null): boolean {
  if (!run) return false;
  return run.stoppedBy === 'end' && c3p4TraceReached(run.trace);
}

/** Is this page trace the chapter's goal route? Also used to re-read a restored
 *  run, where no runner result survives a refresh. */
export function c3p4TraceReached(trace: readonly number[]): boolean {
  return (
    trace.length === C3_P4_TARGET_TRACE.length &&
    C3_P4_TARGET_TRACE.every((page, index) => trace[index] === page)
  );
}

/** The cell the measured run really left Page 2 from, or null if it never ran. */
export function c3p4MeasuredExitCell(run: PageFlowRunResult | null): string | null {
  return run?.visits.find((visit) => visit.page === JTW_C3_SEA_PAGE)?.exitCell ?? null;
}

/** Does the measured Page 2 exit cell agree with the child's prediction? */
export function c3p4PredictionMatchedRun(run: PageFlowRunResult | null): boolean {
  return c3p4MeasuredExitCell(run) === C3_P4_EXIT_CELL;
}

// ─── resolved / story_after / continue ───────────────────────────────────────

export const C3_P4_RESOLVED_WORLD_CHANGE =
  'The cycle that brought the raft home disappeared: it passed through a sea route with wind, progress, and pauses, and landed firmly on the shoal on the other side. For the first time, the songs in the mountains and forests came down.';
export const C3_P4_STORY_AFTER =
  'The route is connected. Next, it’s up to you to choose the starry night or the morning fog to express the middle part of this journey.';
export const C3_P4_CONTINUE_LABEL = 'Choose the shape of the sea';

/** 远行印 — C3's seal. P4 lights HALF of it; the seal itself is C3-P8's. */
export const C3_P4_HALF_SEAL_LABEL = 'Long journey seal · Half brightened';
export const C3_P4_HALF_SEAL_NOTE =
  'There is a story in the middle of the sea, but the raft is not in the right position when it crosses the page. The Journey Seal will not be lit until all eight parts of this chapter are completed and aggregated by the server. This is just to remember that you are halfway there.';

export const C3_P4_LOCKED_HINT =
  'First, use the exit card to explain how numbers lead the way in Chapter 3, and then come to the page in the middle of the sea.';
export const C3_P4_LOADING_HINT = 'The raft is waiting for you in the middle of the sea...';
