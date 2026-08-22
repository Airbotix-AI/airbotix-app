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

import { listBlocksProjects, loadBlocksProject } from '../blocksApi';
import type { BlocksProject } from '../blocksModel';
import type { PageFlowRunResult } from '../pageFlowRun';
import {
  jtwC3RouteDesign,
  jtwC3RouteSavedWeather,
  JTW_C3_P7_BOARD_LEG,
  JTW_C3_P7_MAX_ACTIONS,
  JTW_C3_P7_MIN_ACTIONS,
  JTW_C3_P7_MIN_CHILD_BLOCKS,
  JTW_C3_P7_PAGE1_RAFT_CELL,
  type JtwC3RouteDesign,
} from '../jtwC3PersonalRoute';
import { JTW_C3_FAR_SHORE_PAGE, JTW_C3_SEA_LEG, JTW_C3_SEA_PAGE } from '../jtwC3SeaBuild';
import type { JtwC3Weather } from '../jtwC3WeatherBuild';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import { c3p2PageLabel } from './journeyWestC3Part2Program';

export const C3_P7_LESSON_ID = 'jtw-s1-c3-p7';
export const C3_P7_PART_ID = 'jtw-s1-c3-p7';
export const C3_P7_NEXT_PART_ID = 'jtw-s1-c3-p8';
/** 教学脚本 C3 Part 7 / 本章卡: the saved work is `Across the Sea to Learn`. */
export const C3_P7_WORK_NAME = 'Across the Sea to Learn';
export const C3_P7_PROJECT_TITLE = `Journey to the West · ${C3_P7_WORK_NAME}`;

/** How many recent projects the part page scans for the child's own route. */
export const C3_P7_RECENT_PROJECTS_TO_SCAN = 8;

/** The route every valid personal build has to walk. */
export const C3_P7_TARGET_TRACE: readonly number[] = [1, JTW_C3_SEA_PAGE, JTW_C3_FAR_SHORE_PAGE];

// ─── the saved Personal Ship, read straight off the VFS ─────────────────────
// C3-P8 reopens the SAME work through the SAME read path, which is what makes
// its "不得另载答案项目" structural: there is no template either Part can create
// to stand in for a route the child never saved.

export interface C3PersonalRouteBuild {
  projectId: string | null;
  /** The SAVED project, exactly as the server has it. */
  project: BlocksProject | null;
  /** Server VFS version — the version id a Part's evidence cites. */
  savedVersion: number | null;
  /** The parsed personal route, or null while the structure is unfinished. */
  design: JtwC3RouteDesign | null;
  /** The sea the saved Page 2 paints, even before the route is finished. */
  startedWeather: JtwC3Weather | null;
  /** The saved document satisfies the personal-route grammar. */
  programMatches: boolean;
  /** The studio recorded a finished run + save for this lesson. */
  runCompleted: boolean;
}

export const C3_P7_NO_BUILD: C3PersonalRouteBuild = {
  projectId: null,
  project: null,
  savedVersion: null,
  design: null,
  startedWeather: null,
  programMatches: false,
  runCompleted: false,
};

