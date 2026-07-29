import { describe, expect, it } from 'vitest';

import type { BlocksProject } from '../blocksModel';
import { c2p5ProgramMatches } from './journeyWestC2Part5Program';
import { storyMissionFor } from '../curriculumGuides';
import { storyMissionProgramMatches } from '../storyMissionProgress';

function project(
  curtainMiddle: string[] = ['hide'],
  caveMiddle: string[] = ['show'],
): BlocksProject {
  return {
    version: 1,
    name: 'P5',
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
            start: { gx: 7, gy: 7, size: 5, reach: 1, rot: 0 },
            scripts: [
              {
                id: 'water-curtain-open',
                blocks: [
                  { op: 'when_bump' },
                  ...curtainMiddle.map((op) => ({ op: op as 'hide' })),
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
                  ...caveMiddle.map((op) => ({ op: op as 'show' })),
                  { op: 'say', text: '桥、干地、石座、清水。' },
                  { op: 'end' },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('C2-P5 saved-program completion contract', () => {
  it('requires Hide on the curtain and Show on the initially-hidden cave', () => {
    expect(c2p5ProgramMatches(project())).toBe(true);
    expect(storyMissionFor('jtw-s1-c2-p5')?.lessonId).toBe('jtw-s1-c2-p5');
    expect(storyMissionProgramMatches(project(), 'jtw-s1-c2-p5')).toBe(true);
    expect(c2p5ProgramMatches(project([], ['show']))).toBe(false);
    expect(storyMissionProgramMatches(project([], ['show']), 'jtw-s1-c2-p5')).toBe(false);
    expect(c2p5ProgramMatches(project(['hide'], []))).toBe(false);
    expect(c2p5ProgramMatches(project(['show'], ['hide']))).toBe(false);
  });

  it('rejects moved visibility and collision-reach contracts', () => {
    const wrongVisibility = project();
    wrongVisibility.pages[0].characters[1].start.visible = true;
    expect(c2p5ProgramMatches(wrongVisibility)).toBe(false);
    const hiddenCurtain = project();
    hiddenCurtain.pages[0].characters[0].start.visible = false;
    expect(c2p5ProgramMatches(hiddenCurtain)).toBe(false);
    const broadCollision = project();
    broadCollision.pages[0].characters[0].start.reach = 5;
    expect(c2p5ProgramMatches(broadCollision)).toBe(false);
  });
});
