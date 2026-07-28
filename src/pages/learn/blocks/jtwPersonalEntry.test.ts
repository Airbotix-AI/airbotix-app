// Journey to the West S1/C2-P7 — the personal-entry contract (scene-specs
// JTW-S1-C2-P7 断言: 左右路线均可独立成功，错误混搭不通过).

import { describe, expect, it } from 'vitest';

import {
  parseProject,
  serializeProject,
  type Block,
  type BlocksProject,
  type Page,
} from './blocksModel';
import { jtwWetStoneTrace } from './story-parts/journeyWestC2Route';
import { storyMissionProgramMatches } from './storyMissionProgress';
import {
  JTW_C2_P7_EVIDENCE_LINES,
  JTW_C2_P7_LESSON_ID,
  JTW_C2_P7_SIDES,
  jtwEntrySideForStart,
  jtwPersonalEntryDesign,
  type JtwEntrySide,
} from './jtwPersonalEntry';
import {
  JTW_C2_ACTOR_FREE_BACKGROUND,
  JTW_C2_CAVE_SPRITE,
  JTW_C2_CURTAIN_SPRITE,
  JTW_STONE_MONKEY_SPRITE,
} from './jtwC2Stage';

const [LEFT, RIGHT] = JTW_C2_P7_SIDES;

interface EntryOptions {
  start?: { gx: number; gy: number };
  route?: readonly Block[];
  waitN?: number | null;
  line?: string;
  curtainChain?: Block[];
  caveChain?: Block[];
  caveVisible?: boolean;
}

