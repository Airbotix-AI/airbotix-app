// Tiny Star Village · Season 1 — the sequential season manifest, the child-facing
// progression it drives, and the season record a finished scene writes.
// Curriculum SOT: `tiny-star-village-season-1-scene-specs.md` §11; queue task:
// `.autonomous/story-blocks-season-1/task_list.md` Task 25.
//
// The 24 scenes are ONE chain — chapters A1…A6, each chapter Explore → Complete
// → Fix → Build — and the unlock TRUTH is the server
// (`/story-parts/tiny-star-village-s1`, platform-backend `story-parts.catalog.ts`,
// the same adjacent-unlock model Journey to the West uses). Finishing a scene
// records it against the kid and opens exactly the next scene; a chapter never
// opens wholesale. This module never decides what is open: it orders the season,
// projects the server's answer onto the scenes, and names the scene to resume.

import { ApiError } from '@/lib/api';
import { completeStoryPart, type StoryLineProgress } from './story-parts/storyPartsApi';
import {
  storyMissionProjectTitle,
  TINY_STAR_VILLAGE_CHAPTERS,
  type StoryJourneyPosition,
} from './storyJourneyCatalog';

/** The story line id the season chain is stored under (server + client). */
export const TINY_STAR_STORY_LINE_ID = 'tiny-star-village-s1';

/** The backend's refusal code for a scene whose predecessor is unfinished. */
const STORY_PART_LOCKED_CODE = 'STORY_PART_LOCKED';

export interface TinyStarSeasonScene extends StoryJourneyPosition {
  /** 1-based position in the 24-scene season chain. */
  order: number;
  /** The scene's lesson id — also its Story Part id on the server. */
  lessonId: string;
}

/** The season in playing order: chapter by chapter, scene by scene. */
export const TINY_STAR_SEASON_MANIFEST: readonly TinyStarSeasonScene[] =
  TINY_STAR_VILLAGE_CHAPTERS.flatMap((chapter) =>
    chapter.missions.map((mission, index) => ({
      chapter,
      mission,
      sceneNumber: index + 1,
      sceneCount: chapter.missions.length,
      lessonId: mission.lessonId,
    })),
  ).map((scene, index) => ({ ...scene, order: index + 1 }));

export const TINY_STAR_SEASON_SCENE_COUNT = TINY_STAR_SEASON_MANIFEST.length;

export function tinyStarSeasonScene(lessonId: string | undefined): TinyStarSeasonScene | undefined {
  if (!lessonId) return undefined;
  return TINY_STAR_SEASON_MANIFEST.find((scene) => scene.lessonId === lessonId);
}

export function isTinyStarSeasonScene(lessonId: string | undefined): boolean {
  return tinyStarSeasonScene(lessonId) !== undefined;
}

/**
 * What a child may do with a scene right now.
 * - `completed` — finished, and replayable for ever.
 * - `open` — the one scene the season is waiting on.
 * - `locked` — still behind an unfinished scene.
 */
export type TinyStarSceneState = 'completed' | 'open' | 'locked';

export interface TinyStarSeasonView {
  /**
   * True once the server's unlock answer has been read. While it is false the
   * season renders unlocked: a slow, signed-out or offline session must never
   * shut a child out of a scene they already earned. The season RECORD is still
   * server-enforced, so an out-of-order scene can never advance the chain.
   */
  known: boolean;
  /** lessonId → state, for every scene in the manifest. */
  states: ReadonlyMap<string, TinyStarSceneState>;
  completedCount: number;
  sceneCount: number;
  /** The scene to continue with: the open, unfinished one. */
  resume?: TinyStarSeasonScene;
  /** True only when all 24 scenes are recorded complete. */
  seasonComplete: boolean;
}

