// Journey to the West · C2-P8 "守约成为美猴王" — chapter two's Retell and the
// server-aggregated chapter seal (scene-specs JTW-S1-C2-P8, teaching script
// C2 故事卡D + Part 8).
//
// This Part ships NO starter of its own. It reopens the C2-P7 Personal Ship the
// child really saved, runs it Start → End through the real BlocksRunner, and
// asks the child to order the chapter's seven cause cards and retell it with
// 因为—所以—结果—后来. The 水帘洞印 is lit by the SERVER's chapter aggregation
// over the stored evidence rows — a page boolean can never light it.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` is already over it, so no
// C2 part content is added there either).

import type { JtwEvidenceOption } from './journeyWestSeason1';

/** Child-facing story text — teaching-script C2 故事卡D + Part 8 IN FULL. */
export const C2_P8_STORY_BEFORE: readonly [string, string] = [
  '石猴不只成功进去，还按原路回来，把发现说清楚，再带群猴一起进入。群猴记起瀑布前的约定，推他做美猴王。勇敢不是只往前跳，也包括回来、说明和带伙伴走对路。',
  '现在轮到你把这一章讲回来：先把七张因果卡按发生的先后排好，再运行你自己保存的作品，说说是哪一条路线和哪一条事件脚本推动了这个故事。',
];

/** 原著卡（scene-specs JTW-S1-C2-P8）：称号来自守约与带路，不是随机奖励。 */
export const C2_P8_CLASSIC_CARD =
  '原著第一回中，石猴穿过瀑布、发现水帘洞、返回并带群猴进入，随后被推为猴王；称号来自守约与带路，不是随机奖励。';

/** 瀑布前那两句原创对白——这一章要核对的，正是它们。 */
export const C2_P8_DIALOGUE_MONKEYS = '水帘后面会不会有路？';
export const C2_P8_DIALOGUE_STONE_MONKEY = '我先看清楚，再回来告诉你们。';
export const C2_P8_DIALOGUE_INTRO =
  '第二章开始时，瀑布前说过两句话。现在把它们和你的程序放在一起看，就知道约定有没有兑现：';

/** 七张因果卡（scene-specs 证据卡），按故事发生的先后排列。 */
export const C2_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'water-clue', label: '🌊 水声线索', correct: true },
  { id: 'falls-agreement', label: '🤝 瀑布约定', correct: true },
  { id: 'exact-route', label: '👣 精确路线', correct: true },
  { id: 'curtain-response', label: '✨ 水帘回应', correct: true },
  { id: 'fixed-return', label: '🔧 修好回程', correct: true },
  { id: 'friends-enter', label: '🐒 带伙伴进入', correct: true },
  { id: 'monkey-king', label: '👑 成为猴王', correct: true },
];
export const C2_P8_CAUSE_CARD_ORDER: readonly string[] = [
  'water-clue',
  'falls-agreement',
  'exact-route',
  'curtain-response',
  'fixed-return',
  'friends-enter',
  'monkey-king',
];
export const C2_P8_CAUSE_CARD_TITLE =
  '运行之前：把这一章的七张因果卡按先后排好';
export const C2_P8_RUN_GATE_HINT = '先把上面的七张因果卡排好，再运行你保存的作品。';

/**
 * Retell：用"因为—所以—结果—后来"把人物选择和程序证据连起来。
 * 只念积木名不通过，只说结果（没有原因）也不通过。
 */
export const C2_P8_RETELL_QUESTION =
  '把第二章讲回来：用"因为—所以—结果—后来"把人物的选择和程序的证据连在一起。';
export const C2_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-promise-and-program',
    label:
      '因为大家在瀑布前约好"进去→看清→回来→分享"，所以石猴用一条每一步都说得清的路线走到水帘前；结果脚底刚好碰到水帘，On Bump 让水帘 Hide、洞口 Show，洞里被看见了；后来他按修好的回程回来，带伙伴走同一条路，大家才推他做美猴王',
    correct: true,
  },
  {
    id: 'block-names-only',
    label: 'Move Right、Move Up、On Bump、Hide、Show、Wait、End——把积木的名字按顺序念一遍',
    correct: false,
  },
  {
    id: 'result-without-cause',
    label: '石猴进了水帘洞，后来他就成了美猴王',
    correct: false,
  },
];
export const C2_P8_RETELL_RETRY_HINT =
  '只念积木名，或者只说结果，都还不是讲回来。要把"为什么这样做"（约定）和"程序做了什么"（路线、碰撞回应、修好的回程）连在同一句里：因为…所以…结果…后来…。';

/** 水帘洞印 — the chapter seal the SERVER aggregates (never the page). */
export const C2_P8_SEAL_ID = 'jtw-s1-c2-water-curtain-seal';
export const C2_P8_SEAL_TITLE = '水帘洞印';
/** Teaching script C2 Part 8 names the seal's promise in the child's words. */
export const C2_P8_SEAL_LINE = '我会规划多段路线，也会让一个角色碰到另一个角色后得到回应。';
export const C2_P8_KING_TITLE = '美猴王';
export const C2_P8_LIGHT_SEAL_LABEL = '点亮水帘洞印';

/**
 * resolved_world_change. The scene also names 洞外海面出现的木头线索, but the C3
 * raft prop is a FINISHED raft (C3's own payoff) and no driftwood-clue artwork
 * exists — so that beat is left to C3 rather than faked with a stand-in image.
 * Recorded in the saga asset bible §8.
 */
export const C2_P8_RESOLVED_WORLD_CHANGE =
  '水帘洞印亮起来了，"美猴王"的称号也跟着亮起——它奖励的是读故事、搭程序和讲回来这三件事，不是谁跳得最快。洞口的暖光留在同一格上，水帘后面从一个秘密变成了大家的家。';
export const C2_P8_STORY_AFTER =
  '水帘洞成为共同的家园。多年以后，美猴王站在洞外望向海边，开始想：怎样才能更有智慧地生活？他还没有出发，也还没有遇见任何取经的伙伴。';

export const C2_P8_CONTINUE_NOW_LABEL = '现在看海边';
export const C2_P8_CONTINUE_LATER_LABEL = '以后继续';
/** Recorded on the row so "保存当前位置" is server truth, not a page claim. */
export type C2P8ContinueChoice = 'now' | 'later';

/** Did the child put all seven cause cards in the story's own order? */
export function c2p8CardsOrdered(order: readonly string[]): boolean {
  return (
    order.length === C2_P8_CAUSE_CARD_ORDER.length &&
    C2_P8_CAUSE_CARD_ORDER.every((id, index) => order[index] === id)
  );
}

/** Is this the retell that links the promise to the program? */
export function c2p8RetellAccepted(retell: string | null): boolean {
  return C2_P8_RETELL_OPTIONS.find((option) => option.id === retell)?.correct === true;
}
