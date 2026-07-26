import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P1_PART_ID = 'jtw-s1-c4-p1'
export const C4_P1_NEXT_PART_ID = 'jtw-s1-c4-p2'

export const C4_P1_STORY_SCREENS = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。',
  '师父问：“你从哪里来？为什么走这么远？”石猴回答：“我从花果山来，想认真学习。学会以后，我还想把懂得的事带回家。”山门里安静了一会儿。门内听见的不是寻宝计划，而是一段走了很久、仍愿意认真学习的来路。',
] as const

export const C4_P1_SCREEN_IDS = ['story-card-a', 'gate-dialogue'] as const

export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门。本课不把他写成寻宝、已经取经，或一按按钮就学会本领。'

export const C4_P1_ROUTE_CARDS: JtwEvidenceOption[] = [
  { id: 'flower-fruit-mountain', label: '🍑 花果山', correct: true },
  { id: 'sea-route', label: '🌊 海路', correct: true },
  { id: 'master-gate', label: '⛩ 师门', correct: true },
]
export const C4_P1_ROUTE_ORDER = C4_P1_ROUTE_CARDS.map((card) => card.id)

export const C4_P1_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'learn-carefully', label: '愿意认真学', correct: true },
  { id: 'bring-learning-home', label: '想把所学带回家', correct: true },
  { id: 'find-shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
]
export const C4_P1_MOTIVE_IDS = ['learn-carefully', 'bring-learning-home']

export const C4_P1_PREDICTION_QUESTION =
  '如果石猴只是为了寻宝，正文里的哪两处会互相矛盾？'
export const C4_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label: '“想认真学习”和“把懂得的事带回家”都不像寻宝',
    correct: true,
  },
  { id: 'sea-and-gate', label: '海路和山门不能同时出现', correct: false },
  { id: 'name-board', label: '空名字牌还没有字', correct: false },
]

export const C4_P1_WHY_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'because-learn-and-share',
    label: '因为他愿意认真学习，还想把所学带回家',
    correct: true,
  },
  { id: 'because-treasure', label: '因为山门里藏着闪亮宝物', correct: false },
]

export const C4_P1_RESOLVED_WORLD_CHANGE =
  '山门的暖灯亮了，门只打开通往庭院的一条路，空名字牌进入视野。'
export const C4_P1_STORY_AFTER =
  '门内听见了石猴的来处和理由。下一步，要理解为什么一个名字会连接过去与未来。'
export const C4_P1_CONTINUE_LABEL = '看看空木牌'

export function c4p1StoryRead(screens: string[]): boolean {
  return C4_P1_SCREEN_IDS.every((id) => screens.includes(id))
}

export function c4p1RouteDone(order: string[]): boolean {
  return order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((id, index) => order[index] === id)
}

export function c4p1MotivesDone(selected: string[]): boolean {
  return selected.length === C4_P1_MOTIVE_IDS.length &&
    C4_P1_MOTIVE_IDS.every((id) => selected.includes(id))
}

export function c4p1Correct(optionId: string | null, options: JtwEvidenceOption[]): boolean {
  return options.find((option) => option.id === optionId)?.correct === true
}
