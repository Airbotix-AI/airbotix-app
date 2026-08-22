// Journey to the West · C2-P6 "回去的第一处偏离" — the chapter's Fix contract and
// child-facing content (scene-specs JTW-S1-C2-P6, teaching script C2 Part 6).
//
// The starter (`blocks_jtw_c2_p6`) ships the bug as-is: Left 2 → Left 2 →
// Down 1. Every block and every parameter is already useful — only the middle
// order is wrong, so the monkey leaves the wet-stone route at 2/7 (open water
// above the low stones) and his Down lands him on the WRONG low stone: he
// never sets foot on 4-8, the stone the friends have to follow. The repair is
// one swap — the second Left 2 with the Down 1 — and nothing else.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md.

import type { Block, BlocksProject } from '../blocksModel';
import type { JtwEvidenceOption } from './journeyWestSeason1';
import { jtwWetStoneTrace } from './journeyWestC2Route';

export const C2_P6_LESSON_ID = 'jtw-s1-c2-p6';
export const C2_P6_PAGE_ID = 'jtw-c2-p6-page';
export const C2_P6_SCRIPT_ID = 'stone-monkey-return-bug';
export const C2_P6_TEMPLATE = 'blocks_jtw_c2_p6';
export const C2_P6_PROJECT_TITLE = 'Journey to the West · The first deviation back';

/** The monkey starts the return walk on the entrance cell P4/P5 left him on. */
export const C2_P6_START = { gx: 6, gy: 7 } as const;

/** The shipped bug chain (child-visible middle only — Start/End are reserved). */
export const C2_P6_BUG_MOVES: readonly Block[] = [
  { op: 'move_left', n: 2 },
  { op: 'move_left', n: 2 },
  { op: 'move_down', n: 1 },
];

/** The one legal repair: the second Left 2 and the Down 1 swap places. */
export const C2_P6_TARGET_MOVES: readonly Block[] = [
  { op: 'move_left', n: 2 },
  { op: 'move_down', n: 1 },
  { op: 'move_left', n: 2 },
];

export const C2_P6_BUG_TRACE = jtwWetStoneTrace(C2_P6_BUG_MOVES, C2_P6_START);
export const C2_P6_TARGET_TRACE = jtwWetStoneTrace(C2_P6_TARGET_MOVES, C2_P6_START);

/** The low stone the bug never touches — the whole point of the first deviation. */
export const C2_P6_SKIPPED_STONE = '4-8';
/** Where the bug leaves the route: open water above the low stones. */
export const C2_P6_OFF_ROUTE_CELL = '2-7';

/** Child-facing story text — teaching script C2 Part 6 IN FULL, never compressed. */
export const C2_P6_STORY_BEFORE: readonly [string, string, string] = [
  'Stone Monkey promised to go back and tell his partner, but the return script was Left 2 → Left 2 → Down 1; the building blocks and parameters were all useful, only the order in the middle was wrong. The child first marks three actual stopping points, locates the first deviation according to the map in the cave, and only exchanges Down 1 and the second Left 2 before running.',
  'Debug Checkpoint 2: Able to complete "It\'s not that there are too few blocks, but that step ___ should be ___ first; after the exchange, the route returns from ___ to ___."',
  'Post-mission story: The stone monkey returned to the group of monkeys, explained that the cave was safe, and invited everyone to follow his route.',
];

/** 人物动机：兑现“回来分享”的约定；速度不能修复方向顺序。 */
export const C2_P6_MOTIVE =
  'The stone monkey wants to fulfill the promise of "come back and share": his companions must follow his footsteps, so they must step on every wet stone on the way back. No matter how fast you run, you can\'t fix the direction sequence - what\'s wrong is where to go first in the second segment, not the speed.';

/** 因果桥：三段回程各对应一块积木和一个停点。 */
export const C2_P6_STORY_BRIDGE =
  'The return journey is the same wet stone road as the outbound journey, just in reverse: Left 2 returns from the entrance to the high platform, Down 1 steps on the low rocks 4-8, and finally Left 2 returns to the starting point where the friends are waiting. Three building blocks, three stopping points - if the order is wrong, the footprints will no longer be a path that your partner can follow.';

