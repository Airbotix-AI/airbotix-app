import { describe, expect, it } from 'vitest'

import { JTW_C4_P7_LESSON_ID, JTW_C4_P4_PAGE_ID, JTW_C4_WUKONG_ASSET } from '../jtwC4DualBuild'
import type { BlocksProject } from '../blocksModel'
import {
  C4_P8_CAUSE_ORDER,
  C4_P8_RETELL_OPTIONS,
  c4p8CardsOrdered,
  c4p8Correct,
  c4p8RunComplete,
  runC4P8SavedProject,
} from './journeyWestC4Part8Program'

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
        { id: 'sun-wukong-name', blocks: [{ op: 'when_flag' }, { op: 'show' }, { op: 'say', text: '我是孙悟空' }, { op: 'end' }] },
        { id: 'sun-wukong-skill', blocks: [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '我等到邀请了' }, { op: 'end' }] },
      ],
    }],
  }],
}

describe('JtW C4-P8 retell evidence', () => {
  it('requires all six cause cards in the approved order and a full retell', () => {
    expect(c4p8CardsOrdered(C4_P8_CAUSE_ORDER)).toBe(true)
    expect(c4p8CardsOrdered([...C4_P8_CAUSE_ORDER].reverse())).toBe(false)
    expect(c4p8Correct('linked-name-and-events', C4_P8_RETELL_OPTIONS)).toBe(true)
    expect(c4p8Correct('blocks-only', C4_P8_RETELL_OPTIONS)).toBe(false)
  })

  it('runs the saved project through real Go then Tap and reaches both Ends', async () => {
    const run = await runC4P8SavedProject(PROJECT, async () => undefined)
    expect(run.startTrace).toEqual(['when_flag', 'show', 'say', 'end'])
    expect(run.tapTrace).toEqual(['when_tap', 'hop', 'say', 'end'])
    expect(c4p8RunComplete(run)).toBe(true)
  })
})
