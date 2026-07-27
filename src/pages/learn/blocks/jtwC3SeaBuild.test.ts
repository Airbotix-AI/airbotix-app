import { describe, expect, it } from 'vitest';

import type { Block, BlocksProject } from './blocksModel';
import { parseProject } from './blocksModel';
import { runPageFlow } from './pageFlowRun';
import { storyMissionProgramMatches } from './storyMissionProgress';
import {
  JTW_C3_ARRIVAL_CHAIN,
  JTW_C3_DEPART_CHAIN,
  JTW_C3_P4_LESSON_ID,
  JTW_C3_P4_PAGE_IDS,
  JTW_C3_P4_PAGE1_RAFT_CELL,
  JTW_C3_P4_SCRIPT_IDS,
  JTW_C3_RAFT_CHAIN,
  JTW_C3_SEA_TARGET,
  jtwC3SeaBuildComplete,
  jtwC3SeaExitTarget,
  jtwC3SeaPlacedBlocks,
} from './jtwC3SeaBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_SCENE,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_SCENE,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
} from './jtwC3Stage';

const cell = (gx: number, gy: number) => ({ gx, gy });

function monkey(start: { gx: number; gy: number }, scriptId: string, blocks: readonly Block[]) {
  return {
    id: JTW_C3_MONKEY_KING_ID,
    name: 'Monkey King',
    emoji: '🐵',
    asset: JTW_C3_MONKEY_KING_SPRITE,
    start: { ...start, size: JTW_C3_MONKEY_KING_SIZE, rot: 0 },
    scripts: [{ id: scriptId, blocks: [...blocks] }],
  };
}

function raft(start: { gx: number; gy: number }, blocks: readonly Block[] | null) {
  return {
    id: JTW_C3_RAFT_ID,
    name: 'Raft',
    emoji: '🛶',
    asset: JTW_C3_RAFT_SPRITE,
    start: { ...start, size: JTW_C3_RAFT_SIZE, rot: 0 },
    scripts: blocks ? [{ id: JTW_C3_P4_SCRIPT_IDS.raftCarry, blocks: [...blocks] }] : [],
  };
}

/** A saved C3-P4 project whose Page 2 chain is whatever the child left there. */
function seaProject(seaChain: readonly Block[]): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C3 — A Story and an Exit in the Open Sea',
    lessonId: JTW_C3_P4_LESSON_ID,
    pages: [
      {
        id: JTW_C3_P4_PAGE_IDS[0],
        background: JTW_C3_PAGE1_SCENE,
        characters: [
          monkey(JTW_C3_PAGE1_START_CELL, JTW_C3_P4_SCRIPT_IDS.depart, JTW_C3_DEPART_CHAIN),
          raft(JTW_C3_P4_PAGE1_RAFT_CELL, null),
        ],
      },
      {
        id: JTW_C3_P4_PAGE_IDS[1],
        background: JTW_C3_PAGE2_SCENE,
        characters: [
          monkey(JTW_C3_PAGE2_START_CELL, JTW_C3_P4_SCRIPT_IDS.seaLeg, seaChain),
          raft(JTW_C3_PAGE2_START_CELL, JTW_C3_RAFT_CHAIN),
        ],
      },
      {
        id: JTW_C3_P4_PAGE_IDS[2],
        background: JTW_C3_PAGE3_SCENE,
        characters: [
          monkey(JTW_C3_PAGE3_START_CELL, JTW_C3_P4_SCRIPT_IDS.arrival, JTW_C3_ARRIVAL_CHAIN),
          raft(JTW_C3_PAGE3_START_CELL, null),
        ],
      },
    ],
  };
}

/** The shipped starter: Page 2 holds nothing but Start. */
const STARTER = seaProject([{ op: 'when_flag' }]);
/** The finished build. */
const BUILT = seaProject(JTW_C3_SEA_TARGET);

