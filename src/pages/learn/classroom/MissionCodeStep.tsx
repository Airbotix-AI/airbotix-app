import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';
import { EmbeddedCodeStudio } from '@/pages/learn/code/CodeStudioPage';
import {
  createCodeProject,
  submitMission,
  type MissionSubmitResult,
  type VfsFile,
} from '@/pages/learn/code/codeApi';

interface MissionCodeStepProps {
  /** The Mission this code step belongs to (PRD §7 — Project is created with this set). */
  missionId: string;
  /** Mission title, used to seed the project title. */
  missionTitle: string;
  /**
   * Optional existing code project for this Mission (resume — one Project per
   * `(kid_id, mission_id)`). When absent, the step creates one on mount-start.
   */
  projectId?: string;
  /** The runner passes this to mark the step done once acceptance passes. */
  onComplete: () => void;
}

/**
 * Mission `widget: code` step (learn-code-studio-prd.md §7 +
 * learn-missions-prd.md §3.2 widget registry). Embeds the Code Studio (Pro
 * layout) inside Mission chrome. The Project is created with `mission_id` set;
 * the acceptance gate runs server-side against the final VFS when the kid
 * presses "I'm done" (learn-missions-prd §3.4 — client cannot lie about it).
 *
 * NOTE: there is no in-page Mission *step runner* in the SPA yet — Missions are
 * launched from `MissionDetailPage` which navigates to `/learn/projects/new`.
 * This component is therefore wired as a mountable drop-in (mirroring
 * `MissionShareStep`): once a step runner exists, mount this for `widget: code`
 * steps and pass the resolved `projectId` + `onComplete`.
 */
export function MissionCodeStep({
  missionId,
  missionTitle,
  projectId: existingProjectId,
  onComplete,
}: MissionCodeStepProps) {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  const [projectId, setProjectId] = useState<string | null>(existingProjectId ?? null);
  const [files, setFiles] = useState<VfsFile[]>([]);
  const [result, setResult] = useState<MissionSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startProject = useMutation({
    mutationFn: () =>
      createCodeProject({
        kidId,
        familyId,
        title: missionTitle,
        template: 'blank',
        missionId,
      }),
    onSuccess: (p) => {
      setProjectId(p.id);
      setError(null);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError && (e.code === 'WALLET_INSUFFICIENT' || e.status === 402))
        setError('Out of Stars! Ask a parent to top up.');
      else setError(e instanceof ApiError ? e.message : 'Could not start the code project.');
    },
  });

  const submit = useMutation({
    mutationFn: () => submitMission({ projectId: projectId!, missionId }),
    onSuccess: (res) => {
      setResult(res);
      setError(null);
      if (res.status === 'accepted') onComplete();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not check your work.'),
  });

  // ── Not started yet ──────────────────────────────────────────────────────
  if (!projectId) {
    return (
      <div className="card-base">
        <div className="eyebrow eyebrow-sky">Mission step</div>
        <h3 className="text-[18px] font-bold text-ink mt-1">Build it with code</h3>
        <p className="lead-text mt-2" style={{ fontSize: '14px' }}>
          The AI writes the code, you tell it what you want. When it works, press “I’m done”.
        </p>
        {error && (
          <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}
        <button
          onClick={() => startProject.mutate()}
          disabled={startProject.isPending}
          className="btn-pill-primary mt-4"
        >
          {startProject.isPending ? 'Opening…' : '💻 Start coding'}
        </button>
      </div>
    );
  }

  const incomplete = result?.status === 'incomplete';

  // ── Studio embedded in Mission chrome ────────────────────────────────────
  return (
    <div className="space-y-4">
      <EmbeddedCodeStudio projectId={projectId} onFilesChange={setFiles} />

      {result?.status === 'accepted' ? (
        <div className="rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 text-[13px] font-medium text-ink">
          🎉 Nice work — this step is done!
          {result.stars_awarded ? ` +${result.stars_awarded}★` : ''}
        </div>
      ) : (
        <div className="card-base flex flex-col gap-3">
          {incomplete && (
            <div className="rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 text-[13px] font-medium text-ink">
              You’re nearly there!{' '}
              {result?.reason ??
                (result?.missing?.length
                  ? `Still need: ${result.missing.join(', ')}.`
                  : 'Keep going.')}
            </div>
          )}
          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending || files.length === 0}
              className="btn-pill-primary"
            >
              {submit.isPending ? 'Checking…' : "✓ I'm done"}
            </button>
            <span className="text-[12px] text-slate2">
              We’ll check your code meets the mission.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
