import type { Block, BlockOp, BlocksProject, Page } from '../blocksModel'

export const C5_PART_IDS = ['jtw-s1-c5-p1', 'jtw-s1-c5-p2', 'jtw-s1-c5-p3', 'jtw-s1-c5-p4', 'jtw-s1-c5-p5', 'jtw-s1-c5-p6', 'jtw-s1-c5-p7', 'jtw-s1-c5-p8'] as const
export type C5PartId = (typeof C5_PART_IDS)[number]
export type C5EarlyPartId = Extract<C5PartId, 'jtw-s1-c5-p1' | 'jtw-s1-c5-p2' | 'jtw-s1-c5-p3' | 'jtw-s1-c5-p4' | 'jtw-s1-c5-p5'>

export const C5_NEXT: Record<C5PartId, string> = {
  'jtw-s1-c5-p1': 'jtw-s1-c5-p2',
  'jtw-s1-c5-p2': 'jtw-s1-c5-p3',
  'jtw-s1-c5-p3': 'jtw-s1-c5-p4',
  'jtw-s1-c5-p4': 'jtw-s1-c5-p5',
  'jtw-s1-c5-p5': 'jtw-s1-c5-p6',
  'jtw-s1-c5-p6': 'jtw-s1-c5-p7',
  'jtw-s1-c5-p7': 'jtw-s1-c5-p8',
  'jtw-s1-c5-p8': 'jtw-s1-c6-p1',
}

export const C5_ROUTE_ORDER = ['learned-home', 'tools-unfit', 'pillar-shadow']
export const C5_STATE_DEMO: Block[] = [
  { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'wait', n: 5 },
  { op: 'reset_size' }, { op: 'wait', n: 5 }, { op: 'shrink', n: 2 }, { op: 'end' },
]
export const C5_REVERSED_DEMO: Block[] = [
  { op: 'when_flag' }, { op: 'shrink', n: 2 }, { op: 'wait', n: 5 },
  { op: 'reset_size' }, { op: 'wait', n: 5 }, { op: 'grow', n: 2 }, { op: 'end' },
]
export const C5_DEBUG_BUG: Block[] = [
  { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'wait', n: 5 },
  { op: 'shrink', n: 2 }, { op: 'reset_size' }, { op: 'end' },
]
export const C5_DEBUG_FIXED: Block[] = [
  { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'wait', n: 5 },
  { op: 'reset_size' }, { op: 'shrink', n: 2 }, { op: 'end' },
]
export const C5_RETELL_ORDER = ['learned-home', 'tools-unfit', 'dragon-palace', 'state-test', 'fix-reset', 'carry-staff']
export function c5Page(blocks: Block[]): Page {
  return {
    id: 'dragon-palace-hall',
    background: 'underwater',
    characters: [{
      id: 'ruyi-staff',
      name: 'Ruyi Staff',
      emoji: '🟨',
      start: { gx: 11, gy: 8, size: 2, rot: 0, visible: true },
      scripts: [{ id: 'size-story', blocks }],
    }],
  }
}

export function c5BuildValid(ops: BlockOp[]): boolean {
  return ops.length >= 4 && ops.filter((op) => op === 'grow' || op === 'reset_size' || op === 'shrink').length === 3 && ops.includes('wait') && !ops.includes('turn_right')
}

export function c5Portable(ops: BlockOp[]): boolean {
  const states = ops.filter((op) => op === 'grow' || op === 'reset_size' || op === 'shrink')
  return states.length >= 3 && states.at(-1) === 'shrink'
}

export function c5PersonalProject(ops: BlockOp[], waitSeconds: number): BlocksProject {
  return {
    version: 1,
    name: 'Ruyi Staff Size Story',
    lessonId: 'jtw-s1-c5-p7',
    pages: [c5Page([
      { op: 'when_flag' },
      ...ops.map((op) => op === 'grow' || op === 'shrink' ? { op, n: 2 } : op === 'wait' ? { op, n: waitSeconds } : { op }),
      { op: 'say', text: '合适才是目标' }, { op: 'end' },
    ])],
  }
}
