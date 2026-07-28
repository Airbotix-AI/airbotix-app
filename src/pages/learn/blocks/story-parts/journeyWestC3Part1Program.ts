// Journey to the West · C3-P1 "快乐的家，也装不下所有问题" — chapter three's
// Read & Why entry (scene-specs JTW-S1-C3-P1, teaching script C3 故事卡A/B +
// 原创对白 + Part 1).
//
// This Part edits no blocks and writes no project: the child reads the story,
// points at the three places on the same-screen map, orders the TWO real motive
// evidence cards, completes 虽然…但是…所以… and answers the which-line-would-fail
// prediction. All of that is persisted through `/story-parts`; nothing here is a
// page boolean.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` is already over it, so no
// chapter-three content is added there either).

import type { JtwEvidenceOption } from './journeyWestSeason1';
import {
  JTW_C1_BACKGROUND_ASSET,
  JTW_C2_RESOLVED_BACKGROUND_ASSET,
} from './journeyWestSeason1';
import { JTW_C3_PAGE1_BACKGROUND } from '../jtwC3Stage';

/**
 * story_before — teaching-script C3 故事卡A and 故事卡B IN FULL, two screens.
 * Part 1 of the teaching script co-reads both cards; the scene's Story Screen 1
 * is 故事卡A, and 故事卡B carries the farewell the motive evidence is read from.
 */
export const C3_P1_STORY_SCREENS: readonly [string, string] = [
  '美猴王和伙伴们在水帘洞生活了很久。一天，他想到：花果山虽然快乐，生命和时间却会改变，自己还有许多不明白的事。他想寻找能教他学习、思考和修行的师父。这是一次为了求知的离开，不是已经加入取经队伍。',
  '群猴帮他找来木头和藤条，做成一只木筏。美猴王看着水帘洞，有些舍不得，却仍对伙伴说：“我会记得从哪里出发，也会认真寻找答案。”木筏离岸，花果山在身后慢慢变小。',
];
export const C3_P1_SCREEN_IDS: readonly [string, string] = ['story-card-a', 'story-card-b'];
export const C3_P1_NEXT_SCREEN_LABEL = '再读下一段';
export const C3_P1_PREV_SCREEN_LABEL = '回上一段';
export const C3_P1_UNREAD_HINT = '先把两段正文都读完，再来摆动机卡——答案在正文里，不在卡片上。';

/** 原创对白（teaching script C3）：动机证据和预测都要从这两句里读出来。 */
export const C3_P1_DIALOGUE: readonly [string, string] = [
  '群猴：“要走很远，你还会回来吗？”',
  '美猴王：“我先去学会更多，再把经历讲给你们听。”',
];

/** Classic Card — 第一回·漂洋求师；动机不是寻宝、取经，也不是讨厌花果山。 */
export const C3_P1_CLASSIC_CARD =
  '原著第一回中，美猴王因为想到生命和时间都会改变而远行求师：跨海、访人间、再渡海，经过很久才找到师门。低龄可以说“他想学习怎样更有智慧地生活”，但不能改成寻宝或取经，也不是因为讨厌花果山。';

/** 故事—程序桥（teaching script C3）：三页是旅程的三个可读阶段。 */
export const C3_P1_STORY_BRIDGE =
  '这一章有三个 Page：离开花果山、经过海上、到达师门所在的山。每一页的动作、Wait 和声音让这个地点有内容，页面出口的数字把下一段接上去。今天先读懂他为什么要出发。';

// ─── 同屏地图 ────────────────────────────────────────────────────────────────
// 花果山、水帘洞与海面同时出现在一屏上；每个地点用它自己真实的场景图，
// 不在一张背景上画假的地标。

export interface C3P1MapPlace {
  id: string;
  label: string;
  hint: string;
  asset: string;
  alt: string;
}

export const C3_P1_MAP_PLACES: readonly C3P1MapPlace[] = [
  {
    id: 'flower-fruit-mountain',
    label: '花果山',
    hint: '果树、清泉和仙石都在这里——他长大的地方。',
    asset: JTW_C1_BACKGROUND_ASSET,
    alt: '花果山：桃树、清泉和山顶的仙石',
  },
  {
    id: 'water-curtain-cave',
    label: '水帘洞',
    hint: '第二章大家一起走进去的家，暖光还亮着。',
    asset: JTW_C2_RESOLVED_BACKGROUND_ASSET,
    alt: '水帘洞：水帘后面亮着暖光的洞口和湿石路线',
  },
  {
    id: 'open-sea',
    label: '海面',
    hint: '从家门口的沙滩往右看，海一直连到天边。',
    asset: JTW_C3_PAGE1_BACKGROUND,
    alt: '花果山海岸：左边是山和果树，右边的海一直连到天边',
  },
];
export const C3_P1_MAP_TITLE = '先在地图上指出三个地方（三个都要点到）';

/** 音频重放：故事里的海风。静音时仍然有可见的风纹。 */
export const C3_P1_AUDIO_ID = 'sea-wind';
export const C3_P1_AUDIO_LABEL = '▶ 听一听海风';
export const C3_P1_AUDIO_AGAIN_LABEL = '再听一次海风';
export const C3_P1_AUDIO_NOTE = '静音也能读：海风响的时候，海面上会出现三道风纹。';

// ─── 动机证据卡 ──────────────────────────────────────────────────────────────

