import { describe, expect, it } from 'vitest'

import type { BlocksProject } from './blocksModel'
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P4_LESSON_ID,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_SKILL_TARGET,
  JTW_C4_WUKONG_ASSET,
  JTW_C4_WUKONG_ID,
  jtwC4DualBuildMatches,
  jtwC4PlacedBlocks,
} from './jtwC4DualBuild'

function project(): BlocksProject {
  return {
    version: 1,
    name: 'C4 P4',
    lessonId: JTW_C4_P4_LESSON_ID,
    pages: [{
      id: JTW_C4_P4_PAGE_ID,
      background: 'jtw-s1-c4-mountain-gate',
      characters: [{
        id: JTW_C4_WUKONG_ID,
        name: 'Sun Wukong',
        emoji: '🐒',
        asset: JTW_C4_WUKONG_ASSET,
        start: { gx: 10, gy: 9, size: 3, rot: 0 },
        scripts: [
          { id: 'sun-wukong-name', blocks: [...JTW_C4_NAME_TARGET] },
          { id: 'sun-wukong-skill', blocks: [...JTW_C4_SKILL_TARGET] },
        ],
      }],
    }],
  }
}

describe('JtW C4-P4 dual-event build contract', () => {
  it('accepts only the exact six child-placed blocks across both triggers', () => {
    const built = project()
    expect(jtwC4DualBuildMatches(built)).toBe(true)
    expect(jtwC4PlacedBlocks(built)).toHaveLength(6)
  })

  it('rejects an action under the wrong trigger, missing End, or wrong Hop distance', () => {
    const wrongTrigger = project()
    wrongTrigger.pages[0].characters[0].scripts[0].blocks[1] = { op: 'hop', n: 2 }
    expect(jtwC4DualBuildMatches(wrongTrigger)).toBe(false)

    const missingEnd = project()
    missingEnd.pages[0].characters[0].scripts[1].blocks.pop()
    expect(jtwC4DualBuildMatches(missingEnd)).toBe(false)

    const wrongHop = project()
    wrongHop.pages[0].characters[0].scripts[1].blocks[1] = { op: 'hop', n: 1 }
    expect(jtwC4DualBuildMatches(wrongHop)).toBe(false)
  })
})
