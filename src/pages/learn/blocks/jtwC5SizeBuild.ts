import { BlocksRunner, type SpriteState } from './interpreter'
import type { Block, BlocksProject, Script } from './blocksModel'

export const RUYI_STAFF_ID = 'ruyi-staff'
export const RUYI_SIZE_SCRIPT_ID = 'ruyi-staff/size-build'
export const JTW_C5_P4_LESSON_ID = 'jtw-s1-c5-p4'
export const JTW_C5_P5_LESSON_ID = 'jtw-s1-c5-p5'

export const JTW_C5_P4_TARGET_BLOCKS: readonly Block[] = [
  { op: 'when_flag' },
  { op: 'grow', n: 2 },
  { op: 'wait', n: 5 },
  { op: 'reset_size' },
  { op: 'shrink', n: 2 },
  { op: 'end' },
]

export interface JtwC5SizeStop {
  op: 'grow' | 'reset_size' | 'shrink'
  size: number
}

export function findRuyiTargetScript(project: BlocksProject): Script | null {
  const scripts = project.pages
    .flatMap((page) => page.characters)
    .filter((character) => character.id === RUYI_STAFF_ID)
    .flatMap((character) => character.scripts)
    .filter((script) => script.id === RUYI_SIZE_SCRIPT_ID)
  return scripts.length === 1 ? scripts[0] : null
}

export function blockSignature(block: Block): string {
  if (block.op === 'say') return `${block.op}:${block.text ?? ''}`
  return block.n === undefined ? block.op : `${block.op}:${block.n}`
}

export function sizeBuildAst(project: BlocksProject): string[] {
  return findRuyiTargetScript(project)?.blocks.map(blockSignature) ?? []
}

export function jtwC5P4ExactAst(project: BlocksProject): boolean {
  if (project.lessonId !== JTW_C5_P4_LESSON_ID) return false
  const actual = sizeBuildAst(project)
  const target = JTW_C5_P4_TARGET_BLOCKS.map(blockSignature)
  return actual.length === target.length && target.every((block, index) => actual[index] === block)
}

export function jtwC5PlacedBlocks(project: BlocksProject): string[] {
  const script = findRuyiTargetScript(project)
  if (!script) return []
  return script.blocks.slice(1, -1).map(blockSignature)
}

export function isCarryingSize(finalSize: number, initialSize: number): boolean {
  return finalSize < initialSize - 0.05
}

export function ruyiInitialSize(project: BlocksProject): number | null {
  for (const page of project.pages) {
    const character = page.characters.find((candidate) => candidate.id === RUYI_STAFF_ID)
    if (character) return character.start.size
  }
  return null
}

export async function runRuyiSizeTrace(project: BlocksProject): Promise<JtwC5SizeStop[]> {
  const page = project.pages.find((candidate) =>
    candidate.characters.some((character) => character.id === RUYI_STAFF_ID),
  )
  const character = page?.characters.find((candidate) => candidate.id === RUYI_STAFF_ID)
  const script = findRuyiTargetScript(project)
  if (!page || !character || !script) return []

  const sizeOps = script.blocks.filter(
    (block): block is Block & { op: JtwC5SizeStop['op'] } =>
      block.op === 'grow' || block.op === 'reset_size' || block.op === 'shrink',
  )
  const stops: JtwC5SizeStop[] = []
  let nextSizeOp = 0
  let previousSize = character.start.size
  const host = {
    onSprite: (charId: string, state: SpriteState) => {
      if (charId !== RUYI_STAFF_ID || Math.abs(state.size - previousSize) < 0.001) return
      const block = sizeOps[nextSizeOp]
      if (block) stops.push({ op: block.op, size: state.size })
      nextSizeOp += 1
      previousSize = state.size
    },
    onSay: () => undefined,
    onNote: () => undefined,
    onSound: () => undefined,
    onGotoPage: () => undefined,
  }
  const runner = new BlocksRunner(page, host, async () => undefined)
  await runner.runFlag()
  return stops
}

export function sameBlocksWithOnlyResetMoved(before: readonly Block[], after: readonly Block[]): boolean {
  const resetIndexes = (blocks: readonly Block[]) => blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.op === 'reset_size')
  const beforeReset = resetIndexes(before)
  const afterReset = resetIndexes(after)
  if (beforeReset.length !== 1 || afterReset.length !== 1) return false
  if (beforeReset[0].index === afterReset[0].index) return false
  const withoutReset = (blocks: readonly Block[]) => blocks
    .filter((block) => block.op !== 'reset_size')
    .map(blockSignature)
  return JSON.stringify(withoutReset(before)) === JSON.stringify(withoutReset(after))
}

export const JTW_C5_USE_SAYS = ['看见原貌', '比较初始', '准备携带'] as const

export function jtwC5P5ValidAst(project: BlocksProject): boolean {
  if (project.lessonId !== JTW_C5_P5_LESSON_ID) return false
  const script = findRuyiTargetScript(project)
  if (!script) return false
  const blocks = script.blocks
  if (blocks[0]?.op !== 'when_flag' || blocks.at(-1)?.op !== 'end') return false
  const middle = blocks.slice(1, -1)
  const sizeBlocks = middle.filter((block) =>
    block.op === 'grow' || block.op === 'reset_size' || block.op === 'shrink',
  )
  const waits = middle.filter((block) => block.op === 'wait' && block.n === 5)
  const says = middle.filter(
    (block) => block.op === 'say' && JTW_C5_USE_SAYS.includes(block.text as typeof JTW_C5_USE_SAYS[number]),
  )
  const allowed = middle.every((block) =>
    (block.op === 'grow' && block.n === 2) ||
    block.op === 'reset_size' ||
    (block.op === 'shrink' && block.n === 2) ||
    (block.op === 'wait' && block.n === 5) ||
    (block.op === 'say' && JTW_C5_USE_SAYS.includes(block.text as typeof JTW_C5_USE_SAYS[number])),
  )
  const sizeSignatures = sizeBlocks.map(blockSignature).sort()
  const lastSizeBlock = sizeBlocks.at(-1)
  return allowed &&
    sizeBlocks.length === 3 &&
    JSON.stringify(sizeSignatures) === JSON.stringify(['grow:2', 'reset_size', 'shrink:2']) &&
    waits.length >= 1 &&
    says.length === 1 &&
    lastSizeBlock?.op === 'shrink'
}

export function astChangedFromP4(beforeAst: readonly string[], afterProject: BlocksProject): boolean {
  const withoutSay = (tokens: readonly string[]) => tokens.filter((token) => !token.startsWith('say:'))
  const afterAst = sizeBuildAst(afterProject)
  return beforeAst.length > 0 &&
    JSON.stringify(withoutSay(beforeAst)) !== JSON.stringify(withoutSay(afterAst))
}
