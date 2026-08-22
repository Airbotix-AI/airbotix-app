// Journey to the West · C3-P6 "木筏跳了位置" — chapter three's Fix (scene-specs
// JTW-S1-C3-P6, teaching script C3 Part 6 · Story Screen 6).
//
// C3-P5 finished the route: three pages, the child's own weather, exits that all
// point the right way. And yet the picture breaks — the raft leaves Page 1 from
// the right and turns up on Page 2 from the right AGAIN, because Page 2's start
// cell ships as `16/8` instead of `2/8`.
//
// This module holds everything the Part page judges: the two story screens, the
// expectation the child states BEFORE the buggy run, the first-discontinuity
// pick, the minimal-fix choice, the peer's picture-only continuity reading and
// the copy around both real runs. The program contract itself — the shipped bug,
// the one legal repair and the continuity measurement — lives in
// `../jtwC3JumpFix`, because the studio needs it too.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` and `BlocksStudioPage.tsx`
// are already over it, so no chapter-three content is added to either).

import type { JtwEvidenceOption } from './journeyWestSeason1';
import {
  JTW_C3_P6_TARGET_START_CELL,
  JTW_C3_P6_WRONG_START_CELL,
  jtwC3CellLabel,
} from '../jtwC3JumpFix';
import { JTW_C3_FAR_SHORE_PAGE, JTW_C3_SEA_PAGE } from '../jtwC3SeaBuild';

export const C3_P6_LESSON_ID = 'jtw-s1-c3-p6';
export const C3_P6_PART_ID = 'jtw-s1-c3-p6';
export const C3_P6_PREV_PART_ID = 'jtw-s1-c3-p5';
export const C3_P6_NEXT_PART_ID = 'jtw-s1-c3-p7';
export const C3_P6_PROJECT_TITLE = 'Journey to the West · Raft jumped position';

/** How many recent projects the part page scans for the child's repair. */
export const C3_P6_RECENT_PROJECTS_TO_SCAN = 8;

/** The route both the buggy and the repaired run still walk. */
export const C3_P6_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

/** The boundary the shipped bug always breaks — Page 1 → Page 2. */
export const C3_P6_BREAK_BOUNDARY = { from: 1, to: JTW_C3_SEA_PAGE } as const;

// ─── story_before — teaching script C3 Part 6, IN FULL, two screens ──────────

export const C3_P6_STORY_SCREENS: readonly [string, string] = [
  'Three pages are set up: Flower-Fruit Mountain The coast sends him off, in the middle of the sea is the sea you chose and the expression you connected, and the mountains and forests on the other side end steadily. The exits are all correct, and the raft has indeed gone through 1 → 2 → 3. But after reading the three pages in a row, the picture is still strange: he clearly crossed out from the right side of the first page, and when he turned to the second page, he appeared on the right again - as if someone had picked up the raft and put it on the other side of the sea.',
  'There is an invisible line in the story: he keeps walking to the right, so where the previous page left, the next page should come in from a place further to the left, so that the audience can read "he is continuing on." What was broken this time was not the building blocks, nor the exit numbers—it was the starting grid on the page in the middle of the sea. There is only one thing you have to do: find the first discontinuity, drag the starting point of Page 2 back to the left of the sea, and leave the other squares untouched.',
];
export const C3_P6_SCREEN_IDS: readonly [string, string] = [
  'part-6-the-raft-jumped',
  'part-6-the-invisible-line',
];
export const C3_P6_NEXT_SCREEN_LABEL = 'Read the next paragraph';
export const C3_P6_PREV_SCREEN_LABEL = 'Go back to the previous paragraph';

/** 原著小卡片 — the compression this chapter keeps repeating out loud. */
export const C3_P6_CLASSIC_CARD =
  "In the first chapter of the original book, the Monkey King's journey across the ocean to seek his master was a continuous journey: he started from Flower-Fruit Mountain and went all the way to the master's gate, without anyone moving him around in the middle. The three pages are just our way of telling this section of the road; the continuous direction is something that exists in the original book.";

export const C3_P6_STORY_BRIDGE =
  'The building blocks determine what happens on this page, the exit number determines which page to turn to next, and the starting grid determines where he appears on the next page. Each of the three things is responsible for one section: this time the building blocks and the exit are both correct, and the third thing - the starting point - is wrong.';

