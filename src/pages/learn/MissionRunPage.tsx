import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { StudioDrawer } from '@/pages/learn/create/shared/StudioDrawer';
import { ImageStudioContent } from '@/pages/learn/create/shared/ImageStudioContent';
import { StoryStudioContent } from '@/pages/learn/create/shared/StoryStudioContent';
import { VoiceStudioContent } from '@/pages/learn/create/shared/VoiceStudioContent';
import { MusicStudioContent } from '@/pages/learn/create/shared/MusicStudioContent';
import { VideoStudioContent } from '@/pages/learn/create/shared/VideoStudioContent';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MissionStep {
  id: string;
  title: string;
  instruction_md: string;
  widget: 'image_create' | 'story_write' | 'voice_create' | 'music_create' | 'video_create' | 'share_to_class' | 'read_only';
  widget_config: Record<string, unknown>;
  completion: { type: string; kind?: string; min_words?: number };
}

export interface Mission {
  id: string;
  slug: string;
  title: string;
  description: string;
  estimated_stars: number;
  order_index: number;
  content_md: string;
  steps_json: MissionStep[];
}

export interface CoursePack {
  id: string;
  slug: string;
  title: string;
  product_line: 'line_a_creative' | 'line_b_coding';
  mission_count: number;
}

interface Artifact {
  id: string;
  kind: string;
  created_at: string;
}

interface SubmitResult {
  ok: boolean;
  missing?: string[];
  reason?: string;
  stars_awarded?: number;
  balance_after?: number;
  already_accepted?: boolean;
}

interface MissionRunPageProps {
  pack: CoursePack;
  missions: Mission[];
  projectId: string;
  packSlug: string;
  initialMissionId?: string;
}

interface StepWidgetProps {
  step: MissionStep;
  projectId: string;
  isDone: boolean;
  onAcknowledge: () => void;
  onOpenDrawer: () => void;
  onShare: () => void;
  isSharing: boolean;
}

