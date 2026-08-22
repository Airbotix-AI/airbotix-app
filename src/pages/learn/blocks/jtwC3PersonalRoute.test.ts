import { describe, expect, it } from 'vitest';

import type { Block, BlocksProject } from './blocksModel';
import {
  JTW_C3_P7_LESSON_ID,
  JTW_C3_P7_SAY_CHOICES,
  JTW_C3_P7_SCRIPT_IDS,
  jtwC3RouteComplete,
  jtwC3RouteDesign,
  jtwC3RouteEncodeExits,
  jtwC3RouteEncodeLedger,
  jtwC3RouteEncodeOps,
  jtwC3RouteFingerprint,
  jtwC3RouteSavedWeather,
  jtwC3RouteStarterProject,
} from './jtwC3PersonalRoute';
import { JTW_C3_MONKEY_KING_ID, JTW_C3_RAFT_ID } from './jtwC3Stage';
import type { JtwC3Weather } from './jtwC3WeatherBuild';
import { storyMissionProgramMatches } from './storyMissionProgress';

const WHOOSH = 4;
const SPARKLE = 6;
const ARRIVAL_LINE = "I hear singing in the forest. I'll follow it.";

/** A legal personal route: 2 · 3 · 2 actions, both exits, a stable End. */
const HOME_ACTIONS: Block[] = [
  { op: 'play_sound', n: WHOOSH },
  { op: 'move_right', n: 4 },
];
const SEA_ACTIONS: Block[] = [
  { op: 'set_speed', n: 1 },
  { op: 'wait', n: 2 },
  { op: 'move_right', n: 4 },
];
const SHORE_ACTIONS: Block[] = [
  { op: 'move_right', n: 2 },
  { op: 'say', text: ARRIVAL_LINE },
];

function scriptOf(project: BlocksProject, pageIndex: number, scriptId: string) {
  const character = project.pages[pageIndex].characters.find(
    (actor) => actor.id === JTW_C3_MONKEY_KING_ID,
  );
  const script = character?.scripts.find((candidate) => candidate.id === scriptId);
  if (!script) throw new Error(`missing script ${scriptId} on page ${pageIndex + 1}`);
  return script;
}

/** The starter with the three slots filled in — what a finished build looks like. */
function builtRoute(
  weather: JtwC3Weather = 'starry',
  overrides: {
    home?: Block[];
    sea?: Block[];
    shore?: Block[];
    homeExit?: Block;
    seaExit?: Block;
    shoreExit?: Block;
  } = {},
): BlocksProject {
  const project = jtwC3RouteStarterProject(weather);
  scriptOf(project, 0, JTW_C3_P7_SCRIPT_IDS.depart).blocks = [
    { op: 'when_flag' },
    ...(overrides.home ?? HOME_ACTIONS),
    overrides.homeExit ?? { op: 'goto_page', n: 2 },
  ];
  scriptOf(project, 1, JTW_C3_P7_SCRIPT_IDS.seaLeg).blocks = [
    { op: 'when_flag' },
    ...(overrides.sea ?? SEA_ACTIONS),
    overrides.seaExit ?? { op: 'goto_page', n: 3 },
  ];
  scriptOf(project, 2, JTW_C3_P7_SCRIPT_IDS.arrival).blocks = [
    { op: 'when_flag' },
    ...(overrides.shore ?? SHORE_ACTIONS),
    overrides.shoreExit ?? { op: 'end' },
  ];
  return project;
}

describe('jtwC3RouteStarterProject — what the two whitelisted branches ship', () => {
  it.each([['starry'], ['morning']])('seeds the %s branch as three EMPTY slots', (weather) => {
    const project = jtwC3RouteStarterProject(weather as JtwC3Weather);
    expect(project.lessonId).toBe(JTW_C3_P7_LESSON_ID);
    expect(jtwC3RouteSavedWeather(project)).toBe(weather);
    for (const [pageIndex, scriptId] of [
      [0, JTW_C3_P7_SCRIPT_IDS.depart],
      [1, JTW_C3_P7_SCRIPT_IDS.seaLeg],
      [2, JTW_C3_P7_SCRIPT_IDS.arrival],
    ] as const) {
      expect(scriptOf(project, pageIndex, scriptId).blocks).toEqual([{ op: 'when_flag' }]);
    }
    // The starter itself is NOT a finished route — every block is still owed.
    expect(jtwC3RouteDesign(project)).toBeNull();
  });
});

