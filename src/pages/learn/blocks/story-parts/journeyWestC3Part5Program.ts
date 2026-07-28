// Journey to the West · C3-P5 "星夜和晨雾都需要观察" — chapter three's expression
// choice (scene-specs JTW-S1-C3-P5, teaching script C3 Part 5 · 故事选择：中间的海).
//
// C3-P4 gave the middle of the sea a story and an exit. Here the child decides
// HOW that middle leg reads — 星夜 (wait for the clouds to part) or 晨雾 (slow
// down and listen) — and then really builds the 2–3 expression blocks in front
// of the route both versions keep.
//
// This module holds everything the Part page judges: the story screens, the two
// weather cards and their evidence, the "why isn't faster better" explanation,
// the peer prediction (what will be heard, when the raft moves, which page it
// ends on) and the cross-page run contract. The two-branch PROGRAM contract
// itself lives in `../jtwC3WeatherBuild`, because the studio needs it too.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md (`journeyWestSeason1.ts` and `BlocksStudioPage.tsx`
// are already over it, so no chapter-three content is added to either).

import type { PageFlowRunResult } from '../pageFlowRun';
import type { JtwEvidenceOption } from './journeyWestSeason1';
import {
  JTW_C3_FAR_SHORE_PAGE,
  JTW_C3_SEA_LEG,
  JTW_C3_SEA_PAGE,
} from '../jtwC3SeaBuild';
import {
  JTW_C3_WEATHER_VERSIONS,
  jtwC3WeatherVersion,
  type JtwC3Weather,
} from '../jtwC3WeatherBuild';
import { JTW_C3_PAGE2_START_CELL } from '../jtwC3Stage';

export const C3_P5_LESSON_ID = 'jtw-s1-c3-p5';
export const C3_P5_PART_ID = 'jtw-s1-c3-p5';
export const C3_P5_PREV_PART_ID = 'jtw-s1-c3-p4';
export const C3_P5_NEXT_PART_ID = 'jtw-s1-c3-p6';
export const C3_P5_PROJECT_TITLE = '西游记 · 星夜和晨雾都需要观察';

/** How many recent projects the part page scans for the child's build. */
export const C3_P5_RECENT_PROJECTS_TO_SCAN = 8;

/** The route both versions must still walk. */
export const C3_P5_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

// ─── story_before — teaching script C3 Part 5, IN FULL, two screens ──────────

export const C3_P5_STORY_SCREENS: readonly [string, string] = [
  '海中央这一段路已经有故事了，可它到底是什么样的海？两个版本都是对的：选 A 星夜海面，木筏在星光下等云散开再辨方向；选 B 晨雾海面，木筏放慢速度、听着浪声找岸。Page 2 的节奏、声音和动作不一样，但两版都仍然要走到 Page 3。',
  '再说清楚一次：原著里这段寻找走了很多年、经过很多地方、不止渡过一次海。我们把它压成三张页面来讲，所以这里选的不是"哪片海是真的"，而是"我要让观众看到哪一种观察"。选定以后，你要自己把那一版的 2–3 块表达积木接在 ➡️ Right 4 前面——Right 4 和 📄 Page 3 一块都不能动。',
];
export const C3_P5_SCREEN_IDS: readonly [string, string] = [
  'part-5-two-valid-versions',
  'part-5-compression-and-task',
];
export const C3_P5_NEXT_SCREEN_LABEL = '再读下一段';
export const C3_P5_PREV_SCREEN_LABEL = '回上一段';

/** 原著小卡片 — the compression the scene demands be said out loud. */
export const C3_P5_CLASSIC_CARD =
  '原著第一回里，美猴王漂洋求师走了很多年，跨海、访人间、再渡海。三页是我们讲故事的方法，不是说原著只有三片真的海；星夜和晨雾也不是原著写死的天气，而是你选给观众看的那一种观察。';

export const C3_P5_STORY_BRIDGE =
  '同一条路线可以有不同的讲法：声音、速度和停顿改变的是节奏，➡️ Right 4 和 📄 Page 3 改变的是路线。选择只动前面那几块，路线一块都不动——所以两版都能到彼岸。';

