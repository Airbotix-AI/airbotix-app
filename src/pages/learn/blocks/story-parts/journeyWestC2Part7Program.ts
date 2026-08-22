// Journey to the West · C2-P7 "把发现变成大家的路" — chapter two's Personal Ship
// contract and child-facing content (scene-specs JTW-S1-C2-P7, teaching script
// C2 Part 7).
//
// The child designs the entry route themselves: which bank, the exact chain
// that bank needs, how long the door stays open and which evidence line the
// cave says. `jtwPersonalEntry.ts` owns the design grammar; this module owns
// the Part's story text, its evidence questions, and the read-back that turns a
// SAVED BlocksProject into the Part's completion evidence.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md.

import type { BlocksProject, Page } from '../blocksModel';
import { listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  JTW_C2_P7_LESSON_ID,
  JTW_C2_P7_PAGE_ID,
  jtwPersonalEntryDesign,
  type JtwPersonalEntryDesign,
} from '../jtwPersonalEntry';
import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C2_P7_LESSON_ID = JTW_C2_P7_LESSON_ID;
export const C2_P7_TEMPLATE = 'blocks_jtw_c2_p7' as const;
/** Teaching script C2 Part 7 names the saved work `Find the Water Curtain Cave`. */
export const C2_P7_PROJECT_TITLE = 'Journey to the West · Find the Water Curtain Cave';

/** Child-facing story text — teaching script C2 Part 7 IN FULL, never compressed. */
export const C2_P7_STORY_BEFORE: readonly [string, string, string] = [
  'The stone monkey returned to his friends, explained that the cave was safe, and invited everyone to follow his route and enter. But "I walked it once" does not mean "everyone can walk it": what partners want is a path that they can understand, guess, and be the same every time.',
  'This time it’s up to you to design: choose the left or right path, and build the main script of the stone monkey independently; you can decide how many directions and distances, how long to wait, and which sentence of discovery is said at the entrance of the cave, but you must keep the story lock of "arrival→encounter→water curtain response". Neither the water curtain nor the response rail at the entrance can be deleted.',
  'Ship Checkpoint 3: A partner used only the map and program to predict the route and the response at the cave entrance. The actual run matched; after saving, closing, reopening and running again, the result stayed the same. Title: Find the Water Curtain Cave.',
];

/** 人物动机：把个人发现变成伙伴可预测、可重复的安全路线。 */
export const C2_P7_MOTIVE =
  "Stone Monkey does not want to perform his own skills again, but wants to turn his personal discovery into everyone's path: by following this route, the partners can predict every stopping point and safely enter and exit again and again.";

/** 因果桥：路线产生接触，接触启动回应，等待把门留给伙伴。 */
export const C2_P7_STORY_BRIDGE =
  'The last step of the route is to make the soles of your feet just touch the water curtain, and collide with the Hide to activate the water curtain and the Show at the entrance of the hole. The last piece of Wait leaves the door open - the waiting must occur before the partner comes in, otherwise the program will end as soon as the response is completed.';

/** 预测（scene-specs）：同伴只看起点和积木，先说路线会停在哪里。 */
export const C2_P7_PREDICTION_QUESTION =
  'Let your companions only look at the starting point and the string of blocks, and first predict: Where will the stone monkey stop at the end, and what will happen?';
export const C2_P7_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'predict-knock-then-open',
    label:
      'Stop on the stone that is only one block away from the water curtain - as soon as your feet touch it, the water curtain will hide and the hole will show.',
    correct: true,
  },
  {
    id: 'predict-walk-through',
    label: 'Walk directly into the cave without touching the water curtain',
    correct: false,
  },
  {
    id: 'predict-two-cells-away',
    label:
      'If you park two spaces away from the water curtain, the water curtain will also separate.',
    correct: false,
  },
];
export const C2_P7_PREDICTION_RETRY_HINT =
  "Think about what you learned in Part 4: If you miss one square, you won't be able to touch it, and the water curtain won't have any response. The route must go exactly to the rock one block away from the water curtain.";

/** 证据：Wait 为什么放在碰撞之后。 */
export const C2_P7_WAIT_QUESTION =
  "You put Wait at the end. Why can't it be placed before the move?";
export const C2_P7_WAIT_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'wait-holds-door',
    label:
      'Because you have to encounter the water curtain first and the entrance of the cave appears first. Waiting is "leaving the door to your friends"',
    correct: true,
  },
  {
    id: 'wait-makes-faster',
    label: 'Because the stone monkey will walk faster after a while',
    correct: false,
  },
  {
    id: 'wait-anywhere',
    label: 'It’s the same wherever you put it, Wait doesn’t affect the story',
    correct: false,
  },
];
export const C2_P7_WAIT_RETRY_HINT =
  "Read it in order: walk to the curtain → touch it → hide the curtain → reveal the cave entrance → wait. If you wait first, the entrance has not opened yet, so your partner has nowhere to enter.";

export const C2_P7_RESOLVED_WORLD_CHANGE =
  "The group of monkeys came one after another according to the route you designed: the footprints fell on the same stone, the water curtain separated at the same grid, and the stone seat and clear water in the cave became everyone's resting place.";
export const C2_P7_STORY_AFTER =
  'The cave changes from a quiet clearing to a new home with companions and responses. Discovering that they have become a common home - the story has yet to reach the final step: how will they fulfill the promise made before the waterfall?';
export const C2_P7_CONTINUE_LABEL = 'See if the agreement is completed?';

/** What the part page reads back from the kid's SAVED Personal Ship project. */
export interface C2P7EntryBuild {
  projectId: string | null;
  /** Server VFS version of the saved project — the version id the evidence cites. */
  savedVersion: number | null;
  /** The parsed design, or null when the saved page breaks the contract. */
  design: JtwPersonalEntryDesign | null;
  /** The studio recorded a real verified run + save for this lesson. */
  runCompleted: boolean;
  /** The saved page itself, so the part page can REOPEN and rerun it for real. */
  page: Page | null;
}

export const C2_P7_EMPTY_BUILD: C2P7EntryBuild = {
  projectId: null,
  savedVersion: null,
  design: null,
  runCompleted: false,
  page: null,
};

/** Turn a freshly loaded project + VFS version into the Part's build status. */
export function c2p7BuildFrom(
  projectId: string,
  project: BlocksProject,
  version: number,
  runCompleted: boolean,
): C2P7EntryBuild {
  const page = project.pages.find((candidate) => candidate.id === JTW_C2_P7_PAGE_ID) ?? null;
  return {
    projectId,
    savedVersion: version,
    design: project.lessonId === C2_P7_LESSON_ID ? jtwPersonalEntryDesign(page ?? undefined) : null,
    runCompleted,
    page,
  };
}

/** How far back through the kid's recent work the entry project is searched. */
const RECENT_PROJECTS_TO_SCAN = 8;

/**
 * Reopen the kid's SAVED Personal Ship straight from the server. Both C2-P7 and
 * C2-P8 start from this load — for P7 it IS the "关闭重开", and for P8 it is the
 * scene's "加载P7真实保存版本" (never an answer project this page built).
 */
export async function findC2EntryBuild(kidId: string): Promise<C2P7EntryBuild> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== C2_P7_LESSON_ID) continue;
      return c2p7BuildFrom(
        meta.id,
        loaded.project,
        loaded.version,
        Boolean(loaded.storyProgress?.completed[C2_P7_LESSON_ID]) &&
          storyMissionProgramMatches(loaded.project, C2_P7_LESSON_ID),
      );
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return C2_P7_EMPTY_BUILD;
}
