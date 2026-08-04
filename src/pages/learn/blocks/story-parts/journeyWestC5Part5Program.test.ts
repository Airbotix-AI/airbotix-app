import { describe, expect, it } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import {
  c5p5BuildEvidence,
  c5p5EnvironmentValid,
  c5p5UsesValid,
} from './journeyWestC5Part5Program'

const BEFORE = ['when_flag', 'grow:2', 'wait:5', 'reset_size', 'shrink:2', 'end']

function project(blocks: BlocksProject['pages'][number]['characters'][number]['scripts'][number]['blocks']): BlocksProject {
  return {
    version: 1,
    name: 'C5 P5',
    lessonId: 'jtw-s1-c5-p5',
    pages: [{
      id: 'size-page',
      background: 'pillar-hall',
      characters: [{
        id: 'ruyi-staff',
        name: 'Ruyi Staff',
        emoji: '🦯',
        start: { gx: 10, gy: 8, size: 1, rot: 0 },
        scripts: [{ id: 'ruyi-staff/size-build', blocks }],
      }],
    }],
  }
}

const VALID = project([
  { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'reset_size' },
  { op: 'wait', n: 5 }, { op: 'shrink', n: 2 },
  { op: 'say', text: '准备携带' }, { op: 'end' },
])

describe('journeyWestC5Part5Program', () => {
  it('records before/after AST and accepts a real changed rhythm ending carrying', async () => {
    const evidence = await c5p5BuildEvidence('project-p5', VALID, ['jtw-s1-c5-p5'], BEFORE)
    expect(evidence.beforeAst).toEqual(BEFORE)
    expect(evidence.afterAst).not.toEqual(BEFORE)
    expect(evidence.validAst).toBe(true)
    expect(evidence.changedOrderOrRhythm).toBe(true)
    expect(evidence.runCompleted).toBe(true)
    expect(evidence.carrying).toBe(true)
  })

  it('rejects a valid-looking chain that finishes at the original size', async () => {
    const wrongEnd = project([
      { op: 'when_flag' }, { op: 'grow', n: 2 }, { op: 'wait', n: 5 },
      { op: 'shrink', n: 2 }, { op: 'reset_size' },
      { op: 'say', text: '比较初始' }, { op: 'end' },
    ])
    const evidence = await c5p5BuildEvidence('project-p5', wrongEnd, ['jtw-s1-c5-p5'], BEFORE)
    expect(evidence.validAst).toBe(false)
    expect(evidence.carrying).toBe(false)
  })

  it('accepts a second legal order when Shrink remains the final state change', async () => {
    const alternate = project([
      { op: 'when_flag' }, { op: 'wait', n: 5 }, { op: 'grow', n: 2 },
      { op: 'reset_size' }, { op: 'say', text: '看见原貌' },
      { op: 'shrink', n: 2 }, { op: 'end' },
    ])
    const evidence = await c5p5BuildEvidence('project-p5-alt', alternate, ['jtw-s1-c5-p5'], BEFORE)
    expect(evidence.validAst).toBe(true)
    expect(evidence.changedOrderOrRhythm).toBe(true)
    expect(evidence.carrying).toBe(true)
  })

  it('requires both environmental limits and the exact three use labels', () => {
    expect(c5p5EnvironmentValid(['narrow-door', 'curved-waterway'])).toBe(true)
    expect(c5p5EnvironmentValid(['narrow-door', 'brightest'])).toBe(false)
    expect(c5p5UsesValid({
      large: '看见原貌',
      original: '比较初始',
      small: '准备携带',
    })).toBe(true)
    expect(c5p5UsesValid({
      large: '准备携带',
      original: '比较初始',
      small: '看见原貌',
    })).toBe(false)
  })
})