export function c3p5StoryRead(screens: readonly string[]): boolean {
  return C3_P5_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

// ─── 两个有效版本：共读证据 ─────────────────────────────────────────────────

export interface C3P5VersionCard {
  id: JtwC3Weather;
  label: string;
  /** What this version shows the audience, read together before choosing. */
  evidence: string;
  /** The blocks it adds, spelled out as a child reads them. */
  chainLabel: string;
}

export const C3_P5_VERSION_CARDS: readonly C3P5VersionCard[] = [
  {
    id: 'starry',
    label: JTW_C3_WEATHER_VERSIONS[0].label,
    evidence:
      '星夜的海上有月亮，可云还压在天边的岛上，看不清哪边是岸。木筏先让星光响一下，再停两拍等云散开——看清楚了才走。',
    chainLabel: '✨ Sparkle → ⏱ Wait 2',
  },
  {
    id: 'morning',
    label: JTW_C3_WEATHER_VERSIONS[1].label,
    evidence:
      '晨雾的海上什么都白蒙蒙的，眼睛帮不上忙。木筏把速度放慢，让海风吹过去，再说出自己在听什么——用耳朵找岸。',
    chainLabel: '🐢 Speed 慢 → 💨 Whoosh → 💬 我先听浪声',
  },
];

export const C3_P5_VERSION_TITLE = '两种海都成立。你要让观众看到哪一种观察？';
export const C3_P5_VERSION_NOTE =
  '两版都保留 ➡️ Right 4 → 📄 Page 3：换的是节奏和表达，不是路线。选好以后工作区就会用你选的那片海。';
export const C3_P5_VERSION_CHANGE_LOCKED =
  '已经按这片海开始搭了。想换另一片海，要回到工作区重新开始——所以先想好。';

/** Both cards are valid, so "correct" is not a property of the choice itself. */
export function c3p5VersionPicked(version: JtwC3Weather | null): boolean {
  return version !== null;
}

// ─── 解释："看不清时为什么不是越快越好" ──────────────────────────────────────

export const C3_P5_WHY_QUESTION = '看不清的时候，为什么不是走得越快越好？';
export const C3_P5_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'why-observe-first',
    label: '看不清就先看清楚：等一等或慢一点，才知道往哪边走；走得快只是更快地走错。',
    correct: true,
  },
  {
    id: 'why-faster-is-better',
    label: '越快越好，早一点到岸就行。',
    correct: false,
  },
  {
    id: 'why-louder-sound',
    label: '把声音放大一点，看不清也没关系。',
    correct: false,
  },
];
export const C3_P5_WHY_RETRY_HINT =
  '再想想 Part 3 的那句话：用加速把问题遮起来，木筏还是会走错。星夜的 ⏱ Wait 和晨雾的 🐢 Speed 都在做同一件事——先看清楚，再前进。';

export function c3p5WhyAnswered(answer: string | null): boolean {
  return C3_P5_WHY_OPTIONS.find((option) => option.id === answer)?.correct === true;
}

// ─── Prediction：同伴按天气卡预测（听见什么／何时移动／最后去哪页） ──────────

export interface C3P5PredictionRow {
  id: string;
  question: string;
  options: readonly { id: string; label: string }[];
  /** The right answer per weather version — the card really decides it. */
  answer: Record<JtwC3Weather, string>;
  /** Shown when the picked option is not this version's answer. */
  hint: string;
}

export const C3_P5_PREDICTION_TITLE = '同伴只拿到你的天气卡。让他先说三件事：';

