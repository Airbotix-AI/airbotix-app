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
  '星夜、晨雾和海风不断变化，木筏却不能一直回到出发页。美猴王检查每一个页面出口，终于从 Page 1 走到 2，再从 2 走到 3。山林里传来歌声，他顺着线索来到师门前，先安静等候。',
  '到达不等于学会。他找到了门，也把路修对了，但本领还没有学，取经的队伍也还没有出现。现在轮到你把这一章讲回来：先把五张因果卡按发生的先后排好，再运行你自己在 Part 7 保存的那份作品，然后说清楚——他为什么出发（文字里的证据），以及程序里的什么东西证明这条路真的走通了。',
];

/** 原著卡（教学脚本 Classic Card｜漂洋求师）。 */
export const C3_P8_CLASSIC_CARD =
  '原著第一回中，美猴王因思考生命无常而远行求师，跨海、访人间、再渡海，经过多年才找到师门。低龄文案可以说“他想学习怎样更有智慧地生活”，但不能把动机改成寻宝或取经。';

/** 出发时说过的那两句话——这一章要核对的，正是它们。 */
export const C3_P8_DIALOGUE_INTRO =
  '第三章开始时，岸边说过两句话。现在把它们和你的程序放在一起看，就知道这一程有没有讲清楚：';
export const C3_P8_DIALOGUE_MONKEYS = '要走很远，你还会回来吗？';
export const C3_P8_DIALOGUE_MONKEY_KING = '我先去学会更多，再把经历讲给你们听。';
/** 伏笔对白（教学脚本 C3 Part 8）：门里的第一句话属于第四章。 */
export const C3_P8_MASTER_LINE = '你远道而来。先从认识自己开始。';

// ─── 五张因果卡 ─────────────────────────────────────────────────────────────

/** scene-specs: 为什么离开 → 伙伴造筏 → Page 2出口错误 → 修复顺序与位置 → 到达师门 */
export const C3_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'why-leave', label: '🏝 为什么离开', correct: true },
  { id: 'friends-build-raft', label: '🛶 伙伴造筏', correct: true },
  { id: 'page2-exit-wrong', label: '↩️ Page 2 出口错误', correct: true },
  { id: 'fix-order-and-position', label: '🔧 修复顺序与位置', correct: true },
  { id: 'arrive-at-gate', label: '⛩ 到达师门', correct: true },
];
export const C3_P8_CAUSE_CARD_ORDER: readonly string[] = [
  'why-leave',
  'friends-build-raft',
  'page2-exit-wrong',
  'fix-order-and-position',
  'arrive-at-gate',
];
export const C3_P8_CAUSE_CARD_TITLE = '① 运行之前：把这一章的五张因果卡按先后排好';
export const C3_P8_RUN_GATE_HINT = '先把上面的五张因果卡排好，再运行你在 Part 7 保存的作品。';

/** Did the child put all five cause cards in the story's own order? */
export function c3p8CardsOrdered(order: readonly string[]): boolean {
  return (
    order.length === C3_P8_CAUSE_CARD_ORDER.length &&
    C3_P8_CAUSE_CARD_ORDER.every((id, index) => order[index] === id)
  );
}

// ─── ②运行 Part 7 真实保存的作品 ────────────────────────────────────────────

export const C3_P8_RUN_TITLE = '② 完整运行你在 Part 7 保存的那条求师路';
export const C3_P8_RUN_NOTE =
  '这里打开的就是你自己保存的那一份，没有另一份“标准答案”可以载入。同一个解释器把它从 Page 1 一页一页跑下去，量的是真实轨迹、每一页的脚印和每一次跨页接不接得上。';
export const C3_P8_RUN_LABEL = '▶ 从 Page 1 跑到 Page 3 的 End';
export const C3_P8_RUN_AGAIN_LABEL = '再跑一次';
export const C3_P8_RUN_BUSY_LABEL = '木筏正在走…';
export const C3_P8_RUN_TRACE_TITLE = '这一遍真的走过的三页';
export const C3_P8_BOUNDARY_TITLE = '每一次跨页：他在哪一格离开，又在哪一格出现';
export const C3_P8_TRACE_MISMATCH_HINT =
  '这一遍没有走成 1 → 2 → 3，或者最后一页没有稳稳结束，又或者有一处跨页断开了。回 Part 7 打开工作区检查两个出口数字、Page 2 的起点和最后那块 End，再回来跑一次。';
export const C3_P8_WORK_MISSING =
  '没有找到你在 Part 7 保存的三页求师路，或者它已经不成立了。这一页不会替你载入另一份作品。';
export const C3_P8_WORK_MISSING_LINK = '回到 Part 7 打开工作区，确认已保存 →';
export const C3_P8_DESIGN_TITLE = '你保存下来的三页（从作品里读回来的，不是页面猜的）';

/** Did the run really walk `1 → 2 → 3`? */
export function c3p8TraceReached(trace: readonly number[]): boolean {
  return (
    trace.length === C3_P8_TARGET_TRACE.length &&
    C3_P8_TARGET_TRACE.every((page, index) => trace[index] === page)
  );
}

// ─── ③Retell：因为—所以—结果—后来 ───────────────────────────────────────────

export const C3_P8_RETELL_QUESTION =
  '③ 把第三章讲回来：用“因为—所以—结果—后来”把人物的选择和程序的证据连在一起。';
