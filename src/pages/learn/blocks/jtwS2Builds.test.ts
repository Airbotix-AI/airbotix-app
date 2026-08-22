import { describe, expect, it } from 'vitest';

import type { Block, BlocksProject } from './blocksModel';
import { BlocksRunner } from './interpreter';
import {
  JTW_S2_C1_P4_TARGET,
  JTW_S2_C1_P5_SIGN_TARGET,
  JTW_S2_C1_P6_TARGET,
  JTW_S2_C2_P4_TARGET,
  JTW_S2_C2_P5_WUKONG_TARGET,
  JTW_S2_C2_P6_WUKONG_BUG,
  JTW_S2_C3_P4_STONE_TARGET,
  JTW_S2_C3_P4_WUKONG_TARGET,
  JTW_S2_C3_P5_HORSE_TARGET,
  JTW_S2_C4_P4_BAJIE_TARGET,
  JTW_S2_C4_P4_WUKONG_TARGET,
  JTW_S2_C4_P5_BAJIE_TARGET,
  JTW_S2_C4_P5_HORSE_TARGET,
  JTW_S2_C5_P4_BAJIE_TARGET,
  JTW_S2_C5_P4_WUJING_TARGET,
  JTW_S2_C5_P4_WUKONG_TARGET,
  JTW_S2_C5_P5_WUJING_TARGET,
  JTW_S2_C5_P5_WUKONG_REPLY,
  JTW_S2_C6_HORSE_TARGET,
  JTW_S2_C6_P1_TARGET,
  JTW_S2_C6_P2_TARGET,
  JTW_S2_C6_WUJING_TARGET,
  JTW_S2_C6_WUKONG_TARGET,
  isJtwS2C2P5TapCompletion,
  isJtwS2C2P6TapCompletion,
  jtwS2BuildMatches,
} from './jtwS2Builds';

function messageProject(lessonId: string): BlocksProject {
  const c4 = lessonId.startsWith('jtw-s2-c4-');
  return {
    version: 1,
    name: lessonId,
    lessonId,
    pages: [
      {
        id: `${lessonId}-page`,
        background: c4 ? 'jtw-s2-c4-gaolao-courtyard' : 'jtw-s2-c5-flowing-sands-river',
        characters: c4
          ? [
              {
                id: 'wukong-sender',
                name: 'Wukong',
                emoji: '🐒',
                start: { gx: 3, gy: 7, size: 2, rot: 0 },
                scripts: [
                  {
                    id: 'wukong-route-send',
                    blocks: JTW_S2_C4_P4_WUKONG_TARGET.map((block) => ({ ...block })),
                  },
                ],
              },
              {
                id: 'bajie-receiver',
                name: 'Bajie',
                emoji: '🐷',
                start: { gx: 10, gy: 8, size: 2, rot: 0 },
                scripts: [
                  {
                    id: 'bajie-route-receive',
                    blocks: (lessonId === 'jtw-s2-c4-p4'
                      ? JTW_S2_C4_P4_BAJIE_TARGET
                      : JTW_S2_C4_P5_BAJIE_TARGET
                    ).map((block) => ({ ...block })),
                  },
                ],
              },
              {
                id: 'white-horse-waiting',
                name: 'Horse',
                emoji: '🐴',
                start: { gx: 15, gy: 8, size: 2, rot: 0, visible: false },
                scripts: [
                  {
                    id: 'horse-route-receipt',
                    blocks: (lessonId === 'jtw-s2-c4-p4'
                      ? ([{ op: 'when_message', n: 3 }, { op: 'end' }] as Block[])
                      : JTW_S2_C4_P5_HORSE_TARGET
                    ).map((block) => ({ ...block })),
                  },
                ],
              },
            ]
          : [
              {
                id: 'wukong-relay',
                name: 'Wukong',
                emoji: '🐒',
                start: { gx: 2, gy: 7, size: 2, rot: 0 },
                scripts: [
                  {
                    id: 'wukong-relay-send',
                    blocks: JTW_S2_C5_P4_WUKONG_TARGET.map((block) => ({ ...block })),
                  },
                  ...(lessonId !== 'jtw-s2-c5-p4'
                    ? [
                        {
                          id: 'wukong-relay-receipt',
                          blocks: JTW_S2_C5_P5_WUKONG_REPLY.map((block) => ({ ...block })),
                        },
                      ]
                    : []),
                ],
              },
              {
                id: 'bajie-relay',
                name: 'Bajie',
                emoji: '🐷',
                start: { gx: 9, gy: 8, size: 2, rot: 0 },
                scripts: [
                  {
                    id: 'bajie-relay-forward',
                    blocks: JTW_S2_C5_P4_BAJIE_TARGET.map((block) => ({ ...block })),
                  },
                ],
              },
              {
                id: 'wujing-relay',
                name: 'Wujing',
                emoji: '🧑',
                start: { gx: 16, gy: 8, size: 2, rot: 0, visible: false },
                scripts: [
                  {
                    id: 'wujing-relay-receive',
                    blocks: (lessonId === 'jtw-s2-c5-p4'
                      ? JTW_S2_C5_P4_WUJING_TARGET
                      : JTW_S2_C5_P5_WUJING_TARGET
                    ).map((block) => ({ ...block })),
                  },
                ],
              },
            ],
      },
    ],
  };
}

