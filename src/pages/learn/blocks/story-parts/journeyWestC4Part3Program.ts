export const C4_P3_STORY = [
  '如果本领全接在Start后，悟空还没等师父问就抢先表演，观众会看不懂“得名”和“展示”的区别。',
  '把动作放回On Tap之后，悟空就会先介绍自己，再等观众邀请。',
] as const

export const C4_P3_TRIGGER_CHOICES = {
  start: [
    { id: 'scene-start', label: 'Start在等场景开始', correct: true },
    { id: 'audience-start', label: 'Start在等观众邀请', correct: false },
  ],
  tap: [
    { id: 'audience-tap', label: 'Tap在等观众邀请', correct: true },
    { id: 'scene-tap', label: 'Tap在等场景开始', correct: false },
  ],
} as const

export const C4_P3_PREDICTIONS = [
  { id: 'turn-before-invite', label: '举旗后，悟空会没等邀请就先转身', correct: true },
  { id: 'name-only', label: '举旗后只会介绍名字，动作会安静等待', correct: false },
] as const

export function c4p3ModelComplete(input: {
  startMeaning: string | null
  tapMeaning: string | null
  prediction: string | null
  actionCircle: string
  movedCards: readonly string[]
  rehearsals: readonly string[]
}): boolean {
  return input.startMeaning === 'scene-start'
    && input.tapMeaning === 'audience-tap'
    && input.prediction === 'turn-before-invite'
    && input.actionCircle === 'tap'
    && input.movedCards.length === 1
    && input.movedCards[0] === 'turn:start-to-tap'
    && input.rehearsals.includes('flag:name-only')
    && input.rehearsals.includes('paper-tap:turn')
}
