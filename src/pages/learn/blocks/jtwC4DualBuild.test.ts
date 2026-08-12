import { describe, expect, it } from 'vitest'

import type { BlocksProject } from './blocksModel'
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P4_LESSON_ID,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_P7_SKILL_TARGETS,
  JTW_C4_SKILL_TARGET,
  JTW_C4_WUKONG_ASSET,
  JTW_C4_WUKONG_ID,
  jtwC4DualBuildMatches,
  jtwC4P5Choice,
  jtwC4P6BuildMatches,
  jtwC4P6Version,
  jtwC4P7BuildMatches,
  jtwC4P7Version,
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

  it.each(['hop', 'turn', 'reappear'] as const)('accepts a complete C4-P7 %s Personal Ship', (version) => {
    const candidate = project();
    candidate.name = 'Meet Sun Wukong';
    candidate.lessonId = 'jtw-s1-c4-p7';
    candidate.pages[0].id = 'jtw-c4-p7-page';
    candidate.pages[0].characters[0].scripts[1].blocks = [...JTW_C4_P7_SKILL_TARGETS[version]];
    expect(jtwC4P7Version(candidate)).toBe(version);
    expect(jtwC4P7BuildMatches(candidate)).toBe(true);
    candidate.pages[0].characters[0].scripts[1].blocks.pop();
    expect(jtwC4P7BuildMatches(candidate)).toBe(false);
  });

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

describe('JtW C4-P5 expression choice contract', () => {
  it('accepts all three exact Tap choices while preserving the name chain', () => {
    const built = project()
    built.lessonId = 'jtw-s1-c4-p5'
    built.pages[0].id = 'jtw-c4-p5-page'
    const skill = built.pages[0].characters[0].scripts[1]
    skill.blocks = [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '我等到邀请了' }, { op: 'end' }]
    expect(jtwC4P5Choice(built)).toBe('hop')
    skill.blocks = [{ op: 'when_tap' }, { op: 'turn_left', n: 2 }, { op: 'wait', n: 1 }, { op: 'say', text: '家在那边' }, { op: 'end' }]
    expect(jtwC4P5Choice(built)).toBe('turn')
    skill.blocks = [{ op: 'when_tap' }, { op: 'hide' }, { op: 'wait', n: 1 }, { op: 'show' }, { op: 'say', text: '再看这里' }, { op: 'end' }]
    expect(jtwC4P5Choice(built)).toBe('reappear')
  })

  it('rejects a P4 carry-over and a deleted name chain', () => {
    const built = project()
    built.lessonId = 'jtw-s1-c4-p5'
    built.pages[0].id = 'jtw-c4-p5-page'
    expect(jtwC4P5Choice(built)).toBeNull()
    built.pages[0].characters[0].scripts[1].blocks = [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '我等到邀请了' }, { op: 'end' }]
    built.pages[0].characters[0].scripts[0].blocks = [{ op: 'when_flag' }]
    expect(jtwC4P5Choice(built)).toBeNull()
  })
})

describe('JtW C4-P6 wrong-trigger repair', () => {
  it('accepts every carried-forward action group only after its trigger becomes Tap', () => {
    for (const version of ['hop', 'turn', 'reappear'] as const) {
      const candidate = project()
      candidate.lessonId = 'jtw-s1-c4-p6'
      candidate.pages[0].id = 'jtw-c4-p6-page'
      const targets = {
        hop: [{ op: 'when_tap' as const }, { op: 'hop' as const, n: 2 }, { op: 'say' as const, text: '我等到邀请了' }, { op: 'end' as const }],
        turn: [{ op: 'when_tap' as const }, { op: 'turn_left' as const, n: 2 }, { op: 'wait' as const, n: 1 }, { op: 'say' as const, text: '家在那边' }, { op: 'end' as const }],
        reappear: [{ op: 'when_tap' as const }, { op: 'hide' as const }, { op: 'wait' as const, n: 1 }, { op: 'show' as const }, { op: 'say' as const, text: '再看这里' }, { op: 'end' as const }],
      }
      candidate.pages[0].characters[0].scripts[1].blocks = [...targets[version]]
      expect(jtwC4P6Version(candidate)).toBe(version)
      expect(jtwC4P6BuildMatches(candidate)).toBe(true)
      candidate.pages[0].characters[0].scripts[1].blocks[0] = { op: 'when_flag' }
      expect(jtwC4P6BuildMatches(candidate)).toBe(false)
    }
  })

  it('rejects deleting, reordering or changing the carried action group', () => {
    const candidate = project()
    candidate.lessonId = 'jtw-s1-c4-p6'
    candidate.pages[0].id = 'jtw-c4-p6-page'
    candidate.pages[0].characters[0].scripts[1].blocks = [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '我等到邀请了' }, { op: 'end' }]
    candidate.pages[0].characters[0].scripts[1].blocks.splice(1, 1)
    expect(jtwC4P6BuildMatches(candidate)).toBe(false)
  })
})
