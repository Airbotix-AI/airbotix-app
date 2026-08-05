import { describe, expect, it } from 'vitest';

import type { BlocksProject } from './blocksModel';
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P4_LESSON_ID,
  JTW_C4_P4_PAGE_ID,
  JTW_C4_SKILL_TARGET,
  JTW_C4_WUKONG_ASSET,
  JTW_C4_WUKONG_ID,
  jtwC4DualBuildMatches,
  jtwC4P5BuildMatches,
  jtwC4P5Version,
  jtwC4PlacedBlocks,
} from './jtwC4DualBuild';

function project(): BlocksProject {
  return {
    version: 1,
    name: 'C4 P4',
    lessonId: JTW_C4_P4_LESSON_ID,
    pages: [
      {
        id: JTW_C4_P4_PAGE_ID,
        background: 'jtw-s1-c4-mountain-gate',
        characters: [
          {
            id: JTW_C4_WUKONG_ID,
            name: 'Sun Wukong',
            emoji: '🐒',
            asset: JTW_C4_WUKONG_ASSET,
            start: { gx: 10, gy: 9, size: 3, rot: 0 },
            scripts: [
              { id: 'sun-wukong-name', blocks: [...JTW_C4_NAME_TARGET] },
              { id: 'sun-wukong-skill', blocks: [...JTW_C4_SKILL_TARGET] },
            ],
          },
        ],
      },
    ],
  };
}

describe('JtW C4-P4 dual-event build contract', () => {
  it('accepts only the exact six child-placed blocks across both triggers', () => {
    const built = project();
    expect(jtwC4DualBuildMatches(built)).toBe(true);
    expect(jtwC4PlacedBlocks(built)).toHaveLength(6);
  });

  it('rejects an action under the wrong trigger, missing End, or wrong Hop distance', () => {
    const wrongTrigger = project();
    wrongTrigger.pages[0].characters[0].scripts[0].blocks[1] = { op: 'hop', n: 2 };
    expect(jtwC4DualBuildMatches(wrongTrigger)).toBe(false);

    const missingEnd = project();
    missingEnd.pages[0].characters[0].scripts[1].blocks.pop();
    expect(jtwC4DualBuildMatches(missingEnd)).toBe(false);

    const wrongHop = project();
    wrongHop.pages[0].characters[0].scripts[1].blocks[1] = { op: 'hop', n: 1 };
    expect(jtwC4DualBuildMatches(wrongHop)).toBe(false);
  });
});

describe('JtW C4-P5 expression choices', () => {
  it.each([
    [
      'leaf',
      [{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'say', text: '我等到邀请了' }, { op: 'end' }],
    ],
    [
      'home',
      [
        { op: 'when_tap' },
        { op: 'turn_left', n: 2 },
        { op: 'wait', n: 1 },
        { op: 'say', text: '家在那边' },
        { op: 'end' },
      ],
    ],
    [
      'screen',
      [
        { op: 'when_tap' },
        { op: 'hide' },
        { op: 'wait', n: 1 },
        { op: 'show' },
        { op: 'say', text: '再看这里' },
        { op: 'end' },
      ],
    ],
  ] as const)('accepts only the exact %s multi-block version', (version, skill) => {
    const candidate = project();
    candidate.lessonId = 'jtw-s1-c4-p5';
    candidate.pages[0].id = 'jtw-c4-p5-page';
    candidate.pages[0].characters[0].scripts[1].blocks = [...skill];
    expect(jtwC4P5Version(candidate)).toBe(version);
    expect(jtwC4P5BuildMatches(candidate)).toBe(true);
    candidate.pages[0].characters[0].scripts[0].blocks.splice(1, 1);
    expect(jtwC4P5BuildMatches(candidate)).toBe(false);
  });
});