export const C3_P5_PREDICTION_ROWS: readonly C3P5PredictionRow[] = [
  {
    id: 'hear',
    question: '① 他会听见什么？',
    options: [
      { id: 'hear-sparkle', label: '✨ Sparkle——星光的声音' },
      { id: 'hear-whoosh', label: '💨 Whoosh——海风的声音' },
      { id: 'hear-nothing', label: '什么都听不见' },
    ],
    answer: { starry: 'hear-sparkle', morning: 'hear-whoosh' },
    hint: '看一眼你选的那张天气卡上写的积木：星夜用 ✨ Sparkle，晨雾用 💨 Whoosh。',
  },
  {
    id: 'move',
    question: '② 木筏什么时候才移动？',
    options: [
      { id: 'move-after-observe', label: '先观察完，再向右走 4 格' },
      { id: 'move-immediately', label: '一按 Go 就立刻向右走' },
      { id: 'move-never', label: '这一页它不动' },
    ],
    answer: { starry: 'move-after-observe', morning: 'move-after-observe' },
    hint: '两版的表达积木都排在 ➡️ Right 4 前面：先等一等或先慢下来，看清楚了才走这一段。',
  },
  {
    id: 'page',
    question: '③ 这一页最后把他交给哪一页？',
    options: [
      { id: 'page-3', label: 'Page 3 · 彼岸山林' },
      { id: 'page-1', label: 'Page 1 · 花果山海岸' },
      { id: 'page-stay', label: '哪也不去，停在海上' },
    ],
    answer: { starry: 'page-3', morning: 'page-3' },
    hint: '选择只改节奏，不改出口。📄 Page 上写的还是 3——那是彼岸山林。',
  },
];

/** Every row answered? */
export function c3p5PredictionsAnswered(picks: Readonly<Record<string, string>>): boolean {
  return C3_P5_PREDICTION_ROWS.every((row) => Boolean(picks[row.id]));
}

/** Every row answered the way this weather card really behaves. */
export function c3p5PredictionsCorrect(
  picks: Readonly<Record<string, string>>,
  version: JtwC3Weather | null,
): boolean {
  if (!version) return false;
  return C3_P5_PREDICTION_ROWS.every((row) => picks[row.id] === row.answer[version]);
}

/** Predictions → stored evidence rows (`hear:hear-sparkle`). */
export function c3p5EncodePredictions(picks: Readonly<Record<string, string>>): string[] {
  return C3_P5_PREDICTION_ROWS.filter((row) => picks[row.id]).map(
    (row) => `${row.id}:${picks[row.id]}`,
  );
}

const PREDICTION_ROW = /^([\w-]+):([\w-]+)$/;

/** Stored evidence rows → predictions. Malformed rows are dropped, not guessed. */
export function c3p5DecodePredictions(rows: readonly string[]): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const row of rows) {
    const match = PREDICTION_ROW.exec(row);
    if (!match) continue;
    if (!C3_P5_PREDICTION_ROWS.some((known) => known.id === match[1])) continue;
    picks[match[1]] = match[2];
  }
  return picks;
}

// ─── 工作区文案 ──────────────────────────────────────────────────────────────

export const C3_P5_BUILD_TITLE = '去真正的工作区，把这一版的表达接上去';
export const C3_P5_BUILD_NOTE =
  'Page 2 的脚本槽里已经有 ➡️ Right 4 → 📄 Page 3 —— 那是两版共用的路线，一块都不要动。你要做的是把这一版的表达积木接在 Right 4 前面：星夜是 ✨ Sparkle → ⏱ Wait 2，晨雾是 🐢 Speed 慢 → 💨 Whoosh → 💬 那句话（💬 的文字在积木上点一下就能选，不用自己打字）。';
export const C3_P5_OPEN_STUDIO_NEW = '按这片海开始搭 →';
export const C3_P5_OPEN_STUDIO_RESUME = '继续搭建 →';
export const C3_P5_OPEN_STUDIO_DONE = '再看看我的海';
export const C3_P5_OPEN_STUDIO_BUSY = '正在准备这片海…';
export const C3_P5_OPEN_STUDIO_LOCKED = '先选一片海，才能开始搭。';
export const C3_P5_BUILD_DONE_LABEL = '✓ 这一版的表达链已搭好并在工作区真实运行过';
export const C3_P5_BUILD_PENDING_LABEL =
  '表达链还没有精确搭好，或还没在工作区按过 Go 并保存。只把背景换掉不算——积木也要接上。';
export const C3_P5_TARGET_CHAIN_TITLE = '目标：这一版的 Page 2 主脚本';
export const C3_P5_SAVED_CHAIN_TITLE = '你保存的 Page 2 主脚本（从作品里读回来的，不是页面猜的）';
export const C3_P5_SHARED_TAIL_TITLE = '两版都不能动的路线';
export const C3_P5_CREATE_ERROR = '没能打开工作区，请再试一次。';

/** The chain a finished build of this version must carry. */
export function c3p5TargetChain(version: JtwC3Weather) {
  return jtwC3WeatherVersion(version).chain;
}

