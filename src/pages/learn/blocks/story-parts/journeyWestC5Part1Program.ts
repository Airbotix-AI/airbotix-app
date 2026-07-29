import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C5_P1_PART_ID = 'jtw-s1-c5-p1'
export const C5_P1_NEXT_PART_ID = 'jtw-s1-c5-p2'

export const C5_P1_STORY =
  '悟空学成后回到花果山。他会许多本领，却还没有一件大小、重量和使用方式都适合自己的兵器。普通木棍一用力就弯了，石锤虽然结实，却不便使用和携带。伙伴说，东海深处有一道奇怪的金光，像一根巨大的柱影。悟空想找的不是“最大”的器物，而是一件自己拿得动、能改变大小、也便于携带的合适工具。于是，他把旧工具留在安全处，准备沿水纹去看清那道海底柱影。'

export const C5_P1_CLASSIC_CARD =
  '原著第三回中，悟空学艺回山后到龙宫寻兵器。本课保留“学艺在前、龙宫寻宝在后”的顺序，不把金箍棒写成师父赠送，也不表演争执或打斗。'

export const C5_P1_STORY_CARDS: JtwEvidenceOption[] = [
  { id: 'return-after-learning', label: '🏡 学成回家', correct: true },
  { id: 'old-tools-unsuitable', label: '🪵 旧工具不合适', correct: true },
  { id: 'undersea-shadow', label: '🌊 海底出现柱影', correct: true },
]
export const C5_P1_STORY_ORDER = C5_P1_STORY_CARDS.map((card) => card.id)

export const C5_P1_MOTIVE_OPTIONS: JtwEvidenceOption[] = [
  { id: 'wood-bent', label: '木棍弯了', correct: true },
  { id: 'hammer-hard-to-use', label: '石锤不便使用和携带', correct: true },
  { id: 'can-change-and-carry', label: '需要拿得动、能变大小、便于携带', correct: true },
  { id: 'defeat-an-enemy', label: '为了打败一个本章敌人', correct: false },
  { id: 'biggest-is-best', label: '越大就一定越合适', correct: false },
]

export const C5_P1_PREDICTION_QUESTION =
  '哪一条线索最能说明悟空需要的是“合适”，而不是“最大”？'
export const C5_P1_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'change-and-carry',
    label: '要拿得动、能改变大小，也便于携带',
    correct: true,
  },
  { id: 'largest-shadow', label: '海底的影子看起来最大', correct: false },
  { id: 'beat-someone', label: '需要用它打败一个敌人', correct: false },
]

export const C5_P1_RESOLVED_WORLD_CHANGE =
  '三张故事卡连成一条水纹路线；悟空把弯木棍和石锤留在安全处。'
export const C5_P1_STORY_AFTER =
  '悟空沿着水纹向海底下行。远处的柱厅仍被巨大阴影遮住：那根柱子原来有多大，最后又应该停在哪里？'
export const C5_P1_CONTINUE_LABEL = '潜入柱厅'

export function c5p1OrderDone(order: string[]): boolean {
  return order.length === C5_P1_STORY_ORDER.length &&
    C5_P1_STORY_ORDER.every((id, index) => order[index] === id)
}

export function c5p1MotiveDone(selected: string[]): boolean {
  if (selected.length < 2) return false
  const options = selected.map((id) => C5_P1_MOTIVE_OPTIONS.find((option) => option.id === id))
  return options.every((option) => option?.correct === true)
}

export function c5p1PredictionDone(prediction: string | null): boolean {
  return C5_P1_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true
}
