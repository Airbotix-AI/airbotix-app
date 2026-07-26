// Journey to the West · C2-P7 "把发现变成大家的路" — chapter two's Personal Ship
// (scene-specs JTW-S1-C2-P7). The child designs the entry route in the REAL
// Blocks Studio: which bank the friends come from, the exact chain that bank
// needs, how long the door is held open and which preset evidence line the cave
// says. This page never invents any of that — it LOADS the saved project back
// from the server (that load IS the "关闭重开"), shows the design read out of
// the saved JSON, takes the partner's prediction, and then RERUNS the saved
// page through the real BlocksRunner so "结果一致" is measured rather than
// claimed. Completion needs the saved project, the studio's run marker, the
// prediction, the wait reason and a matching rerun; continue unlocks ONLY
// jtw-s1-c2-p8 and no chapter completes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { GRID_H, GRID_W, type Page } from '../blocksModel';
import { BlocksRunner, startState, type SpriteState } from '../interpreter';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  JTW_C2_P7_CAVE_ID,
  JTW_C2_P7_CURTAIN_ID,
  JTW_C2_P7_MONKEY_ID,
} from '../jtwPersonalEntry';
import { JTW_MONKEY_FRIENDS_SPRITE } from '../jtwC2Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C2_P7_CONTINUE_LABEL,
  C2_P7_EMPTY_BUILD,
  C2_P7_LESSON_ID,
  C2_P7_MOTIVE,
  C2_P7_PREDICTION_OPTIONS,
  C2_P7_PREDICTION_QUESTION,
  C2_P7_PREDICTION_RETRY_HINT,
  C2_P7_PROJECT_TITLE,
  C2_P7_RESOLVED_WORLD_CHANGE,
  C2_P7_STORY_AFTER,
  C2_P7_STORY_BEFORE,
  C2_P7_STORY_BRIDGE,
  C2_P7_TEMPLATE,
  C2_P7_WAIT_OPTIONS,
  C2_P7_WAIT_QUESTION,
  C2_P7_WAIT_RETRY_HINT,
  c2p7BuildFrom,
  c2p7RerunMatches,
  c2p7RerunResult,
  type C2P7EntryBuild,
  type C2P7RerunResult,
} from './journeyWestC2Part7Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c2-p7';
const NEXT_PART_ID = 'jtw-s1-c2-p8';
const RECENT_PROJECTS_TO_SCAN = 8;
const BASE_ASSET = '/story-blocks/journey-to-the-west/backgrounds/s1/c2/actor-free-v01.png';

/** Reopen the kid's SAVED Personal Ship straight from the server (VFS truth). */
async function findEntryBuild(kidId: string): Promise<C2P7EntryBuild> {
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

/**
 * The reopen-and-rerun: the SAVED page (never a page-built copy of it) is
 * handed to the real BlocksRunner, so the curtain hiding, the cave showing and
 * the evidence line are things the interpreter did, not things this page drew.
 */
function JourneyWestEntryRerun({
  page,
  onResult,
  sleep,
}: {
  page: Page;
  onResult: (result: C2P7RerunResult) => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [sprites, setSprites] = useState<Map<string, SpriteState>>(
    () => new Map(page.characters.map((character) => [character.id, startState(character)])),
  );
  const [saidLine, setSaidLine] = useState<string | null>(null);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSaidLine(null);
    setSprites(new Map(page.characters.map((character) => [character.id, startState(character)])));
    let heardLine: string | null = null;
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (charId, state) =>
          setSprites((previous) => new Map(previous).set(charId, state)),
        onSay: (charId, text) => {
          if (charId !== JTW_C2_P7_CAVE_ID || text === null) return;
          heardLine = text;
          setSaidLine(text);
        },
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: () => undefined,
      },
      sleep,
    );
    runnerRef.current = runner;
    await runner.runFlag();
    setRunning(false);
    setRan(true);
    onResult(c2p7RerunResult((charId) => runner.state(charId), heardLine));
  }, [onResult, page, running, sleep]);

  const monkey = page.characters.find((character) => character.id === JTW_C2_P7_MONKEY_ID);
  const monkeyState = sprites.get(JTW_C2_P7_MONKEY_ID);
  const curtainVisible = sprites.get(JTW_C2_P7_CURTAIN_ID)?.visible !== false;
  const caveVisible = sprites.get(JTW_C2_P7_CAVE_ID)?.visible === true;
  const curtain = page.characters.find((character) => character.id === JTW_C2_P7_CURTAIN_ID);
  const cave = page.characters.find((character) => character.id === JTW_C2_P7_CAVE_ID);

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c2p7-stage"
        data-world-state={caveVisible ? 'cave-revealed' : 'curtain-closed'}
      >
        <img
          src={BASE_ASSET}
          alt="水帘前的湿石路：左岸的石阶和右岸的花丛石滩都通向同一个入口"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {curtain && curtainVisible && (
          <img
            src={curtain.asset}
            alt="合着的水帘"
            data-testid="jtw-c2p7-curtain"
            data-visible="true"
            className="absolute right-[5%] top-[3%] h-[68%] w-[49%] object-contain"
          />
        )}
        {cave && caveVisible && (
          <img
            src={cave.asset}
            alt="暖光洞口，里面有石桥、干地、石座和清水"
            data-testid="jtw-c2p7-cave"
            data-visible="true"
            className="absolute right-[12%] top-[12%] h-[61%] w-[38%] object-contain"
          />
        )}
        {monkey && monkeyState && (
          <img
            src={monkey.asset}
            alt="Stone Monkey"
            data-testid="jtw-c2p7-stone-monkey"
            data-gx={monkeyState.gx}
            data-gy={monkeyState.gy}
            className="absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200"
            style={{
              left: `${(monkeyState.gx / (GRID_W - 1)) * 100}%`,
              top: `${(monkeyState.gy / (GRID_H - 1)) * 100}%`,
            }}
          />
        )}
      </div>

      {saidLine && (
        <p className="text-[14px] font-semibold text-ink" data-testid="jtw-c2p7-said-line">
          洞口说：「{saidLine}」
        </p>
      )}

      <button
        type="button"
        className="btn-pill-primary"
        disabled={running}
        onClick={() => void run()}
        data-testid="jtw-c2p7-rerun"
      >
        {running ? '重跑中…' : ran ? '▶ 再跑一次' : '▶ 重开以后再跑一次'}
      </button>
    </div>
  );
}

