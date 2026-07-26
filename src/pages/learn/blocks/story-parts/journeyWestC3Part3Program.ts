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
  '三张页面卡放在地面：花果山海岸、海上中段、彼岸山林。每一页的出口上放一张 Goto 卡，卡上写着 1、2 或 3。现在由你扮木筏，沿着出口卡上的数字一页一页走。',
  '走到哪一页转不出去了，就在那里停下——那里就是循环。停下以后不要把三张页面全部重做，只换一张 Goto 卡，再走一次。口令是：“出口数字决定下一页。”',
];
export const C3_P3_SCREEN_IDS: readonly [string, string] = [
  'part-3-floor-cards',
  'part-3-password',
];
export const C3_P3_NEXT_SCREEN_LABEL = '再读下一段';
export const C3_P3_PREV_SCREEN_LABEL = '回上一段';

/** 故事—程序桥（teaching script C3）：Page 目标把下一段接上去。 */
export const C3_P3_STORY_BRIDGE =
  '三个 Page 代表旅程的三个可读阶段；每页的动作、Wait 和声音让这个地点有内容，Page 目标把下一段接上去。出口上的数字不是门牌上的装饰，它就是下一页的地址。';

/** 原著小卡片 — 三页是教学压缩，出口数字是课程的说法，不是原著的说法。 */
export const C3_P3_CLASSIC_CARD =
  '原著第一回里，美猴王漂洋求师走了很久、渡过不止一次海。课程把这段路压缩成三张页面来讲；“出口数字”是我们程序里的说法，原著里没有页面，也没有数字。';

// ─── Part 2 的只读脚印（真的从服务器上取回来，不是本页编出来的） ───────────────

export const C3_P3_PART2_ID = 'jtw-s1-c3-p2';
export const C3_P3_FOOTPRINT_TITLE = 'Part 2 跑出来的脚印（只读，这里不会再跑一次）';
export const C3_P3_FOOTPRINT_MISSING_HINT =
  '读不到 Part 2 存下来的脚印。请先回到 Part 2 把 starter 原样跑一次，这一页不猜脚印。';

// ─── 第一次偏离的解释（“为什么木筏会回家”） ─────────────────────────────────

/** An evidence card that carries its own text-grounded retry hint. */
export interface C3P3Option extends JtwEvidenceOption {
  /** Shown when a child picks this wrong card — always grounded in the trace. */
  hint?: string;
}

export const C3_P3_REASON_QUESTION =
  '对着 Part 2 的脚印说清楚：木筏为什么从海中央又回到了花果山海岸？';
export const C3_P3_REASON_OPTIONS: readonly C3P3Option[] = [
  {
    id: 'reason-exit-number-says-1',
    label: '海中央那一页的出口卡上写着 1，1 就是花果山海岸，木筏照着数字走了回去',
    correct: true,
  },
  {
    id: 'reason-raft-too-fast',
    label: '木筏走得太快，一下子冲过了彼岸山林',
    correct: false,
    hint: '脚印上木筏在海中央从 2-8 走到 6-8，一格没多走。把速度调慢也只是同一条路走得慢一点，出口卡上的数字一个都不会变。',
  },
  {
    id: 'reason-cards-out-of-order',
    label: '三张页面卡在地上摆错了顺序',
    correct: false,
    hint: '顺序没有摆错：Page 1 的出口写 2，木筏确实先到了海中央。问题出在它离开海中央的时候。',
  },
];

// ─── 只换哪一张卡（“不能重做全部页面”） ─────────────────────────────────────

export const C3_P3_SWAP_QUESTION = '按 Part 2 的脚印，这一次只需要换哪一张卡？';
export const C3_P3_SWAP_OPTIONS: readonly C3P3Option[] = [
  {
    id: 'swap-page-1-card',
    label: '换 Page 1 的出口卡',
    correct: false,
    hint: 'Page 1 的出口写 2，木筏确实到了海中央——那张卡没有错，换掉它反而会把对的一段弄坏。',
  },
  { id: 'swap-page-2-card', label: '只换 Page 2 的出口卡', correct: true },
  {
    id: 'swap-page-3-card',
    label: '换 Page 3 的出口卡',
    correct: false,
    hint: '彼岸山林这一次根本没有打开过，脚印里没有它的一行。还轮不到换它的卡。',
  },
  {
    id: 'swap-redo-all-pages',
    label: '三张页面全部重做一遍',
    correct: false,
    hint: '全部重做就看不出到底是哪一个数字把路带错了。脚印只指着一张卡。',
  },
];

// ─── 地卡演练：孩子扮木筏，沿 Page 1 → Page 2 → Page 1 走 ────────────────────

export const C3_P3_WALK_TITLE = '先扮一次木筏：按现在这三张出口卡，你会一页一页走到哪里？';

/** A tappable card with no correctness of its own — the SEQUENCE is judged. */
export interface C3P3Card {
  id: string;
  label: string;
}

export const C3_P3_WALK_CARDS: readonly C3P3Card[] = [
  { id: 'floor-page-1', label: 'Page 1 花果山海岸' },
  { id: 'floor-page-2', label: 'Page 2 海上中段' },
  { id: 'floor-page-3', label: 'Page 3 彼岸山林' },
];
export const C3_P3_WALK_RESET_LABEL = '重走';
export const C3_P3_WALK_HINT =
  '走到那一页转不出去、又踩回踩过的地卡时就停下——脚印上是几页，你就走几步。';

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
  return required.length > 0 && walk.length === required.length && required.every((id, index) => walk[index] === id);
}