// ─── 跨页运行（studio 的 runner 一次只跑一页） ───────────────────────────────

export const C3_P5_RUN_TITLE = '从 Page 1 完整跑一次，核对天气表达和 1 → 2 → 3';
export const C3_P5_RUN_NOTE =
  '工作区的 Go 一次只跑一页。这里用同一个解释器把你保存的作品从 Page 1 一页一页跑下去：天气表达要真的发生，路线也要真的还是 1 → 2 → 3。只在编辑器里摆对、没有真的跑过，这个 Part 不算完成。';
export const C3_P5_RUN_LABEL = '▶ 从 Page 1 跑到 Page 3';
export const C3_P5_RUN_AGAIN_LABEL = '再跑一次';
export const C3_P5_RUN_BUSY_LABEL = '木筏正在走…';
export const C3_P5_RUN_LOCKED_HINT = '先把这一版的表达链搭好并在工作区保存，才能跑这条完整路线。';
export const C3_P5_EXPECTED_TRACE_TITLE = '预期路线';
export const C3_P5_ACTUAL_TRACE_TITLE = '实际脚印';
export const C3_P5_TRACE_MISMATCH_HINT =
  '这一次没有走成 1 → 2 → 3。回到工作区检查 📄 Page 上的数字还是不是 3，再跑一次。';

/** Where `move_right(4)` from the contract's 2/8 start really leaves him. */
export const C3_P5_EXIT_CELL = `${JTW_C3_PAGE2_START_CELL.gx + JTW_C3_SEA_LEG}-${JTW_C3_PAGE2_START_CELL.gy}`;

/** Is this page trace the chapter's goal route? Also re-reads a restored run. */
export function c3p5TraceReached(trace: readonly number[]): boolean {
  return (
    trace.length === C3_P5_TARGET_TRACE.length &&
    C3_P5_TARGET_TRACE.every((page, index) => trace[index] === page)
  );
}

/**
 * Did a REAL cross-page run of the SAVED project reach the far shore? Exactly
 * `1 → 2 → 3`, stopped because the last page ENDED — never because the route
 * looped or ran out of teaching budget.
 */
export function c3p5RunReachedFarShore(run: PageFlowRunResult | null): boolean {
  if (!run) return false;
  return run.stoppedBy === 'end' && c3p5TraceReached(run.trace);
}

/** The page number the measured run really left the sea leg for. */
export function c3p5MeasuredExitPage(run: PageFlowRunResult | null): number | null {
  return run?.visits.find((visit) => visit.page === JTW_C3_SEA_PAGE)?.exitTo ?? null;
}

/** The exit is still 彼岸山林 — the scene's "出口仍为3" completion evidence. */
export function c3p5ExitStillFarShore(run: PageFlowRunResult | null): boolean {
  return c3p5MeasuredExitPage(run) === JTW_C3_FAR_SHORE_PAGE;
}

// ─── resolved / story_after / continue ───────────────────────────────────────

export const C3_P5_MUTED_TITLE = '把声音关掉也读得出来';

export const C3_P5_RESOLVED_TITLE = 'Page 2 保存成了你选的那片海';
export function c3p5ResolvedWorldChange(version: JtwC3Weather): string {
  return version === 'starry'
    ? '星夜版存下来了：云退开，月光在海面上铺成一条路，木筏是在看清楚以后才走的——观众读得出"他观察过，然后继续"。'
    : '晨雾版存下来了：雾散开一条路，木筏放慢速度、听着浪声穿过去——观众读得出"他观察过，然后继续"。';
}
export const C3_P5_AUDIENCE_READS = '观众能读出来的一句话：他先观察，然后继续。';

export const C3_P5_STORY_AFTER =
  '天气和路线都清楚了。可是再看一遍：木筏从 Page 1 的右边离开，却又从 Page 2 的右边冒出来——它跨页的时候站错了边。';
export const C3_P5_CONTINUE_LABEL = '找跳位原因';

export const C3_P5_LOCKED_HINT = '先在第三章 Part 4 把海中央这一页搭出来，再来选这片海的样子。';
export const C3_P5_LOADING_HINT = '两片海都在等你看一眼…';
