import type { BlocksProject } from '../blocksModel'
import { jtwC4DualBuildMatches, jtwC4PlacedBlocks } from '../jtwC4DualBuild'

export const C4_P4_PART_ID = 'jtw-s1-c4-p4'
export const C4_P4_NEXT_PART_ID = 'jtw-s1-c4-p5'
export const C4_P4_TEMPLATE_ID = 'blocks_jtw_c4_p4'
export const C4_P4_CONTINUE_LABEL = '选择一个小展示'

export const C4_P4_STORY_BEFORE = [
  '师父为石猴取姓“孙”，又按门中排行给他法名“悟空”。这个名字不是换一张装饰贴纸：从这以后，伙伴和观众都能用同一个名字认识他；过去仍是花果山的石猴，未来会以悟空的名字行动。',
  '悟空在师门学习了很长时间。课程只选一个小小的“本领展示”来表达他学会响应不同的开始：Go时先完成得名故事，观众Tap他之后，他才展示动作。几块积木不等于完整修行，也不代表七十二变。',
]

export const C4_P4_CLASSIC_CARD =
  '原著第一至二回写猴王经过多年寻找，拜师得名并学习本领。课程尊重师父角色，不让AI Coach模仿宗教权威，也不把修行变成一按按钮就获得奖励。'

export const C4_P4_STORY_BRIDGE =
  'Start承载“进入场景就发生的得名”；On Tap承载“观众邀请后才发生的展示”。两个Trigger代表两个不同的故事条件。'

export const C4_P4_PREDICTION_OPTIONS = [
  { id: 'skill-quiet', label: '只按Go：名字链运行，本领链保持安静', correct: true },
  { id: 'both-run', label: '只按Go：名字和本领两条链一起运行', correct: false },
] as const

export const C4_P4_TAP_OPTIONS = [
  { id: 'leaf-after-tap', label: 'Tap后叶纹目标才亮起', correct: true },
  { id: 'leaf-before-tap', label: 'Go后叶纹目标已经亮起', correct: false },
] as const

export const C4_P4_RESOLVED_WORLD_CHANGE =
  '名字牌由Start稳定点亮；叶纹目标只在Tap后亮起，两条链各自走到End。'
export const C4_P4_STORY_AFTER =
  '伙伴先记住“孙悟空”这个名字，收到邀请后才看见小展示。师父请悟空下一步自己选择怎样回应，而不是抢在邀请前表演。'

export interface C4P4BuildEvidence {
  projectId: string
  placedBlocks: string[]
  programMatches: boolean
  dualRunCompleted: boolean
}

export function c4p4BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
): C4P4BuildEvidence {
  return {
    projectId,
    placedBlocks: jtwC4PlacedBlocks(project),
    programMatches: jtwC4DualBuildMatches(project),
    dualRunCompleted: completedLessonIds.includes(C4_P4_PART_ID),
  }
}

export function c4p4PredictionCorrect(value: string | null): boolean {
  return C4_P4_PREDICTION_OPTIONS.some((option) => option.id === value && option.correct)
}

export function c4p4TapPredictionCorrect(value: string | null): boolean {
  return C4_P4_TAP_OPTIONS.some((option) => option.id === value && option.correct)
}
