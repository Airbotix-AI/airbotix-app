import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C4_P8_PART_ID = 'jtw-s1-c4-p8'
export const C4_P8_NEXT_PART_ID = 'jtw-s1-c5-p1'
export const C4_P8_SEAL_ID = 'jtw-s1-c4-naming-seal'

export const C4_P8_STORY_BEFORE = [
  '石猴走了很远，在门前说清来意，得到“孙悟空”这个名字，又经过很长时间学习。名字连接他的来处和以后，但名字和几块积木都不等于一下子学完整修行。',
  '同伴先按 Go，名字牌和“我是孙悟空”出现；本领安静等待。只有同伴真的轻点悟空，他选择的小展示才运行到 End。现在请打开 Part 7 真正保存的作品，把这段因果完整讲回来。',
] as const

export const C4_P8_CLASSIC_CARD =
  '原著第一至二回写猴王经过多年寻找，拜师得名孙悟空，并在长期学习后展示本领。课程只用一个温和小展示练习 Start 与 Tap，不把它写成完整修行或七十二变。'

export const C4_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'leave-home', label: '🏝 离开花果山', correct: true },
  { id: 'explain-purpose', label: '⛩ 到门前说明来意', correct: true },
  { id: 'receive-name', label: '🏷 得到名字', correct: true },
  { id: 'learn-over-time', label: '📚 经过学习', correct: true },
  { id: 'wait-for-invitation', label: '👆 等待邀请', correct: true },
  { id: 'show-skill', label: '✨ 展示本领', correct: true },
]

export const C4_P8_CAUSE_ORDER = [
  'leave-home',
  'explain-purpose',
  'receive-name',
  'learn-over-time',
  'wait-for-invitation',
  'show-skill',
] as const

export const C4_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-story-and-events',
    label:
      '因为石猴想认真学习，所以他从花果山远行、在门前说明来意；结果他得到孙悟空这个名字，经过学习后仍先等观众邀请；后来 Go 只让名字出现，Tap 才让本领展示到 End，他带着名字和来处回家。',
    correct: true,
  },
  { id: 'blocks-only', label: 'Start、Show、Say、End、Tap、Hop、Wait、End。', correct: false },
  { id: 'instant-learning', label: '他得到名字，按一下按钮就学会了全部本领。', correct: false },
]

export const C4_P8_TEXT_EVIDENCE: JtwEvidenceOption[] = [
  { id: 'came-to-learn', label: '“我从花果山来，想认真学习。”', correct: true },
  { id: 'treasure', label: '“我远行只是为了寻找闪亮宝物。”', correct: false },
]

export const C4_P8_RUN_EVIDENCE: JtwEvidenceOption[] = [
  { id: 'two-trigger-traces', label: 'Go 轨迹只走名字链，真实 Tap 才走本领链，两条都到 End。', correct: true },
  { id: 'auto-played', label: 'Go 自动把名字和本领全部播放完。', correct: false },
]

export const C4_P8_DEBUG_EVIDENCE: JtwEvidenceOption[] = [
  { id: 'wrong-trigger-first', label: 'P6 第一次偏离是本领用了错误的 Start Trigger。', correct: true },
  { id: 'wait-too-long', label: 'P6 第一次偏离只是 Wait 太久。', correct: false },
]

export function c4p8CardsOrdered(order: readonly string[]): boolean {
  return order.length === C4_P8_CAUSE_ORDER.length && C4_P8_CAUSE_ORDER.every((id, index) => order[index] === id)
}

export function c4p8Correct(options: JtwEvidenceOption[], selected: string | null): boolean {
  return options.find((option) => option.id === selected)?.correct === true
}

export type C4P8ContinueChoice = 'now' | 'later'