export function JourneyWestC2Part7Page({
  previewSleep,
}: {
  /** Injectable rerun timing for tests. */
  previewSleep?: (ms: number) => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c2-p7-build', kidId],
    queryFn: () => findEntryBuild(kidId!),
    enabled: !!kidId,
  });

  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [waitReason, setWaitReason] = useState<string | null>(null);
  const [waitMissed, setWaitMissed] = useState(false);
  const [rerun, setRerun] = useState<C2P7RerunResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved explanation exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setPrediction(evidence.prediction ?? null);
    setWaitReason(evidence.selections?.wait_reason?.[0] ?? null);
    setRestored(true);
  }

  const design = build.data?.design ?? null;
  // VFS truth only: the SAVED page must satisfy the personal-entry contract AND
  // the studio must have recorded a verified run for this lesson.
  const buildDone = Boolean(design && build.data?.runCompleted);
  const predictionDone =
    C2_P7_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
  const waitDone = C2_P7_WAIT_OPTIONS.find((option) => option.id === waitReason)?.correct === true;
  const rerunOk = c2p7RerunMatches(design, rerun);
  const completed = Boolean(savedEntry);
  const resolved = buildDone && predictionDone && rerunOk && waitDone;

  const routeChips = useMemo(() => design?.side.route ?? [], [design]);

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: C2_P7_PROJECT_TITLE,
        template: C2_P7_TEMPLATE,
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
          entry_side: design ? [design.side.id] : [],
          route_ops: design ? design.side.route.map((block) => `${block.op}:${block.n ?? 0}`) : [],
          route_stops: design ? [...design.side.stops] : [],
          wait_beats: design ? [String(design.waitN)] : [],
          evidence_line: design ? [design.evidenceLine] : [],
          wait_reason: waitReason ? [waitReason] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          saved_version:
            build.data?.savedVersion !== null && build.data?.savedVersion !== undefined
              ? [String(build.data.savedVersion)]
              : [],
          reopen_rerun: rerun ? [rerun.endCell, 'curtain-hidden', 'cave-shown'] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">伙伴们正在水边等你的路线…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p7-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          先在 Part 6 把回程修好，再来把这条路线变成大家的路。
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p7">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二章 水帘洞的约定 · Part 7 · Personal Ship
        </p>
        <h1 className="text-[28px] font-black text-ink">把发现变成大家的路</h1>
      </header>

      {/* ── story_before：教学脚本 C2 Part 7 全文 + 动机 + 因果桥 ─────────── */}
      <section className="space-y-4" data-testid="jtw-c2p7-story">
        {C2_P7_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <p>
            <span className="font-bold">石猴为什么要设计路线：</span>
            {C2_P7_MOTIVE}
          </p>
          <p className="mt-2">
            <span className="font-bold">故事—程序桥：</span>
            {C2_P7_STORY_BRIDGE}
          </p>
        </aside>
      </section>

      {/* ── 真实设计：进入 Blocks Studio ─────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c2p7-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">去真正的工作区设计你的进入路线</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          留在左岸的 2/8，或者把石猴拖到右岸的 12/9——两岸的路线不一样，块数也不一样。把这一岸需要的一步移动块按顺序接上，末尾放一块 Wait
          1 或 Wait 2，再挑一句洞口的发现对白。水帘和洞口的 On Bump 轨一块都不能删。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c2p7-open-studio"
            disabled={creating}
            onClick={() => void openStudio()}
          >
            {creating
              ? '正在打开你的舞台…'
              : buildDone
                ? '再看看我的路线'
                : build.data?.projectId
                  ? '继续设计 →'
                  : '开始设计 →'}
          </button>
          {buildDone && (
            <span
              className="text-[13px] font-bold text-brand-mint"
              data-testid="jtw-c2p7-build-done"
            >
              ✓ 路线已保存，并在工作区真实运行过
            </span>
          )}
          {!buildDone && build.data?.projectId && (
            <span className="text-[13px] font-semibold text-ink-soft">
              还不成立：检查起点在不在某一岸、这一岸的每一步、末尾的 Wait，以及两条 On Bump 轨。
            </span>
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            没能打开工作区，请再试一次。
          </p>
        )}
      </section>

      {buildDone && design && build.data?.page && (
        <>
          {/* ── 从保存的作品读回：起点、路线、等待、对白、版本号 ─────────── */}
          <section className="space-y-3" data-testid="jtw-c2p7-design">
            <h2 className="text-[15px] font-bold text-ink">
              你保存的设计（从作品里读回来的，不是页面猜的）：
            </h2>
            <p className="text-[14px] font-semibold text-ink" data-testid="jtw-c2p7-side">
              起点：{design.side.label}
            </p>
            <div className="flex flex-wrap items-center gap-1" data-testid="jtw-c2p7-route">
              {routeChips.map((block, index) => (
                <BlockChip
                  key={`${block.op}-${index}`}
                  block={block}
                  inChain
                  isLast={index === routeChips.length - 1}
                />
              ))}
            </div>
            <ol className="flex flex-wrap gap-2" data-testid="jtw-c2p7-stops">
              {design.side.stops.map((cell, index) => (
                <li
                  key={cell}
                  data-stop={cell}
                  data-knock={cell === design.side.knockCell}
                  className={clsx(
                    'rounded-2xl border px-4 py-2 text-[14px] font-semibold text-ink',
                    cell === design.side.knockCell
                      ? 'border-brand-mint/60 bg-wash-mint'
                      : 'border-hairline bg-canvas-pure',
                  )}
                >
                  <span className="mr-1 text-[12px] font-black text-ink-soft">
                    第{index + 1}步
                  </span>
                  {cell}
                  {cell === design.side.knockCell ? ' · 刚好碰到水帘' : ''}
                </li>
              ))}
            </ol>
            <p className="text-[13px] font-semibold text-ink-soft">
              <span data-testid="jtw-c2p7-wait">等待 {design.waitN} 拍</span> ·{' '}
              <span data-testid="jtw-c2p7-line">洞口对白「{design.evidenceLine}」</span> ·{' '}
              <span data-testid="jtw-c2p7-saved-version">
                保存版本 #{build.data.savedVersion}
              </span>
            </p>
          </section>

          {/* ── 预测：同伴只看起点和积木 ─────────────────────────────── */}
          <section data-testid="jtw-c2p7-prediction">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P7_PREDICTION_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C2_P7_PREDICTION_OPTIONS.map((option) => (
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
                {C2_P7_PREDICTION_RETRY_HINT}
              </p>
            )}
          </section>

          {/* ── 关闭重开以后再跑一次：真实 Runner 跑保存下来的那一页 ─────── */}
          {predictionDone && (
            <section className="space-y-4" data-testid="jtw-c2p7-rerun-section">
              <h2 className="text-[15px] font-bold text-ink">
                这一页是刚从服务器重新打开的作品。再跑一次，看结果是不是一样：
              </h2>
              <JourneyWestEntryRerun
                page={build.data.page}
                onResult={setRerun}
                sleep={previewSleep}
              />
              {rerun && (
                <p
                  className={clsx(
                    'text-[13px] font-semibold',
                    rerunOk ? 'text-brand-mint' : 'text-brand-coral',
                  )}
                  data-testid="jtw-c2p7-rerun-result"
                  data-consistent={rerunOk}
                >
                  {rerunOk
                    ? `重开后重跑一致：石猴停在 ${rerun.endCell}，水帘隐藏、洞口显现，洞口说出同一句发现。`
                    : '这一次的结果和保存的设计对不上——回工作区检查路线，再重跑一次。'}
                </p>
              )}
            </section>
          )}

          {/* ── 等待证据 ─────────────────────────────────────────── */}
          {rerunOk && (
            <section data-testid="jtw-c2p7-wait-reason">
              <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P7_WAIT_QUESTION}</h2>
              <div className="flex flex-col gap-2">
                {C2_P7_WAIT_OPTIONS.map((option) => (
                  <Choice
                    key={option.id}
                    option={option}
                    active={waitReason === option.id}
                    onPick={() => {
                      setWaitReason(option.id);
                      setWaitMissed(!option.correct);
                    }}
                  />
                ))}
              </div>
              {waitMissed && (
                <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                  {C2_P7_WAIT_RETRY_HINT}
                </p>
              )}
            </section>
          )}
        </>
      )}

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p7-resolved"
        >
          <img
            src={JTW_MONKEY_FRIENDS_SPRITE}
            alt="三只群猴跟着石猴的路线走到洞口"
            data-testid="jtw-c2p7-friends"
            className="mb-3 w-full max-w-sm"
          />
          <p className="text-[15px] leading-7 text-ink">{C2_P7_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P7_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p7-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C2_P7_CONTINUE_LABEL}
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