function entryPage(side: JtwEntrySide, options: EntryOptions = {}): Page {
  const route = options.route ?? side.route;
  const wait: Block[] = options.waitN === null ? [] : [{ op: 'wait', n: options.waitN ?? 1 }];
  return {
    id: 'jtw-c2-p7-page',
    background: JTW_C2_ACTOR_FREE_BACKGROUND,
    characters: [
      {
        id: 'stone-monkey',
        name: 'Stone Monkey',
        emoji: '🐵',
        asset: JTW_STONE_MONKEY_SPRITE,
        start: { ...(options.start ?? side.start), size: 3, rot: 0 },
        scripts: [
          {
            id: 'stone-monkey-personal-entry',
            blocks: [{ op: 'when_flag' }, ...route, ...wait, { op: 'end' }],
          },
        ],
      },
      {
        id: 'water-curtain-trigger',
        name: 'Water Curtain',
        emoji: '🌊',
        asset: JTW_C2_CURTAIN_SPRITE,
        start: { gx: 7, gy: 7, size: 5, reach: 1, rot: 0, visible: true },
        scripts: [
          {
            id: 'water-curtain-open',
            blocks: options.curtainChain ?? [
              { op: 'when_bump' },
              { op: 'hide' },
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
        asset: JTW_C2_CAVE_SPRITE,
        start: { gx: 7, gy: 7, size: 4, reach: 1, rot: 0, visible: options.caveVisible ?? false },
        scripts: [
          {
            id: 'cave-entrance-reveal',
            blocks: options.caveChain ?? [
              { op: 'when_bump' },
              { op: 'show' },
              { op: 'say', text: options.line ?? JTW_C2_P7_EVIDENCE_LINES[0] },
              { op: 'end' },
            ],
          },
        ],
      },
    ],
  };
}

function entryProject(page: Page): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C2 — Find the Water Curtain Cave',
    lessonId: JTW_C2_P7_LESSON_ID,
    pages: [page],
  };
}

describe('C2-P7 route geometry', () => {
  it('walks each bank onto its own knock cell, one cell from the door', () => {
    for (const side of JTW_C2_P7_SIDES) {
      expect(jtwWetStoneTrace(side.route, side.start)).toEqual([...side.stops]);
      expect(side.stops.at(-1)).toBe(side.knockCell);
      expect(side.stops.at(-2)).toBe(side.shortOfDoorCell);
    }
  });

  it('gives each bank an independent 5–7 block route, not one mirrored chain', () => {
    expect(LEFT.route).toHaveLength(5);
    expect(RIGHT.route).toHaveLength(6);
    for (const side of JTW_C2_P7_SIDES) {
      expect(side.route.length).toBeGreaterThanOrEqual(5);
      expect(side.route.length).toBeLessThanOrEqual(7);
      expect(side.route.every((block) => block.n === 1)).toBe(true);
    }
    expect(LEFT.start.gy).not.toBe(RIGHT.start.gy);
  });

  it('recognises only the two bank starts', () => {
    expect(jtwEntrySideForStart(LEFT.start)?.id).toBe('left');
    expect(jtwEntrySideForStart(RIGHT.start)?.id).toBe('right');
    expect(jtwEntrySideForStart({ gx: 5, gy: 8 })).toBeNull();
  });
});

describe('jtwPersonalEntryDesign', () => {
  it('accepts either bank with either wait and any preset line', () => {
    for (const side of JTW_C2_P7_SIDES) {
      for (const waitN of [1, 2]) {
        for (const line of JTW_C2_P7_EVIDENCE_LINES) {
          const design = jtwPersonalEntryDesign(entryPage(side, { waitN, line }));
          expect(design).toEqual({ side, waitN, evidenceLine: line });
        }
      }
    }
  });

  it('rejects the mashup: one bank standing on the other bank’s route', () => {
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { start: RIGHT.start }))).toBeNull();
    expect(jtwPersonalEntryDesign(entryPage(RIGHT, { start: LEFT.start }))).toBeNull();
  });

  it('rejects a start on neither bank', () => {
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { start: { gx: 4, gy: 8 } }))).toBeNull();
  });

  it('rejects a route that stops short of, or overshoots, the door', () => {
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { route: LEFT.route.slice(0, -1) }))).toBeNull();
    expect(
      jtwPersonalEntryDesign(
        entryPage(LEFT, { route: [...LEFT.route, { op: 'move_right', n: 1 }] }),
      ),
    ).toBeNull();
  });

  it('rejects the merged-parameter shortcut and a reordered route', () => {
    expect(
      jtwPersonalEntryDesign(
        entryPage(LEFT, {
          route: [
            { op: 'move_right', n: 2 },
            { op: 'move_up', n: 1 },
            { op: 'move_right', n: 2 },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      jtwPersonalEntryDesign(
        entryPage(LEFT, { route: [LEFT.route[2], ...LEFT.route.slice(0, 2), ...LEFT.route.slice(3)] }),
      ),
    ).toBeNull();
  });

  it('rejects a missing wait, an out-of-band wait, and a wait before the walk', () => {
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { waitN: null }))).toBeNull();
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { waitN: 3 }))).toBeNull();
    expect(
      jtwPersonalEntryDesign(entryPage(LEFT, { route: [{ op: 'wait', n: 1 }, ...LEFT.route], waitN: null })),
    ).toBeNull();
  });

  it('rejects a deleted, shortened or reordered response chain', () => {
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { curtainChain: [{ op: 'when_bump' }, { op: 'end' }] }))).toBeNull();
    expect(
      jtwPersonalEntryDesign(
        entryPage(LEFT, {
          curtainChain: [
            { op: 'when_bump' },
            { op: 'play_sound', n: 2 },
            { op: 'hide' },
            { op: 'end' },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      jtwPersonalEntryDesign(entryPage(LEFT, { caveChain: [{ op: 'when_bump' }, { op: 'show' }, { op: 'end' }] })),
    ).toBeNull();
  });

  it('rejects a cave that no longer starts hidden and a free-typed line', () => {
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { caveVisible: true }))).toBeNull();
    expect(jtwPersonalEntryDesign(entryPage(LEFT, { line: '我最快！' }))).toBeNull();
  });
});

describe('storyMissionProgramMatches · jtw-s1-c2-p7', () => {
  it('completes for both banks and for neither mashup', () => {
    for (const side of JTW_C2_P7_SIDES) {
      expect(storyMissionProgramMatches(entryProject(entryPage(side)), JTW_C2_P7_LESSON_ID)).toBe(
        true,
      );
    }
    expect(
      storyMissionProgramMatches(
        entryProject(entryPage(LEFT, { start: RIGHT.start })),
        JTW_C2_P7_LESSON_ID,
      ),
    ).toBe(false);
  });

  it('still completes after the curriculum artwork scales round-trip through safe parsing', () => {
    const saved = parseProject(serializeProject(entryProject(entryPage(RIGHT))));

    expect(storyMissionProgramMatches(saved, JTW_C2_P7_LESSON_ID)).toBe(true);
  });

  it('never completes from the shipped starter, which has an empty entry script', () => {
    expect(
      storyMissionProgramMatches(entryProject(entryPage(LEFT, { route: [], waitN: null })), JTW_C2_P7_LESSON_ID),
    ).toBe(false);
  });
});
