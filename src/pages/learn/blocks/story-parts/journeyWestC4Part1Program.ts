import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P1_PART_ID = 'jtw-s1-c4-p1'
export const C4_P1_NEXT_PART_ID = 'jtw-s1-c4-p2'

export const C4_P1_SCREEN_IDS = ['gate-arrival', 'why-he-came'] as const

export const C4_P1_STORY_SCREENS: readonly [string, string] = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来。海风、木筏和长长的山路都留在身后，旧布带还系在身上。门前的名字牌仍是空的，因为这里还没有谁叫孙悟空。',
  '师父问：“你从哪里来？为什么走这么远？”石猴回答：“我从花果山来，想认真学习。等我学会更多，也想把所学带回家。”师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习，也没有忘记伙伴的心。',
]

export const C4_P1_CLASSIC_CARD =
  '原著第一至二回里，石猴经过多年寻找来到师门，说明来意后才拜师得名。本课不把他写成寻宝、已经取经，或一按按钮就学成本领。'

export const C4_P1_ROUTE_ORDER = ['flower-fruit-mountain', 'sea-road', 'master-gate'] as const
export const C4_P1_ROUTE_CARDS: JtwEvidenceOption[] = [
  { id: 'flower-fruit-mountain', label: '花果山', correct: true },
  { id: 'sea-road', label: '海路', correct: true },
  { id: 'master-gate', label: '师门', correct: true },
]

export const C4_P1_MOTIVE_IDS = ['ready-to-learn', 'bring-learning-home'] as const
export const C4_P1_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'ready-to-learn', label: '愿意认真学', correct: true },
  { id: 'bring-learning-home', label: '想把所学带回家', correct: true },
  { id: 'shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
]

export const C4_P1_WHY_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '因为他愿意认真学习，也想把所学带回花果山，所以走了很远来到师门。',
    correct: true,
  },
  {
    id: 'treasure-only',
    label: '因为他只想找闪亮宝物，所以离开了不喜欢的伙伴。',
    correct: false,
  },
]

export const C4_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'learning-and-home-conflict',
    label: '“想认真学习”和“想把所学带回家”都会对不上。',
    correct: true,
  },
  { id: 'route-only', label: '只有“经过海路”会对不上。', correct: false },
]

export function c4p1StoryRead(screens: readonly string[]): boolean {
  return C4_P1_SCREEN_IDS.every((screen) => screens.includes(screen))
}

export function c4p1RouteOrdered(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((card, index) => order[index] === card)
  )
}

export function c4p1MotivesCorrect(selected: readonly string[]): boolean {
  return (
    selected.length === C4_P1_MOTIVE_IDS.length &&
    C4_P1_MOTIVE_IDS.every((motive) => selected.includes(motive))
  )
}

export function c4p1WrongMotiveSelected(selected: readonly string[]): boolean {
  return selected.some(
    (id) => C4_P1_MOTIVE_OPTIONS.find((option) => option.id === id)?.correct === false,
  )
}

export function c4p1CorrectChoice(
  options: readonly JtwEvidenceOption[],
  selected: string | null,
): boolean {
  return options.find((option) => option.id === selected)?.correct === true
}
