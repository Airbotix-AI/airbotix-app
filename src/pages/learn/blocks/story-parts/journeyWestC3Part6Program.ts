// Journey to the West · C3-P6 "木筏跳了位置" — chapter three's Fix (scene-specs
// JTW-S1-C3-P6, teaching script C3 Part 6 · Story Screen 6).
//
// C3-P5 finished the route: three pages, the child's own weather, exits that all
// point the right way. And yet the picture breaks — the raft leaves Page 1 from
// the right and turns up on Page 2 from the right AGAIN, because Page 2's start
// cell ships as `16/8` instead of `2/8`.
//
// This module holds everything the Part page judges: the two story screens, the
// expectation the child states BEFORE the buggy run, the first-discontinuity
// pick, the minimal-fix choice, the peer's picture-only continuity reading and
// the copy around both real runs. The program contract itself — the shipped bug,
// the one legal repair and the continuity measurement — lives in
// `../jtwC3JumpFix`, because the studio needs it too.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` and `BlocksStudioPage.tsx`
// are already over it, so no chapter-three content is added to either).

import type { JtwEvidenceOption } from './journeyWestSeason1';
import {
  JTW_C3_P6_TARGET_START_CELL,
  JTW_C3_P6_WRONG_START_CELL,
  jtwC3CellLabel,
} from '../jtwC3JumpFix';
import { JTW_C3_FAR_SHORE_PAGE, JTW_C3_SEA_PAGE } from '../jtwC3SeaBuild';

export const C3_P6_LESSON_ID = 'jtw-s1-c3-p6';
export const C3_P6_PART_ID = 'jtw-s1-c3-p6';
export const C3_P6_PREV_PART_ID = 'jtw-s1-c3-p5';
export const C3_P6_NEXT_PART_ID = 'jtw-s1-c3-p7';
export const C3_P6_PROJECT_TITLE = '西游记 · 木筏跳了位置';

/** How many recent projects the part page scans for the child's repair. */
export const C3_P6_RECENT_PROJECTS_TO_SCAN = 8;

/** The route both the buggy and the repaired run still walk. */
export const C3_P6_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

/** The boundary the shipped bug always breaks — Page 1 → Page 2. */
export const C3_P6_BREAK_BOUNDARY = { from: 1, to: JTW_C3_SEA_PAGE } as const;

// ─── story_before — teaching script C3 Part 6, IN FULL, two screens ──────────

export const C3_P6_STORY_SCREENS: readonly [string, string] = [
  '三页都搭好了：花果山海岸送他出发，海中央有你选的那片海和你接上的表达，彼岸山林稳稳地结束。出口也都没错，木筏确实走完了 1 → 2 → 3。可是把三页连着看一遍，画面还是怪：他明明是从第一页的右边划出去的，翻到第二页，他又出现在右边——像是有人把木筏拎起来，放到了海的另一头。',
  '故事里有一条看不见的线：他一直朝右走，所以上一页从哪里离开，下一页就该从更靠左的地方进来，观众才读得出"他是接着走的"。这一次断掉的不是积木，也不是出口数字——是海中央那一页的起点格。你要做的只有一件事：找到第一处不连续，把 Page 2 的起点拖回海面左边，别的一格都不要动。',
];
export const C3_P6_SCREEN_IDS: readonly [string, string] = [
  'part-6-the-raft-jumped',
  'part-6-the-invisible-line',
];
export const C3_P6_NEXT_SCREEN_LABEL = '再读下一段';
export const C3_P6_PREV_SCREEN_LABEL = '回上一段';

/** 原著小卡片 — the compression this chapter keeps repeating out loud. */
export const C3_P6_CLASSIC_CARD =
  '原著第一回里，美猴王漂洋求师是一段连着的路：他从花果山出发，一路向着师门去，中间没有谁把他搬来搬去。三页只是我们讲这段路的方法；连续的方向，是原著里就有的那件事。';

export const C3_P6_STORY_BRIDGE =
  '积木决定这一页里发生什么，出口数字决定接下来翻到哪一页，起点格决定他在下一页的哪个位置出现。三件事各管一段：这一次积木和出口都是对的，错的是第三件——起点。';