// ── 五段解释 1：预期 ─────────────────────────────────────────────────────────
export const C2_P6_EXPECT_QUESTION =
  'Let’s talk about expectations first: If we return along the original route as agreed, what should be the three stopping points?';
export const C2_P6_EXPECT_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'expect-4-7-4-8-2-8',
    label:
      '4-7 High platform → 4-8 Low stone → 2-8 Starting point (how to go when you came, how to go back)',
    correct: true,
  },
  {
    id: 'expect-straight-left',
    label:
      'Just go all the way to the left, and it will be the same wherever you step in the middle.',
    correct: false,
  },
  {
    id: 'expect-down-first',
    label: 'Jump into the water first, then swim back to the left',
    correct: false,
  },
];

// ── 五段解释 2：实际 ─────────────────────────────────────────────────────────
export const C2_P6_ACTUAL_QUESTION =
  'After running the bug, what are the actual three stopping points?';
export const C2_P6_ACTUAL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'actual-off-route',
    label:
      '4-7 → 2-7 → 2-8: The second section breaks out of the high platform and stops on the water above the low rocks.',
    correct: true,
  },
  {
    id: 'actual-same-as-expected',
    label: 'Exactly as expected, just a little slower',
    correct: false,
  },
  { id: 'actual-stuck', label: "The stone monkey didn't move a step", correct: false },
];

// ── 五段解释 3：第一次偏离 ───────────────────────────────────────────────────
export const C2_P6_DEVIATION_QUESTION =
  'In which paragraph is the first deviation? Click on the track:';
export const C2_P6_DEVIATION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'deviation-second-segment',
    label:
      'Second section - Down 1 should be used to step on the low rocks at 4-8, but the bug continues to use Left 2 to rush above the water at 2-7',
    correct: true,
  },
  {
    id: 'deviation-first-segment',
    label: 'The first paragraph - the two versions are different from the first step',
    correct: false,
  },
  {
    id: 'deviation-third-segment',
    label: 'Third paragraph - only the last piece is different',
    correct: false,
  },
];
export const C2_P6_DEVIATION_RETRY_HINT =
  'Look at each paragraph side by side: the first paragraph of both versions is Left 2, and both stop on the high platform of 4-7 - which paragraph is the first to be different?';

// ── 五段解释 4：最小 diff ────────────────────────────────────────────────────
export const C2_P6_FIX_QUESTION = 'What changes did you make in the workspace?';
export const C2_P6_FIX_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'fix-swap-two-blocks',
    label: 'Just swap the positions of the second Left 2 and Down 1, nothing else is changed.',
    correct: true,
  },
  {
    id: 'fix-bigger-number',
    label: 'Change Left 2 to Left 4 and retreat to the end at a time',
    correct: false,
  },
  {
    id: 'fix-speed',
    label: 'Add a piece of Set Speed ​​to make the stone monkey run faster',
    correct: false,
  },
  { id: 'fix-rebuild', label: 'Delete all three pieces and create a new one', correct: false },
];

// ── 五段解释 5：重跑结果 ─────────────────────────────────────────────────────
export const C2_P6_RERUN_QUESTION =
  'After running again, what is the difference between the footprints and the bug?';
export const C2_P6_RERUN_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'rerun-stone-path',
    label:
      'The end point is the same, but the road is different: this time I have stepped on 4-8 low stones, and my partner will follow the same path without missing anything.',
    correct: true,
  },
  {
    id: 'rerun-faster',
    label: "It's just a little faster, but the route is actually the same",
    correct: false,
  },
  {
    id: 'rerun-new-endpoint',
    label: 'Stone Monkey returns to a completely different place',
    correct: false,
  },
];
export const C2_P6_RERUN_RETRY_HINT =
  'Comparing the two sets of footprints together: they stopped at 2-8 twice, but only once passed the low stone at 4-8 - the one that the partner wanted to follow.';

/** 预测（scene-specs）：第一段正确以后，第二段应该先向下还是继续向左？ */
export const C2_P6_PREDICTION_QUESTION =
  'After the first paragraph is correct, should the second paragraph go down first or continue to the left?';
