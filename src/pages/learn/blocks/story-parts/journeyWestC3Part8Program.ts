// Journey to the West · C3-P8 "到达不是学会，而是准备开始" — chapter three's
// Retell and the server-side chapter aggregation (scene-specs JTW-S1-C3-P8,
// teaching script C3 故事卡D + Part 8).
//
// This Part ships NO starter of its own. It reopens the C3-P7 Personal Ship the
// child really saved and walks it from Page 1 to Page 3's End through the real
// `PageFlowRunner`, so the scene's "不得另载答案项目" is structural: there is no
// template this page could create. The child then orders the chapter's five
// cause cards, retells it with 因为—所以—结果—后来, and names ONE 文字动机证据
// and ONE 程序/运行证据 — and the program one is only accepted when the run that
// just happened really produced it. 远行印 is lit by the SERVER's aggregation
// over the stored C3 evidence rows; a page boolean can never light it.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` and `BlocksStudioPage.tsx`
// are already over it, so no chapter-three content is added to either).

import { jtwC3JumpBoundaries, jtwC3JumpBoundariesContinuous } from '../jtwC3JumpFix';
import type { JtwC3RouteDesign } from '../jtwC3PersonalRoute';
import { JTW_C3_FAR_SHORE_PAGE, JTW_C3_SEA_PAGE } from '../jtwC3SeaBuild';
import type { PageFlowRunResult } from '../pageFlowRun';
import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C3_P8_PART_ID = 'jtw-s1-c3-p8';
export const C3_P8_NEXT_PART_ID = 'jtw-s1-c4-p1';
/** Where a child with no saved Personal Ship is sent back to. */
export const C3_P8_PREV_PART_PATH = '/learn/story/journey-west/jtw-s1-c3-p7';

/** The route the saved work has to walk before anything else opens. */
export const C3_P8_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

// ─── story_before — teaching script C3 故事卡D + Part 8, IN FULL ─────────────

export const C3_P8_STORY_BEFORE: readonly [string, string] = [
  "The starry night, morning fog and sea breeze kept changing, but the raft could not always return to the departure page. The Monkey King checked each page exit, and finally went from Page 1 to 2, and then from 2 to 3. There was singing in the mountains and forests. He followed the clues and came to the teacher's door, where he waited quietly.",
  "Arriving is not the same as learning. He found the door and built the road correctly, but he had not yet learned the skills, and the team to learn the scriptures had not yet appeared. Now it's your turn to tell this chapter back: first arrange the five cause and effect cards in the order of occurrence, then run the work you saved in Part 7, and then explain clearly why he set out (evidence in the text), and what in the program proves that this path really works.",
];

/** 原著卡（教学脚本 Classic Card｜漂洋求师）。 */
export const C3_P8_CLASSIC_CARD =
  'In the first chapter of the original work, the Monkey King thought about the impermanence of life and traveled far to seek his teacher. He crossed the sea, visited the world, and then crossed the sea again. It took many years to find his teacher. A young copywriter can say "he wants to learn how to live more wisely", but he cannot change the motivation to treasure hunting or learning.';

/** 出发时说过的那两句话——这一章要核对的，正是它们。 */
export const C3_P8_DIALOGUE_INTRO =
  'At the beginning of the third chapter, Kishibe said two sentences. Now look at them together with your program, and you will know whether this process has been explained clearly:';
export const C3_P8_DIALOGUE_MONKEYS = 'You have to go a long way, will you come back?';
export const C3_P8_DIALOGUE_MONKEY_KING =
  'I will learn more first and then tell you about my experience.';
/** 伏笔对白（教学脚本 C3 Part 8）：门里的第一句话属于第四章。 */
export const C3_P8_MASTER_LINE = 'You have come a long way. Start by getting to know yourself.';

// ─── 五张因果卡 ─────────────────────────────────────────────────────────────

