import { BlocksRunner } from '../interpreter'
import type { Block, BlocksProject } from '../blocksModel'
import {
  RUYI_SIZE_SCRIPT_ID,
  RUYI_STAFF_ID,
  findRuyiTargetScript,
  sameBlocksWithOnlyResetMoved,
  sizeBuildAst,
} from '../jtwC5SizeBuild'
import type { JtwEvidenceOption } from './journeyWestSeason1'

export const C5_P6_PART_ID = 'jtw-s1-c5-p6'
export const C5_P6_NEXT_PART_ID = 'jtw-s1-c5-p7'
export const C5_P6_CONTINUE_LABEL = '制作我的如意故事'

export const C5_P6_STORY_BEFORE = [
  '悟空已经分清了“最大”和“最合适”。他想让金箍棒先变大让伙伴看清原貌，再回到初始状态比较，最后变小以便携带。',
  '可是这次运行结束时，窄门又被挡住了。先说出预期，再从 Start 运行错误版，保留每一步的大小轨迹，找到程序第一次偏离的位置。',
] as const

export const C5_P6_STORY_AFTER =
  '悟空现在能指出：Reset 不是倒带，它会恢复初始大小。把它放在 Shrink 前面后，金箍棒最后稳定在适合携带的小状态，窄门重新打开。下一步，他要制作自己的三段大小故事。'

export const C5_P6_PREDICTION =
  '我预测最后是小状态；实际若回到原状态，第一次偏离应在最后Reset。'

export const C5_P6_EXPECTATION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'final-small', label: '最后应是可携带的小状态', correct: true },
  { id: 'final-initial', label: '最后应恢复初始大小', correct: false },
]

export const C5_P6_ACTUAL_OPTIONS: JtwEvidenceOption[] = [
  { id: 'reset-restored-initial', label: '实际又回到原状态，窄门被挡住', correct: true },
  { id: 'shrink-stayed-small', label: '实际稳定停在小状态', correct: false },
]

export const C5_P6_DEVIATION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'final-reset', label: '第一次偏离在末尾 Reset 执行时', correct: true },
  { id: 'grow-two', label: '第一次偏离在 Grow 2 执行时', correct: false },
]

export const C5_P6_EXPLANATION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'last-state-wins',
    label: '最后是小状态，因为最后一个状态块是 Shrink 2',
    correct: true,
  },
  { id: 'reset-is-rewind', label: 'Reset 会把整段程序倒带到开头', correct: false },
]

export const C5_P6_STAFF_ID = RUYI_STAFF_ID
export const C5_P6_SCRIPT_ID = RUYI_SIZE_SCRIPT_ID
export const C5_P6_PAGE_ID = 'jtw-c5-size-page'

export const C5_P6_BUG_BLOCKS: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'grow', n: 2 },
  { op: 'wait', n: 5 },
  { op: 'shrink', n: 2 },
  { op: 'reset_size' },
  { op: 'end' },
]

export const C5_P6_FIXED_BLOCKS: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'grow', n: 2 },
  { op: 'wait', n: 5 },
  { op: 'reset_size' },
  { op: 'shrink', n: 2 },
  { op: 'end' },
]

function cloneBlock(block: Block): Block {
  return { ...block, body: block.body?.map(cloneBlock) }
}

function exactBlock(actual: Block | undefined, expected: Block): boolean {
  return actual?.op === expected.op && actual.n === expected.n && actual.text === expected.text
}

function exactBlocks(actual: readonly Block[] | undefined, expected: readonly Block[]): boolean {
  return actual?.length === expected.length &&
    expected.every((block, index) => exactBlock(actual[index], block))
}

function debugBlocks(project: BlocksProject): Block[] | undefined {
  if (project.lessonId !== C5_P6_PART_ID || project.pages.length !== 1) return undefined
  const page = project.pages[0]
  const staff = page?.characters.find((character) => character.id === C5_P6_STAFF_ID)
  if (page?.id !== C5_P6_PAGE_ID || !staff || staff.scripts.length !== 1) return undefined
  return findRuyiTargetScript(project)?.blocks
}

export function createC5P6BugProject(): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C5 — Reset Debug',
    lessonId: C5_P6_PART_ID,
    pages: [{
      id: C5_P6_PAGE_ID,
      background: 'jtw-s1-c5-pillar-hall',
      characters: [{
        id: C5_P6_STAFF_ID,
        name: 'Ruyi Staff',
        emoji: '🦯',
        start: { gx: 10, gy: 8, size: 1, rot: 0 },
        scripts: [{
          id: C5_P6_SCRIPT_ID,
          blocks: C5_P6_BUG_BLOCKS.map(cloneBlock),
        }],
      }],
    }],
  }
}

