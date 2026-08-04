import type { BlocksProject } from '../blocksModel'
import {
  JTW_C5_P4_LESSON_ID,
  isCarryingSize,
  jtwC5P4ExactAst,
  jtwC5PlacedBlocks,
  runRuyiSizeTrace,
  ruyiInitialSize,
  sizeBuildAst,
  type JtwC5SizeStop,
} from '../jtwC5SizeBuild'

export const C5_P4_PART_ID = JTW_C5_P4_LESSON_ID
export const C5_P4_NEXT_PART_ID = 'jtw-s1-c5-p5'
export const C5_P4_CONTINUE_LABEL = '选择三段用途'

export const C5_P4_STORY_BEFORE = [
  '龙宫柱厅的窄门仍被金色柱影遮住。悟空站在刻度旁，没有急着带走它：先让每次大小变化都能被看清，才能知道最后是否真正适合携带。',
  'Grow、Reset和Shrink改变当前状态；Wait只留出观察时间。最后一个状态块决定结尾，Turn Right只是干扰，不能让金箍棒通过窄门。',
]

export const C5_P4_TARGET_OPTIONS = [
  { id: 'large-original-small', label: '大 → 原 → 小（最后适合携带）', correct: true },
  { id: 'small-original-large', label: '小 → 原 → 大（最后仍挡住窄门）', correct: false },
] as const

export const C5_P4_PREDICTION_OPTIONS = [
  { id: 'large-original-small', label: 'Grow后大、Reset后原、Shrink后小', correct: true },
  { id: 'large-small-original', label: 'Grow后大、Reset后小、Shrink后原', correct: false },
] as const

export const C5_P4_WAIT_OPTIONS = [
  { id: 'after-grow', label: 'Grow后的Wait帮助观众先比较大状态', correct: true },
  { id: 'turn', label: 'Turn Right帮助观众比较大小', correct: false },
] as const

export const C5_P4_RESOLVED_WORLD_CHANGE =
  '三个大小停点依次可辨，柱厅阴影分段缩短，窄门完全露出，水流也慢了下来；如意印只亮起半枚。'
export const C5_P4_STORY_AFTER =
  '悟空能站到刻度旁比较每段大小，却还要说明每段状态有什么用途，并确认结尾为什么适合带走。'

export interface C5P4BuildEvidence {
  projectId: string
  ast: string[]
  placedBlocks: string[]
  exactAst: boolean
  runCompleted: boolean
  sizeTrace: JtwC5SizeStop[]
  carrying: boolean
}

export async function c5p4BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
): Promise<C5P4BuildEvidence> {
  const sizeTrace = await runRuyiSizeTrace(project)
  const initialSize = ruyiInitialSize(project)
  return {
    projectId,
    ast: sizeBuildAst(project),
    placedBlocks: jtwC5PlacedBlocks(project),
    exactAst: jtwC5P4ExactAst(project),
    runCompleted: completedLessonIds.includes(C5_P4_PART_ID),
    sizeTrace,
    carrying: initialSize !== null && sizeTrace.length === 3 &&
      isCarryingSize(sizeTrace.at(-1)!.size, initialSize),
  }
}

export function c5p4Correct(
  options: ReadonlyArray<{ id: string; correct: boolean }>,
  value: string | null,
): boolean {
  return options.some((option) => option.id === value && option.correct)
}
