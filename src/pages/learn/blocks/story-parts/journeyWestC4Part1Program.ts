import type { JtwEvidenceOption } from './journeyWestSeason1'
import { JTW_C1_BACKGROUND_ASSET } from './journeyWestSeason1'
import { JTW_C3_PAGE2_BACKGROUND, JTW_C3_PAGE3_BACKGROUND } from '../jtwC3Stage'

export const C4_P1_STORY_SCREENS: readonly [string, string] = [
  '石猴走了很远，终于来到安静的山门。他没有一进门就表演本领，而是先说明自己从花果山来，为什么愿意远行求学。师父听见的，不只是“我想变厉害”，还有他坚持寻找、愿意学习的心。',
  '师父问：“你从哪里来？为什么走这么远？”石猴回答：“我从花果山来，想认真学习，也想把学到的带回家。”门前的空木牌还没有名字；先把来处和理由讲清楚，才能走进下一段故事。',
]
export const C4_P1_SCREEN_IDS: readonly [string, string] = ['story-card-a', 'story-dialogue']
export const C4_P1_CLASSIC_CARD =
  '原著第一至二回中，石猴经过多年寻找来到师门，说明来意后才拜师得名。本课不把他写成寻宝、已经取经，或一按按钮就学会全部本领。'

export interface C4P1RouteCard extends JtwEvidenceOption {
  asset: string
  alt: string
}

export const C4_P1_ROUTE_CARDS: readonly C4P1RouteCard[] = [
  {
    id: 'flower-fruit-mountain',
    label: '花果山',
    correct: true,
    asset: JTW_C1_BACKGROUND_ASSET,
    alt: '花果山的桃树、清泉和仙石',
  },
  {
    id: 'sea-road',
    label: '海路',
    correct: true,
    asset: JTW_C3_PAGE2_BACKGROUND,
    alt: '木筏穿过很长的海路',
  },
  {
    id: 'master-gate',
    label: '师门',
    correct: true,
    asset: JTW_C3_PAGE3_BACKGROUND,
    alt: '山路尽头的师门石门',
  },
]
export const C4_P1_ROUTE_ORDER = ['flower-fruit-mountain', 'sea-road', 'master-gate'] as const

export const C4_P1_MOTIVE_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'learn-carefully', label: '愿意认真学', correct: true },
  { id: 'bring-learning-home', label: '想把所学带回家', correct: true },
  { id: 'find-shiny-treasure', label: '来找闪亮宝物', correct: false },
  { id: 'dislike-friends', label: '不喜欢伙伴', correct: false },
]
export const C4_P1_MOTIVE_IDS = ['learn-carefully', 'bring-learning-home'] as const

export const C4_P1_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-bring-back',
    label: '因为还有许多要学，所以走很远来到师门，也想把所学带回家',
    correct: true,
  },
  { id: 'treasure-only', label: '因为想拿宝物，所以只要门一开就够了', correct: false },
  { id: 'escape-home', label: '因为不喜欢伙伴，所以不想再提花果山', correct: false },
]

export const C4_P1_PREDICTION_QUESTION =
  '如果石猴只为寻宝，正文中哪两处会互相矛盾？'
export const C4_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-return-lines',
    label: '“想认真学习”与“想把学到的带回家”',
    correct: true,
  },
  { id: 'gate-and-nameplate', label: '“来到山门”与“空木牌还没有名字”', correct: false },
  { id: 'far-and-quiet', label: '“走了很远”与“安静的山门”', correct: false },
]

export const C4_P1_RESOLVED_WORLD_CHANGE =
  '山门的暖灯亮起，门只打开通往庭院的一条路，空名字牌也进入视野。'
export const C4_P1_STORY_AFTER =
  '门内听见了石猴的来处和理由；下一步要理解为什么一个名字会连接过去与未来。'

export function c4p1StoryRead(screens: readonly string[]): boolean {
  return C4_P1_SCREEN_IDS.every((screen) => screens.includes(screen))
}

export function c4p1RouteOrdered(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((id, index) => order[index] === id)
  )
}

export function c4p1MotivesDone(motives: readonly string[]): boolean {
  return (
    motives.length === C4_P1_MOTIVE_IDS.length &&
    C4_P1_MOTIVE_IDS.every((id) => motives.includes(id))
  )
}

export function c4p1WhyDone(why: string | null): boolean {
  return C4_P1_WHY_OPTIONS.find((option) => option.id === why)?.correct === true
}

export function c4p1PredictionDone(prediction: string | null): boolean {
  return C4_P1_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true
}
