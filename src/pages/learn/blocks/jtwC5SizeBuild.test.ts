import { describe, expect, it } from 'vitest'

import type { Block, BlocksProject } from './blocksModel'
import {
  JTW_C5_P4_TARGET_BLOCKS,
  astChangedFromP4,
  isCarryingSize,
  jtwC5P4ExactAst,
  jtwC5P5ValidAst,
  runRuyiSizeTrace,
  sameBlocksWithOnlyResetMoved,
  sizeBuildAst,
} from './jtwC5SizeBuild'

function project(lessonId: string, blocks: readonly Block[]): BlocksProject {
  return {
    version: 1,
    name: 'Ruyi size build',
    lessonId,
    pages: [{
      id: 'jtw-c5-size-page',
      background: 'jtw-s1-c5-pillar-hall',
      characters: [{
        id: 'ruyi-staff',
        name: 'Ruyi Staff',
        emoji: '🦯',
        start: { gx: 10, gy: 8, size: 1, rot: 0 },
        scripts: [{ id: 'ruyi-staff/size-build', blocks: [...blocks] }],
      }],
    }],
  }
}

describe('jtwC5SizeBuild', () => {
  it('requires the complete P4 AST and records a real runner size trace', async () => {
    const built = project('jtw-s1-c5-p4', JTW_C5_P4_TARGET_BLOCKS)
    expect(jtwC5P4ExactAst(built)).toBe(true)
    expect(sizeBuildAst(built)).toEqual([
      'when_flag', 'grow:2', 'wait:5', 'reset_size', 'shrink:2', 'end',
    ])
    const trace = await runRuyiSizeTrace(built)
    expect(trace).toEqual([
      { op: 'grow', size: 1.2 },
      { op: 'reset_size', size: 1 },
      { op: 'shrink', size: 0.8 },
    ])
    expect(isCarryingSize(trace.at(-1)!.size, 1)).toBe(true)
  })

  it('rejects a distractor, a missing wait, and a one-parameter shortcut', () => {
    const distractor = [...JTW_C5_P4_TARGET_BLOCKS]
    distractor[2] = { op: 'turn_right', n: 3 }
    expect(jtwC5P4ExactAst(project('jtw-s1-c5-p4', distractor))).toBe(false)
    const shortcut = [...JTW_C5_P4_TARGET_BLOCKS]
    shortcut.splice(2, 2)
    expect(jtwC5P4ExactAst(project('jtw-s1-c5-p4', shortcut))).toBe(false)
  })

  it('accepts multiple P5 rhythms only when they retain all states and finish carrying', async () => {
    const first = project('jtw-s1-c5-p5', [
      { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'reset_size' },
      { op: 'wait', n: 5 }, { op: 'shrink', n: 2 },
      { op: 'say', text: '准备携带' }, { op: 'end' },
    ])
    const second = project('jtw-s1-c5-p5', [
      { op: 'when_flag' }, { op: 'wait', n: 5 }, { op: 'grow', n: 2 },
      { op: 'reset_size' }, { op: 'shrink', n: 2 },
      { op: 'say', text: '看见原貌' }, { op: 'end' },
    ])
    for (const built of [first, second]) {
      expect(jtwC5P5ValidAst(built)).toBe(true)
      const trace = await runRuyiSizeTrace(built)
      expect(isCarryingSize(trace.at(-1)!.size, 1)).toBe(true)
      expect(astChangedFromP4(JTW_C5_P4_TARGET_BLOCKS.map((block) =>
        block.op === 'wait' ? 'wait:5' : block.op === 'grow' || block.op === 'shrink' ? `${block.op}:2` : block.op,
      ), built)).toBe(true)
    }
  })

  it('recognises a Reset-only reorder and rejects deletion or parameter changes', () => {
    const bug: Block[] = [
      { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'wait', n: 5 },
      { op: 'shrink', n: 2 }, { op: 'reset_size' }, { op: 'end' },
    ]
    const fixed: Block[] = [
      { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'wait', n: 5 },
      { op: 'reset_size' }, { op: 'shrink', n: 2 }, { op: 'end' },
    ]
    expect(sameBlocksWithOnlyResetMoved(bug, fixed)).toBe(true)
    expect(sameBlocksWithOnlyResetMoved(bug, fixed.filter((block) => block.op !== 'reset_size'))).toBe(false)
    const changed = fixed.map((block) => block.op === 'shrink' ? { ...block, n: 3 } : block)
    expect(sameBlocksWithOnlyResetMoved(bug, changed)).toBe(false)
  })
})
