import type { BlocksProject } from '../blocksModel'
import { jtwC4P5Choice, jtwC4PlacedBlocks } from '../jtwC4DualBuild'

export const C4_P5_PART_ID = 'jtw-s1-c4-p5'
export const C4_P5_NEXT_PART_ID = 'jtw-s1-c4-p6'
export const C4_P5_TEMPLATE_ID = 'blocks_jtw_c4_p5'
export const C4_P5_CONTINUE_LABEL = '检查排错的队伍'

export const C4_P5_STORY_BEFORE = [
  '悟空在师门学习了很长时间。今天他不需要抢先证明自己：名字先由Start介绍，温和的小展示要等伙伴准备好、真正Tap他之后才开始。',
  '这三种选择只表达一次回应，不代表完整修行，也不冒充七十二变。选择会改变Tap链的动作、顺序和可见结果。',
]

export const C4_P5_MOTIVE_OPTIONS = [
  { id: 'audience-ready', label: '因为伙伴先准备好，悟空才回应邀请', correct: true },
  { id: 'show-off-first', label: '因为悟空要抢在名字前证明自己最厉害', correct: false },
] as const

export const C4_P5_VERSION_OPTIONS = [
  { id: 'hop', label: '跃过叶纹：Hop 2 → “我等到邀请了” → End' },
  { id: 'turn', label: '转身指家：Turn Left 2 → Wait 1 → “家在那边” → End' },
  { id: 'reappear', label: '屏风再现：Hide → Wait 1 → Show → “再看这里” → End' },
] as const

export const C4_P5_PREDICTION_OPTIONS = [
  { id: 'chosen-after-tap', label: 'Go只显示名字；Tap后才出现我选择的回应', correct: true },
  { id: 'chosen-on-go', label: 'Go会自动播放名字和我选择的回应', correct: false },
] as const

export interface C4P5BuildEvidence {
  projectId: string
  placedBlocks: string[]
  version: string | null
  dualRunCompleted: boolean
}

export function c4p5BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
): C4P5BuildEvidence {
  return {
    projectId,
    placedBlocks: jtwC4PlacedBlocks(project),
    version: jtwC4P5Choice(project),
    dualRunCompleted: completedLessonIds.includes(C4_P5_PART_ID),
  }
}

export function c4p5MotiveCorrect(value: string | null): boolean {
  return C4_P5_MOTIVE_OPTIONS.some((option) => option.id === value && option.correct)
}

export function c4p5PredictionCorrect(value: string | null): boolean {
  return C4_P5_PREDICTION_OPTIONS.some((option) => option.id === value && option.correct)
}
