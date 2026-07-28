import type { BlocksProject } from '../blocksModel'
import {
  JTW_C4_P6_LESSON_ID,
  jtwC4P6FixedVersion,
  jtwC4P6TriggerDiff,
  type JtwC4P5Version,
} from '../jtwC4DualBuild'

export const C4_P6_PART_ID = JTW_C4_P6_LESSON_ID
export const C4_P6_NEXT_PART_ID = 'jtw-s1-c4-p7'
export const C4_P6_CONTINUE_LABEL = '制作我的认识卡'

export const C4_P6_STORY_BEFORE = [
  '一阵风把悟空完整的本领小链吹到了Start入口。动作和顺序都没有变，可按Go以后，名字和本领连续自动发生，观众还没有邀请。',
  '悟空说：“先别急着改动作。我们先找程序第一次和‘Go只得名，Tap才展示’不一样的地方。”',
]

export const C4_P6_EXPECT_OPTIONS = [
  { id: 'separate', label: 'Go只得名并等待，Tap才完整展示', correct: true },
  { id: 'automatic', label: 'Go后名字和本领一起自动发生', correct: false },
] as const

export const C4_P6_DEVIATION_OPTIONS = [
  { id: 'skill-trigger', label: '本领小链用了Start入口', correct: true },
  { id: 'action-parameter', label: '本领动作的数字不够大', correct: false },
] as const

export const C4_P6_TEMPLATES: Record<JtwC4P5Version, 'blocks_jtw_c4_p6_leap' | 'blocks_jtw_c4_p6_turn' | 'blocks_jtw_c4_p6_screen'> = {
  leap: 'blocks_jtw_c4_p6_leap',
  turn: 'blocks_jtw_c4_p6_turn',
  screen: 'blocks_jtw_c4_p6_screen',
}

export interface C4P6BuildEvidence {
  projectId: string
  version: JtwC4P5Version | null
  triggerDiff: string[]
  dualRunCompleted: boolean
}

export function c4p6BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
): C4P6BuildEvidence {
  return {
    projectId,
    version: jtwC4P6FixedVersion(project),
    triggerDiff: jtwC4P6TriggerDiff(project),
    dualRunCompleted: completedLessonIds.includes(C4_P6_PART_ID),
  }
}

export function c4p6AnswerCorrect(
  options: ReadonlyArray<{ id: string; correct: boolean }>,
  value: string | null,
): boolean {
  return options.some((option) => option.id === value && option.correct)
}
