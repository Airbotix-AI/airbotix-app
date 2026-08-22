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
import { JTW_C1_BACKGROUND_ASSET, JTW_C2_RESOLVED_BACKGROUND_ASSET } from './journeyWestSeason1';
import { JTW_C3_PAGE1_BACKGROUND } from '../jtwC3Stage';

/**
 * story_before — teaching-script C3 故事卡A and 故事卡B IN FULL, two screens.
 * Part 1 of the teaching script co-reads both cards; the scene's Story Screen 1
 * is 故事卡A, and 故事卡B carries the farewell the motive evidence is read from.
 */
export const C3_P1_STORY_SCREENS: readonly [string, string] = [
  'The Monkey King and his friends have lived in Water Curtain Cave for a long time. One day, he realises that although Flower-Fruit Mountain is happy, life changes and he still has much to learn. He wants to find a teacher who can help him study, think and practise. This is his search for wisdom; the pilgrimage has not begun yet.',
  'The monkeys helped him find wood and rattan to make a raft. The Monkey King looked at Water Curtain Cave with some reluctance, but still said to his companion: "I will remember where I started from, and I will also look for the answer seriously." The raft left the shore, and Flower-Fruit Mountain slowly became smaller behind it.',
];
export const C3_P1_SCREEN_IDS: readonly [string, string] = ['story-card-a', 'story-card-b'];
export const C3_P1_NEXT_SCREEN_LABEL = 'Read the next paragraph';
export const C3_P1_PREV_SCREEN_LABEL = 'Go back to the previous paragraph';
export const C3_P1_UNREAD_HINT =
  'First read both paragraphs of text, and then move the card - the answer is in the text, not on the card.';

/** 原创对白（teaching script C3）：动机证据和预测都要从这两句里读出来。 */
export const C3_P1_DIALOGUE: readonly [string, string] = [
  'Group of monkeys: "We have to go a long way, will you come back?"',
  'Monkey King: "I will learn more first, and then I will tell you about my experience."',
];

/** Classic Card — 第一回·漂洋求师；动机不是寻宝、取经，也不是讨厌花果山。 */
export const C3_P1_CLASSIC_CARD =
  'In the first chapter of the original work, the Monkey King traveled far to seek his teacher because he thought that life and time would change: he crossed the sea, visited the world, and then crossed the sea again. It took a long time to find his teacher. A younger person can say "he wants to learn how to live more wisely", but it cannot be changed to treasure hunting or learning, nor is it because he hates Flower-Fruit Mountain.';

/** 故事—程序桥（teaching script C3）：三页是旅程的三个可读阶段。 */
export const C3_P1_STORY_BRIDGE =
  'This chapter has three pages: leaving Flower-Fruit Mountain, passing through the sea, and arriving at the mountain where the division gate is located. The actions, waits and sounds on each page add content to this location, and the page exit numbers connect the next paragraph. Today, let’s first understand why he set out.';

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
    label: 'Flower-Fruit Mountain',
    hint: 'Fruit trees, clear springs and fairy stones are all here - where he grew up.',
    asset: JTW_C1_BACKGROUND_ASSET,
    alt: 'Flower-Fruit Mountain: Peach trees, clear springs and fairy stones on the top of the mountain',
  },
  {
    id: 'water-curtain-cave',
    label: 'Water Curtain Cave',
    hint: 'Chapter 2 Everyone walked into the home together, and the warm light was still on.',
    asset: JTW_C2_RESOLVED_BACKGROUND_ASSET,
    alt: 'Water Curtain Cave: The cave entrance and wet stone route with warm light behind the water curtain',
  },
  {
    id: 'open-sea',
    label: 'sea ​​surface',
    hint: 'Looking to the right from the beach in front of my house, the sea stretches all the way to the horizon.',
    asset: JTW_C3_PAGE1_BACKGROUND,
    alt: 'Flower-Fruit Mountain Coast: There are mountains and fruit trees on the left, and the sea on the right stretches to the horizon.',
  },
];
export const C3_P1_MAP_TITLE = 'First point out three places on the map (click on all three)';

