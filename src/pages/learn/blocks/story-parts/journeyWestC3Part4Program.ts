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
export const C3_P4_PROJECT_TITLE = '西游记 · 让海中央既有故事又有出口';

/** How many recent projects the part page scans for the child's build. */
export const C3_P4_RECENT_PROJECTS_TO_SCAN = 8;

/** The route the finished build must really walk. */
export const C3_P4_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

// ─── story_before — teaching script C3 Part 4 · Build 1, IN FULL ─────────────

export const C3_P4_STORY_SCREENS: readonly [string, string] = [
  'Page 2 一开始只有木筏、海上的背景和一个空的脚本槽。你要自己选出并排好四块：海风、前进、停顿和出口，再在 Page 目标里选择 3；运行的时候检查风声、移动、停顿和转场是不是都出现了。Page 1 与 Page 3 保留短示范链，让你比较三个页面各自承担的故事作用。',
  '你实际要做的事：选择 4 块、排列 4 块、设定 1 个页面目标、预测木筏在 Page 2 的哪一格离开，再从 Page 1 完整运行一次。搭成功的意思不是"摆得好看"，而是：Page 2 不再是空过场，实际轨迹是 1 → 2 → 3，Page 3 稳定结束。',
];
export const C3_P4_SCREEN_IDS: readonly [string, string] = ['part-4-build-brief', 'part-4-workload'];
export const C3_P4_NEXT_SCREEN_LABEL = '再读下一段';
export const C3_P4_PREV_SCREEN_LABEL = '回上一段';

/** 原著小卡片 — 三页仍是教学压缩，不是原著只有三片海。 */
export const C3_P4_CLASSIC_CARD =
  '原著第一回里，美猴王漂洋求师走了很久，跨海、访人间、再渡海。课程把这段路压成三页来讲；"海中央"是我们给中间那一段起的名字，原著里没有页码。';

/** 故事—程序桥（teaching script C3）。 */
export const C3_P4_STORY_BRIDGE =
  '三个 Page 代表旅程的三个可读阶段；每页的动作、Wait 和声音让这个地点有内容，Page 目标把下一段接上去。只有出口而没有内容，这一页就只是一个空过场。';

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
  { id: 'role-sea-wind', label: '让观众听见这是一段有风的海', correct: true },
  { id: 'role-forward', label: '让木筏真的向前走了一段', correct: true },
  { id: 'role-pause', label: '让他停下来看清方向', correct: true },
  { id: 'role-exit', label: '把这一段交给下一页', correct: true },
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

export const C3_P4_ROLE_TITLE = '这四块各自在做什么？给每一块选一个职责。';
export const C3_P4_ROLE_RETRY_HINT =
  '再想一遍：声音只被听见，移动才改变位置，Wait 什么都不改只让时间过去，Page 上的数字决定下一页。';

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
  '按 Go 之前先说清楚：木筏会在海中央的哪一格离开这一页？';
export const C3_P4_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'predict-exit-6-8', label: `${C3_P4_EXIT_CELL}——从 ${C3_P4_START_CELL} 向右走 4 格`, correct: true },
  { id: 'predict-exit-2-8', label: `${C3_P4_START_CELL}——他在原地等风停`, correct: false },
  { id: 'predict-exit-far-edge', label: '19-8——木筏会一直冲到画面最右边', correct: false },
];
export const C3_P4_PREDICTION_RETRY_HINT = `木筏从 ${C3_P4_START_CELL} 出发，Right ${JTW_C3_SEA_LEG} 就是向右 ${JTW_C3_SEA_LEG} 格；Wait 只让时间过去，一格都不多走。`;

export function c3p4PredictionDone(prediction: string | null): boolean {
  return C3_P4_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
}