/** Project the server's progress answer onto the season manifest. */
export function tinyStarSeasonView(progress: StoryLineProgress | undefined): TinyStarSeasonView {
  const known = progress !== undefined;
  const completed = new Set(progress?.completed.map((entry) => entry.part_id) ?? []);
  const unlocked = new Set(progress?.unlocked_part_ids ?? []);
  const states = new Map<string, TinyStarSceneState>();
  let resume: TinyStarSeasonScene | undefined;
  let completedCount = 0;

  for (const scene of TINY_STAR_SEASON_MANIFEST) {
    if (!known) {
      states.set(scene.lessonId, 'open');
      continue;
    }
    if (completed.has(scene.lessonId)) {
      states.set(scene.lessonId, 'completed');
      completedCount += 1;
      continue;
    }
    if (unlocked.has(scene.lessonId)) {
      states.set(scene.lessonId, 'open');
      if (!resume) resume = scene;
      continue;
    }
    states.set(scene.lessonId, 'locked');
  }

  return {
    known,
    states,
    completedCount,
    sceneCount: TINY_STAR_SEASON_SCENE_COUNT,
    resume,
    seasonComplete: known && completedCount === TINY_STAR_SEASON_SCENE_COUNT,
  };
}

export function tinyStarSceneState(
  view: TinyStarSeasonView,
  lessonId: string,
): TinyStarSceneState {
  return view.states.get(lessonId) ?? 'open';
}

/** The subset of a Blocks project listing this module needs to resume a scene. */
export interface TinyStarProjectRef {
  id: string;
  title: string;
  updated_at?: string;
}

/**
 * The child's own saved project for a scene, when they already started it.
 * Every season project is created with `storyMissionProjectTitle`, so the title
 * identifies the scene; the most recently updated copy wins. Returning it lets
 * "continue the story" reopen the blocks the child left behind instead of
 * spawning a second empty copy of the same scene.
 */
export function tinyStarResumeProject(
  projects: readonly TinyStarProjectRef[],
  scene: TinyStarSeasonScene,
): TinyStarProjectRef | undefined {
  const title = storyMissionProjectTitle(scene.mission);
  const resumableTitles = new Set([title, ...(scene.mission.legacyProjectTitles ?? [])]);
  return projects
    .filter((project) => resumableTitles.has(project.title))
    .reduce<TinyStarProjectRef | undefined>((newest, project) => {
      if (!newest) return project;
      const a = project.updated_at ?? '';
      const b = newest.updated_at ?? '';
      return a > b ? project : newest;
    }, undefined);
}

/** What happened when a finished scene tried to advance the season chain. */
export type TinyStarSeasonRecord = 'recorded' | 'not-a-season-scene' | 'locked' | 'unavailable';

/** The scene saved, but the season chain refused to advance (played early). */
export const TINY_STAR_SEASON_LOCKED_MESSAGE =
  'Saved! The story map opens scenes in order — finish the earlier scenes to open this one.';

/** The scene saved, but the season chain could not be reached right now. */
export const TINY_STAR_SEASON_OFFLINE_MESSAGE =
  'Saved! The story map could not be updated just now — it will catch up next time you open it.';

/**
 * Record a finished Tiny Star scene against the kid's season chain. The saved
 * project id is the evidence: it points at the VFS the studio just verified and
 * persisted, never at a page boolean. The server re-checks the predecessor, so
 * a scene opened out of order is refused here even though its own project saved.
 */
export async function recordTinyStarSeasonScene(
  lessonId: string,
  projectId: string,
): Promise<TinyStarSeasonRecord> {
  if (!isTinyStarSeasonScene(lessonId)) return 'not-a-season-scene';
  try {
    await completeStoryPart(TINY_STAR_STORY_LINE_ID, lessonId, {
      schema_version: 1,
      selections: { saved_project: [projectId] },
    });
    return 'recorded';
  } catch (error) {
    if (error instanceof ApiError && error.code === STORY_PART_LOCKED_CODE) return 'locked';
    return 'unavailable';
  }
}
