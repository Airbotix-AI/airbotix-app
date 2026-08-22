import { describe, expect, it } from 'vitest';

import type { Block, BlocksProject } from './blocksModel';
import { parseProject } from './blocksModel';
import { runPageFlow } from './pageFlowRun';
import { storyMissionProgramMatches, storyMissionSayChoices } from './storyMissionProgress';
import { JTW_C3_ARRIVAL_CHAIN, JTW_C3_DEPART_CHAIN, JTW_C3_RAFT_CHAIN } from './jtwC3SeaBuild';
import {
  JTW_C3_LISTEN_CLUE,
  JTW_C3_MORNING_EXPRESSION,
  JTW_C3_P5_LESSON_ID,
  JTW_C3_P5_PAGE_IDS,
  JTW_C3_P5_PAGE1_RAFT_CELL,
  JTW_C3_P5_ROUTE_TAIL,
  JTW_C3_P5_SCRIPT_IDS,
  JTW_C3_P5_STARTER_CHAIN,
  JTW_C3_STARRY_EXPRESSION,
  JTW_C3_WEATHER_VERSIONS,
  jtwC3ParseWeather,
  jtwC3WeatherBuildComplete,
  jtwC3WeatherBuildVersion,
  jtwC3WeatherExitTarget,
  jtwC3WeatherPlacedBlocks,
  jtwC3WeatherSavedScene,
  jtwC3WeatherVersion,
  type JtwC3Weather,
} from './jtwC3WeatherBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_SCENE,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_PAGE2_MORNING_SCENE,
  JTW_C3_PAGE2_STARRY_SCENE,
  JTW_C3_PAGE2_START_CELL,
  JTW_C3_PAGE3_SCENE,
  JTW_C3_PAGE3_START_CELL,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SIZE,
  JTW_C3_RAFT_SPRITE,
} from './jtwC3Stage';

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
    scripts: blocks ? [{ id: JTW_C3_P5_SCRIPT_IDS.raftCarry, blocks: [...blocks] }] : [],
  };
}

/** A saved C3-P5 project: any Page 2 sea, any Page 2 chain the child left. */
function weatherProject(scene: string, seaChain: readonly Block[]): BlocksProject {
  return {
    version: 1,
    name: 'Journey to the West · C3 — The Middle Sea',
    lessonId: JTW_C3_P5_LESSON_ID,
    pages: [
      {
        id: JTW_C3_P5_PAGE_IDS[0],
        background: JTW_C3_PAGE1_SCENE,
        characters: [
          monkey(JTW_C3_PAGE1_START_CELL, JTW_C3_P5_SCRIPT_IDS.depart, JTW_C3_DEPART_CHAIN),
          raft(JTW_C3_P5_PAGE1_RAFT_CELL, null),
        ],
      },
      {
        id: JTW_C3_P5_PAGE_IDS[1],
        background: scene,
        characters: [
          monkey(JTW_C3_PAGE2_START_CELL, JTW_C3_P5_SCRIPT_IDS.seaLeg, seaChain),
          raft(JTW_C3_PAGE2_START_CELL, JTW_C3_RAFT_CHAIN),
        ],
      },
      {
        id: JTW_C3_P5_PAGE_IDS[2],
        background: JTW_C3_PAGE3_SCENE,
        characters: [
          monkey(JTW_C3_PAGE3_START_CELL, JTW_C3_P5_SCRIPT_IDS.arrival, JTW_C3_ARRIVAL_CHAIN),
          raft(JTW_C3_PAGE3_START_CELL, null),
        ],
      },
    ],
  };
}

/** A finished build of one version, exactly as its own starter would be edited. */
function built(id: JtwC3Weather): BlocksProject {
  const version = jtwC3WeatherVersion(id);
  return weatherProject(version.scene, version.chain);
}

/** The shipped starter of one branch: the shared route and nothing else. */
function starter(id: JtwC3Weather): BlocksProject {
  return weatherProject(jtwC3WeatherVersion(id).scene, JTW_C3_P5_STARTER_CHAIN);
}

