// Journey to the West · C3-P7 "我的三页求师路" — chapter three's Personal Ship
// (scene-specs JTW-S1-C3-P7, teaching script C3 Part 7 · Story Screen 7).
//
// C3-P6 finished the PUBLIC route. This Part hands the whole three-page journey
// over: every meaningful action on all three pages, both page exits and the
// closing End are blocks the child places, and 星夜/晨雾, the wait rhythm, the
// preset dialogue and how the raft's leg is paced are four real choices.
//
// This module holds everything the Part page SAYS and everything it judges that
// is not the saved document itself: the two story screens, the structure
// checklist, the weather cards, the peer's page-by-page prediction and the
// first-mismatch reading that compares those predictions against a real run.
// The structure contract — what a valid personal route IS — lives in
// `../jtwC3PersonalRoute`, because the studio needs it too.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` and `BlocksStudioPage.tsx`
// are already over it, so no chapter-three content is added to either).

import type { PageFlowRunResult } from '../pageFlowRun';
import {
  JTW_C3_P7_BOARD_LEG,
  JTW_C3_P7_MAX_ACTIONS,
  JTW_C3_P7_MIN_ACTIONS,
  JTW_C3_P7_MIN_CHILD_BLOCKS,
  JTW_C3_P7_PAGE1_RAFT_CELL,
} from '../jtwC3PersonalRoute';
import { JTW_C3_FAR_SHORE_PAGE, JTW_C3_SEA_LEG, JTW_C3_SEA_PAGE } from '../jtwC3SeaBuild';
import { c3p2PageLabel } from './journeyWestC3Part2Program';

export const C3_P7_LESSON_ID = 'jtw-s1-c3-p7';
export const C3_P7_PART_ID = 'jtw-s1-c3-p7';
export const C3_P7_NEXT_PART_ID = 'jtw-s1-c3-p8';
/** 教学脚本 C3 Part 7 / 本章卡: the saved work is `Across the Sea to Learn`. */
export const C3_P7_WORK_NAME = 'Across the Sea to Learn';
export const C3_P7_PROJECT_TITLE = `西游记 · ${C3_P7_WORK_NAME}`;

/** How many recent projects the part page scans for the child's own route. */
export const C3_P7_RECENT_PROJECTS_TO_SCAN = 8;

/** The route every valid personal build has to walk. */
export const C3_P7_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

// ─── story_before — teaching script C3 Part 7, two screens ───────────────────

export const C3_P7_STORY_SCREENS: readonly [string, string] = [
  '公共的那条路已经修好了：三页接得上，木筏不再跳到海的另一头。可那是我们一起搭的路。现在轮到你自己做一条——离开花果山、渡过中间那片海、走到师门所在的山林，三页都由你来写。作品的名字叫「Across the Sea to Learn」，意思是"渡海去学习"：他不是去拿宝物，也还没有开始取经，他是去找一位能教他的师父。',
  `三页各有各的职责：Page 1 说清楚离家和登筏，Page 2 让人看见观察、前进和停顿，Page 3 靠岸、听见山林里的歌声，然后稳稳地结束。每一页放 ${JTW_C3_P7_MIN_ACTIONS}–${JTW_C3_P7_MAX_ACTIONS} 块有意义的动作，Page 1 和 Page 2 各要一块出口，Page 3 要一块 End——加起来至少 ${JTW_C3_P7_MIN_CHILD_BLOCKS} 块，全都是你自己放的。搭好以后保存、关掉、重新打开，再从 Page 1 完整跑一遍：能重开、重开后还一样，这条路才真的是你的。`,
];
export const C3_P7_SCREEN_IDS: readonly [string, string] = [
  'part-7-my-own-route',
  'part-7-what-three-pages-owe',
];
export const C3_P7_NEXT_SCREEN_LABEL = '再读下一段';
export const C3_P7_PREV_SCREEN_LABEL = '回上一段';

export const C3_P7_CLASSIC_CARD =
  '原著第一回里，猴王漂洋求师走了很多年、经过不止一片海和不止一处人间。三页是我们讲这段路的方法，不是说原著只有三片海。你可以换天气、换节奏、换他说的那句话，但他为什么出发不能换：他是去求师学习的。';

export const C3_P7_STORY_BRIDGE =
  '每一页的动作让这一段路真的发生了什么，出口上的数字把故事交给下一页，最后那块 End 说明"讲完了"。三样缺一样，读的人就接不上：没有动作是空壳，没有出口是死页，没有 End 是停不下来。';