describe('jtwC3SeaBuild — the C3-P4 three-page contract', () => {
  it('accepts the exact five-block sea chain with the demo chains intact', () => {
    expect(jtwC3SeaBuildComplete(BUILT)).toBe(true);
    expect(storyMissionProgramMatches(BUILT, JTW_C3_P4_LESSON_ID)).toBe(true);
  });

  it('rejects the shipped starter — an empty slot is not a build', () => {
    expect(jtwC3SeaBuildComplete(STARTER)).toBe(false);
  });

  it('rejects a missing block, a wrong order and a wrong parameter', () => {
    // 缺 Whoosh
    expect(
      jtwC3SeaBuildComplete(
        seaProject([
          { op: 'when_flag' },
          { op: 'move_right', n: 4 },
          { op: 'wait', n: 2 },
          { op: 'goto_page', n: 3 },
        ]),
      ),
    ).toBe(false);
    // Wait 和 Move 顺序交换
    expect(
      jtwC3SeaBuildComplete(
        seaProject([
          { op: 'when_flag' },
          { op: 'play_sound', n: 4 },
          { op: 'wait', n: 2 },
          { op: 'move_right', n: 4 },
          { op: 'goto_page', n: 3 },
        ]),
      ),
    ).toBe(false);
    // 走得不够远
    expect(
      jtwC3SeaBuildComplete(
        seaProject([
          { op: 'when_flag' },
          { op: 'play_sound', n: 4 },
          { op: 'move_right', n: 2 },
          { op: 'wait', n: 2 },
          { op: 'goto_page', n: 3 },
        ]),
      ),
    ).toBe(false);
  });

  it('rejects every exit number that is not 3', () => {
    for (const exit of [1, 2]) {
      const project = seaProject([
        { op: 'when_flag' },
        { op: 'play_sound', n: 4 },
        { op: 'move_right', n: 4 },
        { op: 'wait', n: 2 },
        { op: 'goto_page', n: exit },
      ]);
      expect(jtwC3SeaBuildComplete(project)).toBe(false);
      expect(jtwC3SeaExitTarget(project)).toBe(exit);
    }
  });

  it('rejects a deleted or edited Page 1 / Page 3 demo chain', () => {
    const withoutPage3 = { ...BUILT, pages: BUILT.pages.slice(0, 2) };
    expect(jtwC3SeaBuildComplete(withoutPage3)).toBe(false);

    const brokenDepart = structuredClone(BUILT);
    brokenDepart.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' },
      { op: 'goto_page', n: 2 },
    ];
    expect(jtwC3SeaBuildComplete(brokenDepart)).toBe(false);

    const brokenArrival = structuredClone(BUILT);
    brokenArrival.pages[2].characters[0].scripts[0].blocks = [{ op: 'when_flag' }, { op: 'end' }];
    expect(jtwC3SeaBuildComplete(brokenArrival)).toBe(false);
  });

  it('rejects a moved start, a deleted raft and a changed background', () => {
    const movedStart = structuredClone(BUILT);
    movedStart.pages[1].characters[0].start = { gx: 5, gy: 8, size: 3, rot: 0 };
    expect(jtwC3SeaBuildComplete(movedStart)).toBe(false);

    const noRaft = structuredClone(BUILT);
    noRaft.pages[1].characters = [noRaft.pages[1].characters[0]];
    expect(jtwC3SeaBuildComplete(noRaft)).toBe(false);

    const repainted = structuredClone(BUILT);
    repainted.pages[1].background = 'meadow';
    expect(jtwC3SeaBuildComplete(repainted)).toBe(false);
  });

  it('reads the placed blocks and the exit number back off the saved document', () => {
    expect(jtwC3SeaPlacedBlocks(BUILT).map((block) => block.op)).toEqual([
      'play_sound',
      'move_right',
      'wait',
      'goto_page',
    ]);
    expect(jtwC3SeaExitTarget(BUILT)).toBe(3);
    expect(jtwC3SeaPlacedBlocks(STARTER)).toEqual([]);
    expect(jtwC3SeaExitTarget(STARTER)).toBeNull();
  });

  it('survives a save/parse round trip, so the studio document still matches', () => {
    const reparsed = parseProject(JSON.stringify(BUILT));
    expect(jtwC3SeaBuildComplete(reparsed)).toBe(true);
  });

  it('really walks 1 → 2 → 3 and ends on the far shore when it is built', async () => {
    const built = await runPageFlow(BUILT, {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: () => Promise.resolve(),
    });
    expect(built.trace).toEqual([1, 2, 3]);
    expect(built.stoppedBy).toBe('end');
    // The measured Page 2 walk is the prediction the Part asks for.
    expect(built.visits[1]).toEqual(
      expect.objectContaining({ page: 2, enterCell: '2-8', exitCell: '6-8', exitTo: 3 }),
    );
  });

  it('stops on Page 2 with no exit at all while the slot is still empty', async () => {
    const starter = await runPageFlow(STARTER, {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: () => Promise.resolve(),
    });
    expect(starter.trace).toEqual([1, 2]);
    expect(starter.stoppedBy).toBe('end');
  });

  it('loops home again when the exit is left pointing at Page 1', async () => {
    const wrongExit = await runPageFlow(
      seaProject([
        { op: 'when_flag' },
        { op: 'play_sound', n: 4 },
        { op: 'move_right', n: 4 },
        { op: 'wait', n: 2 },
        { op: 'goto_page', n: 1 },
      ]),
      { trackCharacterId: JTW_C3_MONKEY_KING_ID, sleep: () => Promise.resolve() },
    );
    expect(wrongExit.trace).toEqual([1, 2, 1]);
    expect(wrongExit.stoppedBy).toBe('loop');
  });

  it('keeps the Page 1 raft on the cell the Page 1 walk really ends on', () => {
    expect(JTW_C3_P4_PAGE1_RAFT_CELL).toEqual(cell(7, 9));
  });
});
