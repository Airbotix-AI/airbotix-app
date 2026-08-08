// Mission Mode I/O (learn-game-studio-prd §9A / D-GAME14).
//
// The kid's guided step checklist is the mission's ALREADY-AUTHORED
// `steps_json` array (§9A.1) — the backend serves it alongside the kid's
// check-off state, and NORMALIZES every step id (a step authored without one
// becomes `step_<n>`). Progress keys are therefore server-owned: never derive a
// step id in the client, always use `step.id` verbatim.
//
// Check-off is GUIDANCE, not the reward gate (D-GAME14c): no Stars, no
// acceptance — `POST /projects/:id/submit` + `acceptance_yaml` stays the only
// path to a completed Mission.

import { api } from '@/lib/api';

/** The closed widget registry a step can carry (learn-missions-prd D-M4). */
export type MissionStepWidget =
  | 'image_create'
  | 'story_write'
  | 'voice_create'
  | 'music_create'
  | 'video_create'
  | 'share_to_class'
  | 'read_only'
  | 'code';

export interface MissionStep {
  /** ALWAYS present — server-normalized. The progress key. */
  id: string;
  title: string;
  instruction_md?: string;
  widget: MissionStepWidget;
  /** Present ⇒ this step is a MILESTONE; the string is the celebration copy. */
  milestone?: string;
}

export interface MissionProgress {
  project_id: string;
  mission_id: string | null;
  /** `[]` when the project has no mission, or the mission authored no steps. */
  steps: MissionStep[];
  completed_step_ids: string[];
  /** Subset of `completed_step_ids` — steps a TEACHER ticked (§9A.4). */
  teacher_marked_step_ids: string[];
  updated_at: string | null;
}

/** Shared query key so the pane and the Workspace's auto-open read ONE cache entry. */
export function missionProgressKey(projectId: string): readonly [string, string, string] {
  return ['project', projectId, 'mission-progress'] as const;
}

export function getMissionProgress(projectId: string): Promise<MissionProgress> {
  return api<MissionProgress>(`/projects/${projectId}/mission-progress`);
}

/** Tick/untick one step. The server returns the whole updated progress record. */
export function setMissionStepDone(
  projectId: string,
  stepId: string,
  done: boolean,
): Promise<MissionProgress> {
  return api<MissionProgress>(`/projects/${projectId}/mission-progress`, {
    method: 'PATCH',
    body: { step_id: stepId, done },
  });
}

/**
 * True when at least one authored step is still unchecked (drives auto-open).
 * Tolerates a partial/foreign cache entry (`steps` absent): the auto-open is a
 * convenience, never a reason to crash the workspace.
 */
export function hasUnfinishedSteps(progress: MissionProgress | undefined): boolean {
  const steps = progress?.steps;
  if (!steps?.length) return false;
  const done = new Set(progress?.completed_step_ids ?? []);
  return steps.some((step) => !done.has(step.id));
}
