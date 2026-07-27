// Journey to the West · C3-P2 "把出发和到达排成一条路" — chapter three's Story
// Hook (scene-specs JTW-S1-C3-P2, teaching script C3 故事卡C + Part 2).
//
// The starter is a THREE-page project whose Page 2 exit deliberately points back
// at Page 1. The child arranges the expected route (三张页面卡 + 两张出口箭头),
// predicts what the exit numbers will really do, runs the UNMODIFIED starter
// once, reads the real footprints, and circles Page 2 as the first deviation.
//
// This Part only LOCATES the error. It offers no fix button, never edits the
// Page 2 exit, and writes no BlocksProject — the starter below is the read-only
// stage program, so "P2不允许保存为已修复状态" is structural rather than a rule
// somebody has to remember.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` is already over it, so no
// chapter-three content is added there either).

import type { BlocksProject, Character, Script } from '../blocksModel';
import type { JtwEvidenceOption } from './journeyWestSeason1';
import type { PageFlowRunResult } from '../pageFlowRun';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
  JTW_C3_SEA_WIND_SOUND_ID,
} from '../jtwC3Stage';

export const C3_P2_LESSON_ID = 'jtw-s1-c3-p2';

/** How far each page's move block carries the raft (the shared C3 chain). */
const SEA_LEG = 4;

// ─── story_before — teaching script C3 故事卡C + Part 2, IN FULL ─────────────

export const C3_P2_STORY_SCREENS: readonly [string, string] = [
  '原著里的寻找经历了很长时间、不同地方和不止一次渡海。课程把这段漫长旅程压缩成三张故事页面：离开花果山、经过海上与人间、到达师门所在的山。三页是讲故事的方法，不是说原著只有三片真的海。',
  'starter 为 Page 1→2、Page 2→1、Page 3 师门。先排预期 1→2→3，再 Go。运行后脚印保留实际 1→2→1。孩子圈第一次偏离的 Page 2。',
];
export const C3_P2_SCREEN_IDS: readonly [string, string] = ['story-card-c', 'part-2-hook'];
export const C3_P2_NEXT_SCREEN_LABEL = '再读下一段';
export const C3_P2_PREV_SCREEN_LABEL = '回上一段';

/** Classic Card — 三页是教学压缩，不是原著只有三片海。 */
export const C3_P2_CLASSIC_CARD =
  '原著第一回中，美猴王漂洋求师走了很久，跨海、访人间、再渡海。课程用三张页面把这段路讲清楚；这是讲故事的方法，不是说原著只有三天、三片海。';

/** 故事—程序桥（teaching script C3）：出口数字把下一段接上去。 */
export const C3_P2_STORY_BRIDGE =
  '三个 Page 代表旅程的三个可读阶段；每页的动作、Wait 和声音让这个地点有内容，页面出口上的数字把下一段接上去。数字写错的时候，程序照样跑得动，故事却接不下去。';

// ─── The three-page starter — shipped as-is, never repaired here ─────────────

export const C3_P2_PAGE_IDS: readonly [string, string, string] = [
  'jtw-c3-page-1',
  'jtw-c3-page-2',
  'jtw-c3-page-3',
];

export const C3_P2_SCRIPT_IDS = {
  depart: 'monkey-king-depart',
  wrongExit: 'monkey-king-wrong-exit',
  raftCarry: 'raft-carry',
  arrival: 'monkey-king-arrival',
} as const;

/** The preset arrival clue Page 3 says (teaching script 故事卡D: 山林里的歌声). */
export const C3_P2_ARRIVAL_CLUE = '山林里有歌声，我顺着它走。';

/** Where Page 1's beached raft waits — exactly where the Page 1 walk ends. */
export const C3_P2_PAGE1_RAFT_CELL = {
  gx: JTW_C3_PAGE1_START_CELL.gx + SEA_LEG,
  gy: JTW_C3_PAGE1_START_CELL.gy,
} as const;

interface StartCell {
  gx: number;
  gy: number;
}

const monkeyKing = (start: StartCell, scripts: Script[]): Character => ({
  id: JTW_C3_MONKEY_KING_ID,
  name: 'Monkey King',
  emoji: '🐵',
  asset: JTW_C3_MONKEY_KING_SPRITE,
  start: { gx: start.gx, gy: start.gy, size: JTW_C3_MONKEY_KING_SIZE, rot: 0 },
  scripts,
});

