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
import { JTW_C3_FAR_SHORE_PAGE, JTW_C3_SEA_LEG, JTW_C3_SEA_PAGE } from '../jtwC3SeaBuild';
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
export const C3_P5_PROJECT_TITLE =
  'Journey to the West · Both starry night and morning fog need to be observed';

/** How many recent projects the part page scans for the child's build. */
export const C3_P5_RECENT_PROJECTS_TO_SCAN = 8;

/** The route both versions must still walk. */
export const C3_P5_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

// ─── story_before — teaching script C3 Part 5, IN FULL, two screens ──────────

export const C3_P5_STORY_SCREENS: readonly [string, string] = [
  'There are already stories about this stretch of road in the middle of the sea, but what kind of sea is it? Both versions are correct: Choose A, on the sea at starry night, the raft waits for the clouds to disperse under the stars before identifying the direction; Choose B, on the sea in morning mist, the raft slows down and listens to the sound of waves to find the shore. Page 2 has different rhythms, sounds, and movements, but both versions still have to go to Page 3.',
  'Let me make it clear again: in the original work, this search lasted for many years, passed through many places, and crossed the sea more than once. We compressed it into three pages, so the choice here is not "which sea is real", but "which kind of observation I want the audience to see." After selecting, you have to connect 2–3 expression blocks of that version in front of ➡️ Right 4 - neither Right 4 nor 📄 Page 3 can move.',
];
export const C3_P5_SCREEN_IDS: readonly [string, string] = [
  'part-5-two-valid-versions',
  'part-5-compression-and-task',
];
export const C3_P5_NEXT_SCREEN_LABEL = 'Read the next paragraph';
export const C3_P5_PREV_SCREEN_LABEL = 'Go back to the previous paragraph';

/** 原著小卡片 — the compression the scene demands be said out loud. */
export const C3_P5_CLASSIC_CARD =
  'In the first chapter of the original work, the Monkey King traveled across the ocean to seek a teacher for many years, crossing seas, visiting the world, and crossing seas again. Three pages is our method of telling a story. It does not mean that the original work only has three real seas; the starry night and morning fog are not the weather that the original work describes, but the kind of observation you choose to show the audience.';

export const C3_P5_STORY_BRIDGE =
  'The same route can be told in different ways: the sound, speed and pauses change the rhythm, ➡️ Right 4 and 📄 Page 3 change the route. Choose to move only the first few blocks and not move any part of the route - so both versions can get to the other side.';

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
      'There is a moon on the sea on a starry night, but the clouds are still pressing on the island in the sky, making it difficult to see which side is the shore. The raft let the starlight ring for a moment, then paused for two beats to wait for the clouds to disperse - and then left after having a clear view.',
    chainLabel: '✨ Sparkle → ⏱ Wait 2',
  },
  {
    id: 'morning',
    label: JTW_C3_WEATHER_VERSIONS[1].label,
    evidence:
      "In the morning mist on the sea, everything was white, and my eyes couldn't help. The raft slowed down, letting the sea breeze blow by, and then said what it was listening to - using its ears to find the shore.",
    chainLabel: '🐢 Speed ​​→ 💨 Whoosh → 💬 I’ll listen to the waves first',
  },
];

export const C3_P5_VERSION_TITLE =
  'Both seas are true. Which observation do you want the audience to see?';
export const C3_P5_VERSION_NOTE =
  'Both versions are retained ➡️ Right 4 → 📄 Page 3: What is changed is the rhythm and expression, not the route. After selecting, the workspace will use the sea you selected.';
export const C3_P5_VERSION_CHANGE_LOCKED =
  'We have already started to build according to this sea. If you want to change to another sea, you have to return to the work area and start over - so think about it first.';

/** Both cards are valid, so "correct" is not a property of the choice itself. */
export function c3p5VersionPicked(version: JtwC3Weather | null): boolean {
  return version !== null;
}

// ─── 解释："看不清时为什么不是越快越好" ──────────────────────────────────────

export const C3_P5_WHY_QUESTION = "When you can't see clearly, why not walk as fast as possible?";
export const C3_P5_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'why-observe-first',
    label:
      "If you can't see clearly, see clearly first: wait or slow down a little before you know which way to go; walking fast will just make you go wrong faster.",
    correct: true,
  },
  {
    id: 'why-faster-is-better',
    label: 'The sooner the better, just get to the shore as early as possible.',
    correct: false,
  },
  {
    id: 'why-louder-sound',
    label: "It doesn't matter if you make the sound a little louder and can't see clearly.",
    correct: false,
  },
];
export const C3_P5_WHY_RETRY_HINT =
  "Think again about the sentence in Part 3: Use acceleration to cover up the problem, and the raft will still go wrong. Starry Night's ⏱ Wait and Morning Mist's 🐢 Speed ​​are both doing the same thing - see clearly first, then move forward.";

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

export const C3_P5_PREDICTION_TITLE =
  'Your companion only gets your weather card. Let him say three things first:';

