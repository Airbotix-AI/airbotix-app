// Journey to the West · C1-P7 "我的石猴亮相" — the Personal Ship (scene-specs
// JTW-S1-C1-P7). The child designs their OWN arrival in the real Studio
// (template blocks_jtw_c1_p7: the frame ships; the sound, the two visible
// actions with an optional wait, and the preset greeting are theirs). This
// page reads the SAVED BlocksProject + the studio's run marker — never a
// frontend boolean — shows the detected design, records the real design plus
// the saved VFS version id in the evidence, and collects the choice-reason /
// save-reopen / peer-retell answers. Continue unlocks ONLY jtw-s1-c1-p8.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BUILT_IN_SOUNDS } from '../blocksModel';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import { jtwPersonalArrivalDesign, type JtwPersonalArrivalDesign } from '../jtwPersonalArrival';
import {
  C1_P7_CONTINUE_LABEL,
  C1_P7_MOTIVE_OPTIONS,
  C1_P7_REASON_OPTIONS,
  C1_P7_REOPEN_OPTIONS,
  C1_P7_REOPEN_RETRY_HINT,
  C1_P7_RESOLVED_WORLD_CHANGE,
  C1_P7_RETELL_OPTIONS,
  C1_P7_RETELL_QUESTION,
  C1_P7_RETELL_RETRY_HINT,
  C1_P7_STORY_AFTER,
  C1_P7_STORY_BEFORE,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c1-p7';
const NEXT_PART_ID = 'jtw-s1-c1-p8';
const LESSON_ID = 'jtw-s1-c1-p7';
const RECENT_PROJECTS_TO_SCAN = 8;

/** Child-facing labels for the allowed visible actions. */
const ACTION_LABELS: Record<string, string> = {
  hop: '🦘 跳',
  turn_left: '↩️ 向左转',
  turn_right: '↪️ 向右转',
  grow: '🔼 变大',
  shrink: '🔽 变小',
  reset_size: '🔄 变回原来大小',
};

function actionLabel(action: { op: string; n?: number }): string {
  const base = ACTION_LABELS[action.op] ?? action.op;
  return action.n != null ? `${base} ${action.n}` : base;
}

interface PersonalBuildStatus {
  projectId: string | null;
  /** The saved BlocksProject satisfies the personal-arrival contract. */
  valid: boolean;
  /** The studio recorded a verified run + save for this lesson. */
  runCompleted: boolean;
  /** The saved VFS snapshot version — the evidence references THIS, not a
   *  frontend "saved" flag. */
  savedVersion: number | null;
  /** The child's real design, parsed from the SAVED chain. */
  design: JtwPersonalArrivalDesign | null;
}

/** Read the kid's REAL saved personal-arrival build from the VFS. */
async function findPersonalBuild(kidId: string): Promise<PersonalBuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      const blocks =
        loaded.project.pages[0]?.characters
          .find((character) => character.id === 'stone-monkey')
          ?.scripts.find((script) => script.id === 'stone-monkey-personal-arrival')?.blocks ?? [];
      return {
        projectId: meta.id,
        valid: storyMissionProgramMatches(loaded.project, LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
        savedVersion: loaded.version,
        design: jtwPersonalArrivalDesign(blocks),
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return { projectId: null, valid: false, runCompleted: false, savedVersion: null, design: null };
}

export function JourneyWestPart7Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c1-p7-build', kidId],
    queryFn: () => findPersonalBuild(kidId!),
    enabled: !!kidId,
  });

  const [motive, setMotive] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [reopen, setReopen] = useState<string | null>(null);
  const [retell, setRetell] = useState<string | null>(null);
  const [retellMissed, setRetellMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setReason(evidence.selections?.choice_reason?.[0] ?? null);
    setReopen(evidence.selections?.reopen_check?.[0] ?? null);
    setRetell(evidence.selections?.peer_retell?.[0] ?? null);
    setRestored(true);
  }

  const design = build.data?.design ?? null;
  const buildDone = Boolean(build.data?.valid && build.data.runCompleted && design);
  const motiveDone = C1_P7_MOTIVE_OPTIONS.find((o) => o.id === motive)?.correct === true;
  const reasonDone = C1_P7_REASON_OPTIONS.find((o) => o.id === reason)?.correct === true;
  const reopenDone = C1_P7_REOPEN_OPTIONS.find((o) => o.id === reopen)?.correct === true;
  const retellDone = C1_P7_RETELL_OPTIONS.find((o) => o.id === retell)?.correct === true;
  const completed = Boolean(savedEntry);
  const resolved = motiveDone && buildDone && reasonDone && reopenDone && retellDone;

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    try {
      const { id } = await createBlocksProject({
        title: '西游记 · 我的石猴亮相',
        template: 'blocks_jtw_c1_p7',
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      // The button stays; the kid can tap again.
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          choice_reason: reason ? [reason] : [],
          reopen_check: reopen ? [reopen] : [],
          peer_retell: retell ? [retell] : [],
          design_sound: design ? [`sound:${design.soundN}`] : [],
          design_actions: design
            ? design.actions.map((action) =>
                action.n != null ? `${action.op}:${action.n}` : action.op,
              )
            : [],
          design_wait: design?.waitN != null ? [`wait:${design.waitN}`] : [],
          greeting: design ? [design.greeting] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          saved_version:
            build.data?.savedVersion != null ? [`v${build.data.savedVersion}`] : [],
        },
        prediction: retell ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">石台中央正在为你留着…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-p7-locked">
        <p className="text-[16px] font-bold text-ink">先在 Part 6 修好乱序的亮相，再来设计你自己的版本。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p7">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第一章 石猴出世 · Part 7 · Personal Ship
        </p>
        <h1 className="text-[28px] font-black text-ink">我的石猴亮相</h1>
      </header>

      {/* ── story_before：完整儿童正文 ──────────────────────────────── */}
      <section data-testid="jtw-p7-story">
        <p className="text-[16px] leading-8 text-ink">{C1_P7_STORY_BEFORE}</p>
      </section>

      {/* ── 动机 ────────────────────────────────────────────────────── */}
      <section data-testid="jtw-p7-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">这一次的亮相，石猴想要什么？</h2>
        <div className="flex flex-col gap-2">
          {C1_P7_MOTIVE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={motive === option.id}
              onPick={() => setMotive(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 真实 Personal Ship 搭建 ─────────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-p7-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
        data-saved-version={build.data?.savedVersion ?? 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">去工作区设计你自己的亮相</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Start、hide、声音、Show、一句预设问候和 End 已经放好。把两个能被看见的动作
          （跳、转身、变大、变小）按你的顺序接到 Show 和问候之间，中间可以加一个 Wait 1–3；
          声音和问候也可以换成你喜欢的。运行、保存，然后关闭作品重新打开、再跑一遍——
          内容一样、结果一样，才算真的完成。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-p7-open-studio"
            onClick={() => void openStudio()}
          >
            {buildDone ? '再看看我的亮相' : build.data?.projectId ? '继续设计 →' : '开始设计 →'}
          </button>
          {buildDone && (
            <span className="text-[13px] font-bold text-brand-mint" data-testid="jtw-p7-build-done">
              ✓ 你的亮相已经跑通并保存
            </span>
          )}
          {!buildDone && build.data?.projectId && (
            <span className="text-[13px] font-semibold text-ink-soft">
              还没到位：两个可见动作要接在 Show 之后、问候之前，运行并保存。
            </span>
          )}
        </div>
        {buildDone && design && (
          <p className="mt-2 text-[13px] font-semibold text-ink" data-testid="jtw-p7-design">
            你的设计：
            {BUILT_IN_SOUNDS.find((sound) => sound.id === design.soundN)?.icon ?? '🔔'}{' '}
            {BUILT_IN_SOUNDS.find((sound) => sound.id === design.soundN)?.label ?? '声音'} →{' '}
            {actionLabel(design.actions[0])}
            {design.waitN != null ? ` → ⏱ 等 ${design.waitN}` : ''} →{' '}
            {actionLabel(design.actions[1])} → 💬「{design.greeting}」
          </p>
        )}
      </section>

      {/* ── 选择理由 + 保存重开 + 同伴复述 ──────────────────────────── */}
      {buildDone && (
        <>
          <section data-testid="jtw-p7-reason">
            <h2 className="mb-2 text-[15px] font-bold text-ink">你为什么选这两个动作？</h2>
            <div className="flex flex-col gap-2">
              {C1_P7_REASON_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={reason === option.id}
                  onPick={() => setReason(option.id)}
                />
              ))}
            </div>
          </section>

          <section data-testid="jtw-p7-reopen">
            <h2 className="mb-2 text-[15px] font-bold text-ink">保存、关闭、重开、再跑一遍了吗？</h2>
            <div className="flex flex-col gap-2">
              {C1_P7_REOPEN_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={reopen === option.id}
                  onPick={() => setReopen(option.id)}
                />
              ))}
            </div>
            {reopen === 'reopen-skipped' && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C1_P7_REOPEN_RETRY_HINT}
              </p>
            )}
          </section>

          <section data-testid="jtw-p7-retell">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P7_RETELL_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C1_P7_RETELL_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={retell === option.id}
                  onPick={() => {
                    setRetell(option.id);
                    setRetellMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {retellMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C1_P7_RETELL_RETRY_HINT}
              </p>
            )}
          </section>
        </>
      )}

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p7-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C1_P7_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C1_P7_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-p7-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C1_P7_CONTINUE_LABEL}
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