function c6Project(lessonId: string): BlocksProject {
  return {
    version: 1,
    name: lessonId,
    lessonId,
    pages: [
      {
        id: `${lessonId}-page-1`,
        background: 'jtw-s2-c6-team-gather',
        characters: [
          {
            id: 'xuanzang-team',
            name: 'Xuanzang',
            emoji: '🧑',
            start: { gx: 2, gy: 8, size: 2, rot: 0 },
            scripts: [
              {
                id: 'xuanzang-team-start',
                blocks: JTW_S2_C6_P1_TARGET.map((block) => ({ ...block })),
              },
            ],
          },
        ],
      },
      {
        id: `${lessonId}-page-2`,
        background: 'jtw-s2-c6-team-bridge',
        characters: [
          {
            id: 'bajie-team',
            name: 'Bajie',
            emoji: '🐷',
            start: { gx: 3, gy: 8, size: 2, rot: 0 },
            scripts: [
              {
                id: 'bajie-team-bridge',
                blocks: JTW_S2_C6_P2_TARGET.map((block) => ({ ...block })),
              },
            ],
          },
        ],
      },
      {
        id: `${lessonId}-page-3`,
        background: 'jtw-s2-c6-team-west',
        characters: [
          {
            id: 'wujing-team',
            name: 'Wujing',
            emoji: '🧑',
            start: { gx: 4, gy: 8, size: 2, rot: 0, visible: false },
            scripts: [
              {
                id: 'wujing-team-finish',
                blocks: JTW_S2_C6_WUJING_TARGET.map((block) => ({ ...block })),
              },
            ],
          },
          {
            id: 'white-horse-team',
            name: 'Horse',
            emoji: '🐴',
            start: { gx: 8, gy: 8, size: 2, rot: 0 },
            scripts: [
              {
                id: 'horse-team-finish',
                blocks: JTW_S2_C6_HORSE_TARGET.map((block) => ({ ...block })),
              },
            ],
          },
          {
            id: 'wukong-team',
            name: 'Wukong',
            emoji: '🐒',
            start: { gx: 13, gy: 8, size: 2, rot: 0 },
            scripts: [
              {
                id: 'wukong-team-finish',
                blocks: JTW_S2_C6_WUKONG_TARGET.map((block) => ({ ...block })),
              },
            ],
          },
        ],
      },
    ],
  };
}

function c3Project(
  lessonId: string,
  distance = 4,
  stoneGx = 6,
  horse: Block[] = JTW_S2_C3_P5_HORSE_TARGET,
): BlocksProject {
  return {
    version: 1,
    name: lessonId,
    lessonId,
    pages: [
      {
        id: `${lessonId}-page`,
        background: 'jtw-s2-c3-eagle-sorrow-stream',
        characters: [
          {
            id: 'wukong-scout',
            name: 'Wukong',
            emoji: '🐒',
            asset: '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png',
            start: { gx: 2, gy: 8, size: 2, rot: 0 },
            scripts: [
              {
                id: 'wukong-stream-route',
                blocks: JTW_S2_C3_P4_WUKONG_TARGET.map((block, index) =>
                  index === 1 ? { ...block, n: distance } : { ...block },
                ),
              },
            ],
          },
          {
            id: 'water-stone',
            name: 'Stone',
            emoji: '🪨',
            asset: '/story-blocks/journey-to-the-west/props/water-ripple-stone/neutral-v01.png',
            start: { gx: stoneGx, gy: 8, size: 2, rot: 0 },
            scripts: [{ id: 'stone-ripple', blocks: JTW_S2_C3_P4_STONE_TARGET }],
          },
          {
            id: 'white-dragon-horse',
            name: 'Horse',
            emoji: '🐴',
            asset:
              '/story-blocks/journey-to-the-west/characters/white-dragon-horse/neutral-v01.png',
            start: { gx: 8, gy: 8, size: 2, rot: 0, reach: 3, visible: false },
            scripts: [{ id: 'horse-welcome', blocks: horse.map((block) => ({ ...block })) }],
          },
        ],
      },
    ],
  };
}