export function c3p6StoryRead(screens: readonly string[]): boolean {
  return C3_P6_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

// ─── ①预期：先说"应该怎样"，再运行错误版 ────────────────────────────────────

export const C3_P6_EXPECT_TITLE = '先说预期（还没运行）：跨页的时候，木筏应该从哪边进入下一页？';
export const C3_P6_EXPECT_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'expect-left-entry',
    label: '从上一页的右边离开，就该从下一页的左边进来——他一直朝右走，路才接得上',
    correct: true,
  },
  {
    id: 'expect-same-side',
    label: '从右边离开，就从下一页的右边继续——位置本来就该一样',
    correct: false,
  },
  { id: 'expect-anywhere', label: '哪边都行，反正下一页会自己安排他站哪里', correct: false },
];
export const C3_P6_EXPECT_RETRY_HINT =
  '再想一次那条看不见的线：他这一程一直朝右走。如果下一页把他放在右边，他就得往回走才能继续——观众会以为他被搬过去了。';

export function c3p6ExpectationStated(answer: string | null): boolean {
  return C3_P6_EXPECT_OPTIONS.find((option) => option.id === answer)?.correct === true;
}

// ─── ②错误版运行 ────────────────────────────────────────────────────────────

export const C3_P6_BUG_RUN_TITLE = '按原样跑一次错误版，看画面在哪里第一次断开';
export const C3_P6_BUG_RUN_NOTE = `这一版就是工作区里等着你的那一版，一个字都没有改过：出口没错，你在 Part 5 接的表达也没动，木筏照样走完 1 → 2 → 3。请盯住每一页开头他站在哪一格——Page 2 的起点是 ${jtwC3CellLabel(
  JTW_C3_P6_WRONG_START_CELL,
)}，不是 ${jtwC3CellLabel(JTW_C3_P6_TARGET_START_CELL)}。`;
export const C3_P6_BUG_RUN_LABEL = '▶ 跑一次错误版';
export const C3_P6_BUG_RUN_AGAIN_LABEL = '再跑一次错误版';
export const C3_P6_BUG_RUN_BUSY_LABEL = '木筏正在走…';
export const C3_P6_BUG_RUN_LOCKED_HINT = '先说出你的预期，再运行——不然看到什么都像是对的。';

export const C3_P6_BOUNDARY_TITLE = '每一次跨页：他在哪一格离开，又在哪一格出现';
export const C3_P6_BOUNDARY_OK = '接得上';
export const C3_P6_BOUNDARY_BREAK = '断开了';

// ─── ③第一次不连续（只有真的跑过错误版才打开） ──────────────────────────────

export const C3_P6_BREAK_QUESTION = '对着上面的脚印说：画面第一次不连续，是在哪一次跨页？';
export const C3_P6_BREAK_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'break-page1-to-page2',
    label: 'Page 1 → Page 2：他在花果山海岸的右边离开，却又在海中央的右边出现',
    correct: true,
  },
  {
    id: 'break-page2-to-page3',
    label: 'Page 2 → Page 3：海中央到彼岸山林那一次',
    correct: false,
  },
  { id: 'break-inside-page1', label: '还没跨页就断了，Page 1 里面就不对', correct: false },
];
export const C3_P6_BREAK_RETRY_HINT =
  '一格一格对着看：Page 1 他从 3-9 走到 7-9，这一页里没有跳；Page 2 → Page 3 那一次，他也是从右边离开、从左边进来的。最早不对的是哪一次？';
export const C3_P6_BREAK_RUN_FIRST_HINT =
  '先把错误版真的跑一遍，脚印出来了再来圈——只用眼睛猜哪一页不算证据。';

export function c3p6BreakFound(answer: string | null): boolean {
  return C3_P6_BREAK_OPTIONS.find((option) => option.id === answer)?.correct === true;
}

// ─── ④最小修复：改哪一处？ ──────────────────────────────────────────────────

