// Journey to the West · C1-P4 "搭出完整出世链" — the chapter's Build 1
// (scene-specs JTW-S1-C1-P4). The child reads the build story, explains what
// each core block lets the audience see/hear, answers the Show-first
// prediction, then builds FOR REAL: a `blocks_jtw_c1_p4` project is created
// from the backend template and edited in the actual Blocks Studio (palette
// includes live Grow/Turn distractors; no auto-fix exists). This page verifies
// completion from the SAVED BlocksProject itself — the mission contract must
// match exactly AND the studio's run+save progress marker must be present —
// before continue records the part complete and unlocks ONLY jtw-s1-c1-p5.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  C1_P4_BLOCK_MEANINGS,
  C1_P4_CONTINUE_LABEL,
  C1_P4_PREDICTION_OPTIONS,
  C1_P4_PREDICTION_QUESTION,
  C1_P4_PREDICTION_RETRY_HINT,
  C1_P4_RESOLVED_WORLD_CHANGE,
  C1_P4_STORY_AFTER,
  C1_P4_STORY_BEFORE,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c1-p4';
const NEXT_PART_ID = 'jtw-s1-c1-p5';
const LESSON_ID = 'jtw-s1-c1-p4';
const RECENT_PROJECTS_TO_SCAN = 8;

interface BuildStatus {
  projectId: string | null;
  /** The saved BlocksProject matches the exact target chain. */
  programMatches: boolean;
  /** The studio recorded a finished run + save for this lesson. */
  runCompleted: boolean;
}

/** Find the kid's REAL saved build for this lesson by reading project VFS. */
async function findArrivalBuild(kidId: string): Promise<BuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      return {
        projectId: meta.id,
        programMatches: storyMissionProgramMatches(loaded.project, LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return { projectId: null, programMatches: false, runCompleted: false };
}

export function JourneyWestPart4Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c1-p4-build', kidId],
    queryFn: () => findArrivalBuild(kidId!),
    enabled: !!kidId,
  });

  const [meanings, setMeanings] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    const saved: Record<string, string> = {};
    for (const block of C1_P4_BLOCK_MEANINGS) {
      const pick = evidence.selections?.[`meaning_${block.id}`]?.[0];
      if (pick) saved[block.id] = pick;
    }
    setMeanings(saved);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const meaningsDone = C1_P4_BLOCK_MEANINGS.every(
    (block) => meanings[block.id] === block.meaningId,
  );
  const predictionDone =
    C1_P4_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
  const completed = Boolean(savedEntry);
  const buildDone = Boolean(build.data?.programMatches && build.data.runCompleted);
  const resolved = meaningsDone && predictionDone && buildDone;

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: '西游记 · 搭出完整出世链',
        template: 'blocks_jtw_c1_p4',
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
          ...Object.fromEntries(
            C1_P4_BLOCK_MEANINGS.map((block) => [
              `meaning_${block.id}`,
              meanings[block.id] ? [meanings[block.id]] : [],
            ]),
          ),
          build_project: build.data?.projectId ? [build.data.projectId] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">舞台正在亮灯…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-p4-locked">
        <p className="text-[16px] font-bold text-ink">先完成 Part 3 的排练，再来搭真正的出世链。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p4">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第一章 石猴出世 · Part 4 · Build 1
        </p>
        <h1 className="text-[28px] font-black text-ink">搭出完整出世链</h1>
      </header>

      {/* ── story_before：完整儿童正文 ──────────────────────────────── */}
      <section data-testid="jtw-p4-story">
        <p className="text-[16px] leading-8 text-ink">{C1_P4_STORY_BEFORE}</p>
      </section>

      {/* ── 逐块因果证据 ────────────────────────────────────────────── */}
      <section data-testid="jtw-p4-meanings">
        <h2 className="mb-3 text-[15px] font-bold text-ink">
          每一块会让观众看见 / 听见什么？给四块动作找到它们的故事意思：
        </h2>
        <div className="space-y-4">
          {C1_P4_BLOCK_MEANINGS.map((block) => (
            <div key={block.id} data-testid={`jtw-p4-meaning-${block.id}`}>
              <h3 className="mb-2 text-[14px] font-bold text-ink">
                {block.label}
                {meanings[block.id] === block.meaningId && (
                  <span className="ml-2 text-brand-mint">✓</span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {C1_P4_BLOCK_MEANINGS.map((option) => (
                  <Choice
                    key={option.meaningId}
                    option={{
                      id: option.meaningId,
                      label: option.meaningLabel,
                      correct: option.meaningId === block.meaningId,
                    }}
                    active={meanings[block.id] === option.meaningId}
                    onPick={() =>
                      setMeanings((current) => ({ ...current, [block.id]: option.meaningId }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 预测 ────────────────────────────────────────────────────── */}
      <section data-testid="jtw-p4-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P4_PREDICTION_QUESTION}</h2>
        <div className="flex flex-wrap gap-2">
          {C1_P4_PREDICTION_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => {
                setPrediction(option.id);
                setPredictionMissed(!option.correct);
              }}
            />
          ))}
        </div>
        {predictionMissed && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {C1_P4_PREDICTION_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── 真实搭建：进入 Blocks Studio ────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-p4-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">去真正的工作区搭出世链</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          候选区里混着 Grow 和 Turn——它们能运行，却回答不了眼前的问题。搭好后按 Go
          真实运行并保存，回到这里就能继续。没有任何按钮会替你完成。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-p4-open-studio"
            disabled={creating}
            onClick={() => void openStudio()}
          >
            {creating
              ? '正在准备舞台…'
              : buildDone
                ? '再看看我的程序'
                : build.data?.projectId
                  ? '继续搭建 →'
                  : '开始搭建 →'}
          </button>
          {buildDone && (
            <span className="text-[13px] font-bold text-brand-mint" data-testid="jtw-p4-build-done">
              ✓ 出世链已搭好并真实运行过
            </span>
          )}
          {!buildDone && build.data?.projectId && (
            <span className="text-[13px] font-semibold text-ink-soft">
              程序还没有精确完成，或还没运行保存。
            </span>
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            没能打开工作区，请再试一次。
          </p>
        )}
      </section>

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p4-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C1_P4_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C1_P4_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-p4-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C1_P4_CONTINUE_LABEL}
        </button>
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          没有保存上，请再点一次试试。
        </p>
      )}
    </div>
  );
}
