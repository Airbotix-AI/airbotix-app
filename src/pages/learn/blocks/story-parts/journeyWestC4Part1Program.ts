import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P1_STORY_SCREENS = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。',
  '师父问：“你从哪里来？为什么走这么远？”石猴回答：“我从花果山来，想认真学习。学会以后，我还想把经历带回家，讲给伙伴们听。”山门里安静地亮起一盏暖灯。',
] as const

export const C4_P1_SCREEN_IDS = ['story-card-a', 'story-dialogue'] as const

export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门，说明来意，之后才得到名字并学习本领。本课不把他写成寻宝、已经取经，或一按按钮立刻学成本领。'

export const C4_P1_ROUTE_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'flower-fruit-mountain', label: '花果山', correct: true },
  { id: 'sea-route', label: '海路', correct: true },
  { id: 'master-gate', label: '师门', correct: true },
]

export const C4_P1_ROUTE_ORDER = ['flower-fruit-mountain', 'sea-route', 'master-gate'] as const

export const C4_P1_MOTIVE_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'learn-seriously', label: '愿意认真学', correct: true },
  { id: 'bring-learning-home', label: '想把所学带回家', correct: true },
  { id: 'find-shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
]

export const C4_P1_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-share',
    label: '因为他还有许多想学的事，所以远行求师；学会后还想把经历讲给伙伴。',
    correct: true,
  },
  { id: 'treasure-only', label: '因为他只想拿到山门里的宝物。', correct: false },
  { id: 'leave-friends', label: '因为他不想再见到花果山的伙伴。', correct: false },
]

export const C4_P1_PREDICTION_QUESTION =
  '如果石猴只为寻宝，正文中哪两处会互相矛盾？'

export const C4_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '“想认真学习”与“把经历带回家讲给伙伴”',
    correct: true,
  },
  { id: 'gate-and-sea', label: '“安静的山门”与“走过海路”', correct: false },
  { id: 'master-and-monkey', label: '“师父问话”与“石猴回答”', correct: false },
]

export const C4_P1_RESOLVED_WORLD_CHANGE =
  '山门的暖灯亮起，门只打开通往庭院的一条路；一块空名字牌在石阶尽头进入视野。'

export const C4_P1_STORY_AFTER =
  '门内听见了石猴的来处和理由。下一步，他要理解为什么一个名字会连接过去与未来。'

export function c4p1StoryRead(screens: readonly string[]): boolean {
  return C4_P1_SCREEN_IDS.every((id) => screens.includes(id))
}

export function c4p1RouteOrdered(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((id, index) => order[index] === id)
  )
}

export function c4p1MotivesDone(motives: readonly string[]): boolean {
  const expected = C4_P1_MOTIVE_OPTIONS.filter((option) => option.correct).map(
    (option) => option.id,
  )
  return motives.length === expected.length && expected.every((id) => motives.includes(id))
}

export function c4p1WhyDone(why: string | null): boolean {
  return C4_P1_WHY_OPTIONS.find((option) => option.id === why)?.correct === true
}

export function c4p1PredictionDone(prediction: string | null): boolean {
  return C4_P1_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true
}