/** scene-specs: 为什么离开 → 伙伴造筏 → Page 2出口错误 → 修复顺序与位置 → 到达师门 */
export const C3_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'why-leave', label: '🏝Why left?', correct: true },
  { id: 'friends-build-raft', label: '🛶 Build a raft with partners', correct: true },
  { id: 'page2-exit-wrong', label: '↩️ Page 2 Export Error', correct: true },
  { id: 'fix-order-and-position', label: '🔧 Repair order and location', correct: true },
  { id: 'arrive-at-gate', label: '⛩ Arrive at the division gate', correct: true },
];
export const C3_P8_CAUSE_CARD_ORDER: readonly string[] = [
  'why-leave',
  'friends-build-raft',
  'page2-exit-wrong',
  'fix-order-and-position',
  'arrive-at-gate',
];
export const C3_P8_CAUSE_CARD_TITLE =
  '① Before running: Arrange the five cause and effect cards in this chapter in order';
export const C3_P8_RUN_GATE_HINT =
  'First arrange the five causal cards above, and then run the work you saved in Part 7.';

/** Did the child put all five cause cards in the story's own order? */
export function c3p8CardsOrdered(order: readonly string[]): boolean {
  return (
    order.length === C3_P8_CAUSE_CARD_ORDER.length &&
    C3_P8_CAUSE_CARD_ORDER.every((id, index) => order[index] === id)
  );
}

// ─── ②运行 Part 7 真实保存的作品 ────────────────────────────────────────────

export const C3_P8_RUN_TITLE = '② Completely run the seeking path you saved in Part 7';
export const C3_P8_RUN_NOTE =
  'What is opened here is the one you saved. There is no other "standard answer" that can be loaded. The same interpreter runs it from Page 1 page to page, measuring the real trajectory, the footprints of each page, and the continuity of each page cross.';
export const C3_P8_RUN_LABEL = '▶ Run from Page 1 to the End of Page 3';
export const C3_P8_RUN_AGAIN_LABEL = 'run again';
export const C3_P8_RUN_BUSY_LABEL = 'The raft is going…';
export const C3_P8_RUN_TRACE_TITLE = 'I really walked through the three pages this time';
export const C3_P8_BOUNDARY_TITLE =
  'Every cross-page: where does he leave and where does he appear?';
export const C3_P8_TRACE_MISMATCH_HINT =
  'This time it didn’t go from 1 → 2 → 3, or the last page didn’t end firmly, or there was a cross-page break. Go back to Part 7, open the workspace, check the two exit numbers, the starting point of Page 2 and the last End, and come back and run again.';
export const C3_P8_WORK_MISSING =
  'The three-page guide you saved in Part 7 is not found, or it is no longer valid. This page will not load another work for you.';
export const C3_P8_WORK_MISSING_LINK =
  'Go back to Part 7, open the workspace, and confirm that it has been saved →';
export const C3_P8_DESIGN_TITLE =
  'The three pages you saved (read from the work, not guessed by the page)';

/** Did the run really walk `1 → 2 → 3`? */
export function c3p8TraceReached(trace: readonly number[]): boolean {
  return (
    trace.length === C3_P8_TARGET_TRACE.length &&
    C3_P8_TARGET_TRACE.every((page, index) => trace[index] === page)
  );
}

// ─── ③Retell：因为—所以—结果—后来 ───────────────────────────────────────────

export const C3_P8_RETELL_QUESTION =
  '③ Let’s talk about Chapter 3 again: use “because-so-result-later” to connect the character’s choice and the evidence of the procedure.';