interface StepStudioDrawerProps {
  step: MissionStep;
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

// ─── Module-level constants ───────────────────────────────────────────────────

const WIDGET_META: Record<string, { emoji: string; label: string; cta: string; stars: number; color: string }> = {
  image_create: { emoji: '🎨', label: 'Image Maker',  cta: 'Make an image',  stars: 4, color: 'bubblegum' },
  story_write:  { emoji: '📖', label: 'Story Writer', cta: 'Write a story',  stars: 1, color: 'mint' },
  voice_create: { emoji: '🔊', label: 'Voice Booth',  cta: 'Record a voice', stars: 1, color: 'sky' },
  music_create: { emoji: '🎵', label: 'Music Maker',  cta: 'Make music',     stars: 3, color: 'mint' },
  video_create: { emoji: '🎬', label: 'Video Studio', cta: 'Make a video',   stars: 5, color: 'sunshine' },
};

const DRAWER_META: Record<string, { title: string; emoji: string; color: string }> = {
  image_create: { title: 'Image Maker',  emoji: '🎨', color: 'bubblegum' },
  story_write:  { title: 'Story Writer', emoji: '📖', color: 'mint' },
  voice_create: { title: 'Voice Booth',  emoji: '🔊', color: 'sky' },
  music_create: { title: 'Music Maker',  emoji: '🎵', color: 'mint' },
  video_create: { title: 'Video Studio', emoji: '🎬', color: 'sunshine' },
};

// Pure helper — explicit params to avoid stale-closure issues in effects
function isStepDone(s: MissionStep, acknowledged: Set<string>, artifactData?: Artifact[]): boolean {
  if (s.completion.type === 'acknowledged') return acknowledged.has(s.id);
  if (s.completion.type === 'share_request_submitted') return acknowledged.has(s.id);
  if (s.completion.type === 'artifact_saved') {
    return (artifactData ?? []).some((a) => a.kind === s.completion.kind);
  }
  return false;
}

// ─── MissionRunPage ───────────────────────────────────────────────────────────

export function MissionRunPage({ pack, missions, projectId, packSlug, initialMissionId }: MissionRunPageProps) {
  const initialIdx = useMemo(
    () => (initialMissionId ? Math.max(0, missions.findIndex((m) => m.id === initialMissionId)) : 0),
    // initialMissionId and missions are stable across the lifetime of this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [currentMissionIdx, setCurrentMissionIdx] = useState(initialIdx);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  const mission = missions[currentMissionIdx];
  const steps = useMemo(() => mission?.steps_json ?? [], [mission]);
  const step = steps[currentStepIdx];
  const isLastStep = currentStepIdx === steps.length - 1;
  const isLastMission = currentMissionIdx === missions.length - 1;

  // Fetch artifacts to evaluate step completion
  const artifacts = useQuery<Artifact[]>({
    queryKey: ['project', projectId, 'artifacts'],
    queryFn: () => api<Artifact[]>(`/projects/${projectId}/artifacts`),
    enabled: !!projectId,
    refetchInterval: 3000,
  });

  // Wallet for ★ badge
  const wallet = useQuery<{ stars_balance: number }>({
    queryKey: ['wallet', familyId],
    queryFn: () => api(`/families/${familyId}/wallet`),
    enabled: !!familyId,
  });

  // Submit mission
  const submitMission = useMutation({
    mutationFn: () => api<SubmitResult>(`/projects/${projectId}/submit`, { method: 'POST' }),
    onSuccess: (res) => {
      setSubmitResult(res);
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ['wallet', familyId] });
        qc.invalidateQueries({ queryKey: ['projects'] });
        setShowComplete(true);
      }
    },
  });

  // Share to class
  const shareToClass = useMutation({
    mutationFn: () =>
      api(`/projects/${projectId}/share-request`, {
        method: 'POST',
        body: { target_visibility: 'class' },
      }),
    onSuccess: () => {
      markAcknowledged(step.id);
    },
    onError: (e: unknown) => {
      // CONFLICT = already requested — treat as done
      if (e instanceof ApiError && e.code === 'CONFLICT') markAcknowledged(step.id);
    },
  });

  // ── Completion check ──────────────────────────────────────────────────────

  function stepDone(s: MissionStep): boolean {
    return isStepDone(s, acknowledged, artifacts.data);
  }

  function markAcknowledged(stepId: string) {
    setAcknowledged((prev) => new Set([...prev, stepId]));
  }

  const currentStepDone = step ? stepDone(step) : false;

  // Auto-advance to the first undone step when artifacts or acknowledged state changes
  useEffect(() => {
    if (!steps.length) return;
    const nextUndone = steps.findIndex((s) => !isStepDone(s, acknowledged, artifacts.data));
    if (nextUndone !== -1 && nextUndone !== currentStepIdx) {
      setCurrentStepIdx(nextUndone);
    }
  }, [artifacts.data, acknowledged, steps, currentStepIdx]);

  // ── Confetti completion screen ────────────────────────────────────────────

  if (showComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-[64px] mb-4">🎉</div>
        <span className="sticker-mint text-[14px] mb-4">Mission complete!</span>
        <h1 className="hero-display text-[36px] mt-2">
          You did it!
        </h1>
        <p className="lead-text text-[18px] mt-3">
          "{mission.title}" — done!
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-wash-mint border border-brand-mint/30 px-6 py-4">
          <span className="text-[28px]">⭐⭐⭐</span>
          <div className="text-left">
            <div className="text-[16px] font-bold text-ink">+{submitResult?.stars_awarded ?? 3} Stars reward</div>
            {submitResult?.balance_after !== undefined && (
              <div className="text-[13px] text-steel">Now you have {submitResult.balance_after}★</div>
            )}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to={`/learn/projects/${projectId}`} className="btn-pill-primary">
            See my pet →
          </Link>
          {!isLastMission && (
            <button
              onClick={() => {
                setCurrentMissionIdx((i) => i + 1);
                setCurrentStepIdx(0);
                setShowComplete(false);
                setSubmitResult(null);
              }}
              className="btn-pill-secondary"
            >
              Next mission →
            </button>
          )}
          <Link to="/learn/missions" className="btn-pill-secondary">Back to missions</Link>
        </div>
      </div>
    );
  }

  if (!mission || !step) return <p className="lead-text">Loading mission…</p>;

  const color = pack.product_line === 'line_a_creative' ? 'coral' : 'sky';
  const completedSteps = steps.filter((s) => stepDone(s)).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link to={`/learn/missions/${packSlug}`} className="btn-pill-ghost -ml-3">
          ← Missions
        </Link>
        <div className="text-[14px] font-bold text-steel tabular-nums">
          {wallet.data?.stars_balance ?? '…'}★
        </div>
      </div>

      {/* Mission title + progress */}
      <div className="mb-6">
        <div className="eyebrow eyebrow-sky">
          Mission {currentMissionIdx + 1} of {missions.length}
        </div>
        <h1 className="text-[28px] font-bold text-ink mt-1">{mission.title}</h1>

        {/* Step progress dots */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStepIdx(i)}
              className={`flex items-center justify-center rounded-full transition-all ${
                i < currentStepIdx || stepDone(s)
                  ? `h-8 w-8 bg-grad-${color} text-white text-[12px] font-bold shadow-brand-${color}`
                  : i === currentStepIdx
                  ? `h-9 w-9 border-2 border-brand-${color} bg-canvas-pure text-[13px] font-bold text-ink`
                  : 'h-8 w-8 border-2 border-hairline bg-surface text-[12px] text-steel'
              }`}
            >
              {stepDone(s) ? '✓' : i + 1}
            </button>
          ))}
          <span className="text-[12px] text-steel ml-2">
            {completedSteps}/{steps.length} done
          </span>
        </div>
      </div>

      {/* Step card */}
      <div className="card-base mb-6">
        <div className="eyebrow eyebrow-bubblegum mb-2">Step {currentStepIdx + 1}</div>
        <h2 className="text-[22px] font-bold text-ink mb-3">{step.title}</h2>
        <p className="text-[15px] text-ink-soft leading-relaxed">{step.instruction_md}</p>

        {/* Widget action area */}
        <div className="mt-6">
          <StepWidget
            step={step}
            projectId={projectId}
            isDone={currentStepDone}
            onAcknowledge={() => markAcknowledged(step.id)}
            onOpenDrawer={() => setDrawerOpen(true)}
            onShare={() => shareToClass.mutate()}
            isSharing={shareToClass.isPending}
          />
        </div>

        {/* Next / Submit */}
        <div className="mt-6 flex gap-3">
          {currentStepIdx > 0 && (
            <button
              onClick={() => setCurrentStepIdx((i) => i - 1)}
              className="btn-pill-ghost"
            >
              ← Back
            </button>
          )}
          {!isLastStep ? (
            <button
              onClick={() => setCurrentStepIdx((i) => i + 1)}
              disabled={!currentStepDone}
              className="btn-pill-primary flex-1"
            >
              Next step →
            </button>
          ) : (
            <button
              onClick={() => submitMission.mutate()}
              disabled={!currentStepDone || submitMission.isPending}
              className="btn-pill-primary flex-1"
            >
              {submitMission.isPending ? '✨ Checking…' : "I'm done! →"}
            </button>
          )}
        </div>

        {/* Submit failure nudge */}
        {submitResult && !submitResult.ok && (
          <div className="mt-4 rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 text-[13px] font-medium text-ink">
            Almost there! {submitResult.reason}
          </div>
        )}
      </div>

      {/* Studio drawer */}
      {drawerOpen && (
        <StepStudioDrawer
          step={step}
          projectId={projectId}
          onClose={() => setDrawerOpen(false)}
          onCreated={() => {
            setDrawerOpen(false);
            qc.invalidateQueries({ queryKey: ['project', projectId, 'artifacts'] });
          }}
        />
      )}
    </div>
  );
}