const raft = (start: StartCell, scripts: Script[]): Character => ({
  id: JTW_C3_RAFT_ID,
  name: 'Raft',
  emoji: '🛶',
  asset: JTW_C3_RAFT_SPRITE,
  start: { gx: start.gx, gy: start.gy, size: JTW_C3_RAFT_SIZE, rot: 0 },
  scripts,
});

/**
 * The shipped starter. Page 1's exit is right, Page 2's exit says 1, Page 3 ends
 * stably — exactly the chain the scene prints. The raft is a real stage actor
 * (asset bible §6 forbids baking it into the background): it waits on the beach
 * where the Page 1 walk ends, carries the monkey king across the open sea, where
 * §2.4 would otherwise leave his feet on open water, and lies beached on the far
 * shore.
 */
export const C3_P2_STARTER_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C3-P2 three-page starter',
  lessonId: C3_P2_LESSON_ID,
  pages: [
    {
      id: C3_P2_PAGE_IDS[0],
      background: 'jtw-s1-c3-page1-before-v01',
      characters: [
        monkeyKing(JTW_C3_PAGE1_START_CELL, [
          {
            id: C3_P2_SCRIPT_IDS.depart,
            blocks: [
              { op: 'when_flag' },
              { op: 'move_right', n: SEA_LEG },
              { op: 'goto_page', n: 2 },
            ],
          },
        ]),
        raft(C3_P2_PAGE1_RAFT_CELL, []),
      ],
    },
    {
      id: C3_P2_PAGE_IDS[1],
      background: 'jtw-s1-c3-page2-morning-before-v01',
      characters: [
        monkeyKing(JTW_C3_PAGE2_START_CELL, [
          {
            id: C3_P2_SCRIPT_IDS.wrongExit,
            blocks: [
              { op: 'when_flag' },
              { op: 'play_sound', n: JTW_C3_SEA_WIND_SOUND_ID },
              { op: 'move_right', n: SEA_LEG },
              { op: 'goto_page', n: 1 },
            ],
          },
        ]),
        // The raft carries him: same leg, same page, so his feet stay on deck.
        raft(JTW_C3_PAGE2_START_CELL, [
          {
            id: C3_P2_SCRIPT_IDS.raftCarry,
            blocks: [{ op: 'when_flag' }, { op: 'move_right', n: SEA_LEG }, { op: 'end' }],
          },
        ]),
      ],
    },
    {
      id: C3_P2_PAGE_IDS[2],
      background: 'jtw-s1-c3-page3-before-v01',
      characters: [
        monkeyKing(JTW_C3_PAGE3_START_CELL, [
          {
            id: C3_P2_SCRIPT_IDS.arrival,
            blocks: [
              { op: 'when_flag' },
              { op: 'say', text: C3_P2_ARRIVAL_CLUE },
              { op: 'end' },
            ],
          },
        ]),
        raft(JTW_C3_PAGE3_START_CELL, []),
      ],
    },
  ],
};

/** What a stable run of the shipped starter must produce (the scene's 1→2→1). */
export const C3_P2_EXPECTED_TRACE: readonly number[] = [1, 2, 3];
export const C3_P2_ACTUAL_TRACE: readonly number[] = [1, 2, 1];
/** The page whose exit sends the raft home again — the first deviation. */
export const C3_P2_DEVIATION_PAGE = 2;

// ─── 预期路线：三张页面卡 + 两张出口箭头 ─────────────────────────────────────

export const C3_P2_PAGE_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'page-1-home-shore', label: '花果山海岸', correct: true },
  { id: 'page-2-open-sea', label: '海上中段', correct: true },
  { id: 'page-3-far-forest', label: '彼岸山林', correct: true },
];
export const C3_P2_PAGE_CARD_ORDER: readonly string[] = [
  'page-1-home-shore',
  'page-2-open-sea',
  'page-3-far-forest',
];
export const C3_P2_PAGE_CARD_TITLE = '先把“应该走的路”摆出来：三张页面卡按顺序排好';