export const C3_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-motive-and-program',
    label:
      "Because Flower-Fruit Mountain was very happy, but the Monkey King still had many things he didn’t understand and wanted to find a master who could teach him, so his friends helped him build a raft and he set off from the shore. As a result, the exit on Page 2 sent the raft back to Flower-Fruit Mountain for the first time. He changed the exit number to the right and took the starting point of the next page back to the side where he left; later, the three pages actually pressed 1 → 2 → 3 After getting through, he put away the raft in front of the teacher's gate and waited quietly - he hadn't entered the gate yet, and he hadn't learned his skills yet.",
    correct: true,
  },
  {
    id: 'block-names-only',
    label: 'Whoosh, Move Right, Wait, Page, End - read the names of the building blocks in order',
    correct: false,
  },
  {
    id: 'result-without-cause',
    label: "The Monkey King arrived at the master's gate on a raft, and later he learned the skill",
    correct: false,
  },
];
export const C3_P8_RETELL_RETRY_HINT =
  'Just saying the name of the building blocks, or just saying the result, is not a return; it is also wrong to say "he has learned the skill" - arriving only proves that he has found the door and built the road. It is necessary to connect "why to start" (the motivation in the text) and "what the program did" (the exit of the three pages, the repaired position, the stable End) in the same sentence: because...so...the result...later....';

/** Is this the retell that links the motive to the program? */
export function c3p8RetellAccepted(retell: string | null): boolean {
  return C3_P8_RETELL_OPTIONS.find((option) => option.id === retell)?.correct === true;
}

// ─── ④两类证据：一处文字动机证据 + 一处程序/运行证据 ────────────────────────

export const C3_P8_TEXT_EVIDENCE_TITLE =
  '④ Point out evidence of motivation in a text: Which sentence in the story explains why he set out?';
export const C3_P8_TEXT_EVIDENCE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'wants-a-teacher',
    label: '"He wanted to find a master who could teach him to learn, think and practice."',
    correct: true,
  },
  {
    id: 'promise-to-friends',
    label: `“${C3_P8_DIALOGUE_MONKEY_KING}”`,
    correct: true,
  },
  {
    id: 'treasure',
    label: '"He set out to retrieve a treasure from the other side of the sea."',
    correct: false,
  },
  {
    id: 'exit-number',
    label: "Page 1's exit block has the number 2 written on it.",
    correct: false,
  },
];
export const C3_P8_TEXT_EVIDENCE_RETRY_HINT =
  'Textual evidence of motivation should come from the story itself and should explain the "why". The treasure is not his motive (in the original book, he went to seek a teacher), and the number on the exit is not textual evidence - it is the procedural evidence in the column below.';

/** Did the child point at a real motive sentence in the story text? */
export function c3p8TextEvidenceAccepted(pick: string | null): boolean {
  return C3_P8_TEXT_EVIDENCE_OPTIONS.find((option) => option.id === pick)?.correct === true;
}

/**
 * The program/run evidence cards. There is deliberately no `correct` flag: which
 * of these is true is decided by the run that just happened, never by this list
 * — `c3p8ProgramEvidenceMeasured` is the only judge. The last two can never be
 * measured, because one is a line of text and the other is not how pages work.
 */
export interface C3P8ProgramEvidenceOption {
  id: string;
  label: string;
}

export const C3_P8_PROGRAM_EVIDENCE_TITLE =
  '⑤ Point out another piece of program/operational evidence: What was really measured this time?';
export const C3_P8_PROGRAM_EVIDENCE_OPTIONS: readonly C3P8ProgramEvidenceOption[] = [
  { id: 'trace-1-2-3', label: 'This time I really went from Page 1 to Page 2 and then to Page 3.' },
  { id: 'exit-page2-is-3', label: 'In the saved work, the export number of Page 2 is 3.' },
  {
    id: 'page3-ends',
    label:
      'Page 3 Use 🏁 End to end it smoothly without asking for the next step from other pages.',
  },
  {
    id: 'boundaries-continuous',
    label:
      'Every time he crosses the page, the frame he left is connected to the frame he appears in.',
  },
  { id: 'master-line', label: `Master said: "${C3_P8_MASTER_LINE}”` },
  {
    id: 'raft-knows-the-way',
    label: 'The raft knows which page to go to, no need to write down the exit number.',
  },
];
export const C3_P8_PROGRAM_EVIDENCE_RETRY_HINT =
  'The program/operation evidence must be something that is really measured this time: the three pages passed, the number on the exit, the last End, or two double-page spreads. The words of the master are the text of the story, and the raft will not find its own way - the exit number is written by you.';