export const C3_P6_FIX_QUESTION = '两个地方都能让画面接上。哪一个是最小的修复？';
export const C3_P6_FIX_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'fix-page2-start',
    label: `改 Page 2 的起点（Home）：把木筏和猴王一起拖回 ${jtwC3CellLabel(
      JTW_C3_P6_TARGET_START_CELL,
    )}，海中央就从左边接着走`,
    correct: true,
  },
  {
    id: 'fix-page1-exit',
    label: '改 Page 1 的退出位置：让他别走那么远，停在左边再离开',
    correct: false,
  },
];
export const C3_P6_FIX_RETRY_HINT =
  '改 Page 1 的退出位置要动两样东西：他在第一页走多远，还有第一页的故事本身（他得走到岸边才上得了木筏）。而且下一页的起点还是错的——他还是会在右边出现。只改 Page 2 的起点，一处就够。';

export function c3p6FixChosen(answer: string | null): boolean {
  return C3_P6_FIX_OPTIONS.find((option) => option.id === answer)?.correct === true;
}

// ─── ⑤工作区文案（真实拖动，不是按钮） ──────────────────────────────────────

export const C3_P6_BUILD_TITLE = '去真正的工作区，把 Page 2 的起点拖回来';
export const C3_P6_BUILD_NOTE = `工作区里就是你在 Part 5 选的那片海和你接的那条表达链——一块都不要动。翻到 Page 2，把木筏和站在木筏上的猴王一起拖到海面左边的 ${jtwC3CellLabel(
  JTW_C3_P6_TARGET_START_CELL,
)} 格（松手时会自己吸到格子上），然后按 Go 跑一次保存。别改 Page 1 的出口，别删表达积木，也别加更响的声音。`;
export const C3_P6_OPEN_STUDIO_NEW = '打开这一版，去修起点 →';
export const C3_P6_OPEN_STUDIO_RESUME = '继续修 →';
export const C3_P6_OPEN_STUDIO_DONE = '再看看修好的那一页';
export const C3_P6_OPEN_STUDIO_BUSY = '正在准备这一版…';
export const C3_P6_OPEN_STUDIO_LOCKED = '先说清楚要改哪一处，再打开工作区。';
export const C3_P6_CREATE_ERROR = '没能打开工作区，请再试一次。';
export const C3_P6_BUILD_DONE_LABEL = '✓ Page 2 的起点已经拖回来，并在工作区真实运行过';
export const C3_P6_BUILD_PENDING_LABEL =
  '起点还没有正好落在校准格上，或者还没在工作区按过 Go 并保存。只要有第二处被改动，这一版也不算修好。';
export const C3_P6_DIFF_TITLE = '你真正改动的位置（从保存的作品里读回来的）';
export const C3_P6_DIFF_EMPTY = '还没有位置被改动。';
export const C3_P6_DIFF_NOTE =
  '只有一行——这就是"单一位置 diff"：起点格换了，积木、出口、尺寸和另外两页都还是原样。';

/** The version could not be read back off C3-P5's row — do not guess one. */
export const C3_P6_NO_VERSION_HINT =
  '读不到你在 Part 5 选的那片海，所以这里不敢替你猜一版。请先回到 Part 5 把那一课完成一次，再回来修这处跳位。';

// ─── ⑥修复版运行（真实跨页） ────────────────────────────────────────────────

export const C3_P6_RUN_TITLE = '从 Page 1 重跑一次，看三页边界连成一条线';
export const C3_P6_RUN_NOTE =
  '工作区的 Go 一次只跑一页。这里用同一个解释器把你保存的作品从 Page 1 一页一页跑下去，量的是每一次跨页：他在哪一格离开、在哪一格出现，方向线有没有断。';
export const C3_P6_RUN_LABEL = '▶ 从 Page 1 跑修复版';
export const C3_P6_RUN_AGAIN_LABEL = '再跑一次';
export const C3_P6_RUN_BUSY_LABEL = '木筏正在走…';
export const C3_P6_RUN_LOCKED_HINT = '先在工作区把起点拖回校准格并保存，才能跑这条修复版路线。';
export const C3_P6_BUG_TRACE_TITLE = '错误版的跨页';
export const C3_P6_FIXED_TRACE_TITLE = '修复版的跨页';
export const C3_P6_TRACE_MISMATCH_HINT =
  '这一次没有走成 1 → 2 → 3，或者还有一处跨页是断的。回到工作区检查 Page 2 的起点格和 📄 Page 上的数字，再跑一次。';

