import type { BlocksProject } from '../blocksModel'
import {
  JTW_C5_P5_LESSON_ID,
  astChangedFromP4,
  isCarryingSize,
  jtwC5P5ValidAst,
  runRuyiSizeTrace,
  ruyiInitialSize,
  sizeBuildAst,
  type JtwC5SizeStop,
} from '../jtwC5SizeBuild'

export const C5_P5_PART_ID = JTW_C5_P5_LESSON_ID
export const C5_P5_NEXT_PART_ID = 'jtw-s1-c5-p6'
export const C5_P5_CONTINUE_LABEL = '检查最后一块'

export const C5_P5_STORY_BEFORE = [
  '悟空重新打开自己在Part 4搭好的大小链。窄门很低，弯曲水道不能容下横挡的巨大柱影，回程还要穿过水帘；“最大”并不自动等于“最合适”。',
  '他要为大、原、小三个停点分配用途，并真的改变一次状态顺序或Wait节奏。最终状态若不适合携带，窄门安全线不会出现。',
]

export const C5_P5_ENVIRONMENT_OPTIONS = [
  { id: 'narrow-door', label: '窄门限制最后可携带的大小', correct: true },
  { id: 'curved-waterway', label: '弯曲水道不能让巨大柱影横挡', correct: true },
  { id: 'brightest', label: '选最亮的状态就一定能通过', correct: false },
] as const

export const C5_P5_USE_OPTIONS = {
  large: ['看见原貌', '比较初始', '准备携带'],
  original: ['比较初始', '看见原貌', '准备携带'],
  small: ['准备携带', '看见原貌', '比较初始'],
} as const

export const C5_P5_PREDICTION_OPTIONS = [
  { id: 'three-readable-stops', label: '三个停点依次读出用途，最后小状态通过窄门', correct: true },
  { id: 'largest-wins', label: '只要出现过最大状态，结尾是什么都能通过', correct: false },
] as const

export const C5_P5_RESOLVED_WORLD_CHANGE =
  '三张用途标签依次出现；真实结尾保持携带状态后，窄门安全线才亮起。'
export const C5_P5_STORY_AFTER =
  '悟空能解释自己的选择，但下一次运行末尾藏着一块Reset，合适状态又会丢失。'

export interface C5P5BuildEvidence {
  projectId: string
  beforeAst: string[]
  afterAst: string[]
  validAst: boolean
  changedOrderOrRhythm: boolean
  runCompleted: boolean
  sizeTrace: JtwC5SizeStop[]
  carrying: boolean
}

export async function c5p5BuildEvidence(
  projectId: string,
  project: BlocksProject,
  completedLessonIds: readonly string[],
  beforeAst: readonly string[],
): Promise<C5P5BuildEvidence> {
  const sizeTrace = await runRuyiSizeTrace(project)
  const initialSize = ruyiInitialSize(project)
  return {
    projectId,
    beforeAst: [...beforeAst],
    afterAst: sizeBuildAst(project),
    validAst: jtwC5P5ValidAst(project),
    changedOrderOrRhythm: astChangedFromP4(beforeAst, project),
    runCompleted: completedLessonIds.includes(C5_P5_PART_ID),
    sizeTrace,
    carrying: initialSize !== null && sizeTrace.length === 3 &&
      isCarryingSize(sizeTrace.at(-1)!.size, initialSize),
  }
}

export function c5p5EnvironmentValid(selected: readonly string[]): boolean {
  const unique = new Set(selected)
  return unique.size === 2 && unique.has('narrow-door') && unique.has('curved-waterway')
}

export function c5p5UsesValid(uses: Record<'large' | 'original' | 'small', string>): boolean {
  return uses.large === '看见原貌' &&
    uses.original === '比较初始' &&
    uses.small === '准备携带'
}

export function c5p5PredictionCorrect(value: string | null): boolean {
  return C5_P5_PREDICTION_OPTIONS.some((option) => option.id === value && option.correct)
}