export const C3_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-motive-and-program',
    label:
      '因为花果山很快乐，猴王却还有许多不明白的事，想找一位能教他的师父，所以伙伴们帮他做了木筏，他离岸出发；结果第一次跑的时候 Page 2 的出口把木筏又送回了花果山，他把出口数字改对、又把下一页的起点接回他离开的那一边；后来三页真的按 1 → 2 → 3 走通了，他在师门前收起木筏，安静等候——门还没进，本领也还没有学',
    correct: true,
  },
  {
    id: 'block-names-only',
    label: 'Whoosh、Move Right、Wait、Page、End——把积木的名字按顺序念一遍',
    correct: false,
  },
  {
    id: 'result-without-cause',
    label: '猴王坐着木筏到了师门，后来他就学会本领了',
    correct: false,
  },
];
export const C3_P8_RETELL_RETRY_HINT =
  '只念积木名，或者只说结果，都还不是讲回来；说“他就学会本领了”也不对——到达只证明他找到了门、修好了路。要把“为什么出发”（文字里的动机）和“程序做了什么”（三页的出口、修好的位置、稳稳的 End）连在同一句里：因为…所以…结果…后来…。';

/** Is this the retell that links the motive to the program? */
export function c3p8RetellAccepted(retell: string | null): boolean {
  return C3_P8_RETELL_OPTIONS.find((option) => option.id === retell)?.correct === true;
}

// ─── ④两类证据：一处文字动机证据 + 一处程序/运行证据 ────────────────────────

export const C3_P8_TEXT_EVIDENCE_TITLE = '④ 指出一处文字里的动机证据：故事哪一句说明了他为什么出发？';
export const C3_P8_TEXT_EVIDENCE_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'wants-a-teacher',
    label: '“他想寻找能教他学习、思考和修行的师父。”',
    correct: true,
  },
  {
    id: 'promise-to-friends',
    label: `“${C3_P8_DIALOGUE_MONKEY_KING}”`,
    correct: true,
  },
  {
    id: 'treasure',
    label: '“他出发是为了到海那边取一件宝物回来。”',
    correct: false,
  },
  {
    id: 'exit-number',
    label: 'Page 1 的出口积木上写着数字 2。',
    correct: false,
  },
];
export const C3_P8_TEXT_EVIDENCE_RETRY_HINT =
  '文字动机证据要来自故事本身，而且要说明“为什么出发”。宝物不是他的动机（原著里他是去求师的），出口上的数字也不是文字证据——那是下面那一栏的程序证据。';

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
  '⑤ 再指出一处程序／运行证据：刚才这一遍真的量到了什么？';
export const C3_P8_PROGRAM_EVIDENCE_OPTIONS: readonly C3P8ProgramEvidenceOption[] = [
  { id: 'trace-1-2-3', label: '这一遍真的从 Page 1 走到 Page 2，再走到 Page 3。' },
  { id: 'exit-page2-is-3', label: '保存的作品里，Page 2 的出口数字写的是 3。' },
  { id: 'page3-ends', label: 'Page 3 用 🏁 End 稳稳结束，没有再向别的页面要下一步。' },
  { id: 'boundaries-continuous', label: '每一次跨页，他离开的那一格和出现的那一格接得上。' },
  { id: 'master-line', label: `师父说：“${C3_P8_MASTER_LINE}”` },
  { id: 'raft-knows-the-way', label: '木筏自己知道该去哪一页，不用写出口数字。' },
];
export const C3_P8_PROGRAM_EVIDENCE_RETRY_HINT =
  '程序／运行证据要是这一遍真的量到的东西：走过的三页、出口上的数字、最后那块 End，或者两次跨页接得上。师父那句话是故事文字，木筏也不会自己找路——出口数字是你写的。';

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
export const C3_P8_SEAL_TITLE = '远行印';
/** Teaching script C3 Part 8 names the seal's promise in the child's words. */
export const C3_P8_SEAL_LINE = '我能让三个页面按顺序接起来，也能说出猴王为什么出发。';
export const C3_P8_SEAL_GATE_NOTE =
  '远行印还没有亮——服务器记录里这一章还缺若干项证据。补齐 C3 P1–P8 的阅读、解释、搭建、选择运行、修理、保存版本、重开重跑和讲回证据后它才会点亮。';
export const C3_P8_LIGHT_SEAL_LABEL = '点亮远行印';

// ─── resolved / story_after / continue ──────────────────────────────────────

export const C3_P8_RESOLVED_TITLE = '远行印和师门的石牌一起亮起来了';
/**
 * resolved_world_change. The scene is explicit that this beat must NOT imply the
 * skills are learned, so the copy stops at the lit gate and the lit seal — no
 * fireworks, no "他学会了" — and the artwork is the already-integrated Page 3
 * resolved state (彼岸山路和石牌).
 */
export const C3_P8_RESOLVED_WORLD_CHANGE =
  '彼岸的石阶一级一级亮着，师门的石牌从雾里完整地显出来，远行印也跟着亮起。它奖励的是三件事：读懂他为什么出发、把三个页面按顺序接起来、把这一程讲回来——不是他已经学会了什么本领。';
export const C3_P8_STORY_AFTER =
  '门里有人问他从哪里来、想做什么。猴王说：我从花果山来，想认真跟着师父学习。木筏和这条三页的路都被收好了，它们会跟着他一起进入下一章。';

export const C3_P8_CONTINUE_NOW_LABEL = '现在去敲门';
export const C3_P8_CONTINUE_LATER_LABEL = '以后继续';
/** Recorded on the row so "保存当前位置" is server truth, not a page claim. */
export type C3P8ContinueChoice = 'now' | 'later';

export const C3_P8_LOCKED_HINT = '先在第三章 Part 7 把你自己的三页求师路保存好，再来讲回这一章。';
export const C3_P8_LOADING_HINT = '师门前的雾还没散，伙伴们在等你讲这一章…';