/** Find the kid's REAL saved personal route for this lesson by reading the VFS. */
export async function findC3PersonalRouteBuild(kidId: string): Promise<C3PersonalRouteBuild> {
  const projects = (await listBlocksProjects(kidId)).slice(0, C3_P7_RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== C3_P7_LESSON_ID) continue;
      return {
        projectId: meta.id,
        project: loaded.project,
        savedVersion: loaded.version,
        design: jtwC3RouteDesign(loaded.project),
        startedWeather: jtwC3RouteSavedWeather(loaded.project),
        programMatches: storyMissionProgramMatches(loaded.project, C3_P7_LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[C3_P7_LESSON_ID]),
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return C3_P7_NO_BUILD;
}

/** The saved work really is a finished, run-and-saved personal route. */
export function c3p7BuildDone(build: C3PersonalRouteBuild | undefined): boolean {
  return Boolean(build?.design && build.programMatches && build.runCompleted);
}

// ─── story_before — teaching script C3 Part 7, two screens ───────────────────

export const C3_P7_STORY_SCREENS: readonly [string, string] = [
  'The public road has been repaired: three pages can be connected, and the raft no longer jumps to the other side of the sea. But that\'s the road we take together. Now it\'s your turn to make one yourself - leave Flower-Fruit Mountain, cross the sea in the middle, and walk to the mountain forest where the master is located. You will write the three pages. The name of the work is "Across the Sea to Learn", which means "crossing the sea to learn": He is not going to get treasures, nor has he started to learn scriptures yet. He is looking for a master who can teach him.',
  `Each of the three pages has its own responsibility: Page 1 clearly explains leaving home and boarding the raft, Page 2 allows people to see observation, progress and pause, Page 3 approaches the shore, hears the singing in the mountains and forests, and ends steadily. put on each page ${JTW_C3_P7_MIN_ACTIONS}–${JTW_C3_P7_MAX_ACTIONS} meaningful actions, Page 1 and Page 2 each need an exit, and Page 3 needs an End - adding up to at least ${JTW_C3_P7_MIN_CHILD_BLOCKS} Blocks, all placed by you yourself. After setting it up, save it, close it, reopen it, and then run it completely from Page 1: If you can reopen it and it's still the same after reopening, then this road is really yours.`,
];
export const C3_P7_SCREEN_IDS: readonly [string, string] = [
  'part-7-my-own-route',
  'part-7-what-three-pages-owe',
];
export const C3_P7_NEXT_SCREEN_LABEL = 'Read the next paragraph';
export const C3_P7_PREV_SCREEN_LABEL = 'Go back to the previous paragraph';

export const C3_P7_CLASSIC_CARD =
  "In the first chapter of the original work, the Monkey King traveled across the ocean to seek teachers for many years, passing through more than one sea and more than one human world. Three pages is how we talk about this section of the road. It does not mean that the original work only has three seas. You can change the weather, change the rhythm, and change the words he said, but you can't change why he set out: he went to learn from a teacher.";

export const C3_P7_STORY_BRIDGE =
  'The action on each page makes what really happened in this section of the journey, the number on the exit transfers the story to the next page, and the last piece of End indicates "finished". If one of the three things is missing, the readers will not be able to read it: without action, it is an empty shell, without exit, it is a dead page, and without End, it cannot stop.';

export function c3p7StoryRead(screens: readonly string[]): boolean {
  return C3_P7_SCREEN_IDS.every((screenId) => screens.includes(screenId));
}

// ─── ①选一片海（模板分支白名单） ─────────────────────────────────────────────

export const C3_P7_WEATHER_TITLE = '① First choose which sea you want to cross on this journey';
export const C3_P7_WEATHER_NOTE =
  'Whichever card you choose, the actual sea will be drawn in the workspace, and the saved work will also contain this sea - not a mark on the page. Both seas are established. If you want to change after selecting, you have to go back to the work area and start over.';
export const C3_P7_WEATHER_LOCKED_NOTE =
  'You have already started work on this piece of sea. If you want to change to another piece of the sea, you have to go back to the workspace and start a new work - we will not secretly replace the saved piece for you.';

// ─── ②在真正的工作区里写三页 ────────────────────────────────────────────────

export const C3_P7_BUILD_TITLE = `② Go to the real workspace and write your own "${C3_P7_WORK_NAME}」`;
export const C3_P7_BUILD_NOTE = `There is only one Start in the three-page script slot, and there is no demonstration chain to copy. put per page ${JTW_C3_P7_MIN_ACTIONS}–${JTW_C3_P7_MAX_ACTIONS} Block action, click on the 📄 Page of Page 1 ${JTW_C3_SEA_PAGE}, Page 2 points ${JTW_C3_FAR_SHORE_PAGE}, Page 3 End with 🏁 End, then press Go to run once and save.`;

/** The structure checklist the page renders — the scene's 最低结构, spelled out. */
export interface C3P7StructureRow {
  id: string;
  label: string;
}

export const C3_P7_STRUCTURE_TITLE = 'The minimum structure that this work must satisfy';
export const C3_P7_STRUCTURE_ROWS: readonly C3P7StructureRow[] = [
  {
    id: 'pages',
    label: `Write one paragraph on each of the three pages:${c3p2PageLabel(1)}Leaving home · ${c3p2PageLabel(JTW_C3_SEA_PAGE)}observe · ${c3p2PageLabel(JTW_C3_FAR_SHORE_PAGE)}arrive`,
  },
  {
    id: 'actions',
    label: `per page ${JTW_C3_P7_MIN_ACTIONS}–${JTW_C3_P7_MAX_ACTIONS} Block meaningful actions - a page with only one exit is an empty shell`,
  },
  {
    id: 'exits',
    label: `Page 1 export write ${JTW_C3_SEA_PAGE}, the exit of Page 2 writes ${JTW_C3_FAR_SHORE_PAGE}, Page 3 ends steadily with 🏁 End`,
  },
  {
    id: 'raft',
    label: `Page 1 full ${JTW_C3_P7_BOARD_LEG} The talent is good enough to stop at ${JTW_C3_P7_PAGE1_RAFT_CELL.gx}-${JTW_C3_P7_PAGE1_RAFT_CELL.gy} The raft; Page 2 must also be filled ${JTW_C3_SEA_LEG} Just keep your feet on the raft`,
  },
  {
    id: 'observe',
    label:
      'The page at sea should have ⏱ Wait or 🐢 Speed ​​- if you can’t see clearly, observe first before continuing.',
  },
  {
    id: 'arrive',
    label:
      'On the page on the other side, there is a preset sentence, which means that he heard the singing in the mountains and forests.',
  },
  {
    id: 'ledger',
    label: `At least ${JTW_C3_P7_MIN_CHILD_BLOCKS} You control the blocks: two more blocks to move, a sound, a Wait or Speed, two 📄 Page and one 🏁 End`,
  },
];

export const C3_P7_OPEN_STUDIO_NEW = 'Start writing my three pages →';
export const C3_P7_OPEN_STUDIO_RESUME = 'Continue writing →';
export const C3_P7_OPEN_STUDIO_DONE = 'Take another look at my work';
export const C3_P7_OPEN_STUDIO_BUSY = 'Preparing this sea...';
export const C3_P7_OPEN_STUDIO_LOCKED = 'First select a piece of sea and then open the workspace.';
export const C3_P7_CREATE_ERROR = 'Failed to open workspace, please try again.';
export const C3_P7_BUILD_DONE_LABEL =
  '✓ All three pages have been written, and have been actually run and saved in the workspace.';
export const C3_P7_BUILD_PENDING_LABEL =
  "Not yet established: check the number of action blocks on each page, Page 1/Page 2 each complete 4 squares, Wait or Speed ​​on the sea page, the sentence on the other side, as well as exit 2/3 and the final End. It may also be that you haven't pressed Go in the workspace and saved it.";

export const C3_P7_DESIGN_TITLE =
  'The three pages you saved (read from the work, not guessed by the page)';
export const C3_P7_LEDGER_TITLE = `The building blocks you dominate (at least ${JTW_C3_P7_MIN_CHILD_BLOCKS} piece)`;
export const C3_P7_STARTER_TITLE = 'The look of hair down';
export const C3_P7_STARTER_NOTE =
  'There is only one Start on each of the three pages - every block on it is placed by you.';

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
  { id: 'page-1', label: `Turn to Page 1 · ${c3p2PageLabel(1)}` },
  { id: 'page-2', label: `Turn to Page 2 · ${c3p2PageLabel(JTW_C3_SEA_PAGE)}` },
  { id: 'page-3', label: `Turn to Page 3 · ${c3p2PageLabel(JTW_C3_FAR_SHORE_PAGE)}` },
  { id: 'ends', label: 'The story ends on this page' },
];

