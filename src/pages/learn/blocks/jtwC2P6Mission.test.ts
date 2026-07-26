import { describe, expect, it } from 'vitest';

import type { BlocksProject } from './blocksModel';
import { jtwC2P6ProgramMatches, jtwC2P6ProjectDiff } from './jtwC2P6Mission';

function project(returnOrder: 'bug' | 'fixed', preserveOutbound = true): BlocksProject {
  const middle =
    returnOrder === 'fixed'
      ? [
          { op: 'move_left' as const, n: 2 },
          { op: 'move_down' as const, n: 1 },
          { op: 'move_left' as const, n: 2 },
        ]
      : [
          { op: 'move_left' as const, n: 2 },
          { op: 'move_left' as const, n: 2 },
          { op: 'move_down' as const, n: 1 },
        ];
  return {
    version: 1,
    name: 'P6',
    lessonId: 'jtw-s1-c2-p6',
    pages: [
      {
        id: 'jtw-c2-p6-return-page',
        background: 'jtw-s1-c2-actor-free-base',
        characters: [
          {
            id: 'stone-monkey',
            name: 'Stone Monkey',
            emoji: '🐵',
            start: { gx: 6, gy: 7, size: 3, rot: 0 },
            scripts: [
              {
                id: 'stone-monkey-return-debug',
                blocks: [{ op: 'when_flag' }, ...middle, { op: 'end' }],
              },
            ],
          },
          {
            id: 'waiting-monkeys',
            name: 'Waiting friends',
            emoji: '🐒🐒',
            start: { gx: 2, gy: 8, size: 2, rot: 0 },
            scripts: [],
          },
        ],
      },
      {
        id: 'jtw-c2-p6-outbound-proof',
        background: 'jtw-s1-c2-actor-free-base',
        characters: [
          {
            id: 'stone-monkey-outbound-proof',
            name: 'Outbound proof',
            emoji: '🐵',
            start: { gx: 2, gy: 8, size: 3, rot: 0 },
            scripts: [
              {
                id: 'stone-monkey-route-to-curtain',
                blocks: [
                  { op: 'when_flag' },
                  { op: 'move_right', n: preserveOutbound ? 1 : 2 },
                  { op: 'move_right', n: 1 },
                  { op: 'move_up', n: 1 },
                  { op: 'move_right', n: 1 },
                  { op: 'move_right', n: 1 },
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

describe('JtW C2-P6 return-route contract', () => {
  it('accepts only the exact minimal reorder and records its real diff', () => {
    const fixed = project('fixed');
    expect(jtwC2P6ProgramMatches(fixed)).toBe(true);
    expect(jtwC2P6ProjectDiff(fixed)).toEqual(['move_down:4->3', 'move_left:3->4']);
  });

  it('rejects the shipped bug and any mutation of the P4 outbound route', () => {
    expect(jtwC2P6ProgramMatches(project('bug'))).toBe(false);
    expect(jtwC2P6ProgramMatches(project('fixed', false))).toBe(false);
  });
});