/** 两张正确卡按“虽然…但是…所以…”的顺序排列；另有两张干扰卡。 */
export const C3_P1_MOTIVE_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'treasure-this-home', label: '珍惜现在的家', correct: true },
  { id: 'still-willing-to-learn', label: '仍愿意远行学习', correct: true },
  { id: 'want-treasure', label: '想拿宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
];
export const C3_P1_MOTIVE_CARD_ORDER: readonly string[] = [
  'treasure-this-home',
  'still-willing-to-learn',
];
export const C3_P1_MOTIVE_TITLE = '把两张真正的动机卡按“先舍不得、再决定出发”的顺序摆好';
export const C3_P1_MOTIVE_REJECT_HINT =
  '“想拿宝物”和“不喜欢伙伴”都不在正文里：他说的是“我会记得从哪里出发”，还答应“把经历讲给你们听”。';

// ─── Why 句式：虽然这里很快乐，但是他想到___，所以决定___ ────────────────────

export const C3_P1_WHY_SENTENCE_LEAD = '把句子说完整：“虽然这里很快乐，但是他想到——”';
export const C3_P1_WHY_BUT_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'life-and-time-change',
    label: '生命和时间都会改变，自己还有许多不明白的事',
    correct: true,
  },
  { id: 'friends-too-noisy', label: '伙伴太吵，住不下去了', correct: false },
  { id: 'treasure-across-sea', label: '海那边一定藏着宝物', correct: false },
];
export const C3_P1_WHY_SO_LEAD = '“——所以决定——”';
export const C3_P1_WHY_SO_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'go-find-a-master',
    label: '走很远的路，去找能教他学习和思考的师父',
    correct: true,
  },
  { id: 'bring-back-treasure', label: '去把宝物带回来分给大家', correct: false },
  { id: 'never-come-back', label: '再也不回花果山了', correct: false },
];

// ─── Prediction ──────────────────────────────────────────────────────────────

export const C3_P1_PREDICTION_QUESTION =
  '如果离家只是因为讨厌花果山，正文里哪一句就不成立了？';
export const C3_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'line-remember-where-i-started',
    label: '“我会记得从哪里出发，也会认真寻找答案。”',
    correct: true,
  },
  { id: 'line-friends-bring-wood', label: '“群猴帮他找来木头和藤条。”', correct: false },
  { id: 'line-many-things-unclear', label: '“自己还有许多不明白的事。”', correct: false },
];
export const C3_P1_PREDICTION_RETRY_HINT =
  '再回正文找一找：讨厌一个地方的人，不会说自己“会记得从哪里出发”，也不会答应把经历讲回来给大家听。';

// ─── resolved / story_after / continue ───────────────────────────────────────

/**
 * resolved_world_change. The scene also names 通向木筏材料的脚印 and 伙伴从玩耍
 * 转为准备. Neither has artwork: there is no footprint or loose-wood prop, and
 * `monkey-friends/group-neutral-v01.png` is ONE neutral group image, so it can
 * show the friends standing on the shore but never a play → prepare change.
 * `prop-raft-neutral-v01` is a FINISHED, lashed raft — the payoff the friends
 * have not built yet — so it would contradict this beat rather than illustrate
 * it. The copy therefore describes only the sea-route light the resolved
 * artwork really adds; the missing beats carry no completion evidence and are
 * recorded in the saga asset bible.
 */
export const C3_P1_RESOLVED_WORLD_CHANGE =
  '海面上那道风纹亮了起来，凉凉的青色一直连到天边——离开花果山的方向，第一次看得清清楚楚。群猴从山上下来，站到岸边和他一起看海。';
export const C3_P1_STORY_AFTER =
  '猴王把自己的愿望说清楚了，群猴决定帮他造一只真正能离岸的木筏。';
export const C3_P1_CONTINUE_LABEL = '一起造木筏';

export const C3_P1_LOCKED_HINT =
  '先在第二章 Part 8 把水帘洞的约定讲回来，再跟着美猴王走到海边。';
export const C3_P1_LOADING_HINT = '海风正把花果山的清晨吹开…';

// ─── Evidence rules — every gate below is measured, never assumed ────────────

/** Did the child really point at all three places on the map? */
export function c3p1MapPointed(places: readonly string[]): boolean {
  return C3_P1_MAP_PLACES.every((place) => places.includes(place.id));
}

/** Did the child read BOTH story screens (正文浏览证据)? */
export function c3p1StoryRead(screens: readonly string[]): boolean {
  return C3_P1_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

/** Only 珍惜现在的家 → 仍愿意远行学习 passes; a distractor breaks it. */
export function c3p1MotiveOrdered(order: readonly string[]): boolean {
  return (
    order.length === C3_P1_MOTIVE_CARD_ORDER.length &&
    C3_P1_MOTIVE_CARD_ORDER.every((cardId, index) => order[index] === cardId)
  );
}

export function c3p1WrongMotivePicked(order: readonly string[]): boolean {
  return C3_P1_MOTIVE_CARDS.some((card) => !card.correct && order.includes(card.id));
}

/** Both blanks of 虽然…但是…所以… answered from the story. */
export function c3p1WhySentenceDone(but: string | null, so: string | null): boolean {
  return (
    C3_P1_WHY_BUT_OPTIONS.find((option) => option.id === but)?.correct === true &&
    C3_P1_WHY_SO_OPTIONS.find((option) => option.id === so)?.correct === true
  );
}

export function c3p1PredictionDone(prediction: string | null): boolean {
  return C3_P1_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
}
