// Journey to the West · C2-P6 "回去的第一处偏离" — chapter two's Fix part
// (scene-specs JTW-S1-C2-P6). The child states the expected three return stops,
// RUNS the shipped bug (Left 2 → Left 2 → Down 1) through the REAL BlocksRunner
// on this page — the second segment visibly leaves the wet-stone route at 2-7
// and the Down lands on the wrong low stone — marks the first deviation,
// predicts "down or left first", then repairs the order in the actual Blocks
// Studio (template `blocks_jtw_c2_p6` ships the bug; the mission only completes
// after a bug run AND a repaired rerun). Completion is verified FROM THE SAVED
// BlocksProject + the studio's run marker; the real project diff and both run
// traces are stored as evidence. Continue unlocks ONLY jtw-s1-c2-p7.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { GRID_H, GRID_W } from '../blocksModel';
import { BlocksRunner, pageById, startState, type SpriteState } from '../interpreter';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { jtwWetStoneTrace } from './journeyWestC2Route';
import {
  C2_P6_ACTUAL_OPTIONS,
  C2_P6_ACTUAL_QUESTION,
  C2_P6_BUG_PROJECT,
  C2_P6_BUG_TRACE,
  C2_P6_CONTINUE_LABEL,
  C2_P6_DEVIATION_OPTIONS,
  C2_P6_DEVIATION_QUESTION,
  C2_P6_DEVIATION_RETRY_HINT,
  C2_P6_EXPECT_OPTIONS,
  C2_P6_EXPECT_QUESTION,
  C2_P6_FIX_OPTIONS,
  C2_P6_FIX_QUESTION,
  C2_P6_LESSON_ID,
  C2_P6_MOTIVE,
  C2_P6_PREDICTION_OPTIONS,
  C2_P6_PREDICTION_QUESTION,
  C2_P6_PREDICTION_RETRY_HINT,
  C2_P6_PROJECT_TITLE,
  C2_P6_RERUN_OPTIONS,
  C2_P6_RERUN_QUESTION,
  C2_P6_RERUN_RETRY_HINT,
  C2_P6_RESOLVED_WORLD_CHANGE,
  C2_P6_SKIPPED_STONE,
  C2_P6_START,
  C2_P6_STORY_AFTER,
  C2_P6_STORY_BEFORE,
  C2_P6_STORY_BRIDGE,
  C2_P6_TARGET_TRACE,
  C2_P6_TEMPLATE,
  c2p6ProjectDiff,
  c2p6ReturnScript,
} from './journeyWestC2Part6Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c2-p6';
const NEXT_PART_ID = 'jtw-s1-c2-p7';
const RECENT_PROJECTS_TO_SCAN = 8;
const BASE_ASSET = '/story-blocks/journey-to-the-west/backgrounds/s1/c2/actor-free-v01.png';
const CAVE_ASSET = '/story-blocks/journey-to-the-west/characters/cave-entrance/revealed-v01.png';

interface ReturnBuildStatus {
  projectId: string | null;
  /** The SAVED BlocksProject matches the exact repaired return order. */
  programMatches: boolean;
  /** The studio recorded a bug run + repaired rerun + save for this lesson. */
  runCompleted: boolean;
  /** REAL project diff: which move blocks moved, shipped bug → saved. */
  projectDiff: string[];
  /** The run trace simulated from the SAVED blocks (one stop per move). */
  trace: string[];
}

const EMPTY_BUILD: ReturnBuildStatus = {
  projectId: null,
  programMatches: false,
  runCompleted: false,
  projectDiff: [],
  trace: [],
};

/** Find the kid's REAL saved return project for this lesson by reading the VFS. */
async function findReturnBuild(kidId: string): Promise<ReturnBuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== C2_P6_LESSON_ID) continue;
      const { middle } = c2p6ReturnScript(loaded.project);
      return {
        projectId: meta.id,
        programMatches: storyMissionProgramMatches(loaded.project, C2_P6_LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[C2_P6_LESSON_ID]),
        projectDiff: c2p6ProjectDiff(middle),
        trace: jtwWetStoneTrace(middle, C2_P6_START),
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return EMPTY_BUILD;
}