// ─── StepWidget ───────────────────────────────────────────────────────────────

function StepWidget({ step, projectId: _projectId, isDone, onAcknowledge, onOpenDrawer, onShare, isSharing }: StepWidgetProps) {
  if (step.widget === 'read_only') {
    return isDone ? (
      <div className="flex items-center gap-2 text-brand-mint font-semibold text-[14px]">
        <span>✓</span> Got it!
      </div>
    ) : (
      <button onClick={onAcknowledge} className="btn-pill-primary">
        Got it →
      </button>
    );
  }

  if (step.widget === 'share_to_class') {
    return isDone ? (
      <div className="flex items-center gap-2 text-brand-mint font-semibold text-[14px]">
        <span>✓</span> Shared with class!
      </div>
    ) : (
      <button onClick={onShare} disabled={isSharing} className="btn-pill-primary">
        {isSharing ? 'Sharing…' : '✨ Share with class'}
      </button>
    );
  }

  const meta = WIDGET_META[step.widget];
  if (!meta) return null;

  return (
    <div className={`rounded-2xl bg-wash-${meta.color} border border-brand-${meta.color}/30 px-4 py-4`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[28px]">{meta.emoji}</span>
          <div>
            <div className="text-[14px] font-bold text-ink">{meta.label}</div>
            <div className="text-[12px] text-steel">−{meta.stars}★ per creation</div>
          </div>
        </div>
        {isDone ? (
          <span className="text-brand-mint font-bold text-[13px]">✓ Done</span>
        ) : (
          <button onClick={onOpenDrawer} className="btn-pill-primary shrink-0">
            {meta.cta} →
          </button>
        )}
      </div>
      {isDone && (
        <button
          onClick={onOpenDrawer}
          className="mt-3 text-[12px] font-semibold text-brand-coral hover:underline"
        >
          Make another →
        </button>
      )}
    </div>
  );
}

// ─── StepStudioDrawer ─────────────────────────────────────────────────────────

function StepStudioDrawer({ step, projectId, onClose, onCreated }: StepStudioDrawerProps) {
  const meta = DRAWER_META[step.widget];
  if (!meta) return null;

  return (
    <StudioDrawer title={meta.title} emoji={meta.emoji} color={meta.color} onClose={onClose}>
      {step.widget === 'image_create' && <ImageStudioContent projectId={projectId} onCreated={onCreated} />}
      {step.widget === 'story_write'  && <StoryStudioContent projectId={projectId} onCreated={onCreated} />}
      {step.widget === 'voice_create' && <VoiceStudioContent projectId={projectId} onCreated={onCreated} />}
      {step.widget === 'music_create' && <MusicStudioContent projectId={projectId} onCreated={onCreated} />}
      {step.widget === 'video_create' && <VideoStudioContent projectId={projectId} onCreated={onCreated} />}
    </StudioDrawer>
  );
}
