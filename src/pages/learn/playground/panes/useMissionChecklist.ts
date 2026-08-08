// Mission Mode shared state (learn-game-studio-prd §9A, D-GAME14).
//
// ONE query + ONE toggle mutation, consumed by BOTH surfaces that show the
// checklist: the `MissionPane` window and the taskbar's `MissionStepChip`. They
// already share a react-query cache entry (`missionProgressKey`), so the tick a
// kid makes in one is visible in the other instantly — but the derived state
// (which step is current, what is done, is everything finished) and the
// optimistic mutation must not be duplicated, or the two can disagree.
//
// The mutation also fires the milestone celebration into
// `missionCelebrationStore`, NOT into local pane state: a milestone ticked from
// the taskbar must still celebrate while the Mission window is closed.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { prefersReducedMotion } from '@/components/celebration/reducedMotion';
import {
  getMissionProgress,
  missionProgressKey,
  setMissionStepDone,
  type MissionProgress,
  type MissionStep,
} from './missionApi';
import { useMissionCelebrationStore } from './missionCelebrationStore';

export interface MissionChecklist {
  /** The AUTHORED steps, server-normalized ids. `[]` while loading / on error. */
  steps: MissionStep[];
  completed: ReadonlySet<string>;
  teacherMarked: ReadonlySet<string>;
  /** The first step not yet ticked — the CURRENT one. `-1` ⇒ everything is done. */
  currentIndex: number;
  currentStep: MissionStep | null;
  total: number;
  doneCount: number;
  allDone: boolean;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  /** Tick/untick. A no-op for a read-only viewer or a project-less session. */
  toggle: (step: MissionStep, done: boolean) => void;
  /** False for the teacher live viewer (D-LV-6) and project-less sessions. */
  canWrite: boolean;
}

export interface UseMissionChecklistOptions {
  /** The real backend project. Absent (a project-less session) ⇒ nothing to read. */
  projectId?: string;
  /** Teacher live viewer (D-LV-6) — read the checklist, never write it. */
  readOnly?: boolean;
  /**
   * Extra gate on the fetch. The PANE always reads (opening the window IS the
   * ask), but the always-mounted taskbar chip passes `!!missionId` so a
   * free-play game never issues a checklist request it has no use for.
   */
  enabled?: boolean;
}

export function useMissionChecklist({
  projectId,
  readOnly = false,
  enabled = true,
}: UseMissionChecklistOptions): MissionChecklist {
  const qc = useQueryClient();
  const queryKey = missionProgressKey(projectId ?? '');
  const celebrate = useMissionCelebrationStore((s) => s.celebrate);

  const progress = useQuery<MissionProgress>({
    queryKey,
    queryFn: () => getMissionProgress(projectId!),
    enabled: !!projectId && enabled,
  });

  const steps = useMemo(() => progress.data?.steps ?? [], [progress.data]);
  const completed = useMemo(
    () => new Set(progress.data?.completed_step_ids ?? []),
    [progress.data],
  );
  const teacherMarked = useMemo(
    () => new Set(progress.data?.teacher_marked_step_ids ?? []),
    [progress.data],
  );

  const toggleMutation = useMutation({
    mutationFn: (vars: { stepId: string; done: boolean }) =>
      setMissionStepDone(projectId!, vars.stepId, vars.done),
    // Optimistic: the tick lands instantly — a checklist that lags feels broken.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<MissionProgress>(queryKey);
      if (previous) {
        const ids = previous.completed_step_ids.filter((id) => id !== vars.stepId);
        qc.setQueryData<MissionProgress>(queryKey, {
          ...previous,
          completed_step_ids: vars.done ? [...ids, vars.stepId] : ids,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSuccess: (data, vars) => {
      qc.setQueryData(queryKey, data);
      // Milestone celebration — only on a tick (never on an untick), and only for
      // a step that actually carries `milestone` copy (§9A.6).
      if (!vars.done) return;
      const step = data.steps?.find((s) => s.id === vars.stepId);
      if (!step?.milestone) return;
      // Fires for EVERY milestone step, including the last one. There is no special case
      // for "finishes the mission" any more: that carve-out only existed to stop a DIALOG
      // landing on top of the "All done" state, and there is no dialog now (D-GAME14g).
      // Dropping it also removes an authoring trap — a milestone on the final step used to
      // silently never show, which no author could have guessed from the content.
      celebrate(step.milestone, !prefersReducedMotion());
    },
  });

  const currentIndex = steps.findIndex((s) => !completed.has(s.id));
  const total = steps.length;
  const doneCount = steps.filter((s) => completed.has(s.id)).length;
  const canWrite = !readOnly && !!projectId;

  return {
    steps,
    completed,
    teacherMarked,
    currentIndex,
    currentStep: currentIndex >= 0 ? steps[currentIndex] : null,
    total,
    doneCount,
    allDone: total > 0 && doneCount === total,
    isPending: progress.isPending,
    isError: progress.isError,
    refetch: () => void progress.refetch(),
    toggle: (step, done) => {
      if (!canWrite) return;
      toggleMutation.mutate({ stepId: step.id, done });
    },
    canWrite,
  };
}
