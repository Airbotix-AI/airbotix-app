import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C4_P1_PART_ID = 'jtw-s1-c4-p1';
export const C4_P1_NEXT_PART_ID = 'jtw-s1-c4-p2';

export const C4_P1_STORY_SCREENS: readonly [string, string] = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。',
  '师父问：“你从哪里来？为什么走这么远？”石猴回答：“我从花果山来，想认真学习。我也想把学到的东西带回家，讲给伙伴们听。”门内的人先听清他的来处和理由，才把通往庭院的门打开。',
];
export const C4_P1_SCREEN_IDS: readonly [string, string] = [
  'story-card-a',
  'story-card-a-dialogue',
];
export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门，说明来意后拜师。本课不把这段写成寻宝、已经取经，或一按按钮就学会本领。';

export const C4_P1_ROUTE_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'flower-fruit-mountain', label: '花果山', correct: true },
  { id: 'sea-route', label: '海路', correct: true },
  { id: 'master-gate', label: '师门', correct: true },
];
export const C4_P1_ROUTE_ORDER = ['flower-fruit-mountain', 'sea-route', 'master-gate'] as const;

export const C4_P1_MOTIVE_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'willing-to-learn', label: '愿意认真学', correct: true },
  { id: 'bring-learning-home', label: '想把所学带回家', correct: true },
  { id: 'find-shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
];
export const C4_P1_MOTIVE_IDS = ['willing-to-learn', 'bring-learning-home'] as const;

export const C4_P1_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '因为他想认真学习，也想把学到的东西带回家，所以走过海路来到师门。',
    correct: true,
  },
  { id: 'treasure', label: '因为师门藏着闪亮宝物，所以他离开伙伴来寻找。', correct: false },
  { id: 'already-skilled', label: '因为他已经学会所有本领，所以来表演给师父看。', correct: false },
];

export const C4_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-home-conflict',
    label: '“想认真学习”和“把学到的东西带回家”都会和寻宝说法矛盾。',
    correct: true,
  },
  { id: 'route-conflict', label: '“经过海路”会和寻宝说法矛盾。', correct: false },
  { id: 'gate-conflict', label: '“山门很安静”会和寻宝说法矛盾。', correct: false },
];

export function c4p1StoryRead(screens: readonly string[]): boolean {
  return C4_P1_SCREEN_IDS.every((screen) => screens.includes(screen));
}

export function c4p1RouteOrdered(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((card, index) => order[index] === card)
  );
}

export function c4p1MotivesComplete(motives: readonly string[]): boolean {
  return (
    motives.length === C4_P1_MOTIVE_IDS.length &&
    C4_P1_MOTIVE_IDS.every((motive) => motives.includes(motive))
  );
}

export function c4p1CorrectChoice(
  options: readonly JtwEvidenceOption[],
  choice: string | null,
): boolean {
  return options.find((option) => option.id === choice)?.correct === true;
}
