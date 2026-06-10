import { describe, expect, it } from 'vitest';

import {
  BLOCK_DEFS,
  CATEGORIES,
  blankProject,
  blockDef,
  isTrigger,
  parseProject,
  serializeProject,
} from './blocksModel';

describe('blocksModel', () => {
  it('serialize → parse round-trips a project', () => {
    const p = blankProject('Round trip');
    p.pages[0].characters[0].scripts.push({
      id: 'script-1',
      blocks: [{ op: 'when_flag' }, { op: 'move_right', n: 4 }, { op: 'say', text: 'Hi!' }],
    });
    const out = parseProject(serializeProject(p));
    expect(out.name).toBe('Round trip');
    expect(out.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'move_right', n: 4 },
      { op: 'say', text: 'Hi!' },
    ]);
  });

  it('parses the backend starter shape (blocks_story contract)', () => {
    // Mirrors platform-backend blocks-templates.ts STORY — the cross-repo contract.
    const raw = JSON.stringify({
      version: 1,
      name: 'The cat and the ball',
      pages: [
        {
          id: 'page-1',
          background: 'meadow',
          characters: [
            {
              id: 'char-cat',
              name: 'Cat',
              emoji: '🐱',
              start: { gx: 4, gy: 10, size: 1, rot: 0 },
              scripts: [
                {
                  id: 'script-1',
                  blocks: [
                    { op: 'when_flag' },
                    { op: 'move_right', n: 4 },
                    { op: 'say', text: 'Hi!' },
                    { op: 'hop', n: 2 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const p = parseProject(raw);
    expect(p.pages[0].characters[0].name).toBe('Cat');
    expect(p.pages[0].characters[0].scripts[0].blocks).toHaveLength(4);
  });

  it('drops unknown ops, clamps params, and falls back to blank on garbage', () => {
    const messy = JSON.stringify({
      version: 1,
      name: 'Messy',
      pages: [
        {
          id: 'p',
          background: 'meadow',
          characters: [
            {
              id: 'c',
              name: 'X',
              emoji: '🐱',
              start: { gx: 999, gy: -5, size: 1, rot: 0 },
              scripts: [
                {
                  id: 's',
                  blocks: [{ op: 'when_flag' }, { op: 'evil_op' }, { op: 'move_right', n: 999 }],
                },
                { id: 'headless', blocks: [{ op: 'move_left', n: 1 }] }, // no trigger → dropped
              ],
            },
          ],
        },
      ],
    });
    const p = parseProject(messy);
    const char = p.pages[0].characters[0];
    expect(char.start.gx).toBe(19); // clamped to grid
    expect(char.start.gy).toBe(0);
    expect(char.scripts).toHaveLength(1); // headless script dropped
    expect(char.scripts[0].blocks).toEqual([{ op: 'when_flag' }, { op: 'move_right', n: 9 }]);

    expect(parseProject('not json').pages).toHaveLength(1); // blank fallback
    expect(parseProject('{"version":2}').pages).toHaveLength(1);
  });

  it('covers all six categories in the catalogue', () => {
    const cats = new Set(BLOCK_DEFS.map((d) => d.category));
    expect([...cats].sort()).toEqual(
      [...CATEGORIES.map((c) => c.id)].sort(),
    );
    expect(isTrigger('when_flag')).toBe(true);
    expect(isTrigger('move_right')).toBe(false);
    expect(blockDef('wait').hasN).toBe(true);
  });
});