export function c3p6StoryRead(screens: readonly string[]): boolean {
  return C3_P6_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

// ─── ①预期：先说"应该怎样"，再运行错误版 ────────────────────────────────────

export const C3_P6_EXPECT_TITLE =
  'Let’s talk about expectations first (not running yet): When crossing two pages, from which side should the raft enter the next page?';
export const C3_P6_EXPECT_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'expect-left-entry',
    label:
      'After leaving the right side of the previous page, he should enter from the left side of the next page - he kept walking to the right until the road connected.',
    correct: true,
  },
  {
    id: 'expect-same-side',
    label:
      'If you leave on the right, continue on the right on the next page - the position should be the same',
    correct: false,
  },
  {
    id: 'expect-anywhere',
    label: 'Either way is fine, anyway, the next page will arrange where he stands.',
    correct: false,
  },
];
export const C3_P6_EXPECT_RETRY_HINT =
  "Think again of the invisible line: He's been walking to the right this entire time. If the next page placed him on the right, he would have to go back to continue—the audience would think he had been moved over.";

export function c3p6ExpectationStated(answer: string | null): boolean {
  return C3_P6_EXPECT_OPTIONS.find((option) => option.id === answer)?.correct === true;
}

// ─── ②错误版运行 ────────────────────────────────────────────────────────────

export const C3_P6_BUG_RUN_TITLE =
  'Run the error version as it is and see where the screen breaks for the first time.';
export const C3_P6_BUG_RUN_NOTE = `This version is the one waiting for you in the workspace, and not a word has been changed: the exit is correct, the expression you received in Part 5 has not been changed, and the raft has still completed 1 → 2 → 3. Please pay attention to where he is standing at the beginning of each page - the starting point of Page 2 is ${jtwC3CellLabel(
  JTW_C3_P6_WRONG_START_CELL,
)},no ${jtwC3CellLabel(JTW_C3_P6_TARGET_START_CELL)}。`;
export const C3_P6_BUG_RUN_LABEL = '▶ Run the wrong version once';
export const C3_P6_BUG_RUN_AGAIN_LABEL = 'Run the wrong version again';
export const C3_P6_BUG_RUN_BUSY_LABEL = 'The raft is going…';
export const C3_P6_BUG_RUN_LOCKED_HINT =
  'Say what you expect first, and then run it—otherwise everything will look right.';

export const C3_P6_BOUNDARY_TITLE =
  'Every cross-page: where does he leave and where does he appear?';

// ─── ③第一次不连续（只有真的跑过错误版才打开） ──────────────────────────────

export const C3_P6_BREAK_QUESTION =
  'Talking to the footprints above: When did the picture become discontinuous for the first time, when did it cross the page?';
export const C3_P6_BREAK_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'break-page1-to-page2',
    label:
      'Page 1 → Page 2: He left on the right side of the coast of Flower-Fruit Mountain, but appeared again on the right side of the middle of the sea',
    correct: true,
  },
  {
    id: 'break-page2-to-page3',
    label:
      'Page 2 → Page 3: That time from the middle of the sea to the mountains and forests on the other side',
    correct: false,
  },
  {
    id: 'break-inside-page1',
    label: 'It breaks before it even crosses the page. Something is wrong in Page 1.',
    correct: false,
  },
];
export const C3_P6_BREAK_RETRY_HINT =
  'Look at each frame: Page 1 He walked from 3-9 to 7-9 without jumping on this page; Page 2 → Page 3 That time, he also left from the right and entered from the left. What was the first time something went wrong?';
export const C3_P6_BREAK_RUN_FIRST_HINT =
  'Really run through the wrong page first, and then circle it once the footprints are out - just guessing which page with your eyes is not considered evidence.';

export function c3p6BreakFound(answer: string | null): boolean {
  return C3_P6_BREAK_OPTIONS.find((option) => option.id === answer)?.correct === true;
}

// ─── ④最小修复：改哪一处？ ──────────────────────────────────────────────────

export const C3_P6_FIX_QUESTION =
  'The screen can be connected in both places. Which one is the smallest fix?';
