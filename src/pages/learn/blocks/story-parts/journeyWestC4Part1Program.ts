import type { JtwEvidenceOption } from './journeyWestSeason1';
import { JTW_C1_BACKGROUND_ASSET } from './journeyWestSeason1';
import {
  JTW_C3_PAGE2_RESOLVED_BACKGROUND,
  JTW_C3_PAGE3_RESOLVED_BACKGROUND,
} from '../jtwC3Stage';

export const C4_P1_SCREEN_IDS = ['gate-story-a', 'gate-dialogue'] as const;

export const C4_P1_STORY_SCREENS = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。',
  '师父问：“你从哪里来？为什么走这么远？”石猴回答：“我从花果山来，想认真学习。”他还记得家里的伙伴：学到真正的本领以后，他想把所学带回家。',
] as const;

export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门。本课不把他写成寻宝、已经取经，或一按按钮就立刻学成本领。';

export const C4_P1_ROUTE_CARDS = [
  {
    id: 'flower-fruit-mountain',
    label: '花果山',
    hint: '他从伙伴生活的家出发',
    asset: JTW_C1_BACKGROUND_ASSET,
  },
  {
    id: 'sea-route',
    label: '海路',
    hint: '木筏和长路在中间',
    asset: JTW_C3_PAGE2_RESOLVED_BACKGROUND,
  },
  {
    id: 'master-gate',
    label: '师门',
    hint: '多年寻找以后来到山门',
    asset: JTW_C3_PAGE3_RESOLVED_BACKGROUND,
  },
] as const;

export const C4_P1_ROUTE_ORDER = C4_P1_ROUTE_CARDS.map((card) => card.id);

export const C4_P1_MOTIVE_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'learn-carefully', label: '愿意认真学', correct: true },
  { id: 'bring-learning-home', label: '想把所学带回家', correct: true },
  { id: 'find-shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
];

export const C4_P1_PREDICTION_QUESTION = '如果石猴只为寻宝，正文中哪两处会互相矛盾？';
export const C4_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '“想认真学习”和“想把所学带回家”',
    correct: true,
  },
  { id: 'gate-and-sea', label: '“来到山门”和“走过海路”', correct: false },
  { id: 'far-and-quiet', label: '“走了很远”和“山门安静”', correct: false },
];

export const C4_P1_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learning-links-home',
    label: '因为他珍惜伙伴，也愿意认真学习，所以远行不是为了丢下过去。',
    correct: true,
  },
  {
    id: 'treasure-makes-strong',
    label: '因为宝物会让他马上变厉害，所以他不需要说明来意。',
    correct: false,
  },
];

export const C4_P1_RESOLVED_WORLD_CHANGE =
  '山门的暖灯亮起，门只打开通往庭院的一条路，空名字牌进入视野。';
export const C4_P1_STORY_AFTER =
  '门内听见了石猴的来处和理由。下一步要理解为什么一个名字会连接过去与未来。';
export const C4_P1_CONTINUE_LABEL = '看看空木牌';

export function c4p1StoryRead(screenIds: readonly string[]): boolean {
  return C4_P1_SCREEN_IDS.every((id) => screenIds.includes(id));
}

export function c4p1RouteOrdered(route: readonly string[]): boolean {
  return (
    route.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((id, index) => route[index] === id)
  );
}

export function c4p1MotivesDone(motives: readonly string[]): boolean {
  const correct = C4_P1_MOTIVE_OPTIONS.filter((option) => option.correct).map(
    (option) => option.id,
  );
  return motives.length === correct.length && correct.every((id) => motives.includes(id));
}

export function c4p1ChoiceCorrect(
  options: readonly JtwEvidenceOption[],
  choice: string | null,
): boolean {
  return options.find((option) => option.id === choice)?.correct === true;
}