function project(
  lessonId: string,
  blocks: Block[],
  args?: { second?: Block[]; name?: string },
): BlocksProject {
  const chapter2 = lessonId.startsWith('jtw-s2-c2-');
  const pageId = `${lessonId}-page`;
  const scriptId =
    lessonId === 'jtw-s2-c1-p4'
      ? 'xuanzang-departure'
      : lessonId === 'jtw-s2-c1-p5'
        ? 'xuanzang-departure'
        : lessonId === 'jtw-s2-c1-p6'
          ? 'xuanzang-departure-debug'
          : lessonId === 'jtw-s2-c1-p7'
            ? 'xuanzang-personal-departure'
            : 'xuanzang-approaches-mountain';
  return {
    version: 1,
    name: args?.name ?? lessonId,
    lessonId,
    pages: [
      {
        id: pageId,
        background: chapter2 ? 'jtw-s2-c2-five-elements-mountain' : 'jtw-s2-c1-changan-to-mountain',
        characters: [
          {
            id: 'xuanzang',
            name: 'Xuanzang',
            emoji: '🧑‍🦲',
            asset: '/story-blocks/journey-to-the-west/characters/xuanzang/neutral-v01.png',
            start: { gx: 2, gy: 9, size: 2, rot: 0 },
            scripts: [{ id: scriptId, blocks: blocks.map((block) => ({ ...block })) }],
          },
          ...(args?.second
            ? [
                {
                  id: chapter2 ? 'wukong-waiting' : 'five-elements-sign',
                  name: chapter2 ? 'Wukong Waiting' : 'Five Elements Mountain Sign',
                  emoji: chapter2 ? '🐒' : '🪧',
                  asset: chapter2
                    ? '/story-blocks/journey-to-the-west/characters/wukong-traveller/neutral-v01.png'
                    : '/story-blocks/journey-to-the-west/props/route-marker/neutral-v01.png',
                  start: {
                    gx: chapter2 ? 12 : 10,
                    gy: 8,
                    size: 2,
                    rot: 0,
                    ...(!chapter2 || lessonId === 'jtw-s2-c2-p5' || lessonId === 'jtw-s2-c2-p6'
                      ? { visible: false }
                      : {}),
                  },
                  scripts: [
                    {
                      id:
                        lessonId === 'jtw-s2-c2-p5'
                          ? 'wukong-answers'
                          : lessonId === 'jtw-s2-c2-p6'
                            ? 'wukong-answers-too-early'
                            : chapter2
                              ? 'wukong-waits'
                              : 'mountain-sign-tap',
                      blocks: args.second.map((block) => ({ ...block })),
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
  };
}

describe('Journey West S2 Studio mission contracts', () => {
  it('accepts the exact departure and rejects a route with Wait in the wrong place', () => {
    const valid = project('jtw-s2-c1-p4', JTW_S2_C1_P4_TARGET);
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c1-p4')).toBe(true);
    valid.pages[0].characters[0].asset = '/wrong-asset.png';
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c1-p4')).toBe(false);
    const wrong = [...JTW_S2_C1_P4_TARGET];
    [wrong[3], wrong[4]] = [wrong[4], wrong[3]];
    expect(jtwS2BuildMatches(project('jtw-s2-c1-p4', wrong), 'jtw-s2-c1-p4')).toBe(false);
  });

  it('requires the P4 route and an isolated On Tap sign response in P5', () => {
    const valid = project('jtw-s2-c1-p5', JTW_S2_C1_P4_TARGET, {
      second: JTW_S2_C1_P5_SIGN_TARGET,
    });
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c1-p5')).toBe(true);
    valid.pages[0].characters[1].scripts[0].blocks[0] = { op: 'when_flag' };
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c1-p5')).toBe(false);
  });

  it('rejects the shipped early-arrival bug and accepts moving Wait between the routes', () => {
    const bug = [
      { op: 'when_flag' },
      { op: 'say', text: 'Bring your luggage' },
      { op: 'move_right', n: 3 },
      { op: 'move_right', n: 3 },
      { op: 'wait', n: 2 },
      { op: 'say', text: 'arrive' },
      { op: 'end' },
    ] as Block[];
    expect(jtwS2BuildMatches(project('jtw-s2-c1-p6', bug), 'jtw-s2-c1-p6')).toBe(false);
    expect(jtwS2BuildMatches(project('jtw-s2-c1-p6', JTW_S2_C1_P6_TARGET), 'jtw-s2-c1-p6')).toBe(
      true,
    );
  });

  it('accepts only the three bag lines and two pace choices for Personal Ship', () => {
    const personal: Block[] = [
      { op: 'when_flag' },
      { op: 'say', text: 'Set off with a scroll' },
      { op: 'set_speed', n: 1 },
      { op: 'move_right', n: 3 },
      { op: 'wait', n: 2 },
      { op: 'move_right', n: 3 },
      { op: 'say', text: 'Arrived at the foot of the mountain' },
      { op: 'end' },
    ];
    expect(
      jtwS2BuildMatches(
        project('jtw-s2-c1-p7', personal, { name: 'My First Westward Departure' }),
        'jtw-s2-c1-p7',
      ),
    ).toBe(true);
    personal[1] = { op: 'say', text: 'Depart with a magic portal' };
    expect(
      jtwS2BuildMatches(
        project('jtw-s2-c1-p7', personal, { name: 'My First Westward Departure' }),
        'jtw-s2-c1-p7',
      ),
    ).toBe(false);
  });

  it('keeps Wukong quiet while Xuanzang runs the C2-P4 Start script', () => {
    const valid = project('jtw-s2-c2-p4', JTW_S2_C2_P4_TARGET, {
      second: [{ op: 'when_tap' }, { op: 'end' }],
    });
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c2-p4')).toBe(true);
    valid.pages[0].characters[1].scripts[0].blocks.splice(1, 0, { op: 'say', text: "I'm here" });
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c2-p4')).toBe(false);
  });

  it('requires the preserved question before the exact hidden Wukong Tap response', () => {
    const valid = project('jtw-s2-c2-p5', JTW_S2_C2_P4_TARGET, {
      second: JTW_S2_C2_P5_WUKONG_TARGET,
    });
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c2-p5')).toBe(true);
    valid.pages[0].characters[1].scripts[0].blocks[0] = { op: 'when_flag' };
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c2-p5')).toBe(false);
    valid.pages[0].characters[1].scripts[0].blocks[0] = { op: 'when_tap' };
    valid.pages[0].characters[0].scripts[0].blocks[3] = { op: 'say', text: 'I answer for you' };
    expect(jtwS2BuildMatches(valid, 'jtw-s2-c2-p5')).toBe(false);
  });

  it('accepts the P5 Tap completion only after a matching Go run', () => {
    expect(isJtwS2C2P5TapCompletion('jtw-s2-c2-p5', 'wukong-waiting', true, true)).toBe(true);
    expect(isJtwS2C2P5TapCompletion('jtw-s2-c2-p5', 'wukong-waiting', false, true)).toBe(false);
    expect(isJtwS2C2P5TapCompletion('jtw-s2-c2-p5', 'xuanzang', true, true)).toBe(false);
    expect(isJtwS2C2P5TapCompletion('jtw-s2-c2-p5', 'wukong-waiting', true, false)).toBe(false);
  });

  it('accepts P6 only after the sole wrong Start trigger is repaired', () => {
    const fixed = project('jtw-s2-c2-p6', JTW_S2_C2_P4_TARGET, {
      second: JTW_S2_C2_P5_WUKONG_TARGET,
    });
    expect(jtwS2BuildMatches(fixed, 'jtw-s2-c2-p6')).toBe(true);
    fixed.pages[0].characters[1].scripts[0].blocks = JTW_S2_C2_P6_WUKONG_BUG;
    expect(jtwS2BuildMatches(fixed, 'jtw-s2-c2-p6')).toBe(false);
  });

  it('requires P6 wrong-run, fixed-Go, correct answer and Tap evidence together', () => {
    expect(isJtwS2C2P6TapCompletion('jtw-s2-c2-p6', 'wukong-waiting', true, true, true, true)).toBe(
      true,
    );
    expect(
      isJtwS2C2P6TapCompletion('jtw-s2-c2-p6', 'wukong-waiting', false, true, true, true),
    ).toBe(false);
    expect(
      isJtwS2C2P6TapCompletion('jtw-s2-c2-p6', 'wukong-waiting', true, false, true, true),
    ).toBe(false);
    expect(
      isJtwS2C2P6TapCompletion('jtw-s2-c2-p6', 'wukong-waiting', true, true, false, true),
    ).toBe(false);
    expect(isJtwS2C2P6TapCompletion('jtw-s2-c2-p6', 'xuanzang', true, true, true, true)).toBe(
      false,
    );
  });

  it('accepts C3-P4/P5 only when the route, ripple and response chains are exact', () => {
    const p4 = c3Project('jtw-s2-c3-p4', 4, 6, [{ op: 'when_bump' }, { op: 'end' }]);
    expect(jtwS2BuildMatches(p4, 'jtw-s2-c3-p4')).toBe(true);
    const p5 = c3Project('jtw-s2-c3-p5');
    expect(jtwS2BuildMatches(p5, 'jtw-s2-c3-p5')).toBe(true);
    p5.pages[0].characters[2].scripts[0].blocks[0] = { op: 'when_flag' };
    expect(jtwS2BuildMatches(p5, 'jtw-s2-c3-p5')).toBe(false);
  });

  it('rejects the C3-P6 one-cell-short bug and accepts the repaired distance', () => {
    expect(jtwS2BuildMatches(c3Project('jtw-s2-c3-p6', 3), 'jtw-s2-c3-p6')).toBe(false);
    expect(jtwS2BuildMatches(c3Project('jtw-s2-c3-p6', 4), 'jtw-s2-c3-p6')).toBe(true);
  });

  it('accepts all three aligned C3-P7 distances and both welcome versions', () => {
    const versionB: Block[] = [
      { op: 'when_bump' },
      { op: 'show' },
      { op: 'grow', n: 1 },
      { op: 'reset_size' },
      { op: 'say', text: 'I will go with you steadily' },
      { op: 'end' },
    ];
    for (const [distance, stone] of [
      [3, 5],
      [4, 6],
      [5, 7],
    ] as const) {
      const versionA: Block[] = [
        { op: 'when_bump' },
        { op: 'show' },
        { op: 'hop', n: 1 },
        { op: 'say', text: 'Welcome colleagues' },
        { op: 'end' },
      ];
      expect(
        jtwS2BuildMatches(c3Project('jtw-s2-c3-p7', distance, stone, versionA), 'jtw-s2-c3-p7'),
      ).toBe(true);
      expect(
        jtwS2BuildMatches(c3Project('jtw-s2-c3-p7', distance, stone, versionB), 'jtw-s2-c3-p7'),
      ).toBe(true);
    }
    expect(jtwS2BuildMatches(c3Project('jtw-s2-c3-p7', 3, 7), 'jtw-s2-c3-p7')).toBe(false);
  });

  it.each([
    [3, 5],
    [4, 6],
    [5, 7],
  ] as const)(
    'runs the real C3-P7 bump at distance %i and reveals the horse across the stream',
    async (distance, stone) => {
      const says: string[] = [];
      const welcome: Block[] = [
        { op: 'when_bump' },
        { op: 'show' },
        { op: 'hop', n: 1 },
        { op: 'say', text: 'Welcome colleagues' },
        { op: 'end' },
      ];
      const runner = new BlocksRunner(
        c3Project('jtw-s2-c3-p7', distance, stone, welcome).pages[0],
        {
          onSprite: () => undefined,
          onSay: (_id, text) => {
            if (text) says.push(text);
          },
          onSound: () => undefined,
          onNote: () => undefined,
          onGotoPage: () => undefined,
        },
        () => Promise.resolve(),
      );
      await runner.runFlag();
      expect(runner.state('wukong-scout')?.gx).toBe(stone);
      expect(runner.state('white-dragon-horse')?.visible).toBe(true);
      expect(says).toContain('Welcome colleagues');
      expect(says.filter((line) => line === 'Welcome colleagues')).toHaveLength(1);
    },
  );

  it('requires both C4 message scripts, the receipt, and rejects the shipped orange bug', () => {
    expect(jtwS2BuildMatches(messageProject('jtw-s2-c4-p4'), 'jtw-s2-c4-p4')).toBe(true);
    expect(jtwS2BuildMatches(messageProject('jtw-s2-c4-p5'), 'jtw-s2-c4-p5')).toBe(true);
    const bug = messageProject('jtw-s2-c4-p6');
    bug.pages[0].characters[1].scripts[0].blocks[0] = { op: 'when_message', n: 2 };
    expect(jtwS2BuildMatches(bug, 'jtw-s2-c4-p6')).toBe(false);
    bug.pages[0].characters[1].scripts[0].blocks[0] = { op: 'when_message', n: 5 };
    expect(jtwS2BuildMatches(bug, 'jtw-s2-c4-p6')).toBe(true);
  });

  it('accepts a C4 personal route only when Send/Get match and yellow remains the receipt', () => {
    const personal = messageProject('jtw-s2-c4-p7');
    expect(jtwS2BuildMatches(personal, 'jtw-s2-c4-p7')).toBe(true);
    personal.pages[0].characters[1].scripts[0].blocks[0] = { op: 'when_message', n: 4 };
    expect(jtwS2BuildMatches(personal, 'jtw-s2-c4-p7')).toBe(false);
  });

  it('requires the complete C5 blue-to-yellow relay before the purple receipt', () => {
    const p4 = messageProject('jtw-s2-c5-p4');
    expect(jtwS2BuildMatches(p4, 'jtw-s2-c5-p4')).toBe(true);
    p4.pages[0].characters[1].scripts[0].blocks.splice(2, 1);
    expect(jtwS2BuildMatches(p4, 'jtw-s2-c5-p4')).toBe(false);
    const p5 = messageProject('jtw-s2-c5-p5');
    expect(jtwS2BuildMatches(p5, 'jtw-s2-c5-p5')).toBe(true);
    p5.pages[0].characters[0].scripts[1].blocks[0] = { op: 'when_flag' };
    expect(jtwS2BuildMatches(p5, 'jtw-s2-c5-p5')).toBe(false);
  });

  it('rejects the C5 missing-middle-Send bug and accepts a valid three-colour personal relay', () => {
    const debug = messageProject('jtw-s2-c5-p6');
    debug.pages[0].characters[1].scripts[0].blocks.splice(2, 1);
    expect(jtwS2BuildMatches(debug, 'jtw-s2-c5-p6')).toBe(false);
    debug.pages[0].characters[1].scripts[0].blocks.splice(2, 0, { op: 'send_message', n: 3 });
    expect(jtwS2BuildMatches(debug, 'jtw-s2-c5-p6')).toBe(true);
    const personal = messageProject('jtw-s2-c5-p7');
    expect(jtwS2BuildMatches(personal, 'jtw-s2-c5-p7')).toBe(true);
    personal.pages[0].characters[2].scripts[0].blocks[3] = { op: 'send_message', n: 3 };
    expect(jtwS2BuildMatches(personal, 'jtw-s2-c5-p7')).toBe(false);
  });

  it('requires the exact three-page C6 flow and rejects both stable debug bugs', () => {
    const complete = c6Project('jtw-s2-c6-p5');
    expect(jtwS2BuildMatches(complete, 'jtw-s2-c6-p5')).toBe(true);
    const debug = c6Project('jtw-s2-c6-p6');
    debug.pages[1].characters[0].scripts[0].blocks[4] = { op: 'goto_page', n: 1 };
    debug.pages[2].characters[0].scripts[0].blocks[0] = { op: 'when_message', n: 6 };
    expect(jtwS2BuildMatches(debug, 'jtw-s2-c6-p6')).toBe(false);
    debug.pages[1].characters[0].scripts[0].blocks[4] = { op: 'goto_page', n: 3 };
    debug.pages[2].characters[0].scripts[0].blocks[0] = { op: 'when_message', n: 3 };
    expect(jtwS2BuildMatches(debug, 'jtw-s2-c6-p6')).toBe(true);
  });
});
