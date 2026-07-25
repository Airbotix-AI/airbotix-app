// Journey to the West · C2-P5 "水帘分开以后" — Build 2. The child edits two
// real On Bump tracks in Blocks Studio, runs the retained P4 route, and this
// page verifies the saved project plus the studio run marker before persisting
// Read/prediction/build evidence and unlocking only C2-P6.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  C2_P5_CONTINUE_LABEL,
  C2_P5_EVIDENCE_OPTIONS,
  C2_P5_PREDICTION_OPTIONS,
  C2_P5_RESOLVED_WORLD_CHANGE,
  C2_P5_STORY_AFTER,
  C2_P5_STORY_BEFORE,
  JTW_C2_CAVE_ENTRANCE_ASSET,
  JTW_C2_STAGE_BASE_ASSET,
  JTW_C2_WATER_CURTAIN_ASSET,
  JTW_S1_STORY_LINE_ID,
  JTW_STONE_MONKEY_ASSET,
} from './journeyWestSeason1';
import { Choice, EvidenceGroup } from './partUi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';

const PART_ID = 'jtw-s1-c2-p5';
const NEXT_PART_ID = 'jtw-s1-c2-p6';
const LESSON_ID = 'jtw-s1-c2-p5';
const REQUIRED_EVIDENCE = 3;

interface BuildStatus {
  projectId: string | null;
  programMatches: boolean;
  runCompleted: boolean;
}

async function findBuild(kidId: string): Promise<BuildStatus> {
  for (const meta of (await listBlocksProjects(kidId)).slice(0, 8)) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      return {
        projectId: meta.id,
        programMatches: storyMissionProgramMatches(loaded.project, LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
      };
    } catch {
      // Skip unreadable or legacy projects.
    }
  }
  return { projectId: null, programMatches: false, runCompleted: false };
}

function CaveStage({ resolved }: { resolved: boolean }) {
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
      data-testid="jtw-c2p5-stage"
      data-state={resolved ? 'resolved' : 'before'}
    >
      <img src={JTW_C2_STAGE_BASE_ASSET} alt="湿石路通向空的崖壁凹处" className="h-full w-full object-cover" />
      <img
        src={JTW_C2_CAVE_ENTRANCE_ASSET}
        alt={resolved ? '暖光洞口里能看见石桥、干爽地面、石座和清水' : ''}
        aria-hidden={!resolved}
        data-testid="jtw-c2p5-cave"
        data-visible={resolved}
        className="absolute right-[10%] top-[18%] w-[38%]"
        hidden={!resolved}
      />
      <img
        src={JTW_C2_WATER_CURTAIN_ASSET}
        alt={resolved ? '' : '合着的水帘挡在洞口前'}
        aria-hidden={resolved}
        data-testid="jtw-c2p5-curtain"
        data-visible={!resolved}
        className="absolute right-[10%] top-[12%] w-[38%]"
        hidden={resolved}
      />
      <img
        src={JTW_STONE_MONKEY_ASSET}
        alt=""
        aria-hidden
        className="absolute bottom-[10%] left-[56%] w-[14%]"
      />
    </div>
  );
}

export function JourneyWestC2Part5Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c2-p5-build', kidId],
    queryFn: () => findBuild(kidId!),
    enabled: !!kidId,
  });
  const [evidence, setEvidence] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  if (savedEntry && !restored) {
    const saved = savedEntry.evidence as StoryPartEvidence;
    setEvidence(saved.selections?.cave_evidence ?? []);
    setPrediction(saved.prediction ?? null);
    setRestored(true);
  }

  const validEvidence = evidence.filter(
    (id) => C2_P5_EVIDENCE_OPTIONS.find((option) => option.id === id)?.correct,
  );
  const evidenceDone =
    validEvidence.length >= REQUIRED_EVIDENCE &&
    evidence.every((id) => C2_P5_EVIDENCE_OPTIONS.find((option) => option.id === id)?.correct);
  const predictionDone =
    C2_P5_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
  const buildDone = Boolean(build.data?.programMatches && build.data.runCompleted);
  const resolved = buildDone && evidenceDone && predictionDone;
  const completed = Boolean(savedEntry);

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: '西游记 · 水帘分开以后',
        template: 'blocks_jtw_c2_p5',
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          cave_evidence: validEvidence,
          bump_tracks: ['water-curtain-hide', 'cave-entrance-show'],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">水帘正等着回应…</p>;
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c2p5-locked">
        <p className="font-bold text-ink">先完成 Part 4 的五块路线，再来连接碰撞回应。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p5">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二章 水帘洞的约定 · Part 5 · Build 2
        </p>
        <h1 className="text-[28px] font-black text-ink">水帘分开以后</h1>
      </header>
      <section className="space-y-4" data-testid="jtw-c2p5-story">
        {C2_P5_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 16)} className="text-[16px] leading-8 text-ink">{paragraph}</p>
        ))}
      </section>
      <CaveStage resolved={resolved || completed} />
      <section className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5" data-testid="jtw-c2p5-build">
        <h2 className="font-bold text-ink">在真正的工作区连接两个回应</h2>
        <p className="mt-2 text-[14px] leading-7 text-ink-soft">
          给 Water Curtain 的 On Bump 放 Hide；再选 Cave Entrance，给它的 On Bump 放 Show。
          P4 的五块路线不能改变。按 Go 让石猴真实碰撞，等保存完成后回来。
        </p>
        <button type="button" className="btn-pill-primary mt-4" data-testid="jtw-c2p5-open-studio" disabled={creating} onClick={() => void openStudio()}>
          {creating ? '正在准备舞台…' : build.data?.projectId ? '继续连接 →' : '开始连接 →'}
        </button>
        {buildDone && <p className="mt-3 font-bold text-brand-mint" data-testid="jtw-c2p5-build-done">✓ 两个碰撞轨已真实运行并保存</p>}
        {createError && <p className="mt-2 text-brand-coral" role="alert">没能打开工作区，请再试一次。</p>}
      </section>
      <section>
        <h2 className="mb-2 font-bold text-ink">运行前预测：只 Hide 水帘、不 Show 洞口，会看见什么？</h2>
        <div className="flex flex-col gap-2">
          {C2_P5_PREDICTION_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
          ))}
        </div>
      </section>
      <EvidenceGroup
        title="从洞里找出至少三条“适合伙伴进入”的证据"
        options={C2_P5_EVIDENCE_OPTIONS}
        selected={evidence}
        onToggle={(id) => setEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        done={evidenceDone}
        testId="jtw-c2p5-evidence"
      />
      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/50 bg-wash-mint p-5" data-testid="jtw-c2p5-story-after">
          <p className="font-bold text-ink">{C2_P5_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-ink">{C2_P5_STORY_AFTER}</p>
        </section>
      )}
      <button
        type="button"
        className="btn-pill-primary w-full"
        data-testid="jtw-c2p5-continue"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {complete.isPending ? '正在保存故事证据…' : C2_P5_CONTINUE_LABEL}
      </button>
    </div>
  );
}