export function c5p6BugMatches(project: BlocksProject): boolean {
  return exactBlocks(debugBlocks(project), C5_P6_BUG_BLOCKS)
}

export function c5p6FixedMatches(project: BlocksProject): boolean {
  return exactBlocks(debugBlocks(project), C5_P6_FIXED_BLOCKS)
}

export function moveOnlyC5P6Reset(project: BlocksProject): BlocksProject | null {
  if (!c5p6BugMatches(project)) return null
  const repaired = structuredClone(project)
  const blocks = debugBlocks(repaired)
  if (!blocks) return null
  const resetIndex = blocks.findIndex((block) => block.op === 'reset_size')
  if (resetIndex !== 4 || blocks.filter((block) => block.op === 'reset_size').length !== 1) {
    return null
  }
  const [reset] = blocks.splice(resetIndex, 1)
  blocks.splice(3, 0, reset)
  return c5p6FixedMatches(repaired) ? repaired : null
}

export function c5p6Ast(project: BlocksProject): string[] {
  return sizeBuildAst(project)
}

export function c5p6SingleResetDiff(before: BlocksProject, after: BlocksProject): string[] {
  if (!c5p6BugMatches(before) || !c5p6FixedMatches(after)) return []
  const beforeBlocks = debugBlocks(before)
  const afterBlocks = debugBlocks(after)
  if (!beforeBlocks || !afterBlocks || !sameBlocksWithOnlyResetMoved(beforeBlocks, afterBlocks)) {
    return []
  }
  return [`${C5_P6_STAFF_ID}/debug:reset_size:4→3`]
}

export interface C5P6RunEvidence {
  opTrace: string[]
  stateTrace: string[]
  finalSize: number
  stoppedAtEnd: boolean
}

export async function runC5P6Project(
  project: BlocksProject,
  sleep: (ms: number) => Promise<void> = async () => undefined,
): Promise<C5P6RunEvidence> {
  const page = project.pages[0]
  const staff = page?.characters.find((character) => character.id === C5_P6_STAFF_ID)
  const script = staff?.scripts.find((candidate) => candidate.id === C5_P6_SCRIPT_ID)
  if (!page || !staff || !script) {
    return { opTrace: [], stateTrace: [], finalSize: 0, stoppedAtEnd: false }
  }

  const opTrace: string[] = ['when_flag']
  const stateTrace: string[] = []
  let currentOp: string | null = null
  const runner = new BlocksRunner(page, {
    onSprite: (characterId, state) => {
      if (characterId !== C5_P6_STAFF_ID || !currentOp) return
      if (currentOp === 'grow' || currentOp === 'shrink' || currentOp === 'reset_size') {
        stateTrace.push(`${currentOp}:${state.size.toFixed(1)}`)
      }
    },
    onSay: () => undefined,
    onNote: () => undefined,
    onSound: () => undefined,
    onGotoPage: () => undefined,
    onStep: (characterId, scriptId, index) => {
      if (characterId !== C5_P6_STAFF_ID || scriptId !== C5_P6_SCRIPT_ID || index < 0) return
      currentOp = script.blocks[index]?.op ?? null
      if (currentOp) opTrace.push(currentOp)
    },
  }, sleep)
  await runner.runFlag()
  const finalSize = runner.state(C5_P6_STAFF_ID)?.size ?? 0
  return {
    opTrace,
    stateTrace,
    finalSize,
    stoppedAtEnd: opTrace.at(-1) === 'end',
  }
}

export function c5p6RunMatchesProject(
  run: C5P6RunEvidence | null,
  project: BlocksProject,
): boolean {
  if (!run?.stoppedAtEnd) return false
  const expected = c5p6Ast(project)
  return run.opTrace.length === expected.length &&
    expected.every((token, index) => run.opTrace[index] === token.split(':')[0])
}

export function c5p6RunsEqual(
  first: C5P6RunEvidence | null,
  second: C5P6RunEvidence | null,
): boolean {
  return Boolean(
    first && second &&
    first.finalSize === second.finalSize &&
    JSON.stringify(first.opTrace) === JSON.stringify(second.opTrace) &&
    JSON.stringify(first.stateTrace) === JSON.stringify(second.stateTrace),
  )
}

export function c5p6AnswerCorrect(options: JtwEvidenceOption[], value: string | null): boolean {
  return options.some((option) => option.id === value && option.correct)
}
