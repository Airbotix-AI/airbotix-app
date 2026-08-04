import { describe, expect, it } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P5_SKILL_TARGETS,
  JTW_C4_P7_LESSON_ID,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_WUKONG_ASSET,
} from '../jtwC4DualBuild'
import {
  c4p7BuildComplete,
  c4p7ReopenRunComplete,
  runC4P7ReopenedProject,
  type C4P7BuildEvidence,
} from './journeyWestC4Part7Program'

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
    childLedBlockCount: 7,
    endCount: 2,
  }

  it('requires exact AST, a saved dual-run marker, seven child-led blocks and two Ends', () => {
    expect(c4p7BuildComplete(build)).toBe(true)
    expect(c4p7BuildComplete({ ...build, dualRunCompleted: false })).toBe(false)
    expect(c4p7BuildComplete({ ...build, childLedBlockCount: 6 })).toBe(false)
    expect(c4p7BuildComplete({ ...build, endCount: 1 })).toBe(false)
  })

  it('really reruns both events after reopening the saved JSON', async () => {
    const run = await runC4P7ReopenedProject(PROJECT, async () => undefined)
    expect(run.startTrace).toEqual(['when_flag', 'show', 'say', 'end'])
    expect(run.tapTrace).toEqual(['when_tap', 'turn_left', 'wait', 'say', 'end'])
    expect(c4p7ReopenRunComplete(run)).toBe(true)
  })
})