export const C3_P7_PEER_TITLE =
  '③ The companion only looks at the landmarks on three pages, the grid he is standing on and the numbers on the exit, and says page by page: "What will happen after this page?"';
export const C3_P7_PEER_NOTE =
  'Let your companion finish reading all three pages before running. What came out was different from what he said. The first difference was the "unintelligible part" - go back to the work area and only fix that one part, and then run again.';

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
  'What your companion says page by page is exactly the same as what he actually ran - he understands your route just by looking at the landmarks, starting point and exit numbers.';
export function c3p7MismatchHint(page: number): string {
  return `The first thing I don’t understand is Page ${page} · ${c3p2PageLabel(page)}: What my companion said is not consistent with what actually happened. Just fix this page - check its exit numbers, what's really going on on this page, then come back and run again. Don't touch other pages yet.`;
}
export const C3_P7_MISMATCH_UNVISITED =
  'One page has never been opened, so there is no way to compare its predictions with others. Connect the exit first, so that the route really goes to that page.';

// ─── ④保存 · 关闭 · 重开 ────────────────────────────────────────────────────

export const C3_P7_REOPEN_TITLE = '④ Close this work and reopen it again';
export const C3_P7_REOPEN_NOTE =
  'Here, the work will be fetched from the server again, and then the JSON fetched twice will be compared word by word: three pages, weather, location, script and end point. If there is a difference, it will not be counted.';
