import { describe, expect, it } from 'vitest'

import {
  C5_P6_FIXED_BLOCKS,
  c5p6Ast,
  c5p6BugMatches,
  c5p6FixedMatches,
  c5p6RunsEqual,
  c5p6SingleResetDiff,
  createC5P6BugProject,
  moveOnlyC5P6Reset,
  runC5P6Project,
} from './journeyWestC5Part6Program'

describe('JtW C5-P6 Reset debug contract', () => {
  it('moves the unique Reset and preserves the exact block collection and parameters', () => {
    const before = createC5P6BugProject()
    const after = moveOnlyC5P6Reset(before)
    expect(c5p6BugMatches(before)).toBe(true)
    expect(after && c5p6FixedMatches(after)).toBe(true)
    expect(after && c5p6Ast(after)).toEqual(C5_P6_FIXED_BLOCKS.map((block) =>
      `${block.op}${block.n === undefined ? '' : `:${block.n}`}`,
    ))
    expect(after && c5p6SingleResetDiff(before, after)).toEqual([
      'ruyi-staff/debug:reset_size:4→3',
    ])
    expect(c5p6Ast(before)).toEqual([
      'when_flag',
      'grow:2',
      'wait:5',
      'shrink:2',
      'reset_size',
      'end',
    ])
  })

  it('rejects deletion, parameter edits, and a second Reset', () => {
    const deleted = createC5P6BugProject()
    deleted.pages[0].characters[0].scripts[0].blocks.splice(4, 1)
    expect(moveOnlyC5P6Reset(deleted)).toBeNull()

    const changedParameter = createC5P6BugProject()
    changedParameter.pages[0].characters[0].scripts[0].blocks[1].n = 3
    expect(moveOnlyC5P6Reset(changedParameter)).toBeNull()

    const duplicated = createC5P6BugProject()
    duplicated.pages[0].characters[0].scripts[0].blocks.splice(3, 0, { op: 'reset_size' })
    expect(moveOnlyC5P6Reset(duplicated)).toBeNull()
  })

  it('records the stable wrong trace, repaired full trace, and an identical second run', async () => {
    const before = createC5P6BugProject()
    const after = moveOnlyC5P6Reset(before)!
    const wrong = await runC5P6Project(before)
    const fixed = await runC5P6Project(after)
    const repeated = await runC5P6Project(after)

    expect(wrong.opTrace).toEqual([
      'when_flag', 'grow', 'wait', 'shrink', 'reset_size', 'end',
    ])
    expect(wrong.stateTrace).toEqual(['grow:1.2', 'shrink:1.0', 'reset_size:1.0'])
    expect(wrong.finalSize).toBe(1)
    expect(fixed.opTrace).toEqual([
      'when_flag', 'grow', 'wait', 'reset_size', 'shrink', 'end',
    ])
    expect(fixed.stateTrace).toEqual(['grow:1.2', 'reset_size:1.0', 'shrink:0.8'])
    expect(fixed.finalSize).toBeCloseTo(0.8)
    expect(c5p6RunsEqual(fixed, repeated)).toBe(true)
  })
})