/**
 * What the SAVED design and the run that just happened really support. A card
 * not in this list was not measured, so it cannot be offered as evidence.
 */
export function c3p8ProgramEvidenceMeasured(
  design: JtwC3RouteDesign | null,
  run: PageFlowRunResult | null,
): string[] {
  if (!design || !run) return [];
  const measured: string[] = [];
  if (c3p8TraceReached(run.trace)) measured.push('trace-1-2-3');
  if (design.pages[1]?.exitTo === JTW_C3_FAR_SHORE_PAGE) measured.push('exit-page2-is-3');
  if (design.pages[2]?.ends && run.stoppedBy === 'end') measured.push('page3-ends');
  if (jtwC3JumpBoundariesContinuous(jtwC3JumpBoundaries(run))) {
    measured.push('boundaries-continuous');
  }
  return measured;
}

/** Is this pick one the run really measured? */
export function c3p8ProgramEvidenceAccepted(
  pick: string | null,
  design: JtwC3RouteDesign | null,
  run: PageFlowRunResult | null,
): boolean {
  return pick !== null && c3p8ProgramEvidenceMeasured(design, run).includes(pick);
}

// ─── 远行印 — the chapter seal the SERVER aggregates (never the page) ────────

export const C3_P8_SEAL_ID = 'jtw-s1-c3-long-journey-seal';
export const C3_P8_SEAL_TITLE = 'Seal of long journey';
/** Teaching script C3 Part 8 names the seal's promise in the child's words. */
export const C3_P8_SEAL_LINE =
  'I can connect three pages in order, and I can tell why the Monkey King set out.';
export const C3_P8_SEAL_GATE_NOTE =
  'The Seal of Long Journey has not been revealed yet - there are still several pieces of evidence missing from this chapter in the server records. It will light up after completing C3 P1–P8 reading, explaining, building, selecting to run, repairing, saving version, restarting and rerunning, and telling back the evidence.';
export const C3_P8_LIGHT_SEAL_LABEL = 'Light up the journey seal';

// ─── resolved / story_after / continue ──────────────────────────────────────

export const C3_P8_RESOLVED_TITLE =
  "The Seal of Long Journey and the stone plaque of the master's gate lit up together.";
/**
 * resolved_world_change. The scene is explicit that this beat must NOT imply the
 * skills are learned, so the copy stops at the lit gate and the lit seal — no
 * fireworks, no "他学会了" — and the artwork is the already-integrated Page 3
 * resolved state (彼岸山路和石牌).
 */
export const C3_P8_RESOLVED_WORLD_CHANGE =
  "The stone steps on the other side were lit up step by step, the stone plaque of the master's gate appeared completely from the fog, and the seal of the long journey also lit up. It rewards three things: understanding why he set out, connecting the three pages in order, and recounting the journey - not that he has learned any skills.";
export const C3_P8_STORY_AFTER =
  'Someone at the door asked him where he was from and what he wanted to do. The Monkey King said: I come from Flower-Fruit Mountain and want to study seriously with the master. The raft and the three-page road are collected, and they will follow him into the next chapter.';

export const C3_P8_CONTINUE_NOW_LABEL = 'Now go knock on the door';
export const C3_P8_CONTINUE_LATER_LABEL = 'continue later';
/** Recorded on the row so "保存当前位置" is server truth, not a page claim. */
export type C3P8ContinueChoice = 'now' | 'later';

export const C3_P8_LOCKED_HINT =
  'First save your own three-page guide to seeking a teacher in Chapter 3, Part 7, and then come back to this chapter.';
export const C3_P8_LOADING_HINT =
  "The fog in front of the teacher's gate has not cleared yet. My friends are waiting for you to tell this chapter...";