export const C3_P6_FIX_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'fix-page2-start',
    label: `Change the starting point (Home): Drag the raft back with the Monkey King ${jtwC3CellLabel(
      JTW_C3_P6_TARGET_START_CELL,
    )}, continue from the left in the center of the sea.`,
    correct: true,
  },
  {
    id: 'fix-page1-exit',
    label:
      'Change the exit position of Page 1: let him not go so far, stop on the left and then leave.',
    correct: false,
  },
];
export const C3_P6_FIX_RETRY_HINT =
  "Changing Page 1's exit position changes two things: how far he walked on the first page, and the story itself on the first page (he had to walk to the shore to get on the raft). And the starting point of the next page is still wrong - he still appears on the right. Just change the starting point of Page 2, one place is enough.";

export function c3p6FixChosen(answer: string | null): boolean {
  return C3_P6_FIX_OPTIONS.find((option) => option.id === answer)?.correct === true;
}

// ─── ⑤工作区文案（真实拖动，不是按钮） ──────────────────────────────────────

export const C3_P6_BUILD_TITLE =
  'Go to the real workspace and drag the starting point of Page 2 back';
export const C3_P6_BUILD_NOTE = `The workspace is the sea you selected in Part 5 and the expression chain you connected - don't move any of them. Turn to Page 2 and drag the raft and the Monkey King standing on the raft to the left side of the sea. ${jtwC3CellLabel(
  JTW_C3_P6_TARGET_START_CELL,
)} grid (it will be sucked to the grid when you let go), then press Go to run once and save. Don't change the Page 1 exit, don't delete the expression blocks, and don't add a louder sound.`;
export const C3_P6_OPEN_STUDIO_NEW = 'Open this edition and go to the starting point →';
export const C3_P6_OPEN_STUDIO_RESUME = 'Continue to repair →';
export const C3_P6_OPEN_STUDIO_DONE = 'Look at the repaired page again';
export const C3_P6_OPEN_STUDIO_BUSY = 'Preparing this edition…';
export const C3_P6_OPEN_STUDIO_LOCKED =
  'First make it clear what you want to change, and then open the workspace.';
export const C3_P6_CREATE_ERROR = 'Failed to open workspace, please try again.';
export const C3_P6_BUILD_DONE_LABEL =
  '✓ The starting point of Page 2 has been dragged back and actually run in the workspace';
export const C3_P6_BUILD_PENDING_LABEL =
  'The starting point has not yet fallen exactly on the calibration grid, or Go has not been pressed in the workspace and saved. As long as there is a second change, this version is not considered fixed.';
export const C3_P6_DIFF_TITLE = 'The location of your actual changes (read from the saved work)';
export const C3_P6_DIFF_EMPTY = 'No positions have been changed yet.';
export const C3_P6_DIFF_NOTE =
  'There is only one line - this is a "single position diff": the starting grid is changed, but the blocks, exits, dimensions and two other pages remain the same.';

/** The version could not be read back off C3-P5's row — do not guess one. */
export const C3_P6_NO_VERSION_HINT =
  'I can’t read the sea you chose in Part 5, so I don’t dare to guess a version for you here. Please go back to Part 5 to complete that lesson first, and then come back to fix this jump.';

// ─── ⑥修复版运行（真实跨页） ────────────────────────────────────────────────

export const C3_P6_RUN_TITLE =
  'Run again from Page 1 and see that the boundaries of the three pages are connected in a line.';
export const C3_P6_RUN_NOTE =
  'Go in the workspace only runs one page at a time. Here, use the same interpreter to run your saved works from Page 1 to page. What is measured is each cross-page: where does it leave, where does it appear, and whether the direction line is broken.';
export const C3_P6_RUN_LABEL = '▶ Run the repaired version from Page 1';
export const C3_P6_RUN_AGAIN_LABEL = 'run again';
export const C3_P6_RUN_BUSY_LABEL = 'The raft is going…';
export const C3_P6_RUN_LOCKED_HINT =
  'Before you can run this repaired route, drag the starting point back to the calibration grid in the workspace and save it.';
export const C3_P6_BUG_TRACE_TITLE = 'Wrong version of the spread';
export const C3_P6_FIXED_TRACE_TITLE = 'Repaired spread';
export const C3_P6_TRACE_MISMATCH_HINT =
  'This time it didn’t go from 1 → 2 → 3, or there was a broken page. Go back to the workspace and check the starting grid of Page 2 and the number on 📄 Page, and run again.';

// ─── ⑦同伴只看画面：他从哪里来，往哪里去 ────────────────────────────────────

