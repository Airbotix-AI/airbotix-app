import { describe, expect, it } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P5_SKILL_TARGETS,
  JTW_C4_P7_LESSON_ID,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_WUKONG_ASSET,
} from '../jtwC4DualBuild'
import { c4p7BuildComplete, type C4P7BuildEvidence } from './journeyWestC4Part7Program'

const PROJECT: BlocksProject = {
  version: 1,
  name: 'Meet Sun Wukong',
  lessonId: JTW_C4_P7_LESSON_ID,
  pages: [{
    id: JTW_C4_P4_PAGE_ID,
    background: 'jtw-s1-c4-mountain-gate',
    characters: [{
      id: 'sun-wukong',
      name: 'Sun Wukong',
      emoji: '🐒',
      asset: JTW_C4_WUKONG_ASSET,
      start: { gx: 10, gy: 9, size: 3, rot: 0 },
      scripts: [
        { id: 'sun-wukong-name', blocks: [...JTW_C4_NAME_TARGET] },
        { id: 'sun-wukong-skill', blocks: [...JTW_C4_P5_SKILL_TARGETS.turn] },
      ],
    }],
  }],
}

describe('JtW C4-P7 product evidence', () => {
  const build: C4P7BuildEvidence = {
    projectId: 'p7',
    project: PROJECT,
    version: 4,
    design: 'turn',
    dualRunCompleted: true,
    blockCount: 9,
  }

  it('requires a saved studio dual-run marker and at least eight structural blocks', () => {
    expect(c4p7BuildComplete(build)).toBe(true)
    expect(c4p7BuildComplete({ ...build, dualRunCompleted: false })).toBe(false)
    expect(c4p7BuildComplete({ ...build, blockCount: 7 })).toBe(false)
  })
})