export function c3p4StoryRead(screens: readonly string[]): boolean {
  return C3_P4_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

// ─── 工作区文案 ──────────────────────────────────────────────────────────────

export const C3_P4_BUILD_TITLE = '去真正的工作区，把海中央这一页搭出来';
export const C3_P4_BUILD_NOTE =
  'Page 2 的脚本槽里只有一个 Start。四块都要你自己从积木托盘里选出来、按顺序接上，再把 📄 Page 上的数字点成 3——没有任何"自动装好"的按钮。Page 1 和 Page 3 的示范链只能看，删掉任何一块这个 Part 都不算完成。';
export const C3_P4_OPEN_STUDIO_NEW = '开始搭建 →';
export const C3_P4_OPEN_STUDIO_RESUME = '继续搭建 →';
export const C3_P4_OPEN_STUDIO_DONE = '再看看我的海路';
export const C3_P4_OPEN_STUDIO_BUSY = '正在准备三页海路…';
export const C3_P4_BUILD_DONE_LABEL = '✓ 五块主脚本已搭好并在工作区真实运行过';
export const C3_P4_BUILD_PENDING_LABEL = '链还没有精确搭好，或还没在工作区按过 Go 并保存。';
export const C3_P4_TARGET_CHAIN_TITLE = '目标：Page 2 的五块主脚本';
export const C3_P4_SAVED_CHAIN_TITLE = '你保存的 Page 2 主脚本（从作品里读回来的，不是页面猜的）';
export const C3_P4_DEMO_TITLE = '三页各做各的事（Page 1 / Page 3 是只读示范链）';

/** The chain a finished build must carry, for the read-only "target" strip. */
export const C3_P4_TARGET_CHAIN: readonly Block[] = JTW_C3_SEA_TARGET;

// ─── 跨页运行（studio 的 runner 一次只跑一页，所以这一段在 Part 页面上跑） ────

export const C3_P4_RUN_TITLE = '从 Page 1 真实跑一次三页路线';
export const C3_P4_RUN_NOTE =
  '工作区的 Go 一次只跑一页。这里用同一个解释器把你保存的作品从 Page 1 一页一页跑下去，把每一页真实的进入格、离开格和出口页号量出来——只在编辑器里摆对、没有真的跑过，这个 Part 不算完成。';
export const C3_P4_RUN_LABEL = '▶ 从 Page 1 跑到 Page 3';
export const C3_P4_RUN_AGAIN_LABEL = '再跑一次';
export const C3_P4_RUN_BUSY_LABEL = '木筏正在走…';
export const C3_P4_RUN_LOCKED_HINT = '先把 Page 2 的五块搭好并在工作区保存，才能跑这条完整路线。';
export const C3_P4_EXPECTED_TRACE_TITLE = '预期路线';
export const C3_P4_ACTUAL_TRACE_TITLE = '实际脚印';
export const C3_P4_TRACE_MISMATCH_HINT =
  '这一次没有走成 1 → 2 → 3。回到工作区检查 Page 2 的出口数字，再跑一次。';

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
  '把木筏送回家的那个循环消失了：它经过一段有风声、有前进、也有停顿的海路，稳稳靠上了彼岸的浅滩，山林里的歌声第一次传下来。';
export const C3_P4_STORY_AFTER =
  '路线接通了。接下来由你选择星夜还是晨雾，来表达这段旅程的中间一程。';
export const C3_P4_CONTINUE_LABEL = '选择海的样子';

/** 远行印 — C3's seal. P4 lights HALF of it; the seal itself is C3-P8's. */
export const C3_P4_HALF_SEAL_LABEL = '远行印 · 亮了一半';
export const C3_P4_HALF_SEAL_NOTE =
  '海中央有故事了，可木筏跨页时还没有站对位置。远行印要等这一章八个 Part 都完成、由服务端聚合以后才真的点亮，这里只是记着你已经走到一半。';

export const C3_P4_LOCKED_HINT =
  '先在第三章 Part 3 用出口卡说清楚数字怎样带路，再来亲手搭海中央这一页。';
export const C3_P4_LOADING_HINT = '木筏正在海中央等你…';
