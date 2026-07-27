import { describe, expect, it } from 'vitest';

import { MAX_PARAM, type Block, type Page } from './blocksModel';
import {
  TINY_STAR_RELAY_JITTER_MS,
  TINY_STAR_RELAY_MAX_GAP_MS,
  TINY_STAR_RELAY_MIN_GAP_MS,
  TINY_STAR_RELAY_WAITS,
  TINY_STAR_TURN_MIN_GAP_MS,
} from './storyMissionProgress';
import {
  TINY_STAR_DUET_ACTIONS,
  TINY_STAR_DUET_CAST,
  TINY_STAR_DUET_FIRST_GX,
  TINY_STAR_DUET_FIRST_ID,
  TINY_STAR_DUET_FIRST_SCRIPT,
  TINY_STAR_DUET_GREETINGS,
  TINY_STAR_DUET_GY,
  TINY_STAR_DUET_HOP_N,
  TINY_STAR_DUET_JITTER_MS,
  TINY_STAR_DUET_MAX_WAIT_MS,
  TINY_STAR_DUET_MIN_GAP_MS,
  TINY_STAR_DUET_SECOND_GX,
  TINY_STAR_DUET_SECOND_ID,
  TINY_STAR_DUET_SECOND_SCRIPT,
  tinyStarDuetActionOf,
  tinyStarDuetDesign,
  tinyStarDuetFriendOf,
  tinyStarDuetGapMs,
  tinyStarDuetTookTurns,
  tinyStarDuetWaitBandMs,
  tinyStarDuetWaits,
} from './tinyStarDuet';

const [SAY_ACTION, HOP_ACTION] = TINY_STAR_DUET_ACTIONS;
const [LUMILO, TUAN_TUAN, DOT_DOT] = TINY_STAR_DUET_CAST;

const SAY_GREETING: Block = { op: 'say', text: TINY_STAR_DUET_GREETINGS[0] };
const HOP_GREETING: Block = { op: 'hop', n: TINY_STAR_DUET_HOP_N };

function duetPage(options: {
  first?: (typeof TINY_STAR_DUET_CAST)[number];
  second?: (typeof TINY_STAR_DUET_CAST)[number];
  firstBlocks?: Block[];
  secondBlocks?: Block[];
}): Page {
  const first = options.first ?? LUMILO;
  const second = options.second ?? TUAN_TUAN;
  return {
    id: 'tsv-a5-s-page',
    background: 'candy',
    characters: [
      {
        id: TINY_STAR_DUET_FIRST_ID,
        name: first.name,
        emoji: first.emoji,
        asset: first.asset,
        start: { gx: TINY_STAR_DUET_FIRST_GX, gy: TINY_STAR_DUET_GY, size: 1, rot: 0 },
        scripts: [
          {
            id: TINY_STAR_DUET_FIRST_SCRIPT,
            blocks: options.firstBlocks ?? [{ op: 'when_flag' }, HOP_GREETING, { op: 'end' }],
          },
        ],
      },
      {
        id: TINY_STAR_DUET_SECOND_ID,
        name: second.name,
        emoji: second.emoji,
        asset: second.asset,
        start: { gx: TINY_STAR_DUET_SECOND_GX, gy: TINY_STAR_DUET_GY, size: 1, rot: 0 },
        scripts: [
          {
            id: TINY_STAR_DUET_SECOND_SCRIPT,
            blocks: options.secondBlocks ?? [
              { op: 'when_flag' },
              { op: 'wait', n: 5 },
              HOP_GREETING,
              { op: 'end' },
            ],
          },
        ],
      },
    ],
  };
}

