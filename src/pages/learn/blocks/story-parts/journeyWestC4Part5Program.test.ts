import { describe, expect, it } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_P5_LESSON_ID,
  JTW_C4_P5_SKILL_TARGETS,
  JTW_C4_WUKONG_ASSET,
} from '../jtwC4DualBuild'
import { c4p5BuildEvidence, c4p5MotiveCorrect } from './journeyWestC4Part5Program'

function project(): BlocksProject {
  return {
    version: 1,
    name: 'C4 P5',
    lessonId: JTW_C4_P5_LESSON_ID,
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
}

describe('JtW C4-P5 product evidence', () => {
  it('requires the saved valid version and the studio dual-run marker', () => {
    expect(c4p5BuildEvidence('p5', project(), [])).toMatchObject({
      version: 'turn',
      dualRunCompleted: false,
    })
    expect(c4p5BuildEvidence('p5', project(), [JTW_C4_P5_LESSON_ID])).toMatchObject({
      version: 'turn',
      dualRunCompleted: true,
    })
  })

  it('accepts only the invitation-response motive', () => {
    expect(c4p5MotiveCorrect('respond')).toBe(true)
    expect(c4p5MotiveCorrect('show-off')).toBe(false)
  })
})