export function c3p7StoryRead(screens: readonly string[]): boolean {
  return C3_P7_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

// ─── ①选一片海（模板分支白名单） ─────────────────────────────────────────────

export const C3_P7_WEATHER_TITLE = '① 先选这一程要渡的是哪一片海';
export const C3_P7_WEATHER_NOTE =
  '选哪一张卡，工作区里就真的画哪一片海，保存下来的作品里存的也是这一片——不是页面上的一个记号。两片海都成立，选定以后想换要回工作区重新开始。';
export const C3_P7_WEATHER_LOCKED_NOTE =
  '你已经在这一片海上开工了。想换另一片海，要回到工作区重新开始一份作品——这里不会偷偷替你换掉存下来的那一片。';

// ─── ②在真正的工作区里写三页 ────────────────────────────────────────────────

export const C3_P7_BUILD_TITLE = `② 去真正的工作区，写你自己的「${C3_P7_WORK_NAME}」`;
export const C3_P7_BUILD_NOTE = `三页的脚本槽里都只有一个 Start，没有示范链可以照抄。每页放 ${JTW_C3_P7_MIN_ACTIONS}–${JTW_C3_P7_MAX_ACTIONS} 块动作，Page 1 的 📄 Page 点成 ${JTW_C3_SEA_PAGE}、Page 2 的点成 ${JTW_C3_FAR_SHORE_PAGE}、Page 3 用 🏁 End 收尾，然后按 Go 跑一次保存。`;

/** The structure checklist the page renders — the scene's 最低结构, spelled out. */
export interface C3P7StructureRow {
  id: string;
  label: string;
}

export const C3_P7_STRUCTURE_TITLE = '这一份作品要满足的最低结构';
export const C3_P7_STRUCTURE_ROWS: readonly C3P7StructureRow[] = [
  {
    id: 'pages',
    label: `三页各写一段：${c3p2PageLabel(1)}离家 · ${c3p2PageLabel(JTW_C3_SEA_PAGE)}观察 · ${c3p2PageLabel(JTW_C3_FAR_SHORE_PAGE)}到达`,
  },
  {
    id: 'actions',
    label: `每页 ${JTW_C3_P7_MIN_ACTIONS}–${JTW_C3_P7_MAX_ACTIONS} 块有意义的动作——只放一块出口的页面是空壳`,
  },
  {
    id: 'exits',
    label: `Page 1 的出口写 ${JTW_C3_SEA_PAGE}，Page 2 的出口写 ${JTW_C3_FAR_SHORE_PAGE}，Page 3 用 🏁 End 稳稳结束`,
  },
  {
    id: 'raft',
    label: `Page 1 走满 ${JTW_C3_P7_BOARD_LEG} 格才上得了停在 ${JTW_C3_P7_PAGE1_RAFT_CELL.gx}-${JTW_C3_P7_PAGE1_RAFT_CELL.gy} 的木筏；Page 2 也要走满 ${JTW_C3_SEA_LEG} 格，脚才一直在筏上`,
  },
  {
    id: 'observe',
    label: '海上那一页要有 ⏱ Wait 或 🐢 Speed——看不清的时候先观察，再继续',
  },
  { id: 'arrive', label: '彼岸那一页要说一句预设的话，说明他听见了山林里的歌声' },
  {
    id: 'ledger',
    label: `至少 ${JTW_C3_P7_MIN_CHILD_BLOCKS} 块由你主导：两块以上移动、一个声音、一个 Wait 或 Speed、两个 📄 Page 和一个 🏁 End`,
  },
];

export const C3_P7_OPEN_STUDIO_NEW = '开始写我的三页 →';
export const C3_P7_OPEN_STUDIO_RESUME = '继续写 →';
export const C3_P7_OPEN_STUDIO_DONE = '再看看我的作品';
export const C3_P7_OPEN_STUDIO_BUSY = '正在准备这一片海…';
export const C3_P7_OPEN_STUDIO_LOCKED = '先选一片海，再打开工作区。';
export const C3_P7_CREATE_ERROR = '没能打开工作区，请再试一次。';
export const C3_P7_BUILD_DONE_LABEL = '✓ 三页都写好了，并在工作区真实运行过、保存过';
export const C3_P7_BUILD_PENDING_LABEL =
  '还不成立：检查每页的动作块数、Page 1／Page 2 各走满 4 格、海上那一页的 Wait 或 Speed、彼岸那一句话，以及出口 2／3 和最后的 End。也可能是还没在工作区按过 Go 并保存。';

export const C3_P7_DESIGN_TITLE = '你保存下来的三页（从作品里读回来的，不是页面猜的）';
export const C3_P7_LEDGER_TITLE = `你主导的积木（至少 ${JTW_C3_P7_MIN_CHILD_BLOCKS} 块）`;
export const C3_P7_STARTER_TITLE = '发下来的样子';
export const C3_P7_STARTER_NOTE = '三页都只有一个 Start——上面每一块都是你自己放的。';

// ─── ③同伴逐页预测 ──────────────────────────────────────────────────────────

/**
 * What a peer can say happens after a page, read off the exit numbers alone.
 * There is deliberately no `correct` flag: which answer is right depends on the
 * route the CHILD built, so it is decided by a real run, never by this list.
 */
export interface C3P7PeerOption {
  id: string;
  label: string;
}

export const C3_P7_PEER_OPTIONS: readonly C3P7PeerOption[] = [
  { id: 'page-1', label: `翻到 Page 1 · ${c3p2PageLabel(1)}` },
  { id: 'page-2', label: `翻到 Page 2 · ${c3p2PageLabel(JTW_C3_SEA_PAGE)}` },
  { id: 'page-3', label: `翻到 Page 3 · ${c3p2PageLabel(JTW_C3_FAR_SHORE_PAGE)}` },
  { id: 'ends', label: '故事在这一页结束' },
];

export const C3_P7_PEER_TITLE =
  '③ 同伴只看三页的地标、他站的那一格和出口上的数字，逐页说："这一页之后会怎样？"';
export const C3_P7_PEER_NOTE =
  '先让同伴把三页都说完，再去跑。跑出来的和他说的不一样，第一处不一样就是"看不懂的地方"——回工作区只修那一处，然后重跑。';

export function c3p7PeerAnswered(picks: Readonly<Record<number, string>>): boolean {
  return C3_P7_TARGET_TRACE.every((_page, index) => Boolean(picks[index + 1]));
}

/** Peer answers → stored evidence rows (`page1:page-2`). */
export function c3p7EncodePeer(picks: Readonly<Record<number, string>>): string[] {
  return [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE]
    .filter((page) => Boolean(picks[page]))
    .map((page) => `page${page}:${picks[page]}`);
}

const PEER_ROW = /^page(\d+):([\w-]+)$/;

/** Stored evidence rows → peer answers. Malformed rows are dropped, not guessed. */
export function c3p7DecodePeer(rows: readonly string[]): Record<number, string> {
  const picks: Record<number, string> = {};
  for (const row of rows) {
    const match = PEER_ROW.exec(row);
    if (!match) continue;
    if (!C3_P7_PEER_OPTIONS.some((option) => option.id === match[2])) continue;
    picks[Number(match[1])] = match[2];
  }
  return picks;
}

/**
 * What the run REALLY did after each page, in the peer's own vocabulary. A page
 * the route never opened has no measurement at all, which is itself an answer
 * the child needs to see.
 */
export function c3p7MeasuredAnswers(run: PageFlowRunResult | null): Record<number, string> {
  const measured: Record<number, string> = {};
  for (const visit of run?.visits ?? []) {
    measured[visit.page] = visit.exitTo === null ? 'ends' : `page-${visit.exitTo}`;
  }
  return measured;
}

/**
 * The first page where the peer's reading and the real run disagree, or null
 * when every page matched. This is the scene's "记录第一次不一致" — measured
 * against a run, never against a fixed answer key.
 */
export function c3p7FirstMismatch(
  picks: Readonly<Record<number, string>>,
  run: PageFlowRunResult | null,
): number | null {
  if (!run) return null;
  const measured = c3p7MeasuredAnswers(run);
  for (const page of [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE]) {
    if (picks[page] !== measured[page]) return page;
  }
  return null;
}

export const C3_P7_MISMATCH_MATCHED =
  '同伴逐页说的和真的跑出来的完全一样——他只看地标、起点和出口数字就读懂了你的路线。';
export function c3p7MismatchHint(page: number): string {
  return `第一处看不懂的地方在 Page ${page} · ${c3p2PageLabel(page)}：同伴说的和真的跑出来的对不上。只修这一页——检查它的出口数字、这一页真的发生了什么，然后回来重跑。别的页面先别动。`;
}
export const C3_P7_MISMATCH_UNVISITED =
  '有一页根本没有被打开过，所以同伴对它的预测无从对照。先把出口接上，让路线真的走到那一页。';

// ─── ④保存 · 关闭 · 重开 ────────────────────────────────────────────────────

export const C3_P7_REOPEN_TITLE = '④ 关掉这份作品，再重新打开一次';
export const C3_P7_REOPEN_NOTE =
  '这里会真的把作品从服务器上重新取一遍，然后把两次取到的 JSON 一个字一个字地比对：三页、天气、位置、脚本和结束点，有一处不一样就不算。';
export const C3_P7_REOPEN_LABEL = '💾 关闭并重新打开';
export const C3_P7_REOPEN_AGAIN_LABEL = '再重开一次';
export const C3_P7_REOPEN_BUSY_LABEL = '正在重新打开…';
export const C3_P7_REOPEN_LOCKED_HINT = '先让同伴把三页都预测完，再关掉重开。';
export const C3_P7_REOPEN_MATCH = '✓ 重开以后一模一样：三页、天气、位置、脚本和结束点都对得上。';
export const C3_P7_REOPEN_DIFFERS =
  '重开以后和保存的那一份对不上。回工作区确认最后一次修改真的保存过，再重开一次。';
export const C3_P7_REOPEN_ERROR = '没能重新打开这份作品，请再试一次。';
/** Stored `reopen_match` value — the two loads really were the same document. */
export const C3_P7_REOPEN_MATCH_MARKER = 'json-identical';

// ─── ⑤重开以后再从 Page 1 跑一遍 ────────────────────────────────────────────

export const C3_P7_RUN_TITLE = '⑤ 就用刚重新打开的这一份，从 Page 1 完整跑一遍';
export const C3_P7_RUN_NOTE =
  '工作区的 Go 一次只跑一页。这里用同一个解释器把重开出来的作品从 Page 1 一页一页跑下去，量的是真实轨迹、每一页的脚印和每一次跨页接不接得上。';
export const C3_P7_RUN_LABEL = '▶ 从 Page 1 跑我的求师路';
export const C3_P7_RUN_AGAIN_LABEL = '再跑一次';
export const C3_P7_RUN_BUSY_LABEL = '木筏正在走…';
export const C3_P7_RUN_LOCKED_HINT = '先把作品关掉重开一次，再跑这一遍——不然它就不是"重开以后"的运行。';
export const C3_P7_RUN_TRACE_TITLE = '这一遍真的走过的三页';
export const C3_P7_BOUNDARY_TITLE = '每一次跨页：他在哪一格离开，又在哪一格出现';
export const C3_P7_BOUNDARY_OK = '接得上';
export const C3_P7_BOUNDARY_BREAK = '断开了';
export const C3_P7_TRACE_MISMATCH_HINT =
  '这一遍没有走成 1 → 2 → 3，或者最后一页没有稳稳结束，又或者有一处跨页断开了。回工作区检查两个出口数字和最后那块 End，再重开重跑。';

// ─── resolved / story_after / continue ──────────────────────────────────────

export const C3_P7_RESOLVED_TITLE = '你的求师路可以关掉再打开，也可以再跑一遍';
export const C3_P7_RESOLVED_WORLD_CHANGE =
  '彼岸的浅滩上，木筏被收了起来。上山的石阶一级一级亮着，山林里的歌声就是从那上面传下来的，师门的石牌立在雾里——这一页现在有了它的结局，而且是你写的这一份，不是别人的示范。';
/**
 * 远行印 is C3-P8's server-side aggregation (C3共享实现合同：P1–P8 全部完成才
 * 允许点亮), and this scene's own assertion says "P7不完成Chapter". The Part
 * says so out loud instead of drawing a seal it cannot earn.
 */
export const C3_P7_SEAL_NOTE =
  '远行印还没有亮：它要等第三章八个 Part 都完成、证据齐了，由服务端一起点亮。你现在有的是一份能重开、能重跑的作品。';
export const C3_P7_STORY_AFTER =
  '猴王把木筏收好，沿着山林里的歌声往上走。雾散开一点，师门的入口显了出来——到了门口，还要把来路讲清楚。';
export const C3_P7_CONTINUE_LABEL = '沿歌声上山';

export const C3_P7_LOCKED_HINT = '先在第三章 Part 6 把木筏跳位修好，再来做你自己的三页求师路。';
export const C3_P7_LOADING_HINT = '木筏正在岸边等你的路线…';
