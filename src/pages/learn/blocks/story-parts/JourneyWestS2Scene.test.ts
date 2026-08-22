import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { getJourneyWestS2SceneModel } from './journeyWestS2SceneModel'

const PART_IDS = Array.from({ length: 6 }, (_, chapterIndex) =>
  Array.from({ length: 8 }, (_, partIndex) => `jtw-s2-c${chapterIndex + 1}-p${partIndex + 1}`),
).flat()

describe('JourneyWestS2Scene', () => {
  it('provides real local visual assets for all 48 parts in both states', () => {
    for (const partId of PART_IDS) {
      for (const resolved of [false, true]) {
        const scene = getJourneyWestS2SceneModel(partId, resolved)
        const paths = [scene.background, ...scene.actors.map((actor) => actor.asset), ...scene.props.map((item) => item.asset)]

        expect(scene.actors.length).toBeGreaterThan(0)
        expect(scene.props.length).toBeGreaterThan(0)
        expect(paths.every((path) => path.startsWith('/story-blocks/journey-to-the-west/'))).toBe(true)
        expect(paths.every((path) => existsSync(`public${path}`))).toBe(true)
      }
    }
  })

  it('uses the corrected chapter-six page-one pair and advances the later page states', () => {
    expect(getJourneyWestS2SceneModel('jtw-s2-c6-p1', false).background).toContain('page1-before-v02.webp')
    expect(getJourneyWestS2SceneModel('jtw-s2-c6-p4', true).background).toContain('page1-resolved-v02.webp')
    expect(getJourneyWestS2SceneModel('jtw-s2-c6-p6', false).background).toContain('page2-before-v01.webp')
    expect(getJourneyWestS2SceneModel('jtw-s2-c6-p8', true).background).toContain('page3-resolved-v01.webp')
  })

  it('rejects unsupported identifiers instead of silently showing the wrong chapter', () => {
    expect(() => getJourneyWestS2SceneModel('jtw-s2-c7-p1', false)).toThrow('Unsupported Journey West S2 part')
  })
})