describe('jtwC3RouteDesign — the personal three-page route grammar', () => {
  it.each([['starry'], ['morning']])('accepts a legal route on the %s sea', (weather) => {
    const design = jtwC3RouteDesign(builtRoute(weather as JtwC3Weather));
    expect(design).not.toBeNull();
    expect(design?.weather).toBe(weather);
    // 至少七块：这一份有十块 (2+3+2 个动作 + 两个 Goto + 一个 End)。
    expect(design?.childBlocks).toBe(10);
    expect(design?.moves).toBe(3);
    expect(design?.sounds).toBe(1);
    expect(design?.paces).toBe(2);
    expect(design?.says).toBe(1);
    expect(design?.pages.map((page) => page.moveTotal)).toEqual([4, 4, 2]);
    expect(design?.pages.map((page) => page.exitTo)).toEqual([2, 3, null]);
    expect(design?.pages.map((page) => page.ends)).toEqual([false, false, true]);
    // The studio's own matcher agrees, so a run of this really records a marker.
    expect(
      storyMissionProgramMatches(builtRoute(weather as JtwC3Weather), JTW_C3_P7_LESSON_ID),
    ).toBe(true);
  });

  it('accepts the smallest legal route — 2 actions on every page', () => {
    const design = jtwC3RouteDesign(
      builtRoute('morning', {
        home: [
          { op: 'play_sound', n: WHOOSH },
          { op: 'move_right', n: 4 },
        ],
        sea: [
          { op: 'wait', n: 2 },
          { op: 'move_right', n: 4 },
        ],
        shore: [
          { op: 'say', text: ARRIVAL_LINE },
          { op: 'play_sound', n: SPARKLE },
        ],
      }),
    );
    expect(design?.childBlocks).toBe(9);
    expect(design?.childBlocks).toBeGreaterThanOrEqual(7);
  });

  // 循环 — 出口指回家不是路线。
  it('refuses a Page 2 exit that loops back to the home shore', () => {
    expect(
      jtwC3RouteDesign(builtRoute('starry', { seaExit: { op: 'goto_page', n: 1 } })),
    ).toBeNull();
    expect(
      jtwC3RouteDesign(builtRoute('starry', { homeExit: { op: 'goto_page', n: 1 } })),
    ).toBeNull();
  });

  // 死页 — Page 3 必须 End，不能再把故事交出去。
  it('refuses a far shore that hands the story on instead of ending', () => {
    expect(
      jtwC3RouteDesign(builtRoute('starry', { shoreExit: { op: 'goto_page', n: 1 } })),
    ).toBeNull();
  });

  // 空壳 — 只有一块 Goto 的页面不算一页故事。
  it('refuses a page left as a bare Goto shell, and a page with five actions', () => {
    expect(jtwC3RouteDesign(builtRoute('starry', { sea: [] }))).toBeNull();
    expect(
      jtwC3RouteDesign(builtRoute('starry', { home: [{ op: 'move_right', n: 4 }] })),
    ).toBeNull();
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          sea: [
            { op: 'set_speed', n: 1 },
            { op: 'play_sound', n: WHOOSH },
            { op: 'wait', n: 2 },
            { op: 'move_right', n: 2 },
            { op: 'move_right', n: 2 },
          ],
        }),
      ),
    ).toBeNull();
  });

  // 连续木筏/地标 — 走不到木筏那一格，或者走下木筏，都不通过。
  it('refuses a walk that misses the beached raft or steps off the deck', () => {
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          home: [
            { op: 'play_sound', n: WHOOSH },
            { op: 'move_right', n: 3 },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          sea: [
            { op: 'wait', n: 2 },
            { op: 'move_right', n: 2 },
          ],
        }),
      ),
    ).toBeNull();
    // 分成两块走满四格仍然通过——"木筏路径"是真的可以由孩子选的。
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          sea: [
            { op: 'move_right', n: 2 },
            { op: 'wait', n: 1 },
            { op: 'move_right', n: 2 },
          ],
        }),
      ),
    ).not.toBeNull();
  });

  // Page 2 的职责是"观察、前进与停顿"；Page 3 的职责里有山林歌声。
  it('refuses a sea page with no pause and a far shore that says nothing', () => {
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          sea: [
            { op: 'play_sound', n: SPARKLE },
            { op: 'move_right', n: 4 },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          shore: [
            { op: 'move_right', n: 2 },
            { op: 'play_sound', n: SPARKLE },
          ],
        }),
      ),
    ).toBeNull();
  });

  it('refuses a whole route with no sound anywhere in it', () => {
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          home: [
            { op: 'wait', n: 1 },
            { op: 'move_right', n: 4 },
          ],
          sea: [
            { op: 'wait', n: 2 },
            { op: 'move_right', n: 4 },
          ],
          shore: [
            { op: 'say', text: ARRIVAL_LINE },
            { op: 'move_right', n: 1 },
          ],
        }),
      ),
    ).toBeNull();
  });

  // 预设对白 — 自己打的字到不了保存文档，合同也不接受。
  it('refuses a free-typed line and accepts every preset one', () => {
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          shore: [
            { op: 'move_right', n: 2 },
            { op: 'say', text: "I'm going to get the treasure!" },
          ],
        }),
      ),
    ).toBeNull();
    for (const line of JTW_C3_P7_SAY_CHOICES) {
      expect(
        jtwC3RouteDesign(
          builtRoute('starry', {
            shore: [
              { op: 'move_right', n: 2 },
              { op: 'say', text: line },
            ],
          }),
        ),
      ).not.toBeNull();
    }
  });

  it('refuses an op outside the chapter-three set, and an out-of-band parameter', () => {
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          shore: [
            { op: 'move_left', n: 2 },
            { op: 'say', text: ARRIVAL_LINE },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      jtwC3RouteDesign(
        builtRoute('starry', {
          sea: [
            { op: 'wait', n: 9 },
            { op: 'move_right', n: 4 },
          ],
        }),
      ),
    ).toBeNull();
  });

  it('refuses a moved start cell, a shrunk sprite and a deleted raft chain', () => {
    const moved = builtRoute('starry');
    const monkey = moved.pages[1].characters.find((actor) => actor.id === JTW_C3_MONKEY_KING_ID)!;
    monkey.start = { ...monkey.start, gx: 16 };
    expect(jtwC3RouteDesign(moved)).toBeNull();

    const shrunk = builtRoute('starry');
    const shrunkMonkey = shrunk.pages[0].characters.find(
      (actor) => actor.id === JTW_C3_MONKEY_KING_ID,
    )!;
    shrunkMonkey.start = { ...shrunkMonkey.start, size: 1 };
    expect(jtwC3RouteDesign(shrunk)).toBeNull();

    const noDeck = builtRoute('starry');
    noDeck.pages[1].characters.find((actor) => actor.id === JTW_C3_RAFT_ID)!.scripts = [];
    expect(jtwC3RouteDesign(noDeck)).toBeNull();
  });

  it('refuses a repainted sea and a foreign lesson id', () => {
    const repainted = builtRoute('starry');
    repainted.pages[1].background = 'meadow';
    expect(jtwC3RouteDesign(repainted)).toBeNull();
    expect(jtwC3RouteSavedWeather(repainted)).toBeNull();

    const foreign = builtRoute('starry');
    foreign.lessonId = 'jtw-s1-c3-p5';
    expect(jtwC3RouteDesign(foreign)).toBeNull();
    expect(jtwC3RouteComplete(foreign)).toBe(false);
  });
});