export const C3_P5_PREDICTION_ROWS: readonly C3P5PredictionRow[] = [
  {
    id: 'hear',
    question: '① What will he hear?',
    options: [
      { id: 'hear-sparkle', label: '✨ Sparkle——The voice of starlight' },
      { id: 'hear-whoosh', label: '💨Whoosh——The sound of sea breeze' },
      { id: 'hear-nothing', label: "can't hear anything" },
    ],
    answer: { starry: 'hear-sparkle', morning: 'hear-whoosh' },
    hint: 'Take a look at the blocks written on the weather card you chose: ✨ Sparkle for starry night, 💨 Whoosh for morning fog.',
  },
  {
    id: 'move',
    question: '② When will the raft move?',
    options: [
      { id: 'move-after-observe', label: 'After observing first, then go 4 blocks to the right.' },
      { id: 'move-immediately', label: 'As soon as you press Go, go right immediately' },
      { id: 'move-never', label: "This page doesn't move" },
    ],
    answer: { starry: 'move-after-observe', morning: 'move-after-observe' },
    hint: 'The expression blocks in both versions are ranked in front of ➡️ Right 4: wait a moment or slow down first and see clearly before proceeding to this section.',
  },
  {
    id: 'page',
    question: '③ Which page does this page give him to at the end?',
    options: [
      { id: 'page-3', label: 'Page 3 · The mountains and forests on the other side' },
      { id: 'page-1', label: 'Page 1 · Flower-Fruit Mountain coast' },
      { id: 'page-stay', label: 'Not going anywhere, staying at sea' },
    ],
    answer: { starry: 'page-3', morning: 'page-3' },
    hint: 'Choose to only change the rhythm, not the export. 📄 The page still says 3 - that’s the mountains and forests on the other side.',
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

export const C3_P5_BUILD_TITLE =
  'Go to the real workspace and connect this version of the expression';
export const C3_P5_BUILD_NOTE =
  "There is already ➡️ Right 4 → 📄 Page 3 in the script slot of Page 2 - that is the route shared by both versions, don't touch any of it. What you have to do is to connect this version of the expression block in front of Right 4: Starry Night is ✨ Sparkle → ⏱ Wait 2, Morning Fog is 🐢 Speed ​​→ 💨 Whoosh → 💬 That sentence (💬 text can be selected by clicking on the block, no need to type it yourself).";
export const C3_P5_OPEN_STUDIO_NEW = 'Click this sea to start riding →';
export const C3_P5_OPEN_STUDIO_RESUME = 'Continue building →';
export const C3_P5_OPEN_STUDIO_DONE = 'Look at my sea again';
export const C3_P5_OPEN_STUDIO_BUSY = 'Preparing this sea...';
export const C3_P5_OPEN_STUDIO_LOCKED =
  'Choose a piece of sea first before you can start building.';
export const C3_P5_BUILD_DONE_LABEL =
  '✓ This version of the expression chain has been set up and actually run in the workspace';
export const C3_P5_BUILD_PENDING_LABEL =
  "The expression chain has not been set up accurately, or Go has not been pressed in the workspace and saved. Just changing the background doesn't count - the bricks need to be attached too.";
export const C3_P5_TARGET_CHAIN_TITLE = 'Goal: This version of the Page 2 main script';
export const C3_P5_SAVED_CHAIN_TITLE =
  'The main script of Page 2 you saved (read from the work, not guessed by the page)';
export const C3_P5_SHARED_TAIL_TITLE = 'A route that cannot be moved in either version';
export const C3_P5_CREATE_ERROR = 'Failed to open workspace, please try again.';

/** The chain a finished build of this version must carry. */
export function c3p5TargetChain(version: JtwC3Weather) {
  return jtwC3WeatherVersion(version).chain;
}

// ─── 跨页运行（studio 的 runner 一次只跑一页） ───────────────────────────────

export const C3_P5_RUN_TITLE =
  'Complete a run from Page 1, checking weather expressions and 1 → 2 → 3';
export const C3_P5_RUN_NOTE =
  'Go in the workspace only runs one page at a time. Here, use the same interpreter to run your saved works from Page 1 to page: the weather expression must really happen, and the route must really be 1 → 2 → 3. As long as it is corrected in the editor and has not been actually run, this part is not considered completed.';
export const C3_P5_RUN_LABEL = '▶ Run from Page 1 to Page 3';
export const C3_P5_RUN_AGAIN_LABEL = 'run again';
export const C3_P5_RUN_BUSY_LABEL = 'The raft is going…';
export const C3_P5_RUN_LOCKED_HINT =
  'You must first set up this version of the expression chain and save it in the workspace before you can run this complete route.';
export const C3_P5_EXPECTED_TRACE_TITLE = 'intended route';
export const C3_P5_ACTUAL_TRACE_TITLE = 'actual footprints';
export const C3_P5_TRACE_MISMATCH_HINT =
  'This time it didn’t go 1 → 2 → 3. Go back to the workspace and check whether the number on the 📄 Page is still 3 and run again.';

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

export const C3_P5_MUTED_TITLE = 'You can read it even if you turn off the sound';

export const C3_P5_RESOLVED_TITLE = 'Page 2 Save it as the sea of ​​your choice';
export function c3p5ResolvedWorldChange(version: JtwC3Weather): string {
  return version === 'starry'
    ? 'The Starry Night version has survived: the clouds receded, the moonlight paved a road on the sea, and the raft moved only after seeing clearly - the audience could read "He observed, and then continued."'
    : 'The morning fog version survives: the fog clears a path, the raft slows down and listens to the sound of waves passing through - the audience can read "he observed, and then continued".';
}
export const C3_P5_AUDIENCE_READS =
  'A sentence that the audience can read: He observes first, then moves on.';

export const C3_P5_STORY_AFTER =
  'The weather and route were clear. But look again: the raft leaves from the right side of Page 1, but emerges from the right side of Page 2—it was on the wrong side when it crossed the page.';
export const C3_P5_CONTINUE_LABEL = 'Find the reason for the jump';

export const C3_P5_LOCKED_HINT =
  'First, create the page in the middle of the sea in Chapter 3, Part 4, and then choose the shape of the sea.';
export const C3_P5_LOADING_HINT = 'Both seas are waiting for you to take a look...';
