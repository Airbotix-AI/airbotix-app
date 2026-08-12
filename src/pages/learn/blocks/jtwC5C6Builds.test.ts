import { describe, expect, it } from 'vitest'
import type { Block, BlocksProject } from './blocksModel'
import { C5_P4_TARGET, C5_P5_TARGET, C5_P7_TARGETS, C6_PAGE_ONE, C6_PAGE_THREE, C6_PAGE_TWO, JTW_C5_C6_SAY_CHOICES, jtwC5C6BuildMatches } from './jtwC5C6Builds'

function one(lessonId: string, pageId: string, blocks: readonly Block[]): BlocksProject {
  return { version: 1, name: lessonId === 'jtw-s1-c6-p8' ? "My Monkey King's First Journey" : 'build', lessonId, pages: [{ id: pageId, background: 'stage', characters: [{ id: 'actor', name: 'actor', emoji: '🐒', start: { gx: 5, gy: 9, size: 2, rot: 0 }, scripts: [{ id: 'story', blocks: blocks.map((block) => ({ ...block })) }] }] }] }
}

describe('Journey West C5/C6 real Studio contracts', () => {
  it('offers preset dialogue for every required Say so free typing is never completion evidence', () => {
    expect(JTW_C5_C6_SAY_CHOICES).toEqual({
      'jtw-s1-c5-p5': ['合适才是目标'],
      'jtw-s1-c5-p7': ['合适才是目标'],
      'jtw-s1-c6-p4': ['负责天马', '齐天大圣'],
      'jtw-s1-c6-p5': ['天宫回应'],
      'jtw-s1-c6-p8': ['负责天马', '齐天大圣', '天宫回应', '第一程停在这里'],
    })
  })

  it.each([['jtw-s1-c5-p4', 'jtw-c5-p4-page', C5_P4_TARGET], ['jtw-s1-c5-p5', 'jtw-c5-p5-page', C5_P5_TARGET], ['jtw-s1-c5-p7', 'jtw-c5-p7-page', C5_P7_TARGETS[0]]] as const)('accepts %s only with its saved exact chain', (id, page, target) => {
    const project = one(id, page, target)
    expect(jtwC5C6BuildMatches(project)).toBe(true)
    project.pages[0].characters[0].scripts[0].blocks.splice(1, 1)
    expect(jtwC5C6BuildMatches(project)).toBe(false)
  })

  it('requires all three independently built C6 pages for the Personal Ship', () => {
    const project = one('jtw-s1-c6-p8', 'jtw-c6-page-1', C6_PAGE_ONE)
    project.pages.push(one('x', 'jtw-c6-page-2', C6_PAGE_TWO).pages[0], one('x', 'jtw-c6-page-3', C6_PAGE_THREE).pages[0])
    expect(jtwC5C6BuildMatches(project)).toBe(true)
    project.pages[1].characters[0].scripts[0].blocks[1] = { op: 'hide' }
    expect(jtwC5C6BuildMatches(project)).toBe(false)
  })
})