describe('jtwC3RouteDesign — the stored evidence encodings', () => {
  it('encodes the placed ops, both exits and the seven-block ledger', () => {
    const design = jtwC3RouteDesign(builtRoute('starry'))!;
    expect(jtwC3RouteEncodeOps(design)).toEqual([
      `page1:play_sound:${WHOOSH}`,
      'page1:move_right:4',
      'page2:set_speed:1',
      'page2:wait:2',
      'page2:move_right:4',
      'page3:move_right:2',
      'page3:say:-',
    ]);
    expect(jtwC3RouteEncodeExits(design)).toEqual(['page1:2', 'page2:3', 'page3:end']);
    expect(jtwC3RouteEncodeLedger(design)).toEqual([
      'blocks:10',
      'moves:3',
      'sounds:1',
      'pace:2',
      'gotos:2',
      'ends:1',
    ]);
  });
});

describe('jtwC3RouteFingerprint — what "JSON consistent after reopening" compares', () => {
  it('matches an identical reload and separates one changed block', () => {
    const saved = builtRoute('starry');
    const reloaded = JSON.parse(JSON.stringify(saved)) as BlocksProject;
    expect(jtwC3RouteFingerprint(reloaded)).toBe(jtwC3RouteFingerprint(saved));

    const edited = builtRoute('starry', {
      shore: [
        { op: 'move_right', n: 3 },
        { op: 'say', text: ARRIVAL_LINE },
      ],
    });
    expect(jtwC3RouteFingerprint(edited)).not.toBe(jtwC3RouteFingerprint(saved));
  });
});