export const C3_P2_EXIT_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'exit-1-to-2', label: 'Page 1 的出口 → 2', correct: true },
  { id: 'exit-2-to-3', label: 'Page 2 的出口 → 3', correct: true },
  { id: 'exit-2-to-1', label: 'Page 2 的出口 → 1', correct: false },
  { id: 'exit-3-to-1', label: 'Page 3 的出口 → 1', correct: false },
];
export const C3_P2_EXIT_CARD_ORDER: readonly string[] = ['exit-1-to-2', 'exit-2-to-3'];
export const C3_P2_EXIT_CARD_TITLE = '再摆两张出口箭头：预期路线上的两个出口分别写几？';
export const C3_P2_EXIT_REJECT_HINT =
  '预期路线是 1 → 2 → 3：第三页是终点，它不再送木筏去别的页；把木筏送回 1 的出口正是我们要找的问题，不是计划。';

// ─── 预测（运行之前，从出口积木上的数字读出来） ──────────────────────────────

export const C3_P2_PREDICTION_QUESTION =
  '按 Go 之前再看一眼 Page 2 出口积木上的数字：木筏离开海中央以后，真的会到彼岸山林吗？';
export const C3_P2_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'predict-back-to-page-1',
    label: '不会——那块出口写着 1，木筏会被送回花果山海岸',
    correct: true,
  },
  { id: 'predict-reaches-page-3', label: '会——故事总会自己往下一页走', correct: false },
  { id: 'predict-stays-on-page-2', label: '木筏会停在海中央，哪一页都不去', correct: false },
];
export const C3_P2_PREDICTION_RETRY_HINT =
  '出口积木上的数字就是下一页的页码。Page 2 那一块写的是 1，1 是哪一页？';

// ─── 第一次偏离（只有真的跑过一次才打开） ────────────────────────────────────

export const C3_P2_DEVIATION_QUESTION =
  '对着两排脚印圈出第一次偏离：哪一页的出口第一次和“应该走的路”不一样？';
export const C3_P2_DEVIATION_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'page-1-home-shore', label: 'Page 1 花果山海岸', correct: false },
  { id: 'page-2-open-sea', label: 'Page 2 海上中段', correct: true },
  { id: 'page-3-far-forest', label: 'Page 3 彼岸山林', correct: false },
];
export const C3_P2_DEVIATION_RETRY_HINT =
  '一页一页对着看：Page 1 的出口写 2，木筏确实到了海中央，这一步没错；彼岸山林这次根本没有跑到。最早不一样的是哪一页的出口？';
export const C3_P2_RUN_FIRST_HINT =
  '先按一次 Go，把真的脚印跑出来，再来圈第一次偏离——只用眼睛猜哪一页不算证据。';

// ─── 运行区文案 ──────────────────────────────────────────────────────────────

export const C3_P2_RUN_LABEL = '▶ Go（原样运行 starter）';
export const C3_P2_RUN_AGAIN_LABEL = '再跑一次';
export const C3_P2_RUN_BUSY_LABEL = '木筏正在走…';
export const C3_P2_RUN_NOTE =
  '这个 Part 不修 starter：没有“自动修好”按钮，Page 2 的出口一个数字都不会被改。运行有教学用的有限步数，木筏不会一直在两页之间闪。';
export const C3_P2_EXPECTED_TRACE_TITLE = '预期路线';
export const C3_P2_ACTUAL_TRACE_TITLE = '实际脚印';
export const C3_P2_NEVER_REACHED_NOTE = '彼岸山林这一页这次根本没有打开。';

// ─── resolved / story_after / continue ───────────────────────────────────────

export const C3_P2_RESOLVED_WORLD_CHANGE =
  '两排脚印并排留在舞台上：上面一排是摆好的 1 → 2 → 3，下面一排是真的跑出来的 1 → 2 → 1。海中央那一页被圈了起来——它的出口写着 1，木筏还没到彼岸，就被送回了出发的海岸。';
export const C3_P2_STORY_AFTER =
  '猴王知道问题在第二页的出口，但还要用页面卡说清楚数字是怎样带路的。';
export const C3_P2_CONTINUE_LABEL = '走页面路口';

export const C3_P2_LOCKED_HINT = '先在第三章 Part 1 说清楚猴王为什么要出发，再来看三页的路。';
export const C3_P2_LOADING_HINT = '木筏正在岸边等你…';

// ─── Evidence rules — every gate below is measured, never assumed ────────────

function orderedExactly(order: readonly string[], target: readonly string[]): boolean {
  return order.length === target.length && target.every((id, index) => order[index] === id);
}