export interface C3P6PeerRow {
  id: string;
  question: string;
  options: readonly JtwEvidenceOption[];
  hint: string;
}

export const C3_P6_PEER_TITLE =
  "Show the completed work to your companions. He didn't look at the bricks, only the picture, and answered two sentences:";
export const C3_P6_PEER_ROWS: readonly C3P6PeerRow[] = [
  {
    id: 'from',
    question: '① Where did the raft come from?',
    options: [
      {
        id: 'from-left-shore',
        label: 'Coming in from the left - the shore with the peach trees on the previous page',
        correct: true,
      },
      {
        id: 'from-right',
        label: 'Coming out from the right, you can’t tell where the previous page is.',
        correct: false,
      },
      { id: 'from-nowhere', label: 'It was already there, there was no "coming"', correct: false },
    ],
    hint: 'Take another look at the space where the page just opened: On which side of the ocean is he standing? Compare it with the frame he left on the previous page.',
  },
  {
    id: 'to',
    question: '② Where will he go next?',
    options: [
      {
        id: 'to-right-far-shore',
        label: 'Continue to the right and go to the forest on the other side',
        correct: true,
      },
      {
        id: 'to-back-home',
        label: 'Turn left and go back to Flower-Fruit Mountain',
        correct: false,
      },
      { id: 'to-stay', label: 'Stop in the middle of the sea, not going anywhere', correct: false },
    ],
    hint: 'Look at the direction he goes and which page the page ends up giving him - the number on the exit is always 3 this time.',
  },
];

export function c3p6PeerAnswered(picks: Readonly<Record<string, string>>): boolean {
  return C3_P6_PEER_ROWS.every((row) => Boolean(picks[row.id]));
}

export function c3p6PeerCorrect(picks: Readonly<Record<string, string>>): boolean {
  return C3_P6_PEER_ROWS.every(
    (row) => row.options.find((option) => option.id === picks[row.id])?.correct === true,
  );
}

/** Peer answers → stored evidence rows (`from:from-left-shore`). */
export function c3p6EncodePeer(picks: Readonly<Record<string, string>>): string[] {
  return C3_P6_PEER_ROWS.filter((row) => picks[row.id]).map((row) => `${row.id}:${picks[row.id]}`);
}

const PEER_ROW = /^([\w-]+):([\w-]+)$/;

/** Stored evidence rows → peer answers. Malformed rows are dropped, not guessed. */
export function c3p6DecodePeer(rows: readonly string[]): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const row of rows) {
    const match = PEER_ROW.exec(row);
    if (!match) continue;
    if (!C3_P6_PEER_ROWS.some((known) => known.id === match[1])) continue;
    picks[match[1]] = match[2];
  }
  return picks;
}

// ─── resolved / story_after / continue ──────────────────────────────────────

export const C3_P6_RESOLVED_TITLE =
  'The borders of the three pages are connected into an unbroken direction line.';
export const C3_P6_RESOLVED_WORLD_CHANGE =
  'Now look at it from the beginning: He paddles out to the right of the Flower-Fruit Mountain coast, catch him on the left in the middle of the sea, and then leaves on the right after crossing the sea you chose, and catch him on the left of the mountains and forests on the other side. There is no break at any of the three boundaries - the audience can tell that this is a path taken by one person, not three separate paintings.';
/**
 * 远行印 is C3-P8's server-side aggregation (C3共享实现合同：P1–P8 全部完成才允许
 * 点亮). The scene's own `resolved_world_change` line says the seal lights here,
 * but its assertions in the same section say "P6不完成Chapter" — so the Part
 * says out loud what is really true instead of drawing a seal it cannot earn.
 */
export const C3_P6_SEAL_NOTE =
  'The travel seal has not been lit yet: it will be lit by the server after all eight parts of Chapter 3 are completed and the evidence is available. This repaired place is the last unexplainable place on this route.';
export const C3_P6_STORY_AFTER =
  'The public road has been repaired. The next step is for him to create his own three-page path to seeking education - one that can be saved, closed, reopened, and run over again.';
export const C3_P6_CONTINUE_LABEL = 'Create my path to becoming a teacher';

export const C3_P6_LOCKED_HINT =
  'First select the sea in Chapter 3, Part 5, connect the expression, and then find this jump position.';
export const C3_P6_LOADING_HINT = 'The raft is waiting for you at sea...';
