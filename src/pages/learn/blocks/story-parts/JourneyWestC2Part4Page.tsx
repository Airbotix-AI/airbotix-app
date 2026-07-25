// Journey to the West · C2-P4 "刚好到达，不多也不少" — chapter two's main Build
// (scene-specs JTW-S1-C2-P4). The child reads the build story, then turns the
// P3 prediction into the REAL five-block route: a `blocks_jtw_c2_p4` project
// is created from the backend template (only Start/End ship — no pre-filled
// chain to "just edit a number" on) and edited in the actual Blocks Studio,
// where Left/Down/Wait stay live distractors. This page verifies completion
// FROM THE SAVED BlocksProject itself — the exact five-block mission contract
// must match AND the studio's run+save progress marker must be present (no
// frontend boolean can substitute) — records the real project diff + run
// trace, and collects the 少一格/刚好/多一格 comparison evidence. The target
// run leaves the monkey's feet exactly on the entrance cell, but the curtain
// NEVER responds here (the bump chain is P5). Continue unlocks ONLY
// jtw-s1-c2-p5; kids without C2-P3 get the locked screen (server truth);
// refresh restores the saved comparison evidence.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import type { Block } from '../blocksModel';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  C2_P4_ARRIVAL_OPTIONS,
  C2_P4_ARRIVAL_QUESTION,
  C2_P4_ARRIVAL_RETRY_HINT,
  C2_P4_CONTINUE_LABEL,
  C2_P4_ENTRANCE_CELL,
  C2_P4_EXTRA_OPTIONS,
  C2_P4_EXTRA_QUESTION,
  C2_P4_EXTRA_RETRY_HINT,
  C2_P4_FEWER_OPTIONS,
  C2_P4_FEWER_QUESTION,
  C2_P4_FEWER_RETRY_HINT,
  C2_P4_RESOLVED_WORLD_CHANGE,
  C2_P4_START,
  C2_P4_STORY_AFTER,
  C2_P4_STORY_BEFORE,
  C2_P4_STORY_BRIDGE,
  C2_P4_TARGET_TRACE,
  c2p4RouteTrace,
  JTW_C2_BACKGROUND_ASSET,
  JTW_S1_STORY_LINE_ID,
  JTW_STONE_MONKEY_ASSET,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c2-p4';
const NEXT_PART_ID = 'jtw-s1-c2-p5';
const LESSON_ID = 'jtw-s1-c2-p4';
const RECENT_PROJECTS_TO_SCAN = 8;

interface RouteBuildStatus {
  projectId: string | null;
  /** The saved BlocksProject matches the exact five-block route contract. */
  programMatches: boolean;
  /** The studio recorded a finished run + save for this lesson. */
  runCompleted: boolean;
  /** The child-placed blocks between Start and End, from the SAVED project. */
  placedBlocks: Block[];
  /** The real run trace simulated from the SAVED blocks (one stop per move). */
  trace: string[];
}

/** Serialize a placed move block for the project-diff evidence (vs the bare
 *  Start/End starter every placed block IS the diff). */
function diffToken(block: Block): string {
  return `${block.op.replace('move_', '')}-${block.n ?? 0}`;
}