/** 音频重放：故事里的海风。静音时仍然有可见的风纹。 */
export const C3_P1_AUDIO_ID = 'sea-wind';
export const C3_P1_AUDIO_LABEL = '▶ Listen to the sea breeze';
export const C3_P1_AUDIO_AGAIN_LABEL = 'Listen to the sea breeze again';
export const C3_P1_AUDIO_NOTE =
  'Can be read even on mute: When the sea breeze blows, three wind patterns will appear on the sea surface.';

// ─── 动机证据卡 ──────────────────────────────────────────────────────────────

/** 两张正确卡按“虽然…但是…所以…”的顺序排列；另有两张干扰卡。 */
export const C3_P1_MOTIVE_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'treasure-this-home', label: 'Cherish your current home', correct: true },
  { id: 'still-willing-to-learn', label: 'Still willing to travel far to study', correct: true },
  { id: 'want-treasure', label: 'Want to get the treasure', correct: false },
  { id: 'dislike-friends', label: "don't like partner", correct: false },
];
export const C3_P1_MOTIVE_CARD_ORDER: readonly string[] = [
  'treasure-this-home',
  'still-willing-to-learn',
];
export const C3_P1_MOTIVE_TITLE =
  'Put the two real motivation cards in the order of "first be reluctant to leave, then decide to go"';
export const C3_P1_MOTIVE_REJECT_HINT =
  '"Want to get the treasure" and "Don\'t like partners" are not in the text: what he said was "I will remember where to start" and promised to "tell you about the experience."';

// ─── Why 句式：虽然这里很快乐，但是他想到___，所以决定___ ────────────────────

export const C3_P1_WHY_SENTENCE_LEAD =
  'Complete the sentence: "Although it was happy here, he thought-"';
export const C3_P1_WHY_BUT_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'life-and-time-change',
    label: 'Life and time will change, and there are still many things I don’t understand.',
    correct: true,
  },
  {
    id: 'friends-too-noisy',
    label: "My partner is too noisy and I can't live here anymore.",
    correct: false,
  },
  {
    id: 'treasure-across-sea',
    label: 'There must be a treasure hidden on the other side of the sea',
    correct: false,
  },
];
export const C3_P1_WHY_SO_LEAD = '"——So I decided——"';
export const C3_P1_WHY_SO_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'go-find-a-master',
    label: 'Go a long way to find a master who can teach him to learn and think',
    correct: true,
  },
  {
    id: 'bring-back-treasure',
    label: 'Go and bring the treasure back and distribute it to everyone',
    correct: false,
  },
  { id: 'never-come-back', label: 'Never return to Flower-Fruit Mountain again', correct: false },
];

// ─── Prediction ──────────────────────────────────────────────────────────────

export const C3_P1_PREDICTION_QUESTION =
  'If you leave home just because you hate Flower-Fruit Mountain, which sentence in the text would not be true?';
export const C3_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'line-remember-where-i-started',
    label: '“I will remember where I started from and I will look for answers carefully.”',
    correct: true,
  },
  {
    id: 'line-friends-bring-wood',
    label: '"The monkeys helped him find wood and rattan."',
    correct: false,
  },
  {
    id: 'line-many-things-unclear',
    label: '"There are still many things I don\'t understand."',
    correct: false,
  },
];
export const C3_P1_PREDICTION_RETRY_HINT =
  'Go back to the text and search: People who hate a place will not say that they "will remember where they started from", nor will they agree to tell everyone their experiences.';

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
  'The wind pattern on the sea lit up, and the cool blue color continued to the horizon - leaving the direction of Flower-Fruit Mountain, it was clearly visible for the first time. A group of monkeys came down from the mountain and stood on the shore to watch the sea with him.';
export const C3_P1_STORY_AFTER =
  'The monkey king made his wish clear, and the monkeys decided to help him build a raft that could actually leave the shore.';
export const C3_P1_CONTINUE_LABEL = 'Build a raft together';

export const C3_P1_LOCKED_HINT =
  'Let’s talk about the promise of Water Curtain Cave in Chapter 2, Part 8, and then follow the Monkey King to the beach.';
export const C3_P1_LOADING_HINT =
  'The sea breeze is blowing away the morning of Flower-Fruit Mountain...';

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
