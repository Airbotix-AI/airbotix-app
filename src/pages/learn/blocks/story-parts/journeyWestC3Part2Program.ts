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
  "The search in the original book took a long time, different places and more than one sea crossing. The course compresses this long journey into three story pages: leaving Flower-Fruit Mountain, passing through the sea and the world, and arriving at the mountain where the teacher's gate is located. Three pages is a way of telling a story, not that the original work only has three real seas.",
  'The starters are Page 1→2, Page 2→1, and Page 3 divisions. Arrange expected 1→2→3 first, then Go. After running the footprint remains actual 1→2→1. Page 2 of the first deviation from the circle of children.',
];
export const C3_P2_SCREEN_IDS: readonly [string, string] = ['story-card-c', 'part-2-hook'];
export const C3_P2_NEXT_SCREEN_LABEL = 'Read the next paragraph';
export const C3_P2_PREV_SCREEN_LABEL = 'Go back to the previous paragraph';

/** Classic Card — 三页是教学压缩，不是原著只有三片海。 */
export const C3_P2_CLASSIC_CARD =
  'In the first chapter of the original work, the Monkey King traveled across the ocean to seek guidance for a long time, crossing seas, visiting the world, and crossing seas again. The course uses three pages to explain this journey clearly; this is a way of telling a story, not that the original work only has three days and three seas.';

/** 故事—程序桥（teaching script C3）：出口数字把下一段接上去。 */
export const C3_P2_STORY_BRIDGE =
  'The three Pages represent the three readable stages of the journey; the actions, waits and sounds of each page give this location content, and the numbers on the page exit connect the next paragraph. When the numbers are written incorrectly, the program can still run, but the story cannot continue.';

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
export const C3_P2_ARRIVAL_CLUE = "I hear singing in the forest. I'll follow it.";

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
            blocks: [{ op: 'when_flag' }, { op: 'say', text: C3_P2_ARRIVAL_CLUE }, { op: 'end' }],
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
  { id: 'page-1-home-shore', label: 'Flower-Fruit Mountain coast', correct: true },
  { id: 'page-2-open-sea', label: 'middle section of sea', correct: true },
  { id: 'page-3-far-forest', label: 'The mountains and forests on the other side', correct: true },
];
export const C3_P2_PAGE_CARD_ORDER: readonly string[] = [
  'page-1-home-shore',
  'page-2-open-sea',
  'page-3-far-forest',
];
export const C3_P2_PAGE_CARD_TITLE =
  'First lay out the “path you should take”: arrange the three page cards in order';

export const C3_P2_EXIT_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'exit-1-to-2', label: 'Page 1 Exit → 2', correct: true },
  { id: 'exit-2-to-3', label: 'Page 2 Exit → 3', correct: true },
  { id: 'exit-2-to-1', label: 'Page 2 Exit → 1', correct: false },
  { id: 'exit-3-to-1', label: 'Page 3 Exit → 1', correct: false },
];
export const C3_P2_EXIT_CARD_ORDER: readonly string[] = ['exit-1-to-2', 'exit-2-to-3'];
export const C3_P2_EXIT_CARD_TITLE =
  'Place two more exit arrows: How many are the two exits on the expected route?';
export const C3_P2_EXIT_REJECT_HINT =
  'The expected route is 1 → 2 → 3: the third page is the end point, and it no longer sends the raft to other pages; sending the raft back to the exit of 1 is the problem we are looking for, not the plan.';

// ─── 预测（运行之前，从出口积木上的数字读出来） ──────────────────────────────

export const C3_P2_PREDICTION_QUESTION =
  'Take another look before pressing Go Page 2 Numbers on the exit blocks: After the raft leaves the middle of the sea, will it really reach the mountains and forests on the other side?';
export const C3_P2_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'predict-back-to-page-1',
    label: 'No - the exit says 1 and the raft will be sent back to the Flower-Fruit Mountain coast',
    correct: true,
  },
  {
    id: 'predict-reaches-page-3',
    label: 'Yes - the story will always move on to the next page by itself',
    correct: false,
  },
  {
    id: 'predict-stays-on-page-2',
    label: 'The raft will stop in the middle of the sea and will not go to any page',
    correct: false,
  },
];
export const C3_P2_PREDICTION_RETRY_HINT =
  'The number on the exit block is the page number of the next page. Page 2 That block says 1. Which page is 1 on?';

// ─── 第一次偏离（只有真的跑过一次才打开） ────────────────────────────────────

export const C3_P2_DEVIATION_QUESTION =
  'Circle the first deviation between the two rows of footprints: Which page\'s exit is different from the "supposed path" for the first time?';
export const C3_P2_DEVIATION_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'page-1-home-shore', label: 'Page 1 · Flower-Fruit Mountain coast', correct: false },
  { id: 'page-2-open-sea', label: 'Page 2 Middle section of the sea', correct: true },
  {
    id: 'page-3-far-forest',
    label: 'Page 3 The mountains and forests on the other side',
    correct: false,
  },
];
export const C3_P2_DEVIATION_RETRY_HINT =
  "Look at each page: write 2 on the exit of Page 1. The raft has indeed reached the middle of the sea. This step is correct; the mountains and forests on the other side have not reached it at all this time. Which page's exit is the first to be different?";
export const C3_P2_RUN_FIRST_HINT =
  'Press Go once to run out the real footprints, and then circle the first deviation - just guessing which page with your eyes does not count as evidence.';

// ─── 运行区文案 ──────────────────────────────────────────────────────────────

export const C3_P2_RUN_LABEL = '▶ Go (run starter as is)';
export const C3_P2_RUN_AGAIN_LABEL = 'run again';
export const C3_P2_RUN_BUSY_LABEL = 'The raft is going…';
export const C3_P2_RUN_NOTE =
  'This Part is not a repair starter: there is no "auto-repair" button, and not a single number on the exit of Page 2 will be changed. Running a limited number of steps for teaching purposes, the raft will not always flash between pages.';
export const C3_P2_EXPECTED_TRACE_TITLE = 'intended route';
export const C3_P2_ACTUAL_TRACE_TITLE = 'actual footprints';
export const C3_P2_NEVER_REACHED_NOTE =
  'The page of Mountain Forest on the Other Side was not opened at all this time.';

// ─── resolved / story_after / continue ───────────────────────────────────────

export const C3_P2_RESOLVED_WORLD_CHANGE =
  'Two rows of footprints are left side by side on the stage: the upper row is arranged 1 → 2 → 3, and the lower row is the real ones 1 → 2 → 1. The page in the middle of the sea was circled - its exit was written 1, and the raft was sent back to the shore from which it started before it reached the other shore.';
export const C3_P2_STORY_AFTER =
  'The Monkey King knows that the question is at the exit on the second page, but he still needs to use page cards to explain how the numbers lead the way.';
export const C3_P2_CONTINUE_LABEL = 'Take the page intersection';

export const C3_P2_LOCKED_HINT =
  'First, let’s explain clearly why the Monkey King set out in Chapter 3, Part 1, and then look at the journey on the third page.';
export const C3_P2_LOADING_HINT = 'The raft is waiting for you on the shore...';

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