export const C3_P7_REOPEN_LABEL = '💾 Close and reopen';
export const C3_P7_REOPEN_AGAIN_LABEL = 'Reopen again';
export const C3_P7_REOPEN_BUSY_LABEL = 'Reopening…';
export const C3_P7_REOPEN_LOCKED_HINT =
  'Let your partner predict all three pages first, then close it and reopen it.';
export const C3_P7_REOPEN_MATCH =
  '✓ It will be exactly the same after reopening: the three pages, weather, location, script and end point are all correct.';
export const C3_P7_REOPEN_DIFFERS =
  'After reopening, it will not match the saved one. Go back to the workspace to confirm that the last modification was really saved, and then reopen it.';
export const C3_P7_REOPEN_ERROR = 'Failed to reopen this work, please try again.';
/** Stored `reopen_match` value — the two loads really were the same document. */
export const C3_P7_REOPEN_MATCH_MARKER = 'json-identical';

// ─── ⑤重开以后再从 Page 1 跑一遍 ────────────────────────────────────────────

export const C3_P7_RUN_TITLE =
  '⑤ Just use the copy you just reopened and run it completely from Page 1';
export const C3_P7_RUN_NOTE =
  'Go in the workspace only runs one page at a time. Here, the same interpreter is used to run the re-opened work from Page 1 page to page, measuring the true trajectory, the footprints of each page, and the connection between each page spread.';
export const C3_P7_RUN_LABEL = '▶Start from Page 1 to start my journey of seeking a teacher';
export const C3_P7_RUN_AGAIN_LABEL = 'run again';
export const C3_P7_RUN_BUSY_LABEL = 'The raft is going…';
export const C3_P7_RUN_LOCKED_HINT =
  'First close the work and reopen it, then run it again - otherwise it will not run "after reopening".';
export const C3_P7_RUN_TRACE_TITLE = 'I really walked through the three pages this time';
export const C3_P7_BOUNDARY_TITLE =
  'Every cross-page: where does he leave and where does he appear?';
export const C3_P7_TRACE_MISMATCH_HINT =
  'This time it didn’t go from 1 → 2 → 3, or the last page didn’t end firmly, or there was a cross-page break. Go back to the workspace and check the two exit numbers and the last End, then restart and run again.';

// ─── resolved / story_after / continue ──────────────────────────────────────

export const C3_P7_RESOLVED_TITLE =
  'You can close and open your path to seek guidance, or you can run it again.';
export const C3_P7_RESOLVED_WORLD_CHANGE =
  "On the shoal on the other side, the raft was put away. The stone steps going up the mountain are lit step by step, the songs in the forest are coming from there, and the stone tablet of the master's gate stands in the fog - this page now has its ending, and it is you who wrote this one, not someone else's example.";
/**
 * 远行印 is C3-P8's server-side aggregation (C3共享实现合同：P1–P8 全部完成才
 * 允许点亮), and this scene's own assertion says "P7不完成Chapter". The Part
 * says so out loud instead of drawing a seal it cannot earn.
 */
export const C3_P7_SEAL_NOTE =
  'The travel seal has not been lit yet: it will be lit by the server after all eight parts of Chapter 3 are completed and the evidence is available. What you have now is a work that can be restarted and run again.';
export const C3_P7_STORY_AFTER =
  "The monkey king put away the raft and walked up the mountain following the singing in the forest. The fog cleared a little, and the entrance to the teacher's gate was revealed - when you get to the door, you have to explain the way you came.";
export const C3_P7_CONTINUE_LABEL = 'Follow the song up the mountain';

export const C3_P7_LOCKED_HINT =
  'First fix the raft jumping position in Chapter 3, Part 6, and then make your own three-page guide.';
export const C3_P7_LOADING_HINT = 'The raft is waiting for your route on the shore...';