// ─── ⑦同伴只看画面：他从哪里来，往哪里去 ────────────────────────────────────

export interface C3P6PeerRow {
  id: string;
  question: string;
  options: readonly JtwEvidenceOption[];
  hint: string;
}

export const C3_P6_PEER_TITLE = '把修好的这一遍放给同伴看。他不看积木，只看画面，回答两句：';
export const C3_P6_PEER_ROWS: readonly C3P6PeerRow[] = [
  {
    id: 'from',
    question: '① 木筏是从哪里来的？',
    options: [
      { id: 'from-left-shore', label: '从左边进来的——上一页那片有桃树的海岸', correct: true },
      { id: 'from-right', label: '从右边冒出来的，看不出上一页在哪', correct: false },
      { id: 'from-nowhere', label: '它本来就在那里，没有"来"', correct: false },
    ],
    hint: '再看一眼这一页刚打开的那一格：他站在海面的哪一侧？和上一页他离开的那一格比一比。',
  },
  {
    id: 'to',
    question: '② 他接下来往哪里去？',
    options: [
      { id: 'to-right-far-shore', label: '继续向右，去对岸的山林', correct: true },
      { id: 'to-back-home', label: '掉头向左，回花果山', correct: false },
      { id: 'to-stay', label: '停在海中央，哪也不去', correct: false },
    ],
    hint: '看他走的方向和这一页最后把他交给了哪一页——出口上的数字这一次一直是 3。',
  },
];

export function c3p6PeerAnswered(picks: Readonly<Record<string, string>>): boolean {
  return C3_P6_PEER_ROWS.every((row) => Boolean(picks[row.id]));
}

export function c3p6PeerCorrect(picks: Readonly<Record<string, string>>): boolean {
  return C3_P6_PEER_ROWS.every(
    (row) => row.options.find((option) => option.id === picks[row.id])?.correct === true,
  );
}

/** Peer answers → stored evidence rows (`from:from-left-shore`). */
export function c3p6EncodePeer(picks: Readonly<Record<string, string>>): string[] {
  return C3_P6_PEER_ROWS.filter((row) => picks[row.id]).map((row) => `${row.id}:${picks[row.id]}`);
}

const PEER_ROW = /^([\w-]+):([\w-]+)$/;

/** Stored evidence rows → peer answers. Malformed rows are dropped, not guessed. */
export function c3p6DecodePeer(rows: readonly string[]): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const row of rows) {
    const match = PEER_ROW.exec(row);
    if (!match) continue;
    if (!C3_P6_PEER_ROWS.some((known) => known.id === match[1])) continue;
    picks[match[1]] = match[2];
  }
  return picks;
}

// ─── resolved / story_after / continue ──────────────────────────────────────

export const C3_P6_RESOLVED_TITLE = '三页边界连成了一条不断开的方向线';
export const C3_P6_RESOLVED_WORLD_CHANGE =
  '现在从头看一遍：他在花果山海岸的右边划出去，海中央的左边接住他，走过你选的那片海以后又从右边离开，彼岸山林的左边再接住他。三处边界一处都没断——观众读得出这是一个人走的一条路，不是三张各自摆好的画。';
/**
 * 远行印 is C3-P8's server-side aggregation (C3共享实现合同：P1–P8 全部完成才允许
 * 点亮). The scene's own `resolved_world_change` line says the seal lights here,
 * but its assertions in the same section say "P6不完成Chapter" — so the Part
 * says out loud what is really true instead of drawing a seal it cannot earn.
 */
export const C3_P6_SEAL_NOTE =
  '远行印还没有亮：它要等第三章八个 Part 都完成、证据齐了，由服务端一起点亮。这一处修好的，是这条路线上最后一个说不通的地方。';
export const C3_P6_STORY_AFTER =
  '公共的这条路修好了。下一步，他要做一条自己的三页求师路——可以保存、关掉、再打开，还能从头跑一遍。';
export const C3_P6_CONTINUE_LABEL = '制作我的求师路';

export const C3_P6_LOCKED_HINT = '先在第三章 Part 5 选好那片海、把表达接上，再来找这处跳位。';
export const C3_P6_LOADING_HINT = '木筏正在海上等你…';
