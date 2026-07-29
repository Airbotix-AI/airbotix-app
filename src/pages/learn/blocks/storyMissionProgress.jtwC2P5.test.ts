import { describe, expect, it } from 'vitest'

import type { BlocksProject } from './blocksModel'
import { storyMissionFor } from './curriculumGuides'
import { storyMissionProgramMatches, storyMissionScriptId } from './storyMissionProgress'

function project(curtainResponse = 'hide', caveResponse = 'show'): BlocksProject {
  return {
    version: 1,
    name: 'C2-P5',
    lessonId: 'jtw-s1-c2-p5',
    pages: [
      {
        id: 'jtw-c2-p5-page',
        background: 'jtw-s1-c2-water-curtain-actor-free',
        characters: [
          {
            id: 'water-curtain-trigger',
            name: 'Water Curtain',
            emoji: '🌊',
            start: { gx: 7, gy: 7, size: 5, reach: 1, rot: 0, visible: true },
            scripts: [
              {
                id: 'water-curtain-open',
                blocks: [
                  { op: 'when_bump' },
                  { op: curtainResponse as 'hide' },
                  { op: 'play_sound', n: 2 },
                  { op: 'end' },
                ],
              },
            ],
          },
          {
            id: 'cave-entrance',
            name: 'Cave Entrance',
            emoji: '🕳️',
            start: { gx: 7, gy: 7, size: 4, reach: 1, rot: 0, visible: false },
            scripts: [
              {
                id: 'cave-entrance-reveal',
                blocks: [
                  { op: 'when_bump' },
                  { op: caveResponse as 'show' },
                  { op: 'say', text: '桥、干地、石座、清水。' },
                  { op: 'end' },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

describe('Journey to the West C2-P5 studio registration', () => {
  it('registers the guide, primary script, and two-character completion contract', () => {
    expect(storyMissionFor('jtw-s1-c2-p5')?.lessonId).toBe('jtw-s1-c2-p5')
    expect(storyMissionScriptId('jtw-s1-c2-p5')).toBe('water-curtain-open')
    expect(storyMissionProgramMatches(project(), 'jtw-s1-c2-p5')).toBe(true)
  })

  it('keeps the mission incomplete when either actor owns the wrong response', () => {
    expect(storyMissionProgramMatches(project('show'), 'jtw-s1-c2-p5')).toBe(false)
    expect(storyMissionProgramMatches(project('hide', 'hide'), 'jtw-s1-c2-p5')).toBe(false)
  })
})
