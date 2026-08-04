import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P1_STORY_BEFORE = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。',
  '师父问：“你从哪里来？为什么走这么远？”石猴回答：“我从花果山来，想认真学习，也想把学到的带回家。”',
] as const

export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门。本课不把他写成寻宝、已经取经，或一按按钮立刻学成本领。'

export const C4_P1_ROUTE_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'flower-fruit-mountain', label: '花果山', correct: true },
  { id: 'sea-route', label: '海路', correct: true },
  { id: 'master-gate', label: '师门', correct: true },
]
export const C4_P1_ROUTE_ORDER = ['flower-fruit-mountain', 'sea-route', 'master-gate'] as const

export const C4_P1_MOTIVE_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'learn-carefully', label: '“想认真学习”', correct: true },
  { id: 'bring-learning-home', label: '“想把学到的带回家”', correct: true },
  { id: 'find-shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
]

export const C4_P1_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '因为他想认真学习，也想把所学带回家，所以走过花果山、海路来到师门。',
    correct: true,
  },
  { id: 'treasure-only', label: '因为师门藏着宝物，所以他来拿走宝物。', correct: false },
  { id: 'already-skilled', label: '因为他已经学会所有本领，所以来表演。', correct: false },
]

export const C4_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learning-and-home-conflict',
    label: '“想认真学习”和“想把学到的带回家”都会与只为寻宝互相矛盾。',
    correct: true,
  },
  { id: 'route-conflict', label: '“经过海路”会互相矛盾。', correct: false },
  { id: 'gate-conflict', label: '“来到山门”会互相矛盾。', correct: false },
]

export function c4p1RouteDone(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((card, index) => order[index] === card)
  )
}

export function c4p1MotivesDone(selected: readonly string[]): boolean {
  const correct = C4_P1_MOTIVE_OPTIONS.filter((option) => option.correct).map((option) => option.id)
  return selected.length === correct.length && correct.every((id) => selected.includes(id))
}

export function c4p1Correct(
  options: readonly JtwEvidenceOption[],
  selected: string | null,
): boolean {
  return options.find((option) => option.id === selected)?.correct === true
}

export const C4_P1_RESOLVED_WORLD_CHANGE =
  '山门的暖灯亮起，门只打开通往庭院的一条路，空名字牌进入视野。'
export const C4_P1_STORY_AFTER =
  '门内听见了石猴的来处和理由。下一步，他要理解为什么一个名字会连接过去与未来。'
