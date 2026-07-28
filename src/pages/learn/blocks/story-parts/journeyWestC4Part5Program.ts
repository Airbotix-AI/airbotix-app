import type { BlocksProject } from '../blocksModel'
import {
  JTW_C4_P5_LESSON_ID,
  jtwC4P5BuildVersion,
  jtwC4PlacedBlocks,
  type JtwC4P5Version,
} from '../jtwC4DualBuild'

export const C4_P5_PART_ID = JTW_C4_P5_LESSON_ID
export const C4_P5_NEXT_PART_ID = 'jtw-s1-c4-p6'
export const C4_P5_CONTINUE_LABEL = '检查排错的队伍'

export const C4_P5_STORY_BEFORE = [
  '名字牌稳定出现后，伙伴终于知道怎样称呼悟空。师父没有让所有动作一起抢先开始，而是请悟空等到有人邀请，再展示一项温和的小本领。',
  '三种选择都来自长期学习后的一次小展示，不等于完整修行，也不声称模拟七十二变。真正的选择会改变Tap链的动作、顺序和观众看见的结果。',
]

export const C4_P5_MOTIVE_OPTIONS = [
  { id: 'respond', label: '等观众准备好并Tap后，再回应邀请', correct: true },
  { id: 'show-off', label: '抢在别人开口前证明自己最厉害', correct: false },
] as const

export const C4_P5_VERSIONS: ReadonlyArray<{
  id: JtwC4P5Version
  title: string
  description: string
  prediction: string
  template: 'blocks_jtw_c4_p5_leap' | 'blocks_jtw_c4_p5_turn' | 'blocks_jtw_c4_p5_screen'
}> = [
  { id: 'leap', title: '跃过叶纹', description: 'Hop 2 → “我等到邀请了”', prediction: 'Tap后跃过两格叶纹并说出等待', template: 'blocks_jtw_c4_p5_leap' },
  { id: 'turn', title: '转身指家', description: 'Turn Left 2 → Wait 1 → “家在那边”', prediction: 'Tap后转身、停一下，再指出家的方向', template: 'blocks_jtw_c4_p5_turn' },
  { id: 'screen', title: '屏风再现', description: 'Hide → Wait 1 → Show → “再看这里”', prediction: 'Tap后先隐藏，停一下，再出现并说话', template: 'blocks_jtw_c4_p5_screen' },
]

export interface C4P5BuildEvidence {
  projectId: string
  version: JtwC4P5Version | null
  placedBlocks: string[]
  dualRunCompleted: boolean
}

export function c4p5BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
): C4P5BuildEvidence {
  return {
    projectId,
    version: jtwC4P5BuildVersion(project),
    placedBlocks: jtwC4PlacedBlocks(project),
    dualRunCompleted: completedLessonIds.includes(C4_P5_PART_ID),
  }
}

export function c4p5MotiveCorrect(value: string | null): boolean {
  return C4_P5_MOTIVE_OPTIONS.some((option) => option.id === value && option.correct)
}