describe('A5-S · my two-friend greeting (tinyStarDuet)', () => {
  it('derives each Wait band from what the FIRST friend does', () => {
    // A bounce is over in 360 ms, so the second friend must answer after it has
    // landed and before the stage has stood empty for another whole bounce —
    // exactly the A5-D band, reached here from the action's own duration.
    expect(tinyStarDuetWaitBandMs(HOP_ACTION)).toEqual({ floorMs: 360, ceilingMs: 720 });
    expect(tinyStarDuetWaits(HOP_ACTION)).toEqual([...TINY_STAR_RELAY_WAITS]);
    expect(tinyStarDuetWaitBandMs(HOP_ACTION).floorMs).toBe(TINY_STAR_RELAY_MIN_GAP_MS);

    // A spoken greeting outlives every Wait this runtime has (1400 > 900), so
    // the bubbles can never be pulled apart: the floor becomes the head start
    // A5-B measured, and there is no reachable ceiling to stand empty against.
    expect(SAY_ACTION.durationMs).toBeGreaterThan(TINY_STAR_DUET_MAX_WAIT_MS);
    expect(tinyStarDuetWaitBandMs(SAY_ACTION)).toEqual({ floorMs: 250, ceilingMs: 2800 });
    expect(tinyStarDuetWaits(SAY_ACTION)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(tinyStarDuetWaits(SAY_ACTION).at(-1)).toBe(MAX_PARAM);

    // The two thresholds are the ones chapter five already measured — kept in
    // step here rather than by an import, so this module has no cycle.
    expect(TINY_STAR_DUET_MIN_GAP_MS).toBe(TINY_STAR_TURN_MIN_GAP_MS);
    expect(TINY_STAR_DUET_JITTER_MS).toBe(TINY_STAR_RELAY_JITTER_MS);
    expect(tinyStarDuetWaitBandMs(HOP_ACTION).ceilingMs + TINY_STAR_DUET_JITTER_MS).toBe(
      TINY_STAR_RELAY_MAX_GAP_MS,
    );
  });

  it('reads greetings and cast members only from the approved sets', () => {
    expect(tinyStarDuetActionOf(SAY_GREETING)).toBe(SAY_ACTION);
    expect(tinyStarDuetActionOf(HOP_GREETING)).toBe(HOP_ACTION);
    // Free-typed dialogue, a taller bounce and an unrelated block are not greetings.
    expect(tinyStarDuetActionOf({ op: 'say', text: 'boo' })).toBeNull();
    expect(tinyStarDuetActionOf({ op: 'hop', n: 2 })).toBeNull();
    expect(tinyStarDuetActionOf({ op: 'grow', n: 1 })).toBeNull();
    expect(tinyStarDuetActionOf(undefined)).toBeNull();

    expect(
      tinyStarDuetFriendOf({
        id: TINY_STAR_DUET_FIRST_ID,
        name: DOT_DOT.name,
        emoji: DOT_DOT.emoji,
        asset: DOT_DOT.asset,
        start: { gx: 0, gy: 0, size: 1, rot: 0 },
        scripts: [],
      }),
    ).toBe(DOT_DOT);
    // A renamed or re-skinned friend is not one of the three.
    expect(
      tinyStarDuetFriendOf({
        id: TINY_STAR_DUET_FIRST_ID,
        name: 'My Friend',
        emoji: DOT_DOT.emoji,
        asset: DOT_DOT.asset,
        start: { gx: 0, gy: 0, size: 1, rot: 0 },
        scripts: [],
      }),
    ).toBeNull();
  });

  it('accepts every duet the child can legally design', () => {
    for (const first of TINY_STAR_DUET_CAST) {
      for (const second of TINY_STAR_DUET_CAST) {
        if (first.id === second.id) continue;
        for (const firstGreeting of [SAY_GREETING, HOP_GREETING]) {
          const firstAction = tinyStarDuetActionOf(firstGreeting)!;
          for (const waitN of tinyStarDuetWaits(firstAction)) {
            for (const secondGreeting of [SAY_GREETING, HOP_GREETING]) {
              const design = tinyStarDuetDesign(
                duetPage({
                  first,
                  second,
                  firstBlocks: [{ op: 'when_flag' }, firstGreeting, { op: 'end' }],
                  secondBlocks: [
                    { op: 'when_flag' },
                    { op: 'wait', n: waitN },
                    secondGreeting,
                    { op: 'end' },
                  ],
                }),
              );
              expect(design).toEqual({
                first,
                second,
                firstAction,
                secondAction: tinyStarDuetActionOf(secondGreeting),
                waitN,
              });
            }
          }
        }
      }
    }
  });

  it('refuses the starter, an unbuilt chain and every out-of-band Wait', () => {
    // The shipped starter: ONE friend cast into BOTH spots and two empty chains.
    expect(
      tinyStarDuetDesign(
        duetPage({
          first: LUMILO,
          second: LUMILO,
          firstBlocks: [{ op: 'when_flag' }, { op: 'end' }],
          secondBlocks: [{ op: 'when_flag' }, { op: 'end' }],
        }),
      ),
    ).toBeNull();
    // Casting the same friend twice is never a duet, however well built.
    expect(tinyStarDuetDesign(duetPage({ first: TUAN_TUAN, second: TUAN_TUAN }))).toBeNull();

    // Half-built chains: no greeting, no Wait, or a Wait on the wrong friend.
    expect(
      tinyStarDuetDesign(duetPage({ firstBlocks: [{ op: 'when_flag' }, { op: 'end' }] })),
    ).toBeNull();
    expect(
      tinyStarDuetDesign(
        duetPage({ secondBlocks: [{ op: 'when_flag' }, HOP_GREETING, { op: 'end' }] }),
      ),
    ).toBeNull();
    expect(
      tinyStarDuetDesign(
        duetPage({
          firstBlocks: [{ op: 'when_flag' }, { op: 'wait', n: 5 }, HOP_GREETING, { op: 'end' }],
        }),
      ),
    ).toBeNull();
    // The Wait behind the greeting is A5-B's wrong answer and still fails here.
    expect(
      tinyStarDuetDesign(
        duetPage({
          secondBlocks: [{ op: 'when_flag' }, HOP_GREETING, { op: 'wait', n: 5 }, { op: 'end' }],
        }),
      ),
    ).toBeNull();

    // Out-of-band Waits: too short to hear the order after either greeting, and
    // — behind a bounce — long enough to leave the stage empty (A5-D's lesson).
    for (const n of [1, 2, 3]) {
      expect(
        tinyStarDuetDesign(
          duetPage({
            secondBlocks: [{ op: 'when_flag' }, { op: 'wait', n }, HOP_GREETING, { op: 'end' }],
          }),
        ),
      ).toBeNull();
    }
    for (const n of [8, 9]) {
      expect(
        tinyStarDuetDesign(
          duetPage({
            secondBlocks: [{ op: 'when_flag' }, { op: 'wait', n }, HOP_GREETING, { op: 'end' }],
          }),
        ),
      ).toBeNull();
    }
    // The very same numbers ARE legal when the first friend speaks instead.
    for (const n of [8, 9]) {
      expect(
        tinyStarDuetDesign(
          duetPage({
            firstBlocks: [{ op: 'when_flag' }, SAY_GREETING, { op: 'end' }],
            secondBlocks: [{ op: 'when_flag' }, { op: 'wait', n }, HOP_GREETING, { op: 'end' }],
          }),
        )?.waitN,
      ).toBe(n);
    }
  });

  it('refuses a restaged, over-populated or free-typed duet', () => {
    const freeTyped = duetPage({
      firstBlocks: [{ op: 'when_flag' }, { op: 'say', text: 'hello you' }, { op: 'end' }],
    });
    expect(tinyStarDuetDesign(freeTyped)).toBeNull();

    const moved = duetPage({});
    moved.characters[0].start.gx = 4;
    expect(tinyStarDuetDesign(moved)).toBeNull();

    const resized = duetPage({});
    resized.characters[1].start.size = 0.8;
    expect(tinyStarDuetDesign(resized)).toBeNull();

    const restaged = duetPage({});
    restaged.background = 'meadow';
    expect(tinyStarDuetDesign(restaged)).toBeNull();

    const crowded = duetPage({});
    crowded.characters.push({
      id: 'extra',
      name: 'Extra',
      emoji: '⭐',
      start: { gx: 2, gy: 10, size: 1, rot: 0 },
      scripts: [],
    });
    expect(tinyStarDuetDesign(crowded)).toBeNull();

    const soloed = duetPage({});
    soloed.characters.pop();
    expect(tinyStarDuetDesign(soloed)).toBeNull();

    const extraTrack = duetPage({});
    extraTrack.characters[1].scripts.push({
      id: 'greeter-two-extra',
      blocks: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(tinyStarDuetDesign(extraTrack)).toBeNull();

    const renamedScript = duetPage({});
    renamedScript.characters[0].scripts[0].id = 'greeter-one-other';
    expect(tinyStarDuetDesign(renamedScript)).toBeNull();

    expect(tinyStarDuetDesign(undefined)).toBeNull();
  });

  it('judges the turn from the gap the run really produced', () => {
    const gap = (ms: number) =>
      new Map([
        [TINY_STAR_DUET_FIRST_ID, 5_000],
        [TINY_STAR_DUET_SECOND_ID, 5_000 + ms],
      ]);

    // One greeting alone, or the waiting friend somehow starting first, is no duet.
    expect(tinyStarDuetGapMs(new Map([[TINY_STAR_DUET_FIRST_ID, 5_000]]))).toBeNull();
    expect(tinyStarDuetGapMs(gap(-40))).toBeNull();
    expect(tinyStarDuetTookTurns(gap(-40), HOP_ACTION)).toBe(false);

    // Starting together is what chapter five exists to fix.
    expect(tinyStarDuetTookTurns(gap(0), SAY_ACTION)).toBe(false);
    expect(tinyStarDuetTookTurns(gap(0), HOP_ACTION)).toBe(false);

    for (const action of TINY_STAR_DUET_ACTIONS) {
      const band = tinyStarDuetWaitBandMs(action);
      expect(tinyStarDuetTookTurns(gap(band.floorMs - 1), action)).toBe(false);
      expect(tinyStarDuetTookTurns(gap(band.floorMs), action)).toBe(true);
      for (const n of tinyStarDuetWaits(action)) {
        expect(tinyStarDuetTookTurns(gap(n * 100), action)).toBe(true);
      }
      // A late timer is forgiven; a whole extra turn of silence is not.
      expect(tinyStarDuetTookTurns(gap(band.ceilingMs + TINY_STAR_DUET_JITTER_MS), action)).toBe(
        true,
      );
      expect(
        tinyStarDuetTookTurns(gap(band.ceilingMs + TINY_STAR_DUET_JITTER_MS + 1), action),
      ).toBe(false);
    }

    // A bounce duet timed as if it were a spoken one would wrongly pass, so the
    // band really does have to come from the child's own first action.
    expect(tinyStarDuetTookTurns(gap(900), SAY_ACTION)).toBe(true);
    expect(tinyStarDuetTookTurns(gap(900), HOP_ACTION)).toBe(false);
  });
});
