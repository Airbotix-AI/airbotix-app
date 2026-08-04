import { describe, expect, it } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import { JTW_C5_P4_TARGET_BLOCKS } from '../jtwC5SizeBuild'
import {
  C5_P4_PREDICTION_OPTIONS,
  C5_P4_TARGET_OPTIONS,
  c5p4BuildEvidence,
  c5p4Correct,
} from './journeyWestC5Part4Program'

const BUILT: BlocksProject = {
  version: 1,
  name: 'C5 P4',
  lessonId: 'jtw-s1-c5-p4',
  pages: [{
    id: 'size-page',
    background: 'pillar-hall',
    characters: [{
      id: 'ruyi-staff',
      name: 'Ruyi Staff',
      emoji: '🦯',
      start: { gx: 10, gy: 8, size: 1, rot: 0 },
      scripts: [{ id: 'ruyi-staff/size-build', blocks: [...JTW_C5_P4_TARGET_BLOCKS] }],
    }],
  }],
}

describe('journeyWestC5Part4Program', () => {
  it('combines exact AST, four placements, a real trace and carrying result', async () => {
    const evidence = await c5p4BuildEvidence('project-p4', BUILT, ['jtw-s1-c5-p4'])
    expect(evidence.exactAst).toBe(true)
    expect(evidence.placedBlocks).toEqual(['grow:2', 'wait:5', 'reset_size', 'shrink:2'])
    expect(evidence.runCompleted).toBe(true)
    expect(evidence.sizeTrace.map((stop) => stop.size)).toEqual([1.2, 1, 0.8])
    expect(evidence.carrying).toBe(true)
  })

  it('does not infer a real run from a correct static program', async () => {
    const evidence = await c5p4BuildEvidence('project-p4', BUILT, [])
    expect(evidence.exactAst).toBe(true)
    expect(evidence.runCompleted).toBe(false)
  })

  it('requires the approved target and prediction', () => {
    expect(c5p4Correct(C5_P4_TARGET_OPTIONS, 'large-original-small')).toBe(true)
    expect(c5p4Correct(C5_P4_TARGET_OPTIONS, 'small-original-large')).toBe(false)
    expect(c5p4Correct(C5_P4_PREDICTION_OPTIONS, 'large-small-original')).toBe(false)
  })
})