describe('jtwC3WeatherBuild — the C3-P5 two-branch contract', () => {
  it('accepts BOTH versions independently ("Assert that both versions can succeed independently")', () => {
    expect(jtwC3WeatherBuildVersion(built('starry'))).toBe('starry');
    expect(jtwC3WeatherBuildVersion(built('morning'))).toBe('morning');
    expect(storyMissionProgramMatches(built('starry'), JTW_C3_P5_LESSON_ID)).toBe(true);
    expect(storyMissionProgramMatches(built('morning'), JTW_C3_P5_LESSON_ID)).toBe(true);
  });

  it('ships the exact expression chains the scene prints', () => {
    expect(JTW_C3_STARRY_EXPRESSION).toEqual([
      { op: 'play_sound', n: 6 },
      { op: 'wait', n: 2 },
    ]);
    expect(JTW_C3_MORNING_EXPRESSION).toEqual([
      { op: 'set_speed', n: 1 },
      { op: 'play_sound', n: 4 },
      { op: 'say', text: JTW_C3_LISTEN_CLUE },
    ]);
    // Both versions keep `move_right(4) → goto_page(3)`, as the last two blocks.
    for (const version of JTW_C3_WEATHER_VERSIONS) {
      expect(version.chain.slice(-2)).toEqual([...JTW_C3_P5_ROUTE_TAIL]);
      expect(version.chain[0]).toEqual({ op: 'when_flag' });
    }
  });

  it('rejects the shipped starter — the route alone is not a version', () => {
    expect(jtwC3WeatherBuildComplete(starter('starry'))).toBe(false);
    expect(jtwC3WeatherBuildComplete(starter('morning'))).toBe(false);
  });

  it('rejects "just change the background" — repainting the sea without building the expression', () => {
    // The starry sea painted over the bare shipped route.
    expect(
      jtwC3WeatherBuildComplete(weatherProject(JTW_C3_PAGE2_STARRY_SCENE, JTW_C3_P5_STARTER_CHAIN)),
    ).toBe(false);
    // And the reverse mismatch: a starry chain saved on the mist sea, or a mist
    // chain saved on the starry sea, is neither version.
    expect(
      jtwC3WeatherBuildComplete(
        weatherProject(JTW_C3_PAGE2_MORNING_SCENE, jtwC3WeatherVersion('starry').chain),
      ),
    ).toBe(false);
    expect(
      jtwC3WeatherBuildComplete(
        weatherProject(JTW_C3_PAGE2_STARRY_SCENE, jtwC3WeatherVersion('morning').chain),
      ),
    ).toBe(false);
  });

  it('rejects a deleted Goto and an exit pointed back at Page 1', () => {
    for (const id of ['starry', 'morning'] as const) {
      const chain = [...jtwC3WeatherVersion(id).chain];
      const noGoto = weatherProject(jtwC3WeatherVersion(id).scene, chain.slice(0, -1));
      expect(jtwC3WeatherBuildComplete(noGoto)).toBe(false);
      expect(jtwC3WeatherExitTarget(noGoto)).toBeNull();

      const homeAgain = weatherProject(jtwC3WeatherVersion(id).scene, [
        ...chain.slice(0, -1),
        { op: 'goto_page', n: 1 },
      ]);
      expect(jtwC3WeatherBuildComplete(homeAgain)).toBe(false);
      expect(jtwC3WeatherExitTarget(homeAgain)).toBe(1);
    }
  });

  it('rejects a mixed, reordered or half-built expression chain', () => {
    const scene = JTW_C3_PAGE2_STARRY_SCENE;
    // Wait before Sparkle — the pause no longer follows the sound.
    expect(
      jtwC3WeatherBuildComplete(
        weatherProject(scene, [
          { op: 'when_flag' },
          { op: 'wait', n: 2 },
          { op: 'play_sound', n: 6 },
          ...JTW_C3_P5_ROUTE_TAIL,
        ]),
      ),
    ).toBe(false);
    // Only half of the starry expression.
    expect(
      jtwC3WeatherBuildComplete(
        weatherProject(scene, [
          { op: 'when_flag' },
          { op: 'play_sound', n: 6 },
          ...JTW_C3_P5_ROUTE_TAIL,
        ]),
      ),
    ).toBe(false);
    // The mist expression, but with a Say the child typed themselves.
    expect(
      jtwC3WeatherBuildComplete(
        weatherProject(JTW_C3_PAGE2_MORNING_SCENE, [
          { op: 'when_flag' },
          { op: 'set_speed', n: 1 },
          { op: 'play_sound', n: 4 },
          { op: 'say', text: 'Typing casually' },
          ...JTW_C3_P5_ROUTE_TAIL,
        ]),
      ),
    ).toBe(false);
    // The mist expression at normal speed — "放慢观察" is the whole point.
    expect(
      jtwC3WeatherBuildComplete(
        weatherProject(JTW_C3_PAGE2_MORNING_SCENE, [
          { op: 'when_flag' },
          { op: 'set_speed', n: 2 },
          { op: 'play_sound', n: 4 },
          { op: 'say', text: JTW_C3_LISTEN_CLUE },
          ...JTW_C3_P5_ROUTE_TAIL,
        ]),
      ),
    ).toBe(false);
  });

  it('rejects a broken Page 1 / Page 3 demo chain, a moved start and a lost raft', () => {
    const base = built('morning');

    const withoutPage3 = { ...base, pages: base.pages.slice(0, 2) };
    expect(jtwC3WeatherBuildComplete(withoutPage3)).toBe(false);

    const brokenDepart = structuredClone(base);
    brokenDepart.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' },
      { op: 'goto_page', n: 2 },
    ];
    expect(jtwC3WeatherBuildComplete(brokenDepart)).toBe(false);

    const brokenArrival = structuredClone(base);
    brokenArrival.pages[2].characters[0].scripts[0].blocks = [{ op: 'when_flag' }, { op: 'end' }];
    expect(jtwC3WeatherBuildComplete(brokenArrival)).toBe(false);

    const movedStart = structuredClone(base);
    movedStart.pages[1].characters[0].start = { gx: 5, gy: 8, size: 3, rot: 0 };
    expect(jtwC3WeatherBuildComplete(movedStart)).toBe(false);

    const noRaft = structuredClone(base);
    noRaft.pages[1].characters = [noRaft.pages[1].characters[0]];
    expect(jtwC3WeatherBuildComplete(noRaft)).toBe(false);
  });

  it('offers the mist version its preset line, so nobody has to type it', () => {
    expect(storyMissionSayChoices(JTW_C3_P5_LESSON_ID)).toEqual([JTW_C3_LISTEN_CLUE]);
  });

  it('reads the placed blocks, the exit number and the sea back off the saved doc', () => {
    expect(jtwC3WeatherPlacedBlocks(built('starry')).map((block) => block.op)).toEqual([
      'play_sound',
      'wait',
      'move_right',
      'goto_page',
    ]);
    expect(jtwC3WeatherPlacedBlocks(built('morning')).map((block) => block.op)).toEqual([
      'set_speed',
      'play_sound',
      'say',
      'move_right',
      'goto_page',
    ]);
    expect(jtwC3WeatherExitTarget(built('starry'))).toBe(3);
    expect(jtwC3WeatherSavedScene(built('starry'))).toBe(JTW_C3_PAGE2_STARRY_SCENE);
    expect(jtwC3WeatherSavedScene(built('morning'))).toBe(JTW_C3_PAGE2_MORNING_SCENE);
  });

  it('narrows a stored weather id and refuses anything else', () => {
    expect(jtwC3ParseWeather('starry')).toBe('starry');
    expect(jtwC3ParseWeather('morning')).toBe('morning');
    expect(jtwC3ParseWeather('sunny')).toBeNull();
    expect(jtwC3ParseWeather(undefined)).toBeNull();
  });

  it('survives a save/parse round trip, so the studio document still matches', () => {
    for (const id of ['starry', 'morning'] as const) {
      expect(jtwC3WeatherBuildVersion(parseProject(JSON.stringify(built(id))))).toBe(id);
    }
  });

  it('really walks 1 → 2 → 3 for BOTH versions, and still exits to Page 3', async () => {
    for (const id of ['starry', 'morning'] as const) {
      const run = await runPageFlow(built(id), {
        trackCharacterId: JTW_C3_MONKEY_KING_ID,
        sleep: () => Promise.resolve(),
      });
      expect(run.trace).toEqual([1, 2, 3]);
      expect(run.stoppedBy).toBe('end');
      expect(run.visits[1]).toEqual(
        expect.objectContaining({ page: 2, enterCell: '2-8', exitCell: '6-8', exitTo: 3 }),
      );
    }
  });

  it('loops home again when the version keeps its weather but points the exit at 1', async () => {
    const chain = [...jtwC3WeatherVersion('starry').chain.slice(0, -1), { op: 'goto_page', n: 1 }];
    const run = await runPageFlow(weatherProject(JTW_C3_PAGE2_STARRY_SCENE, chain as Block[]), {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: () => Promise.resolve(),
    });
    expect(run.trace).toEqual([1, 2, 1]);
    expect(run.stoppedBy).toBe('loop');
  });

  it('keeps the Page 1 raft on the cell the Page 1 walk really ends on', () => {
    expect(JTW_C3_P5_PAGE1_RAFT_CELL).toEqual({ gx: 7, gy: 9 });
  });
});