// ─── 口令 ────────────────────────────────────────────────────────────────────

export const C3_P3_PASSWORD_QUESTION = '走完以后一起说口令。哪一句才是这一章的口令？';
export const C3_P3_PASSWORD_OPTIONS: readonly C3P3Option[] = [
  { id: 'password-exit-number', label: '出口数字决定下一页。', correct: true },
  {
    id: 'password-faster-is-earlier',
    label: '走得越快，就越先到下一页。',
    correct: false,
    hint: '快慢只改变木筏走得多急，不改变它去哪一页。用加速把循环遮起来，木筏还是会回到花果山海岸。',
  },
  {
    id: 'password-more-cards',
    label: '页面卡摆得越多，故事就越长。',
    correct: false,
    hint: '这一章只有三张页面卡，多摆几张也不会自己接上；接上路的是出口上的那个数字。',
  },
];

// ─── 三张候选出口卡 1 / 2 / 3，以及每一张的预测 ──────────────────────────────

export const C3_P3_PREDICT_TITLE =
  '先预测，再动手：把海中央的出口卡换成 1、2、3，木筏各会走到哪里？';
/** The three possible endings. Which one is right depends on the CARD, so the
 *  cards carry the answer (`C3P3Candidate.outcomeId`), not the outcome list. */
export const C3_P3_OUTCOME_OPTIONS: readonly C3P3Card[] = [
  { id: 'outcome-loop-home', label: '又被送回花果山海岸，木筏还在打转' },
  { id: 'outcome-stay-open-sea', label: '再进一次海中央，就停在那里走不动了' },
  { id: 'outcome-reach-far-forest', label: '一路走到彼岸山林，稳稳地结束' },
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
    label: '出口卡 1 · 回花果山海岸',
    outcomeId: 'outcome-loop-home',
  },
  {
    id: 'exit-card-2',
    exit: 2,
    label: '出口卡 2 · 又指着海中央',
    outcomeId: 'outcome-stay-open-sea',
  },
  {
    id: 'exit-card-3',
    exit: 3,
    label: '出口卡 3 · 指向彼岸山林',
    outcomeId: 'outcome-reach-far-forest',
  },
];

/** The card whose number really satisfies the chapter's goal. */
export const C3_P3_TARGET_CARD_ID = 'exit-card-3';

export const C3_P3_PREDICT_RETRY_HINT =
  '再看一眼卡上的数字，它就是下一页的页码：1 是花果山海岸，2 是海中央这一页自己，3 才是彼岸山林。';
export const C3_P3_TRY_TITLE = '预测都填好了。点一张卡，木筏就照着这张卡真的走一次给你看。';
export const C3_P3_TRY_LOCKED_HINT =
  '三张卡都先预测过，才能动手试——不先说出你以为会发生什么，试出来的结果就不算证据。';
export const C3_P3_TRY_BUSY_LABEL = '木筏正在走…';
export const C3_P3_TRY_LABEL = '试这张卡';
export const C3_P3_REHEARSAL_TITLE = '这一次演练用的卡（starter 本身没有被改）';
export const C3_P3_STARTER_TITLE = 'Part 2 的 starter 现在的样子（这一页不会改它）';
export const C3_P3_NO_EDITOR_NOTE =
  '这一页不打开积木编辑器，也不保存任何作品：三张候选卡只是拿来试走的，Page 2 出口上的那个 1 一直原样留在 starter 里，等 Part 4 你自己动手搭。';

/** Child-facing sentence for a measured candidate result. */
export function c3p3OutcomeSentence(run: PageFlowRunResult): string {
  const trace = run.trace.map((page) => `Page ${page}`).join(' → ');
  if (run.stoppedBy === 'end') {
    return `${trace}：木筏走到最后一页，稳稳地结束。`;
  }
  if (run.stoppedBy === 'loop') {
    const looped = run.trace[run.trace.length - 1];
    return `${trace}：木筏又踩回 ${c3p2PageLabel(looped)}，路线在这里打住了。`;
  }
  return `${trace}：这次运行停在了 ${run.stoppedBy}。`;
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
  return { ...C3_P2_STARTER_PROJECT, name: `${C3_P2_STARTER_PROJECT.name} · 出口卡 ${exitNumber}`, pages };
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
  return C3_P3_CANDIDATES.every(
    (candidate) => predictions[candidate.id] === candidate.outcomeId,
  );
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

export const C3_P3_CONNECTED_LABEL = 'Page 2 的出口 → 3 · 通向彼岸山林';
export const C3_P3_FADED_LABEL = 'Page 2 的出口 → 1 · 回花果山海岸';
export const C3_P3_RESOLVED_WORLD_CHANGE =
  '出口卡 3 和彼岸山林连在了一起：木筏离开海中央以后，第一次真的踩上了对岸的浅滩。那张把它送回家的返乡箭头淡了下去，留在地上当作提醒。';
export const C3_P3_STORY_AFTER =
  '路口已经找对了，但海中央还什么故事都没有发生；下一步必须由你亲自搭建 Page 2。';
export const C3_P3_CONTINUE_LABEL = '搭海上故事';

export const C3_P3_LOCKED_HINT =
  '先在第三章 Part 2 把 starter 原样跑一次、圈出海中央那一页，再来换出口卡。';
export const C3_P3_LOADING_HINT = '三张页面卡正在铺到地上…';