/** Did the child read both story screens? */
export function c3p2StoryRead(screens: readonly string[]): boolean {
  return C3_P2_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

/** Only 花果山海岸 → 海上中段 → 彼岸山林 passes. */
export function c3p2PageOrdered(order: readonly string[]): boolean {
  return orderedExactly(order, C3_P2_PAGE_CARD_ORDER);
}

/** Only the expected route's two exits, in route order, pass. */
export function c3p2ExitsOrdered(order: readonly string[]): boolean {
  return orderedExactly(order, C3_P2_EXIT_CARD_ORDER);
}

export function c3p2WrongExitPicked(order: readonly string[]): boolean {
  return C3_P2_EXIT_CARDS.some((card) => !card.correct && order.includes(card.id));
}

export function c3p2PredictionDone(prediction: string | null): boolean {
  return C3_P2_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
}

export function c3p2DeviationDone(deviation: string | null): boolean {
  return C3_P2_DEVIATION_OPTIONS.find((option) => option.id === deviation)?.correct === true;
}

/** Is this page trace the scene's stable `1 → 2 → 1`? */
export function c3p2TraceMatches(trace: readonly number[]): boolean {
  return orderedExactly(trace.map(String), C3_P2_ACTUAL_TRACE.map(String));
}

/**
 * Did a REAL run of the shipped starter reproduce the scene's stable loop? The
 * page trace must be 1 → 2 → 1, the run must have stopped BECAUSE the route
 * re-entered a page (not because it ran out of budget), and the page the runner
 * measured as the loop must be Page 2.
 */
export function c3p2RunReproducedLoop(run: PageFlowRunResult | null): boolean {
  if (!run) return false;
  return (
    run.stoppedBy === 'loop' &&
    run.firstLoopPage === C3_P2_DEVIATION_PAGE &&
    c3p2TraceMatches(run.trace)
  );
}

/** One page's worth of real footprints, as the child reads them on stage. */
export interface C3P2Footprint {
  /** 1-based page number. */
  page: number;
  enterCell: string;
  /** null when the page was entered but not run (the teaching loop stop). */
  exitCell: string | null;
  /** The page this exit really asked for; null when the page ended instead. */
  exitTo: number | null;
}

/** The footprints a real run left, measured off the page-flow runner. */
export function c3p2FootprintsOf(run: PageFlowRunResult | null): C3P2Footprint[] {
  if (!run) return [];
  return run.visits.map((visit) => ({
    page: visit.page,
    enterCell: visit.enterCell ?? '',
    exitCell: visit.exitCell,
    exitTo: visit.exitTo,
  }));
}

/** Footprints → the stored evidence strings (`page1:3-9->7-9:page2`). */
export function c3p2EncodeFootprints(footprints: readonly C3P2Footprint[]): string[] {
  return footprints.map((footprint) => {
    const walk = footprint.exitCell
      ? `${footprint.enterCell}->${footprint.exitCell}`
      : footprint.enterCell;
    const exit = footprint.exitTo === null ? 'stop' : `page${footprint.exitTo}`;
    return `page${footprint.page}:${walk}:${exit}`;
  });
}

const FOOTPRINT_ROW = /^page(\d+):([\w-]+)(?:->([\w-]+))?:(?:stop|page(\d+))$/;

/** Stored evidence strings → footprints. Malformed rows are dropped, not guessed. */
export function c3p2DecodeFootprints(rows: readonly string[]): C3P2Footprint[] {
  const footprints: C3P2Footprint[] = [];
  for (const row of rows) {
    const match = FOOTPRINT_ROW.exec(row);
    if (!match) continue;
    footprints.push({
      page: Number(match[1]),
      enterCell: match[2],
      exitCell: match[3] ?? null,
      exitTo: match[4] ? Number(match[4]) : null,
    });
  }
  return footprints;
}

/** Which 1-based pages a trace never opened (Page 3 in the shipped starter). */
export function c3p2PagesNeverVisited(trace: readonly number[]): number[] {
  const visited = new Set(trace);
  return C3_P2_STARTER_PROJECT.pages
    .map((_page, index) => index + 1)
    .filter((page) => !visited.has(page));
}

/** Child-facing name of a 1-based page (used by both footprint rows). */
export function c3p2PageLabel(page: number): string {
  return C3_P2_PAGE_CARDS[page - 1]?.label ?? `Page ${page}`;
}
