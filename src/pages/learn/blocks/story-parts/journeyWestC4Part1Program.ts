import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C4_P1_STORY = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。',
  '师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。石猴说：“我从花果山来，想认真学习，也想把所学带回家。”',
] as const;

export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门。本课不把他写成寻宝、已经取经，或一按按钮就立刻学成本领。';

export const C4_P1_ROUTE_CARDS: JtwEvidenceOption[] = [
  { id: 'flower-fruit-mountain', label: '花果山', correct: true },
  { id: 'sea-route', label: '海路', correct: true },
  { id: 'master-gate', label: '师门', correct: true },
];
export const C4_P1_ROUTE_ORDER = ['flower-fruit-mountain', 'sea-route', 'master-gate'] as const;

export const C4_P1_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'ready-to-learn', label: '愿意认真学', correct: true },
  { id: 'bring-learning-home', label: '想把所学带回家', correct: true },
  { id: 'find-shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
];

export const C4_P1_WHY_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '因为他愿意认真学习，所以走过海路来到师门；后来还想把所学带回家。',
    correct: true,
  },
  { id: 'treasure', label: '因为师门藏着闪亮宝物，所以他来取走宝物。', correct: false },
  { id: 'already-skilled', label: '因为他已经学会本领，所以来山门表演。', correct: false },
];

export const C4_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'learning-and-home-conflict',
    label: '“愿意认真学”和“想把所学带回家”都会对不上。',
    correct: true,
  },
  { id: 'route-conflict', label: '“走过海路”会对不上。', correct: false },
  { id: 'gate-conflict', label: '“来到山门”会对不上。', correct: false },
];

export function c4p1RouteDone(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((id, index) => order[index] === id)
  );
}

export function c4p1MotiveDone(selected: readonly string[]): boolean {
  const correct = C4_P1_MOTIVE_OPTIONS.filter((option) => option.correct).map(
    (option) => option.id,
  );
  return selected.length === correct.length && correct.every((id) => selected.includes(id));
}

export function c4p1CorrectChoice(
  options: readonly JtwEvidenceOption[],
  selected: string | null,
): boolean {
  return options.find((option) => option.id === selected)?.correct === true;
}
