import { parseProject, type Block, type BlocksProject } from '../blocksModel'
import {
  C5_P2_CHARACTER_ID,
  runC5SizeProject,
  type C5SizeRunResult,
} from './journeyWestC5Part2Program'

export const C5_P3_PART_ID = 'jtw-s1-c5-p3'
export const C5_P3_NEXT_PART_ID = 'jtw-s1-c5-p4'

export const C5_P3_STORY = [
  '柱厅旁的干燥圆台画着大圈、原圈和小圈。孩子在自己的安全站位里用伸展、回到初始站姿、收拢表示三个大小状态，不接触同伴，也不模拟挥打。',
  '同样三张状态卡换一个顺序，最后留下的大小也会改变。身体动作帮助记住含义，真正的答案仍要回到程序：两条只读脚本都从 Start 运行到 End，并把真实大小轨迹留下来。',
] as const

export const C5_P3_STATE_CARDS = [
  { id: 'grow', label: '🔵 大 · Grow', correct: true },
  { id: 'reset_size', label: '🟡 原 · Reset', correct: true },
  { id: 'shrink', label: '🟢 小 · Shrink', correct: true },
]

export const C5_P3_ORDER_ONE = ['grow', 'reset_size', 'shrink']
export const C5_P3_ORDER_TWO = ['shrink', 'reset_size', 'grow']

export const C5_P3_FIRST_PREDICTIONS = [
  { id: 'first-small', label: '大 → 原 → 小最后留下小状态', correct: true },
  { id: 'first-large', label: '大 → 原 → 小最后留下大状态', correct: false },
] as const

export const C5_P3_SECOND_PREDICTIONS = [
  { id: 'second-large', label: '小 → 原 → 大最后留下大状态', correct: true },
  { id: 'second-small', label: '小 → 原 → 大最后留下小状态', correct: false },
] as const

export const C5_P3_RESET_EXPLANATIONS = [
  { id: 'middle-restore', label: 'Reset在中间恢复初始大小；后面的状态块仍会继续改变它', correct: true },
  { id: 'middle-ignore', label: 'Reset在中间可以忽略，因为它不会改变状态', correct: false },
] as const

export const C5_P3_BODY_ACTIONS = [
  { id: 'stretch', label: '🙌 Grow：在自己的圆圈里伸展' },
  { id: 'neutral', label: '🧘 Reset：回到初始站姿' },
  { id: 'gather', label: '🤲 Shrink：收拢身体' },
] as const

export const C5_P3_SAFETY_CONFIRMATION = 'own-space-no-contact-no-swinging'

function stateBlock(op: string): Block {
  if (op === 'grow' || op === 'shrink') return { op, n: 2 }
  return { op: 'reset_size' }
}

export function c5p3Project(order: readonly string[], lessonSuffix: string): BlocksProject {
  return parseProject(JSON.stringify({
    version: 1,
    name: `Journey to the West · C5 — State Order ${lessonSuffix}`,
    lessonId: C5_P3_PART_ID,
    pages: [
      {
        id: `jtw-c5-p3-${lessonSuffix}`,
        background: 'underwater',
        characters: [
          {
            id: C5_P2_CHARACTER_ID,
            name: 'Ruyi Staff',
            emoji: '🟨',
            start: { gx: 11, gy: 8, size: 2, rot: 0 },
            scripts: [
              {
                id: `ruyi-staff-${lessonSuffix}`,
                blocks: [
                  { op: 'when_flag' },
                  ...order.flatMap((op, index) => index < order.length - 1
                    ? [stateBlock(op), { op: 'wait' as const, n: 2 }]
                    : [stateBlock(op)]),
                  { op: 'end' },
                ],
              },
            ],
          },
        ],
      },
    ],
  }))
}

export const C5_P3_FIRST_PROJECT = c5p3Project(C5_P3_ORDER_ONE, 'large-original-small')
export const C5_P3_SECOND_PROJECT = c5p3Project(C5_P3_ORDER_TWO, 'small-original-large')

export async function runC5P3Variant(
  project: BlocksProject,
  sleep?: (ms: number) => Promise<void>,
): Promise<C5SizeRunResult> {
  return runC5SizeProject(project, sleep)
}

export function c5p3OrderDone(order: readonly string[], expected: readonly string[]): boolean {
  return order.length === expected.length && expected.every((id, index) => order[index] === id)
}

export function c5p3PredictionDone(value: string | null, variant: 'first' | 'second'): boolean {
  const options = variant === 'first' ? C5_P3_FIRST_PREDICTIONS : C5_P3_SECOND_PREDICTIONS
  return options.find((option) => option.id === value)?.correct === true
}

export function c5p3ResetDone(value: string | null): boolean {
  return C5_P3_RESET_EXPLANATIONS.find((option) => option.id === value)?.correct === true
}

export function c5p3RunsDiffer(first: C5SizeRunResult | null, second: C5SizeRunResult | null): boolean {
  if (!first || !second) return false
  return first.finalSize === 1.8 && second.finalSize === 2.2 &&
    first.stateTrace.map((step) => step.op).join(',') === C5_P3_ORDER_ONE.join(',') &&
    second.stateTrace.map((step) => step.op).join(',') === C5_P3_ORDER_TWO.join(',')
}