export const C2_P6_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'predict-down-first',
    label:
      'Go down first - step on the low rocks 4-8 before you can reach the path back to your partner.',
    correct: true,
  },
  {
    id: 'predict-left-again',
    label: 'Continue to the left, and finally go down to reach home.',
    correct: false,
  },
];
export const C2_P6_PREDICTION_RETRY_HINT =
  'Look at the footprints: Stone Monkey jumped from 4-8 to 4-7. To go back to the original path, you must first step back to the low stone from the high platform.';

export const C2_P6_RESOLVED_WORLD_CHANGE =
  'The stone monkey returns along the way it came: first from the water curtain entrance back to the high platform 4-7, then stepping on the low stone 4-8, and finally back to 2-8 - the high stone where the friends are waiting. The three footprints match exactly where they came from.';
export const C2_P6_STORY_AFTER =
  'He explained his findings clearly in terms of bridge, dry land, and clear water, and invited everyone to follow this feasible route.';
export const C2_P6_CONTINUE_LABEL = 'Make the route a road for everyone';

/**
 * The read-only reproduction the part page runs through the REAL BlocksRunner:
 * the SAME bug the backend starter ships, so "第二段冲出湿石路" is observed on
 * stage rather than narrated. It is never saved and never counts as the Build.
 */
export const C2_P6_BUG_PROJECT: BlocksProject = {
  version: 1,
  name: 'Journey to the West · C2-P6 return bug',
  lessonId: C2_P6_LESSON_ID,
  pages: [
    {
      id: 'jtw-c2-p6-bug-page',
      background: 'jtw-s1-c2-water-curtain-actor-free',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
          start: { gx: C2_P6_START.gx, gy: C2_P6_START.gy, size: 3, rot: 0 },
          scripts: [
            {
              id: C2_P6_SCRIPT_ID,
              blocks: [{ op: 'when_flag' }, ...C2_P6_BUG_MOVES, { op: 'end' }],
            },
          ],
        },
      ],
    },
  ],
};

interface ReturnScriptBlocks {
  /** All blocks of the return script, Start and End included. */
  all: readonly Block[];
  /** Just the child-owned middle, in saved order. */
  middle: readonly Block[];
}

/** Read the return script out of a saved project (empty when it is not there). */
export function c2p6ReturnScript(project: BlocksProject): ReturnScriptBlocks {
  const all =
    project.pages
      .find((page) => page.id === C2_P6_PAGE_ID)
      ?.characters.find((character) => character.id === 'stone-monkey')
      ?.scripts.find((script) => script.id === C2_P6_SCRIPT_ID)?.blocks ?? [];
  return { all, middle: all.filter((block) => block.op !== 'when_flag' && block.op !== 'end') };
}

function moveKey(blocks: readonly Block[]): string {
  return blocks.map((block) => `${block.op}:${block.n ?? 0}`).join(',');
}

/** Is the saved middle exactly the one legal repair? */
export function c2p6OrderRepaired(middle: readonly Block[]): boolean {
  return moveKey(middle) === moveKey(C2_P6_TARGET_MOVES);
}

/** Is the saved middle still the shipped bug (used for the honest project diff)? */
export function c2p6OrderIsBug(middle: readonly Block[]): boolean {
  return moveKey(middle) === moveKey(C2_P6_BUG_MOVES);
}

/**
 * The honest project diff, bug → saved: which 1-based slot each move block moved
 * to. Only reports blocks that actually changed position, so the minimal
 * two-block swap reads as exactly two moves.
 */
export function c2p6ProjectDiff(middle: readonly Block[]): string[] {
  const diff: string[] = [];
  const bugKeys = C2_P6_BUG_MOVES.map((block) => `${block.op}:${block.n ?? 0}`);
  const savedKeys = middle.map((block) => `${block.op}:${block.n ?? 0}`);
  const claimed = new Set<number>();
  savedKeys.forEach((key, savedIndex) => {
    const from = bugKeys.findIndex((bugKey, index) => bugKey === key && !claimed.has(index));
    if (from < 0) {
      diff.push(`${key}:new->${savedIndex + 1}`);
      return;
    }
    claimed.add(from);
    if (from !== savedIndex) diff.push(`${key}:${from + 1}->${savedIndex + 1}`);
  });
  return diff;
}
