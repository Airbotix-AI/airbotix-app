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
export const C2_P6_PROJECT_TITLE = '西游记 · 回去的第一处偏离';

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
  '石猴答应回去告诉伙伴，但返回脚本为Left 2 → Left 2 → Down 1；积木和参数都有用，只有中间顺序错误。孩子先标出三个实际停点，对照洞内地图定位第一处偏离，只交换Down 1与第二个Left 2再运行。',
  'Debug Checkpoint 2：能完成“不是块太少，而是第___步应先___；交换后路线从___回到___。”',
  '任务后故事：石猴回到群猴面前，说明洞里安全，并邀请大家跟着自己的路线进入。',
];

/** 人物动机：兑现“回来分享”的约定；速度不能修复方向顺序。 */
export const C2_P6_MOTIVE =
  '石猴要兑现“回来分享”的约定：伙伴要照着他的脚印走，所以回程必须踩回来时的每一块湿石。跑得再快也修不好方向顺序——错的是第二段先往哪里走，不是速度。';

/** 因果桥：三段回程各对应一块积木和一个停点。 */
export const C2_P6_STORY_BRIDGE =
  '回程和去程是同一条湿石路，只是反过来走：Left 2 从入口退回高台，Down 1 踩下 4-8 的低石，最后 Left 2 回到伙伴等着的起点。三块积木、三个停点——顺序错了，脚印就不再是伙伴能跟的路。';

// ── 五段解释 1：预期 ─────────────────────────────────────────────────────────
export const C2_P6_EXPECT_QUESTION = '先说预期：按约定原路返回，三个停点应该是哪三个？';
export const C2_P6_EXPECT_OPTIONS: JtwEvidenceOption[] = [
  { id: 'expect-4-7-4-8-2-8', label: '4-7 高台 → 4-8 低石 → 2-8 起点（来时怎么走，回去就怎么退）', correct: true },
  { id: 'expect-straight-left', label: '一路向左就好，中间踩哪里都一样', correct: false },
  { id: 'expect-down-first', label: '先跳下水，再一直向左游回去', correct: false },
];

// ── 五段解释 2：实际 ─────────────────────────────────────────────────────────
export const C2_P6_ACTUAL_QUESTION = '运行 bug 之后，实际的三个停点是什么？';
export const C2_P6_ACTUAL_OPTIONS: JtwEvidenceOption[] = [
  { id: 'actual-off-route', label: '4-7 → 2-7 → 2-8：第二段冲出高台，停在低石上方的水面', correct: true },
  { id: 'actual-same-as-expected', label: '和预期完全一样，只是慢了一点', correct: false },
  { id: 'actual-stuck', label: '石猴一步也没有动', correct: false },
];

// ── 五段解释 3：第一次偏离 ───────────────────────────────────────────────────
export const C2_P6_DEVIATION_QUESTION = '第一处偏离在第几段？在轨迹上点出来：';
export const C2_P6_DEVIATION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'deviation-second-segment',
    label: '第二段——应该先 Down 1 踩上 4-8 的低石，bug 却继续 Left 2 冲到 2-7 的水面上方',
    correct: true,
  },
  { id: 'deviation-first-segment', label: '第一段——两版从第一步就不一样', correct: false },
  { id: 'deviation-third-segment', label: '第三段——只有最后一块不同', correct: false },
];
export const C2_P6_DEVIATION_RETRY_HINT =
  '一段一段对着看：两版的第一段都是 Left 2、都停在 4-7 的高台上——最早不一样的是哪一段？';

// ── 五段解释 4：最小 diff ────────────────────────────────────────────────────
export const C2_P6_FIX_QUESTION = '你在工作区里做了什么修改？';
export const C2_P6_FIX_OPTIONS: JtwEvidenceOption[] = [
  { id: 'fix-swap-two-blocks', label: '只把第二个 Left 2 和 Down 1 交换位置，别的什么都没动', correct: true },
  { id: 'fix-bigger-number', label: '把 Left 2 改成 Left 4，一次退到底', correct: false },
  { id: 'fix-speed', label: '加一块 Set Speed，让石猴跑快一点', correct: false },
  { id: 'fix-rebuild', label: '把三块全删掉重新搭一条', correct: false },
];

// ── 五段解释 5：重跑结果 ─────────────────────────────────────────────────────
export const C2_P6_RERUN_QUESTION = '重跑以后，脚印和 bug 那次比有什么不同？';
export const C2_P6_RERUN_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'rerun-stone-path',
    label: '终点一样，路却不一样了：这次踩过 4-8 的低石，伙伴照着走不会踩空',
    correct: true,
  },
  { id: 'rerun-faster', label: '只是快了一点，路线其实一样', correct: false },
  { id: 'rerun-new-endpoint', label: '石猴回到了另一个完全不同的地方', correct: false },
];
export const C2_P6_RERUN_RETRY_HINT =
  '把两串脚印排在一起比：两次都停在 2-8，但只有一次经过 4-8 那块低石——伙伴要跟的就是那一块。';

/** 预测（scene-specs）：第一段正确以后，第二段应该先向下还是继续向左？ */
export const C2_P6_PREDICTION_QUESTION = '第一段正确以后，第二段应该先向下还是继续向左？';
export const C2_P6_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  { id: 'predict-down-first', label: '先向下——踩上 4-8 的低石，才接得回伙伴那条路', correct: true },
  { id: 'predict-left-again', label: '继续向左，最后再向下也一样到家', correct: false },
];
export const C2_P6_PREDICTION_RETRY_HINT =
  '看看来时的脚印：石猴是从 4-8 跳上 4-7 的。回去要原路，就得先从高台踩回那块低石。';

export const C2_P6_RESOLVED_WORLD_CHANGE =
  '石猴沿来路退回：先从水帘入口回到 4-7 的高台，再踩下 4-8 的低石，最后回到 2-8——伙伴们等着的高石前。三个脚印和来时完全对得上。';
export const C2_P6_STORY_AFTER =
  '他按桥、干地、清水把发现说清楚，并邀请大家跟着这条走得通的路线进去。';
export const C2_P6_CONTINUE_LABEL = '把路线变成大家的路';

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