/** Find the kid's REAL saved route build for this lesson by reading the VFS. */
async function findRouteBuild(kidId: string): Promise<RouteBuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      const blocks =
        loaded.project.pages
          .find((page) => page.id === 'jtw-c2-p4-page')
          ?.characters.find((character) => character.id === 'stone-monkey')
          ?.scripts.find((script) => script.id === 'stone-monkey-route-to-curtain')?.blocks ?? [];
      const placedBlocks = blocks.filter((block) => block.op !== 'when_flag' && block.op !== 'end');
      return {
        projectId: meta.id,
        programMatches: storyMissionProgramMatches(loaded.project, LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
        placedBlocks,
        trace: c2p4RouteTrace(placedBlocks),
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return { projectId: null, programMatches: false, runCompleted: false, placedBlocks: [], trace: [] };
}

/** The waterfall Before stage: the monkey at 2/8 and the closed curtain; when
 *  resolved, the five footprints show stable along the wet-stone route
 *  (motion-safe) — the cave mouth stays a hidden marker (the bump chain is P5). */
function RouteStage({ resolved }: { resolved: boolean }) {
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
      data-testid="jtw-c2p4-stage"
    >
      <img
        src={JTW_C2_BACKGROUND_ASSET}
        alt="瀑布前的湿石路：石猴站在左边的起点，白色水帘仍然合着，等着一条五块的真实路线"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* 石猴在起点 2/8 — the real walk happens in the Studio run. */}
      <img
        src={JTW_STONE_MONKEY_ASSET}
        alt=""
        aria-hidden
        data-testid="jtw-c2p4-stone-monkey"
        data-gx={C2_P4_START.gx}
        data-gy={C2_P4_START.gy}
        className="absolute bottom-[10%] left-[12%] w-[13%]"
      />
      {/* 水帘仍关闭、洞口保持隐藏 — nothing responds until P5's bump chain. */}
      <span data-testid="jtw-c2p4-cave-mouth" data-visible="false" hidden aria-hidden />
      {/* 五个脚印：resolved 后稳定显示（一步一个，不闪不跳）。 */}
      <ol
        className="absolute inset-x-[8%] bottom-[4%] flex justify-between"
        data-testid="jtw-c2p4-footprints"
      >
        {C2_P4_TARGET_TRACE.map((cell, index) => (
          <li
            key={cell}
            data-stop={cell}
            data-lit={resolved}
            className={clsx(
              'rounded-full border px-3 py-1 text-[12px] font-bold text-ink',
              resolved ? 'border-brand-mint/70 bg-wash-mint' : 'border-hairline bg-canvas-pure/90',
            )}
          >
            👣 第{index + 1}步 · {cell}
            {cell === C2_P4_ENTRANCE_CELL ? '（入口）' : ''}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function JourneyWestC2Part4Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c2-p4-build', kidId],
    queryFn: () => findRouteBuild(kidId!),
    enabled: !!kidId,
  });

  const [fewer, setFewer] = useState<string | null>(null);
  const [fewerMissed, setFewerMissed] = useState(false);
  const [extra, setExtra] = useState<string | null>(null);
  const [extraMissed, setExtraMissed] = useState(false);
  const [arrival, setArrival] = useState<string | null>(null);
  const [arrivalMissed, setArrivalMissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved comparison evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setFewer(evidence.selections?.fewer_stop?.[0] ?? null);
    setExtra(evidence.selections?.extra_stop?.[0] ?? null);
    setArrival(evidence.selections?.arrival_claim?.[0] ?? null);
    setRestored(true);
  }

  const fewerDone = C2_P4_FEWER_OPTIONS.find((o) => o.id === fewer)?.correct === true;
  const extraDone = C2_P4_EXTRA_OPTIONS.find((o) => o.id === extra)?.correct === true;
  const arrivalDone = C2_P4_ARRIVAL_OPTIONS.find((o) => o.id === arrival)?.correct === true;
  const completed = Boolean(savedEntry);
  // Server/VFS truth only: the SAVED program must match the exact five-block
  // contract AND the studio must have recorded a real run+save.
  const buildDone = Boolean(build.data?.programMatches && build.data.runCompleted);
  const resolved = buildDone && fewerDone && extraDone && arrivalDone;

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: '西游记 · 刚好到达，不多也不少',
        template: 'blocks_jtw_c2_p4',
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
          // The real project diff vs the bare Start/End starter — every placed
          // block, serialized from the SAVED BlocksProject.
          route_diff: (build.data?.placedBlocks ?? []).map(diffToken),
          // The full run trace simulated from the SAVED blocks (five stops).
          run_trace: build.data?.trace ?? [],
          fewer_stop: fewer ? [fewer] : [],
          extra_stop: extra ? [extra] : [],
          arrival_claim: arrival ? [arrival] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
        },
        prediction: fewer ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">湿石路正等着真实的脚印…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p4-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          先在 Part 3 把三段湿石路的停点摆清楚，再来搭真实的路线。
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p4">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二章 水帘洞的约定 · Part 4 · Build 1
        </p>
        <h1 className="text-[28px] font-black text-ink">刚好到达，不多也不少</h1>
      </header>

      {/* ── story_before：教学脚本 Story Screen 4 全文 + 因果桥 ─────────── */}
      <section className="space-y-4" data-testid="jtw-c2p4-story">
        {C2_P4_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C2_P4_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── Before 舞台：石猴在 2/8，水帘仍关闭；resolved 后五个脚印稳定显示 ── */}
      <RouteStage resolved={resolved || completed} />

      {/* ── 真实搭建：进入 Blocks Studio ────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c2p4-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">去真正的工作区搭五块路线</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          工作区里只有 Start 和 End——五块一步移动都由你放，Left、Down 和 Wait
          是能运行的干扰块。先逐块预测停点，再按 Go 真实运行并保存；把三块合并成右2
          也不能通过，没有任何按钮会替你完成。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c2p4-open-studio"
            disabled={creating}
            onClick={() => void openStudio()}
          >
            {creating
              ? '正在准备湿石路…'
              : buildDone
                ? '再看看我的路线'
                : build.data?.projectId
                  ? '继续搭建 →'
                  : '开始搭建 →'}
          </button>
          {buildDone && (
            <span
              className="text-[13px] font-bold text-brand-mint"
              data-testid="jtw-c2p4-build-done"
            >
              ✓ 五块路线已搭好并真实运行过
            </span>
          )}
          {!buildDone && build.data?.projectId && (
            <span className="text-[13px] font-semibold text-ink-soft">
              路线还没有精确完成，或还没运行保存。
            </span>
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            没能打开工作区，请再试一次。
          </p>
        )}
      </section>

      {/* ── 从保存的作品读回：五块顺序 + 完整 run 轨迹 ─────────────────── */}
      {buildDone && build.data && (
        <section data-testid="jtw-c2p4-route-readback">
          <h2 className="mb-2 text-[15px] font-bold text-ink">
            你保存的路线（从作品里读回来的，不是页面猜的）：
          </h2>
          <div className="flex flex-wrap items-center gap-1">
            <BlockChip block={{ op: 'when_flag' }} inChain isLast={false} />
            {build.data.placedBlocks.map((block, index) => (
              <BlockChip key={`${block.op}-${index}`} block={block} inChain isLast={false} />
            ))}
            <BlockChip block={{ op: 'end' }} inChain isLast />
          </div>
          <ol className="mt-3 flex flex-wrap gap-2" data-testid="jtw-c2p4-run-trace">
            {build.data.trace.map((cell, index) => (
              <li
                key={cell}
                data-stop={cell}
                className="rounded-2xl border border-hairline bg-canvas-pure px-4 py-2 text-[14px] font-semibold text-ink"
              >
                <span className="mr-1 text-[12px] font-black text-ink-soft">第{index + 1}步</span>
                {cell}
                {cell === C2_P4_ENTRANCE_CELL ? ' · 水帘入口' : ''}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── 少一格 / 多一格 / 到达≠发现 比较证据 ────────────────────────── */}
      {buildDone && (
        <section
          className="space-y-5 rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
          data-testid="jtw-c2p4-compare"
        >
          <div data-testid="jtw-c2p4-fewer">
            <h3 className="mb-2 text-[14px] font-bold text-ink">{C2_P4_FEWER_QUESTION}</h3>
            <div className="flex flex-col gap-2">
              {C2_P4_FEWER_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={fewer === option.id}
                  onPick={() => {
                    setFewer(option.id);
                    setFewerMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {fewerMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C2_P4_FEWER_RETRY_HINT}
              </p>
            )}
          </div>
          <div data-testid="jtw-c2p4-extra">
            <h3 className="mb-2 text-[14px] font-bold text-ink">{C2_P4_EXTRA_QUESTION}</h3>
            <div className="flex flex-col gap-2">
              {C2_P4_EXTRA_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={extra === option.id}
                  onPick={() => {
                    setExtra(option.id);
                    setExtraMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {extraMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C2_P4_EXTRA_RETRY_HINT}
              </p>
            )}
          </div>
          <div data-testid="jtw-c2p4-arrival">
            <h3 className="mb-2 text-[14px] font-bold text-ink">{C2_P4_ARRIVAL_QUESTION}</h3>
            <div className="flex flex-col gap-2">
              {C2_P4_ARRIVAL_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={arrival === option.id}
                  onPick={() => {
                    setArrival(option.id);
                    setArrivalMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {arrivalMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C2_P4_ARRIVAL_RETRY_HINT}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p4-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C2_P4_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P4_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p4-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C2_P4_CONTINUE_LABEL}
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
