import {
  parseProject,
  serializeProject,
  type BlockOp,
  type BlocksProject,
} from '../blocksModel'
import { BlocksRunner } from '../interpreter'

export const C5_P2_PART_ID = 'jtw-s1-c5-p2'
export const C5_P2_NEXT_PART_ID = 'jtw-s1-c5-p3'
export const C5_P2_CHARACTER_ID = 'ruyi-staff'

export const C5_P2_STORY = [
  '悟空潜入东海柱厅，看见一根巨大的金色柱子挡住窄门。它不是一开始就能带走的小棒。柱厅的刻度写着“大、原、小”，悟空先站在刻度外观察，没有拿起它。',
  '程序会让金箍棒先变大、恢复初始大小，再缩小。Reset不是把故事倒着播放，也不是什么都没做；它把当前大小恢复到出发时的大小。最后一个状态块决定运行结束时留下什么大小。',
] as const

export const C5_P2_CLASSIC_CARD =
  '原著第三回中，悟空到龙宫寻找合适兵器，并取得能改变大小的如意金箍棒。本课观察大小状态，不表演挥打、威胁或争执。'

export const C5_P2_PREDICTIONS = [
  { id: 'small-after-shrink', label: '最后留下小状态，因为最后的状态块是 Shrink', correct: true },
  { id: 'original-after-reset', label: '最后留下原状态，因为程序中出现过 Reset', correct: false },
  { id: 'large-after-grow', label: '最后留下大状态，因为 Grow 最先运行', correct: false },
] as const

export const C5_P2_RESET_EXPLANATIONS = [
  { id: 'restore-initial', label: 'Reset 把当前大小恢复到初始大小，然后程序继续向后运行', correct: true },
  { id: 'rewind-story', label: 'Reset 把整段故事倒着播放回开头', correct: false },
  { id: 'do-nothing', label: 'Reset 什么也没做，所以可以忽略', correct: false },
] as const

export const C5_P2_COMPARISONS = [
  { id: 'prediction-matched-small', label: '我的预测与实际相同：End 前最后留下小状态', correct: true },
  { id: 'prediction-missed-large', label: '实际最后留下大状态', correct: false },
] as const

export const C5_P2_PROJECT: BlocksProject = parseProject(JSON.stringify({
  version: 1,
  name: 'Journey to the West · C5 — Staff Size Demo',
  lessonId: C5_P2_PART_ID,
  pages: [
    {
      id: 'jtw-c5-p2-page',
      background: 'underwater',
      characters: [
        {
          id: C5_P2_CHARACTER_ID,
          name: 'Ruyi Staff',
          emoji: '🟨',
          start: { gx: 11, gy: 8, size: 2, rot: 0 },
          scripts: [
            {
              id: 'ruyi-staff-size-demo',
              blocks: [
                { op: 'when_flag' },
                { op: 'grow', n: 2 },
                { op: 'wait', n: 5 },
                { op: 'reset_size' },
                { op: 'wait', n: 5 },
                { op: 'shrink', n: 2 },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    },
  ],
}))

export const C5_P2_EXPECTED_OP_TRACE: readonly BlockOp[] = [
  'when_flag',
  'grow',
  'wait',
  'reset_size',
  'wait',
  'shrink',
  'end',
]

export interface C5SizeStateStep {
  op: 'grow' | 'reset_size' | 'shrink'
  size: number
}

export interface C5SizeRunResult {
  opTrace: BlockOp[]
  stateTrace: C5SizeStateStep[]
  finalSize: number
  serializedProject: string
}

export async function runC5SizeProject(
  source: BlocksProject,
  sleep?: (ms: number) => Promise<void>,
): Promise<C5SizeRunResult> {
  const project = parseProject(serializeProject(source))
  const page = project.pages[0]
  const character = page.characters[0]
  const script = character.scripts[0]
  const opTrace: BlockOp[] = [script.blocks[0].op]
  const stateTrace: C5SizeStateStep[] = []
  let activeStateOp: C5SizeStateStep['op'] | null = null

  const runner = new BlocksRunner(
    page,
    {
      onSprite: (characterId, state) => {
        if (characterId !== character.id || !activeStateOp) return
        stateTrace.push({ op: activeStateOp, size: state.size })
        activeStateOp = null
      },
      onSay: () => undefined,
      onNote: () => undefined,
      onSound: () => undefined,
      onGotoPage: () => undefined,
      onStep: (_characterId, scriptId, blockIndex) => {
        if (scriptId !== script.id || blockIndex < 1) return
        const op = script.blocks[blockIndex]?.op
        if (!op) return
        opTrace.push(op)
        activeStateOp = op === 'grow' || op === 'reset_size' || op === 'shrink' ? op : null
      },
    },
    sleep,
  )
  await runner.runFlag()

  return {
    opTrace,
    stateTrace,
    finalSize: runner.state(character.id)?.size ?? character.start.size,
    serializedProject: serializeProject(project),
  }
}

export function c5p2PredictionDone(value: string | null): boolean {
  return C5_P2_PREDICTIONS.find((option) => option.id === value)?.correct === true
}

export function c5p2ResetDone(value: string | null): boolean {
  return C5_P2_RESET_EXPLANATIONS.find((option) => option.id === value)?.correct === true
}

export function c5p2ComparisonDone(value: string | null): boolean {
  return C5_P2_COMPARISONS.find((option) => option.id === value)?.correct === true
}

export function c5p2RunDone(run: C5SizeRunResult | null): boolean {
  if (!run) return false
  return run.opTrace.join(',') === C5_P2_EXPECTED_OP_TRACE.join(',') &&
    run.stateTrace.length === 3 &&
    run.stateTrace[0].op === 'grow' && run.stateTrace[0].size === 2.2 &&
    run.stateTrace[1].op === 'reset_size' && run.stateTrace[1].size === 2 &&
    run.stateTrace[2].op === 'shrink' && run.stateTrace[2].size === 1.8 &&
    run.finalSize === 1.8
}

export function c5SizeTraceEvidence(run: C5SizeRunResult): string[] {
  return run.stateTrace.map((step) => `${step.op}:${step.size.toFixed(1)}`)
}

export function restoreC5SizeRun(
  opTrace: readonly string[] | undefined,
  sizeTrace: readonly string[] | undefined,
  finalState: string | undefined,
  project: BlocksProject,
): C5SizeRunResult | null {
  if (!opTrace || !sizeTrace || !finalState?.startsWith('size:')) return null
  const stateTrace = sizeTrace.map((entry) => {
    const [op, rawSize] = entry.split(':')
    if ((op !== 'grow' && op !== 'reset_size' && op !== 'shrink') || !Number.isFinite(Number(rawSize))) {
      return null
    }
    return { op, size: Number(rawSize) }
  })
  if (stateTrace.some((step) => step === null)) return null
  const finalSize = Number(finalState.slice('size:'.length))
  if (!Number.isFinite(finalSize)) return null
  return {
    opTrace: [...opTrace] as BlockOp[],
    stateTrace: stateTrace as C5SizeStateStep[],
    finalSize,
    serializedProject: serializeProject(project),
  }
}