/** One footprint row — the same shape for the bug walk and the repaired walk. */
function TraceList({ trace, testId }: { trace: readonly string[]; testId: string }) {
  return (
    <ol className="flex flex-wrap gap-2" data-testid={testId}>
      {trace.map((cell, index) => (
        <li
          key={`${cell}-${index}`}
          data-stop={cell}
          data-off-route={cell === '2-7'}
          className={clsx(
            'rounded-2xl border px-4 py-2 text-[14px] font-semibold text-ink',
            cell === '2-7'
              ? 'border-brand-coral/60 bg-wash-sunshine'
              : 'border-hairline bg-canvas-pure',
          )}
        >
          <span className="mr-1 text-[12px] font-black text-ink-soft">No.{index + 1}step</span>
          {cell}
          {cell === C2_P6_SKIPPED_STONE ? ' · Low stone' : ''}
          {cell === '2-7' ? ' · The water outside the wet stone road' : ''}
        </li>
      ))}
    </ol>
  );
}

/** Read-only bug reproduction: the REAL BlocksRunner walks the shipped
 *  Left 2 → Left 2 → Down 1 chain, so the child SEES the monkey leave the
 *  wet-stone route instead of being told about it. */
function JourneyWestReturnBugPreview({
  onRunDone,
  sleep,
}: {
  onRunDone?: () => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const page = useMemo(() => pageById(C2_P6_BUG_PROJECT, 'jtw-c2-p6-bug-page'), []);
  const character = page.characters[0];
  const blocks = character.scripts[0].blocks;
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [litIndex, setLitIndex] = useState(-1);
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character));
  const [leftRoute, setLeftRoute] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLeftRoute(false);
    setSprite(startState(character));
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_charId, state) => {
          setSprite(state);
          // The bug made observable: the second segment stops above the low
          // stones, on open water — no foothold a friend could follow.
          if (state.gx === 2 && state.gy === 7) setLeftRoute(true);
        },
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_charId, _scriptId, blockIndex) => setLitIndex(blockIndex),
      },
      sleep,
    );
    runnerRef.current = runner;
    await runner.runFlag();
    setLitIndex(-1);
    setRunning(false);
    setRan(true);
    onRunDone?.();
  }, [character, page, running, sleep, onRunDone]);

  const left = `${(sprite.gx / (GRID_W - 1)) * 100}%`;
  const top = `${(sprite.gy / (GRID_H - 1)) * 100}%`;

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c2p6-stage"
        data-left-route={leftRoute}
      >
        <img
          src={BASE_ASSET}
          alt="The cliff face after the water curtain separates: The wet stone road leads back from the entrance of the cave to the starting point where the friends are waiting."
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* P5 已经打开的洞口——本 Part 只是布景，没有任何碰撞回应。 */}
        <img
          src={CAVE_ASSET}
          alt=""
          aria-hidden
          data-testid="jtw-c2p6-cave"
          data-visible="true"
          className="absolute right-[12%] top-[12%] h-[61%] w-[38%] object-contain"
        />
        <img
          src={character.asset}
          alt="Stone Monkey"
          data-testid="jtw-c2p6-stone-monkey"
          data-gx={sprite.gx}
          data-gy={sprite.gy}
          className="absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200"
          style={{ left, top }}
        />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-soft">
          Bug recurrence track (read only) - The building blocks and numbers are correct, let’s take
          a complete look at where it takes the stone monkey:
        </p>
        <div className="flex flex-wrap items-center gap-1" data-testid="jtw-c2p6-bug-chain">
          {blocks.map((block, index) => (
            <BlockChip
              key={`${block.op}-${index}`}
              block={block}
              inChain
              isLast={index === blocks.length - 1}
              lit={index === litIndex}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn-pill-primary"
        disabled={running}
        onClick={() => void run()}
        data-testid="jtw-c2p6-run"
      >
        {running ? 'Running…' : ran ? '▶ Repeat it again' : '▶ run this bug'}
      </button>
    </div>
  );
}

export function JourneyWestC2Part6Page({
  previewSleep,
}: {
  /** Injectable preview timing for tests. */
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
    queryKey: ['jtw-c2-p6-build', kidId],
    queryFn: () => findReturnBuild(kidId!),
    enabled: !!kidId,
  });

  const [expectation, setExpectation] = useState<string | null>(null);
  const [bugRan, setBugRan] = useState(false);
  const [actual, setActual] = useState<string | null>(null);
  const [deviation, setDeviation] = useState<string | null>(null);
  const [deviationMissed, setDeviationMissed] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [fixMove, setFixMove] = useState<string | null>(null);
  const [rerun, setRerun] = useState<string | null>(null);
  const [rerunMissed, setRerunMissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved five-segment explanation exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setExpectation(evidence.selections?.expectation?.[0] ?? null);
    setActual(evidence.selections?.actual?.[0] ?? null);
    setDeviation(evidence.selections?.first_deviation?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setFixMove(evidence.selections?.fix_move?.[0] ?? null);
    setRerun(evidence.selections?.rerun_result?.[0] ?? null);
    setBugRan(true);
    setRestored(true);
  }

  const picked = (options: typeof C2_P6_EXPECT_OPTIONS, id: string | null) =>
    options.find((option) => option.id === id)?.correct === true;
  const expectationDone = picked(C2_P6_EXPECT_OPTIONS, expectation);
  const actualDone = picked(C2_P6_ACTUAL_OPTIONS, actual);
  const deviationDone = picked(C2_P6_DEVIATION_OPTIONS, deviation);
  const predictionDone = picked(C2_P6_PREDICTION_OPTIONS, prediction);
  const fixDone = picked(C2_P6_FIX_OPTIONS, fixMove);
  const rerunDone = picked(C2_P6_RERUN_OPTIONS, rerun);
  const completed = Boolean(savedEntry);
  // VFS truth only: the SAVED program must be the exact repaired order AND the
  // studio must have recorded the bug run + repaired rerun.
  const buildDone = Boolean(build.data?.programMatches && build.data.runCompleted);
  const resolved =
    expectationDone &&
    bugRan &&
    actualDone &&
    deviationDone &&
    predictionDone &&
    buildDone &&
    fixDone &&
    rerunDone;

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: C2_P6_PROJECT_TITLE,
        template: C2_P6_TEMPLATE,
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
          expectation: expectation ? [expectation] : [],
          actual: actual ? [actual] : [],
          first_deviation: deviation ? [deviation] : [],
          fix_move: fixMove ? [fixMove] : [],
          rerun_result: rerun ? [rerun] : [],
          bug_trace: [...C2_P6_BUG_TRACE],
          fixed_trace: build.data?.trace ?? [],
          project_diff: build.data?.projectDiff ?? [],
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
    return (
      <p className="p-8 text-center text-ink-soft">
        The footsteps of the return journey are being repeated...
      </p>
    );
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p6-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          First let the water curtain and the hole respond to the collision in Part 5, and then
          repair the route back.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p6">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 2 The Agreement of Water Curtain Cave · Part 6 · Debug
        </p>
        <h1 className="text-[28px] font-black text-ink">The first deviation on the way back</h1>
      </header>

      {/* ── story_before：教学脚本 C2 Part 6 全文 + 动机 + 因果桥 ─────────── */}
      <section className="space-y-4" data-testid="jtw-c2p6-story">
        {C2_P6_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <p>
            <span className="font-bold">
              Why does Stone Monkey need to repair the return journey:
            </span>
            {C2_P6_MOTIVE}
          </p>
          <p className="mt-2">
            <span className="font-bold">Story—Program Bridge:</span>
            {C2_P6_STORY_BRIDGE}
          </p>
        </aside>
      </section>

      {/* ── 五段解释 1：预期 ────────────────────────────────────────── */}
      <section data-testid="jtw-c2p6-expectation">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P6_EXPECT_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C2_P6_EXPECT_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={expectation === option.id}
              onPick={() => setExpectation(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── bug 复现：真实 Runner 走乱序的回程 ─────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[15px] font-bold text-ink">Run this bug (read-only reproduction)</h2>
        <JourneyWestReturnBugPreview onRunDone={() => setBugRan(true)} sleep={previewSleep} />
      </section>

      {bugRan && (
        <>
          {/* ── 两串脚印并列比较 ──────────────────────────────────── */}
          <section className="space-y-3" data-testid="jtw-c2p6-compare-traces">
            <div>
              <h3 className="mb-2 text-[14px] font-bold text-ink">
                The three stopping points bug visited this time
              </h3>
              <TraceList trace={C2_P6_BUG_TRACE} testId="jtw-c2p6-bug-trace" />
            </div>
            <div>
              <h3 className="mb-2 text-[14px] font-bold text-ink">
                Return to the three stopping points on the original route as agreed
              </h3>
              <TraceList trace={C2_P6_TARGET_TRACE} testId="jtw-c2p6-target-trace" />
            </div>
          </section>

          {/* ── 五段解释 2：实际 ──────────────────────────────────── */}
          <section data-testid="jtw-c2p6-actual">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P6_ACTUAL_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C2_P6_ACTUAL_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={actual === option.id}
                  onPick={() => setActual(option.id)}
                />
              ))}
            </div>
          </section>

          {/* ── 五段解释 3：第一次偏离（轨迹点选） ───────────────────── */}
          <section data-testid="jtw-c2p6-deviation">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P6_DEVIATION_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C2_P6_DEVIATION_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={deviation === option.id}
                  onPick={() => {
                    setDeviation(option.id);
                    setDeviationMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {deviationMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C2_P6_DEVIATION_RETRY_HINT}
              </p>
            )}
          </section>

          {/* ── 预测：第二段先向下还是继续向左 ────────────────────────── */}
          <section data-testid="jtw-c2p6-prediction">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P6_PREDICTION_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C2_P6_PREDICTION_OPTIONS.map((option) => (
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
                {C2_P6_PREDICTION_RETRY_HINT}
              </p>
            )}
          </section>

          {/* ── 真实修复：进入 Blocks Studio ────────────────────────── */}
          <section
            className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
            data-testid="jtw-c2p6-build"
            data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
          >
            <h2 className="text-[15px] font-bold text-ink">
              Go to the real workspace and fix the return sequence
            </h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              The program in the workspace has this bug. Press Go to run it first, and then just put
              the second Left 2 and Down 1 Swap positions and rerun to save. You are not allowed to
              delete and re-set, change the numbers, add Set Speed or use Go Home Go around - the
              five-block route on the way out is even more untouchable.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="btn-pill-primary"
                data-testid="jtw-c2p6-open-studio"
                disabled={creating}
                onClick={() => void openStudio()}
              >
                {creating
                  ? 'The stage for the return journey is opening...'
                  : buildDone
                    ? 'Take another look at my fix'
                    : build.data?.projectId
                      ? 'Continue to repair →'
                      : 'Start repair →'}
              </button>
              {buildDone && (
                <span
                  className="text-[13px] font-bold text-brand-mint"
                  data-testid="jtw-c2p6-build-done"
                >
                  ✓ The bug has been reproduced, the return sequence has been fixed and the run has
                  been rerun.
                </span>
              )}
              {!buildDone && build.data?.projectId && (
                <span className="text-[13px] font-semibold text-ink-soft">
                  The order has not been swapped to the target return, or the bug has not been run
                  first and then rerun to save.
                </span>
              )}
            </div>
            {buildDone && build.data && build.data.projectDiff.length > 0 && (
              <p
                className="mt-2 text-[12px] font-semibold text-ink-soft"
                data-testid="jtw-c2p6-diff"
              >
                Real modification record:{build.data.projectDiff.join(' · ')}
              </p>
            )}
            {createError && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
                Failed to open workspace, please try again.
              </p>
            )}
          </section>

          {/* ── 修好以后：从保存的作品读回真实脚印 ─────────────────────── */}
          {buildDone && build.data && (
            <section data-testid="jtw-c2p6-fixed-readback">
              <h2 className="mb-2 text-[15px] font-bold text-ink">
                The return journey you saved (read from the work, not guessed by the page):
              </h2>
              <TraceList trace={build.data.trace} testId="jtw-c2p6-fixed-trace" />
            </section>
          )}

          {/* ── 五段解释 4 + 5：最小 diff 与重跑结果 ─────────────────── */}
          {buildDone && (
            <>
              <section data-testid="jtw-c2p6-fix">
                <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P6_FIX_QUESTION}</h2>
                <div className="flex flex-col gap-2">
                  {C2_P6_FIX_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={fixMove === option.id}
                      onPick={() => setFixMove(option.id)}
                    />
                  ))}
                </div>
              </section>

              <section data-testid="jtw-c2p6-rerun">
                <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P6_RERUN_QUESTION}</h2>
                <div className="flex flex-col gap-2">
                  {C2_P6_RERUN_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={rerun === option.id}
                      onPick={() => {
                        setRerun(option.id);
                        setRerunMissed(!option.correct);
                      }}
                    />
                  ))}
                </div>
                {rerunMissed && (
                  <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                    {C2_P6_RERUN_RETRY_HINT}
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p6-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C2_P6_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P6_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← Back to story map
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p6-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : C2_P6_CONTINUE_LABEL}
        </button>
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          Not saved, please click again to try.
        </p>
      )}
    </div>
  );
}
