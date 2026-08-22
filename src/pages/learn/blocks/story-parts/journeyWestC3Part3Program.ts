// Journey to the West · C3-P3 "页面出口不是门牌装饰" — chapter three's page-model
// Part (scene-specs JTW-S1-C3-P3, teaching script C3 Part 3 · 离屏活动：页面就是路口).
//
// C3-P2 located the error. C3-P3 explains the MODEL behind it: the number on a
// page's exit block is not a door plaque, it is the address of the next page.
// The child reads Part 2's own saved footprints, says WHY the raft came home,
// names the single card that has to change, walks the loop on three floor cards,
// says the password — and only then tries the three candidate exit cards 1 / 2 /
// 3, having first predicted where each one leads.
//
// Every candidate outcome is MEASURED: tapping a card runs the C3-P2 starter with
// that ONE exit number swapped through the real `PageFlowRunner`, so
// "选择Page 1仍循环、选择Page 2停留/重入而非到达、只有Page 3满足目标" is a runtime
// fact rather than a sentence in a hint. Nothing is written back to a project:
// the candidate projects are ephemeral rehearsal copies, the shipped starter is
// never edited, and no editor is opened ("本Part记录模型理解，不直接修改starter",
// "P3不完成Code证据").
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` and `BlocksStudioPage.tsx`
// are already over it, so no chapter-three content is added to either).

import type { Block, BlocksProject, Page } from '../blocksModel';
import type { JtwEvidenceOption } from './journeyWestSeason1';
import type { PageFlowRunResult } from '../pageFlowRun';
// C3-P3 rehearses the very starter C3-P2 ships, with one exit number swapped, so
// it shares that Part's project, page labels and footprint codec rather than
// restating them.
import {
  C3_P2_SCRIPT_IDS,
  C3_P2_STARTER_PROJECT,
  c3p2PageLabel,
  type C3P2Footprint,
} from './journeyWestC3Part2Program';

export const C3_P3_LESSON_ID = 'jtw-s1-c3-p3';

/** The page the whole Part is about: 海上中段, whose exit card is wrong. */
export const C3_P3_LOOP_PAGE = 2;
/** The exit number that really reaches 彼岸山林 and ends there. */
export const C3_P3_TARGET_EXIT = 3;
/** The route a correct exit card produces, page by page. */
export const C3_P3_TARGET_TRACE: readonly number[] = [1, 2, 3];

// ─── story_before — teaching script C3 Part 3 · 离屏活动：页面就是路口 ──────────

export const C3_P3_STORY_SCREENS: readonly [string, string] = [
  'Three page cards are placed on the ground: the Flower-Fruit Mountain coast, the middle of the sea and the forest on the far shore. Place a Go To Page card at each exit, marked 1, 2 or 3. Pretend to be the raft and follow the exit numbers one page at a time.',
  "When you reach a page that you can't move on to, just stop there - that's a loop. After you stop, don't redo all three pages, just change one Goto card and go again. The password is: \"The exit number determines the next page.\"",
];
export const C3_P3_SCREEN_IDS: readonly [string, string] = [
  'part-3-floor-cards',
  'part-3-password',
];
export const C3_P3_NEXT_SCREEN_LABEL = 'Read the next paragraph';
export const C3_P3_PREV_SCREEN_LABEL = 'Go back to the previous paragraph';

/** 故事—程序桥（teaching script C3）：Page 目标把下一段接上去。 */
export const C3_P3_STORY_BRIDGE =
  'The three Pages represent the three readable stages of the journey; the actions, waits, and sounds of each page give the location content, and the Page goal connects the next paragraph. The number on the exit is not a decoration on the door plate, it is the address on the next page.';

/** 原著小卡片 — 三页是教学压缩，出口数字是课程的说法，不是原著的说法。 */
export const C3_P3_CLASSIC_CARD =
  'In the first chapter of the original work, the Monkey King traveled across the ocean for a long time to find a teacher and crossed the sea more than once. The course compresses this section of the journey into three pages; "exit numbers" is what we call it in the program. There are no pages or numbers in the original work.';

// ─── Part 2 的只读脚印（真的从服务器上取回来，不是本页编出来的） ───────────────

export const C3_P3_PART2_ID = 'jtw-s1-c3-p2';
export const C3_P3_FOOTPRINT_TITLE =
  'Part 2 The footprints that ran out (read only, will not be run again here)';
export const C3_P3_FOOTPRINT_MISSING_HINT =
  'I can’t read the footprints saved in Part 2. Please go back to Part 2 and run the starter as it is. There will be no guessing of footprints on this page.';

// ─── 第一次偏离的解释（“为什么木筏会回家”） ─────────────────────────────────

/** An evidence card that carries its own text-grounded retry hint. */
export interface C3P3Option extends JtwEvidenceOption {
  /** Shown when a child picks this wrong card — always grounded in the trace. */
  hint?: string;
}

export const C3_P3_REASON_QUESTION =
  'Explain clearly the footprints in Part 2: Why did the raft return from the middle of the sea to the coast of Flower-Fruit Mountain?';
export const C3_P3_REASON_OPTIONS: readonly C3P3Option[] = [
  {
    id: 'reason-exit-number-says-1',
    label:
      'The exit card on the page in the middle of the sea says 1. 1 is the Flower-Fruit Mountain coast. The raft followed the number and walked back.',
    correct: true,
  },
  {
    id: 'reason-raft-too-fast',
    label:
      'The raft went so fast that it rushed through the mountains and forests on the other side.',
    correct: false,
    hint: 'On the footprints, the raft went from 2-8 to 6-8 in the middle of the sea, without moving more than one square. Slowing down the speed will only mean walking the same road slower, and none of the numbers on the exit card will change.',
  },
  {
    id: 'reason-cards-out-of-order',
    label: 'Three pages stuck on the floor in the wrong order',
    correct: false,
    hint: 'The order is correct: the exit of Page 1 is written as 2, and the raft did reach the middle of the sea first. The problem comes when it leaves the middle of the ocean.',
  },
];

// ─── 只换哪一张卡（“不能重做全部页面”） ─────────────────────────────────────

export const C3_P3_SWAP_QUESTION =
  'Following the footsteps of Part 2, which card only needs to be replaced this time?';
export const C3_P3_SWAP_OPTIONS: readonly C3P3Option[] = [
  {
    id: 'swap-page-1-card',
    label: 'Replace the export card of Page 1',
    correct: false,
    hint: 'The exit of Page 1 is written as 2, and the raft has indeed reached the middle of the sea - the card is not wrong, but replacing it will destroy the right section.',
  },
  { id: 'swap-page-2-card', label: 'Only replace the export card of Page 2', correct: true },
  {
    id: 'swap-page-3-card',
    label: 'Replace the export card of Page 3',
    correct: false,
    hint: "The mountains and forests on the other side have not been opened at all this time, and there is no trace of it in the footprints. It's not my turn to change the card yet.",
  },
  {
    id: 'swap-redo-all-pages',
    label: 'Redo all three pages',
    correct: false,
    hint: "If you redo everything, you won't be able to tell which number led you to the wrong path. The footprints only point to one card.",
  },
];

// ─── 地卡演练：孩子扮木筏，沿 Page 1 → Page 2 → Page 1 走 ────────────────────

export const C3_P3_WALK_TITLE =
  'Pretend to be a raft first: press these three exit cards, where will you go page by page?';

/** A tappable card with no correctness of its own — the SEQUENCE is judged. */
export interface C3P3Card {
  id: string;
  label: string;
}

export const C3_P3_WALK_CARDS: readonly C3P3Card[] = [
  { id: 'floor-page-1', label: 'Page 1 · Flower-Fruit Mountain coast' },
  { id: 'floor-page-2', label: 'Page 2 Middle section of the sea' },
  { id: 'floor-page-3', label: 'Page 3 The mountains and forests on the other side' },
];
export const C3_P3_WALK_RESET_LABEL = 'Go again';
export const C3_P3_WALK_HINT =
  "Stop when you get to that page where you can't turn around and step back on the ground you stepped on - just take as many steps as the footprints indicate.";

/** Floor-card id of a 1-based page number (`1` → `floor-page-1`). */
export function c3p3WalkCardId(page: number): string {
  return `floor-page-${page}`;
}

/**
 * The walk a child must reproduce: Part 2's REAL saved page trace, turned into
 * floor-card ids. Reading it off the stored evidence (rather than a literal in
 * this file) is what makes the walk a re-reading of the run that really happened.
 */
export function c3p3RequiredWalk(part2Trace: readonly number[]): string[] {
  return part2Trace.map(c3p3WalkCardId);
}

export function c3p3WalkDone(walk: readonly string[], part2Trace: readonly number[]): boolean {
  const required = c3p3RequiredWalk(part2Trace);
  return (
    required.length > 0 &&
    walk.length === required.length &&
    required.every((id, index) => walk[index] === id)
  );
}

// ─── 口令 ────────────────────────────────────────────────────────────────────

export const C3_P3_PASSWORD_QUESTION =
  'After we finish walking, let’s say the password together. Which sentence is the password for this chapter?';
export const C3_P3_PASSWORD_OPTIONS: readonly C3P3Option[] = [
  { id: 'password-exit-number', label: 'Exit numbers determine the next page.', correct: true },
  {
    id: 'password-faster-is-earlier',
    label: 'The faster you go, the sooner you get to the next page.',
    correct: false,
    hint: 'Speed ​​only changes how fast the raft goes, not which page it goes to. Use acceleration to hide the loop, and the raft will still return to the Flower-Fruit Mountain coast.',
  },
  {
    id: 'password-more-cards',
    label: 'The more page cards there are, the longer the story will be.',
    correct: false,
    hint: "There are only three page cards in this chapter, and if you place a few more, they won't connect by themselves; the one that connects to the road is the number on the exit.",
  },
];

// ─── 三张候选出口卡 1 / 2 / 3，以及每一张的预测 ──────────────────────────────

export const C3_P3_PREDICT_TITLE =
  'Predict first, then act: If the exit cards in the middle of the sea are replaced by 1, 2, and 3, where will the rafts go?';
/** The three possible endings. Which one is right depends on the CARD, so the
 *  cards carry the answer (`C3P3Candidate.outcomeId`), not the outcome list. */
export const C3_P3_OUTCOME_OPTIONS: readonly C3P3Card[] = [
  {
    id: 'outcome-loop-home',
    label: 'and was sent back to the coast of Flower-Fruit Mountain, the raft still spinning.',
  },
  {
    id: 'outcome-stay-open-sea',
    label: 'Once again, I entered the middle of the sea and stopped there, unable to walk.',
  },
  {
    id: 'outcome-reach-far-forest',
    label: 'Walk all the way to the mountains and forests on the other side, and end steadily',
  },
];

/** One candidate exit card: the number on it, and where it really leads. */
export interface C3P3Candidate {
  id: string;
  /** The number printed on the card — also the page it points at. */
  exit: number;
  label: string;
  /** The outcome option a correct prediction picks. */
  outcomeId: string;
}

export const C3_P3_CANDIDATES: readonly C3P3Candidate[] = [
  {
    id: 'exit-card-1',
    exit: 1,
    label: 'Exit Card 1 · Back to Flower-Fruit Mountain Coast',
    outcomeId: 'outcome-loop-home',
  },
  {
    id: 'exit-card-2',
    exit: 2,
    label: 'Exit Card 2 · Pointing to the middle of the sea again',
    outcomeId: 'outcome-stay-open-sea',
  },
  {
    id: 'exit-card-3',
    exit: 3,
    label: 'Exit card 3 · Pointing to the mountains and forests on the other side',
    outcomeId: 'outcome-reach-far-forest',
  },
];

/** The card whose number really satisfies the chapter's goal. */
export const C3_P3_TARGET_CARD_ID = 'exit-card-3';

export const C3_P3_PREDICT_RETRY_HINT =
  'Take another look at the number on the card, it is the page number of the next page: 1 is the Flower-Fruit Mountain coast, 2 is the page itself in the middle of the sea, and 3 is the mountains and forests on the other side.';
export const C3_P3_TRY_TITLE =
  'The predictions are all filled out. Click on a card, and the raft will actually move according to the card to show you.';
export const C3_P3_TRY_LOCKED_HINT =
  "All three cards must be predicted before you can try them out - if you don't tell them what you think will happen first, the results will not be considered evidence.";
export const C3_P3_TRY_BUSY_LABEL = 'The raft is going…';
export const C3_P3_TRY_LABEL = 'try this card';
export const C3_P3_REHEARSAL_TITLE =
  'The card used for this walkthrough (the starter itself has not been changed)';
export const C3_P3_STARTER_TITLE =
  'What the Part 2 starter looks like now (this page will not change it)';
export const C3_P3_NO_EDITOR_NOTE =
  'This page does not open the building block editor, nor does it save any works: the three candidate cards are just for trial use, and the 1 on the exit of Page 2 remains intact in the starter, waiting for you to build it yourself in Part 4.';

/** Child-facing sentence for a measured candidate result. */
export function c3p3OutcomeSentence(run: PageFlowRunResult): string {
  const trace = run.trace.map((page) => `Page ${page}`).join(' → ');
  if (run.stoppedBy === 'end') {
    return `${trace}: The Raft reaches its final page and ends firmly.`;
  }
  if (run.stoppedBy === 'loop') {
    const looped = run.trace[run.trace.length - 1];
    return `${trace}: The raft steps back again ${c3p2PageLabel(looped)}, the route stops here.`;
  }
  return `${trace}: This run stopped at ${run.stoppedBy}。`;
}

// ─── 演练用的候选项目（临时副本，永远不写回 starter） ────────────────────────

/**
 * The C3-P2 starter with Page 2's ONE exit number swapped for `exitNumber`.
 *
 * A fresh copy every time: the shipped `C3_P2_STARTER_PROJECT` is never mutated,
 * so trying a card can never leave the starter "already fixed". Throws when the
 * page or its exit block is missing rather than silently rehearsing the wrong
 * program.
 */
export function c3p3CandidateProject(exitNumber: number): BlocksProject {
  const pages: Page[] = C3_P2_STARTER_PROJECT.pages.map((page, index) => {
    if (index !== C3_P3_LOOP_PAGE - 1) return page;
    return {
      ...page,
      characters: page.characters.map((character) => ({
        ...character,
        scripts: character.scripts.map((script) =>
          script.id === C3_P2_SCRIPT_IDS.wrongExit
            ? { ...script, blocks: swapExit(script.blocks, exitNumber) }
            : script,
        ),
      })),
    };
  });
  return {
    ...C3_P2_STARTER_PROJECT,
    name: `${C3_P2_STARTER_PROJECT.name} · Export card ${exitNumber}`,
    pages,
  };
}

function swapExit(blocks: readonly Block[], exitNumber: number): Block[] {
  if (!blocks.some((block) => block.op === 'goto_page')) {
    throw new Error('journeyWestC3Part3Program: the Page 2 script has no goto_page exit to swap');
  }
  return blocks.map((block) => (block.op === 'goto_page' ? { ...block, n: exitNumber } : block));
}

// ─── 完成判定 ────────────────────────────────────────────────────────────────

function pickedCorrect(options: readonly JtwEvidenceOption[], picked: string | null): boolean {
  return options.find((option) => option.id === picked)?.correct === true;
}

export function c3p3StoryRead(screens: readonly string[]): boolean {
  return C3_P3_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

export function c3p3ReasonDone(reason: string | null): boolean {
  return pickedCorrect(C3_P3_REASON_OPTIONS, reason);
}

export function c3p3SwapDone(swap: string | null): boolean {
  return pickedCorrect(C3_P3_SWAP_OPTIONS, swap);
}

export function c3p3PasswordDone(password: string | null): boolean {
  return pickedCorrect(C3_P3_PASSWORD_OPTIONS, password);
}

/** The retry hint a wrong card carries, if it carries one. */
export function c3p3HintFor(
  options: readonly C3P3Option[],
  picked: string | null,
): string | undefined {
  return options.find((option) => option.id === picked && !option.correct)?.hint;
}

/** Every candidate has an answer — the gate that opens the try buttons. */
export function c3p3PredictionsAnswered(predictions: Readonly<Record<string, string>>): boolean {
  return C3_P3_CANDIDATES.every((candidate) => Boolean(predictions[candidate.id]));
}

/** Every candidate's predicted outcome is the one it really produces. */
export function c3p3PredictionsCorrect(predictions: Readonly<Record<string, string>>): boolean {
  return C3_P3_CANDIDATES.every((candidate) => predictions[candidate.id] === candidate.outcomeId);
}

/** Predictions → stored evidence rows (`exit-card-1:outcome-loop-home`). */
export function c3p3EncodePredictions(predictions: Readonly<Record<string, string>>): string[] {
  return C3_P3_CANDIDATES.filter((candidate) => predictions[candidate.id]).map(
    (candidate) => `${candidate.id}:${predictions[candidate.id]}`,
  );
}

const PREDICTION_ROW = /^([\w-]+):([\w-]+)$/;

/** Stored evidence rows → predictions. Malformed rows are dropped, not guessed. */
export function c3p3DecodePredictions(rows: readonly string[]): Record<string, string> {
  const predictions: Record<string, string> = {};
  for (const row of rows) {
    const match = PREDICTION_ROW.exec(row);
    if (!match) continue;
    if (!C3_P3_CANDIDATES.some((candidate) => candidate.id === match[1])) continue;
    predictions[match[1]] = match[2];
  }
  return predictions;
}

/**
 * Did the chosen card really carry the raft 1 → 2 → 3 and END there? Measured
 * off the page-flow runner: the route must reach the far forest and stop because
 * the last page ended, never because it looped or ran out of teaching budget.
 */
export function c3p3RehearsalReached(run: PageFlowRunResult | null): boolean {
  if (!run) return false;
  return run.stoppedBy === 'end' && c3p3TraceReached(run.trace);
}

/** Is this page trace the chapter's goal route, `1 → 2 → 3`? Used to re-read a
 *  rehearsal restored from stored evidence, where no runner result survives. */
export function c3p3TraceReached(trace: readonly number[]): boolean {
  return (
    trace.length === C3_P3_TARGET_TRACE.length &&
    C3_P3_TARGET_TRACE.every((page, index) => trace[index] === page)
  );
}

/** Footprints of a candidate run, in the shape C3-P2 already stores them in. */
export function c3p3FootprintsOf(run: PageFlowRunResult | null): C3P2Footprint[] {
  if (!run) return [];
  return run.visits.map((visit) => ({
    page: visit.page,
    enterCell: visit.enterCell ?? '',
    exitCell: visit.exitCell,
    exitTo: visit.exitTo,
  }));
}

// ─── resolved / story_after / continue ───────────────────────────────────────

export const C3_P3_CONNECTED_LABEL =
  'Page 2 Exit → 3 · Leading to the mountains and forests on the other side';
export const C3_P3_FADED_LABEL = 'Page 2 Exit → 1 · Back to Flower-Fruit Mountain Coast';
export const C3_P3_RESOLVED_WORLD_CHANGE =
  'Exit card 3 is connected with the mountains and forests on the other side: after the raft left the middle of the sea, it really stepped on the shoal on the other side for the first time. The arrow that sent him home faded away and remained on the ground as a reminder.';
export const C3_P3_STORY_AFTER =
  'The intersection has been found, but no story has happened in the middle of the sea; the next step must be to build Page 2 yourself.';
export const C3_P3_CONTINUE_LABEL = 'Take a sea story';

export const C3_P3_LOCKED_HINT =
  'First, in Chapter 3, Part 2, run the starter as it is, circle the page in the middle of the sea, and then change the exit card.';
export const C3_P3_LOADING_HINT = 'Three page cards are being laid out on the floor...';
