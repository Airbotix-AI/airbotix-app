import type { BlocksProject } from '../blocksModel'
import { BlocksRunner } from '../interpreter'
import { JTW_C4_WUKONG_ID } from '../jtwC4DualBuild'

export const C4_P8_PART_ID = 'jtw-s1-c4-p8'
export const C4_P8_NEXT_PART_ID = 'jtw-s1-c5-p1'
export const C4_P8_SEAL_ID = 'jtw-s1-c4-name-seal'

export const C4_P8_CAUSE_CARDS = [
  { id: 'leave-home', label: '离开花果山', correct: true },
  { id: 'explain-purpose', label: '到门前说明来意', correct: true },
  { id: 'receive-name', label: '得到名字', correct: true },
  { id: 'learn-over-time', label: '经过学习', correct: true },
  { id: 'wait-invitation', label: '等待邀请', correct: true },
  { id: 'show-skill', label: '展示本领', correct: true },
] as const

export const C4_P8_CAUSE_ORDER = C4_P8_CAUSE_CARDS.map((card) => card.id)

export const C4_P8_RETELL_OPTIONS = [
  {
    id: 'linked-name-and-events',
    label: '因为石猴愿意远行求学，所以师父听见来意后给他名字；结果他经过学习，后来先等邀请再展示。',
    correct: true,
  },
  { id: 'blocks-only', label: '后来用了 Start、Tap、Say 和 End。', correct: false },
  { id: 'instant-mastery', label: '因为按了 Go，所以悟空马上学会了所有本领。', correct: false },
] as const

export const C4_P8_TEXT_OPTIONS = [
  { id: 'willing-to-learn', label: '“我从花果山来，想认真学习。”', correct: true },
  { id: 'tap-op', label: 'Tap 是一种 Trigger。', correct: false },
] as const

export const C4_P8_DEBUG_OPTIONS = [
  { id: 'skill-was-on-start', label: 'P6第一次偏离：本领误接在 Start 后，Go 时抢跑。', correct: true },
  { id: 'name-was-wrong', label: 'P6第一次偏离：名字牌写错了。', correct: false },
] as const

export function c4p8CardsOrdered(order: readonly string[]): boolean {
  return order.length === C4_P8_CAUSE_ORDER.length &&
    order.every((value, index) => value === C4_P8_CAUSE_ORDER[index])
}

export function c4p8Correct(
  value: string | null,
  options: ReadonlyArray<{ id: string; correct: boolean }>,
): boolean {
  return options.some((option) => option.id === value && option.correct)
}

export interface C4P8RunEvidence {
  startTrace: string[]
  tapTrace: string[]
  startStoppedAtEnd: boolean
  tapStoppedAtEnd: boolean
}

export async function runC4P8SavedProject(
  project: BlocksProject,
  sleep?: (ms: number) => Promise<void>,
): Promise<C4P8RunEvidence> {
  const page = project.pages[0]
  const character = page?.characters.find((candidate) => candidate.id === JTW_C4_WUKONG_ID)
  if (!page || !character) {
    return { startTrace: [], tapTrace: [], startStoppedAtEnd: false, tapStoppedAtEnd: false }
  }

  const trace: string[] = []
  const runner = new BlocksRunner(page, {
    onSprite: () => undefined,
    onSay: () => undefined,
    onNote: () => undefined,
    onSound: () => undefined,
    onGotoPage: () => undefined,
    onStep: (_characterId, scriptId, index) => {
      if (index < 0) return
      const op = character.scripts.find((script) => script.id === scriptId)?.blocks[index]?.op
      if (op) trace.push(op)
    },
  }, sleep)

  await runner.runFlag()
  const startTrace = ['when_flag', ...trace]
  trace.length = 0
  runner.resetAll()
  await runner.runTap(JTW_C4_WUKONG_ID)
  const tapTrace = ['when_tap', ...trace]
  return {
    startTrace,
    tapTrace,
    startStoppedAtEnd: startTrace.at(-1) === 'end',
    tapStoppedAtEnd: tapTrace.at(-1) === 'end',
  }
}

export function c4p8RunComplete(run: C4P8RunEvidence | null): boolean {
  return Boolean(
    run?.startStoppedAtEnd &&
    run.tapStoppedAtEnd &&
    run.startTrace[0] === 'when_flag' &&
    run.tapTrace[0] === 'when_tap',
  )
}
