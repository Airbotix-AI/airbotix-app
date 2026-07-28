import { describe, expect, it } from 'vitest'

import type { BlocksProject } from '../blocksModel'
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_P5_SKILL_TARGETS,
  JTW_C4_P6_LESSON_ID,
  JTW_C4_WUKONG_ASSET,
  jtwC4P6BugVersion,
} from '../jtwC4DualBuild'
import {
  C4_P6_DEVIATION_OPTIONS,
  C4_P6_EXPECT_OPTIONS,
  c4p6AnswerCorrect,
  c4p6BuildEvidence,
} from './journeyWestC4Part6Program'

function project(trigger: 'when_flag' | 'when_tap'): BlocksProject {
  return {
    version: 1,
    name: 'C4 P6',
    lessonId: JTW_C4_P6_LESSON_ID,
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
          {
            id: 'sun-wukong-skill',
            blocks: [{ op: trigger }, ...JTW_C4_P5_SKILL_TARGETS.turn.slice(1)],
          },
        ],
      }],
    }],
  }
}

describe('JtW C4-P6 trigger debug evidence', () => {
  it('recognises the stable bug but requires the exact one-trigger repair and run marker', () => {
    expect(jtwC4P6BugVersion(project('when_flag'))).toBe('turn')
    expect(c4p6BuildEvidence('p6', project('when_flag'), [JTW_C4_P6_LESSON_ID])).toMatchObject({
      version: null,
      triggerDiff: [],
      dualRunCompleted: true,
    })
    expect(c4p6BuildEvidence('p6', project('when_tap'), [])).toMatchObject({
      version: 'turn',
      triggerDiff: ['sun-wukong-skill:when_flag→when_tap'],
      dualRunCompleted: false,
    })
    expect(c4p6BuildEvidence('p6', project('when_tap'), [JTW_C4_P6_LESSON_ID])).toMatchObject({
      version: 'turn',
      dualRunCompleted: true,
    })
  })

  it('requires the approved expectation and first-deviation answers', () => {
    expect(c4p6AnswerCorrect(C4_P6_EXPECT_OPTIONS, 'separate')).toBe(true)
    expect(c4p6AnswerCorrect(C4_P6_EXPECT_OPTIONS, 'automatic')).toBe(false)
    expect(c4p6AnswerCorrect(C4_P6_DEVIATION_OPTIONS, 'skill-trigger')).toBe(true)
    expect(c4p6AnswerCorrect(C4_P6_DEVIATION_OPTIONS, 'action-parameter')).toBe(false)
  })
})
