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
  'Not only did the stone monkey successfully enter, but he also returned the same way, explained his discovery clearly, and then led the group of monkeys in together. The monkeys remembered the promise made before the waterfall and elected him to be the Monkey King. Being brave is not just about jumping forward, but also about coming back, explaining, and leading your partners on the right path.',
  "Now it's your turn to tell this chapter back: first arrange the seven cause and effect cards in the order of occurrence, then run your own saved work, and talk about which route and which event script promoted the story.",
];

/** 原著卡（scene-specs JTW-S1-C2-P8）：称号来自守约与带路，不是随机奖励。 */
export const C2_P8_CLASSIC_CARD =
  'In the first chapter of the original work, the stone monkey passed through the waterfall, discovered Water Curtain Cave, returned and led a group of monkeys in, and was later promoted as the monkey king; the title comes from keeping promises and leading the way, not a random reward.';

/** 瀑布前那两句原创对白——这一章要核对的，正是它们。 */
export const C2_P8_DIALOGUE_MONKEYS = 'Will there be a road behind the water curtain?';
export const C2_P8_DIALOGUE_STONE_MONKEY =
  'Let me see it clearly first and then come back and tell you.';
export const C2_P8_DIALOGUE_INTRO =
  'At the beginning of the second chapter, two sentences were said before the waterfall. Now look at them together with your program, and you will know whether the agreement has been fulfilled:';

/** 七张因果卡（scene-specs 证据卡），按故事发生的先后排列。 */
export const C2_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'water-clue', label: '🌊 Water sound clues', correct: true },
  { id: 'falls-agreement', label: '🤝 Waterfall Promise', correct: true },
  { id: 'exact-route', label: '👣 Exact route', correct: true },
  { id: 'curtain-response', label: '✨Shui Curtain’s response', correct: true },
  { id: 'fixed-return', label: '🔧 Repair the return journey', correct: true },
  { id: 'friends-enter', label: '🐒 Bring a partner in', correct: true },
  { id: 'monkey-king', label: '👑 Become the Monkey King', correct: true },
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
  'Before running: Arrange the seven cause and effect cards in this chapter in order.';
export const C2_P8_RUN_GATE_HINT =
  'First arrange the seven causal cards above, and then run the work you saved.';

/**
 * Retell：用"因为—所以—结果—后来"把人物选择和程序证据连起来。
 * 只念积木名不通过，只说结果（没有原因）也不通过。
 */
export const C2_P8_RETELL_QUESTION =
  'Bringing it back to Chapter 2: Use "because-therefore-result-later" to connect the character\'s choice with the evidence of the procedure.';
export const C2_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-promise-and-program',
    label:
      'Because everyone made an appointment in front of the waterfall to "go in → see clearly → come back → share", the stone monkey walked to the water curtain using a route that was clearly explained every step of the way. As a result, the soles of his feet just happened to touch the water curtain, and On Bump asked the water curtain to hide and the entrance of the cave to show, and the cave was seen. Later, he came back as the repaired return journey and took his companions along the same road, and everyone recommended him to be the Monkey King.',
    correct: true,
  },
  {
    id: 'block-names-only',
    label:
      'Move Right, Move Up, On Bump, Hide, Show, Wait, End - read the names of the blocks in order',
    correct: false,
  },
  {
    id: 'result-without-cause',
    label: 'Stone Monkey entered Water Curtain Cave and later he became the Monkey King',
    correct: false,
  },
];
export const C2_P8_RETELL_RETRY_HINT =
  'Just saying the name of the building blocks, or just talking about the results, is not the end of the story. Connect "why you did it" (agreement) and "what the program did" (route, collision response, repaired return trip) in the same sentence: because... so... the result... later....';

/** 水帘洞印 — the chapter seal the SERVER aggregates (never the page). */
export const C2_P8_SEAL_ID = 'jtw-s1-c2-water-curtain-seal';
export const C2_P8_SEAL_TITLE = 'Water Curtain Cave print';
/** Teaching script C2 Part 8 names the seal's promise in the child's words. */
export const C2_P8_SEAL_LINE =
  'I will plan multiple routes, and also let one character encounter another character and get a response.';
export const C2_P8_KING_TITLE = 'Monkey King';
export const C2_P8_LIGHT_SEAL_LABEL = 'Light up the Water Curtain Cave seal';

/**
 * resolved_world_change. The scene also names 洞外海面出现的木头线索, but the C3
 * raft prop is a FINISHED raft (C3's own payoff) and no driftwood-clue artwork
 * exists — so that beat is left to C3 rather than faked with a stand-in image.
 * Recorded in the saga asset bible §8.
 */
export const C2_P8_RESOLVED_WORLD_CHANGE =
  'The Water Curtain Cave seal lights up, and the title "Monkey King" also lights up - it rewards reading stories, building programs and telling them back, not who can jump the fastest. The warm light at the entrance of the cave remains on the same grid, and the behind the water curtain changes from a secret to everyone\'s home.';
export const C2_P8_STORY_AFTER =
  "Water Curtain Cave becomes a common home. Many years later, the Monkey King stood outside the cave and looked at the seaside, and began to wonder: How can I live more wisely? He hasn't set out yet, and he hasn't met any companions yet.";

export const C2_P8_CONTINUE_NOW_LABEL = 'Now look at the beach';
export const C2_P8_CONTINUE_LATER_LABEL = 'continue later';
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
