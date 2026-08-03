import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C4_P1_STORY =
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。';

export const C4_P1_DIALOGUE = [
  '师父：“你从哪里来？为什么走这么远？”',
  '石猴：“我从花果山来，想认真学习。”',
] as const;

export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门。这里不是寻宝、不是已经取经，也不是按一下就学会全部本领。';

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

export const C4_P1_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '因为还有许多不明白，所以愿意认真学习，再把经历带回家',
    correct: true,
  },
  { id: 'treasure-only', label: '因为山门里一定有宝物，所以只想进去找宝物', correct: false },
];

export const C4_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learning-and-return-conflict',
    label: '“愿意认真学习”和“把经历带回家”会互相矛盾',
    correct: true,
  },
  { id: 'long-road-conflict', label: '“走了很远”和“来到山门”会互相矛盾', correct: false },
];

export function c4p1RouteDone(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((id, index) => order[index] === id)
  );
}

export function c4p1MotivesDone(selected: readonly string[]): boolean {
  const correct = C4_P1_MOTIVE_OPTIONS.filter((option) => option.correct).map(
    (option) => option.id,
  );
  return selected.length === correct.length && correct.every((id) => selected.includes(id));
}

export function c4p1CorrectOption(
  options: readonly JtwEvidenceOption[],
  selected: string | null,
): boolean {
  return options.find((option) => option.id === selected)?.correct === true;
}
