import { describe, expect, it } from 'vitest';

import type { BlocksProject } from './blocksModel';
import { jtwC2P5ProgramMatches } from './jtwC2P5Mission';

function project(curtain = 'hide', cave = 'show'): BlocksProject {
  return {
    version: 1,
    name: 'P5',
    lessonId: 'jtw-s1-c2-p5',
    pages: [
      {
        id: 'jtw-c2-p5-page',
        background: 'jtw-s1-c2-actor-free-base',
        characters: [
          {
            id: 'stone-monkey',
            name: 'Stone Monkey',
            emoji: '🐵',
            start: { gx: 2, gy: 8, size: 3, rot: 0 },
            scripts: [
              {
                id: 'stone-monkey-route-to-curtain',
                blocks: [
                  { op: 'when_flag' },
                  { op: 'move_right', n: 1 },
                  { op: 'move_right', n: 1 },
                  { op: 'move_up', n: 1 },
                  { op: 'move_right', n: 1 },
                  { op: 'move_right', n: 1 },
                  { op: 'end' },
                ],
              },
            ],
          },
          {
            id: 'water-curtain-trigger',
            name: 'Water Curtain',
            emoji: '💧',
            start: { gx: 6, gy: 7, size: 8, rot: 0, reach: 0.5 },
            scripts: [
              {
                id: 'water-curtain-open',
                blocks: [
                  { op: 'when_bump' },
                  { op: curtain as 'hide' },
                  { op: 'play_sound', n: 2 },
                  { op: 'end' },
                ],
              },
            ],
          },
          {
            id: 'cave-entrance',
            name: 'Cave Entrance',
            emoji: '🪨',
            start: { gx: 6, gy: 7, size: 8, rot: 0, visible: false, reach: 0.5 },
            scripts: [
              {
                id: 'cave-entrance-reveal',
                blocks: [
                  { op: 'when_bump' },
                  { op: cave as 'show' },
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

describe('jtwC2P5ProgramMatches', () => {
  it('accepts only the two child-owned On Bump responses with the carried route', () => {
    expect(jtwC2P5ProgramMatches(project())).toBe(true);
    expect(jtwC2P5ProgramMatches(project('show', 'show'))).toBe(false);
    expect(jtwC2P5ProgramMatches(project('hide', 'hide'))).toBe(false);
  });

  it('rejects a moved route start and a missing real cave trigger', () => {
    const moved = project();
    moved.pages[0].characters[0].start.gx = 3;
    expect(jtwC2P5ProgramMatches(moved)).toBe(false);
    const noTrigger = project();
    noTrigger.pages[0].characters[2].scripts[0].blocks.shift();
    expect(jtwC2P5ProgramMatches(noTrigger)).toBe(false);
  });
});
