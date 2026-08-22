// Journey to the West · C1-P6 "声音怎么从空中来了" — Twist & Debug, the stable
// order bug (scene-specs JTW-S1-C1-P6). The child first states the
// expectation, RUNS the shipped bug (Say → Hop → Show) through the REAL
// BlocksRunner on this page, marks the FIRST deviation on the trace, then
// repairs the order in the real Studio (template blocks_jtw_c1_p6 ships the
// bug; the mission only completes after a bug run AND a repaired rerun). This
// page verifies the fix FROM THE SAVED BlocksProject + the studio's run marker
// and records the five-segment explanation plus the REAL project diff.
// Continue unlocks ONLY jtw-s1-c1-p7.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { GRID_H, GRID_W } from '../blocksModel';
import type { Block } from '../blocksModel';
import { BlocksRunner, pageById, startState, type SpriteState } from '../interpreter';
import { sfx } from '../sounds';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  C1_P6_ACTUAL_OPTIONS,
  C1_P6_ACTUAL_QUESTION,
  C1_P6_BUG_CHAIN,
  C1_P6_BUG_PROJECT,
  C1_P6_CONTINUE_LABEL,
  C1_P6_DEVIATION_OPTIONS,
  C1_P6_DEVIATION_QUESTION,
  C1_P6_DEVIATION_RETRY_HINT,
  C1_P6_EXPECT_OPTIONS,
  C1_P6_EXPECT_QUESTION,
  C1_P6_FIX_OPTIONS,
  C1_P6_FIX_QUESTION,
  C1_P6_RERUN_OPTIONS,
  C1_P6_RERUN_QUESTION,
  C1_P6_RESOLVED_WORLD_CHANGE,
  C1_P6_STORY_AFTER,
  C1_P6_STORY_BEFORE,
  JTW_C1_BACKGROUND_ASSET,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c1-p6';
const NEXT_PART_ID = 'jtw-s1-c1-p7';
const LESSON_ID = 'jtw-s1-c1-p6';
const RECENT_PROJECTS_TO_SCAN = 8;
/** The three movable target blocks — the only ops the repair may relocate. */
const TARGET_OPS = ['show', 'hop', 'say'] as const;

interface DebugBuildStatus {
  projectId: string | null;
  /** The saved BlocksProject matches the repaired Show→Hop→Say chain exactly. */
  programMatches: boolean;
  /** The studio recorded a bug run + repaired rerun + save for this lesson. */
  runCompleted: boolean;
  /** REAL project diff: target-block moves from the shipped bug order. */
  projectDiff: string[];
}

/** 1-based position of an op inside a chain (−1 when absent). */
function opPosition(blocks: readonly Block[], op: string): number {
  const index = blocks.findIndex((block) => block.op === op);
  return index < 0 ? -1 : index + 1;
}

/** The honest project diff: where each target block moved, bug → saved. */
function computeProjectDiff(saved: readonly Block[]): string[] {
  const diff: string[] = [];
  for (const op of TARGET_OPS) {
    const from = opPosition(C1_P6_BUG_CHAIN, op);
    const to = opPosition(saved, op);
    if (to >= 1 && to !== from) diff.push(`${op}:${from}->${to}`);
  }
  return diff;
}

/** Find the kid's REAL saved debug project for this lesson by reading VFS. */
async function findDebugBuild(kidId: string): Promise<DebugBuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      const blocks =
        loaded.project.pages[0]?.characters
          .find((character) => character.id === 'stone-monkey')
          ?.scripts.find((script) => script.id === 'stone-monkey-arrival-debug')?.blocks ?? [];
      return {
        projectId: meta.id,
        programMatches: storyMissionProgramMatches(loaded.project, LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
        projectDiff: computeProjectDiff(blocks),
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return { projectId: null, programMatches: false, runCompleted: false, projectDiff: [] };
}

/** Read-only bug reproduction: the REAL BlocksRunner executes the shipped
 *  Say→Hop→Show chain — the greeting bubble appears while the monkey is still
 *  hidden, making "the voice from thin air" observable, not narrated. */
function JourneyWestBugPreview({
  onRunDone,
  sleep,
}: {
  onRunDone?: () => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const page = useMemo(() => pageById(C1_P6_BUG_PROJECT, 'jtw-s1-c1-p6-bug-page'), []);
  const character = page.characters[0];
  const blocks = character.scripts[0].blocks;
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [litIndex, setLitIndex] = useState(-1);
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character));
  const [say, setSay] = useState<string | null>(null);
  const [voiceFromAir, setVoiceFromAir] = useState(false);
  const spriteVisibleRef = useRef(false);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSay(null);
    const initial = startState(character);
    spriteVisibleRef.current = initial.visible;
    setSprite(initial);
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_charId, state) => {
          spriteVisibleRef.current = state.visible;
          setSprite(state);
        },
        onSay: (_charId, text) => {
          setSay(text);
          // The bug made observable: the greeting fires while nobody is on stage.
          if (text && !spriteVisibleRef.current) setVoiceFromAir(true);
        },
        onNote: () => undefined,
        onSound: (soundId) => sfx.playSound(soundId),
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
        data-testid="jtw-p6-stage"
        data-voice-from-air={voiceFromAir}
      >
        <img
          src={JTW_C1_BACKGROUND_ASSET}
          alt="The stone platform of Flower-Fruit Mountain: the out-of-sequence appearance is about to happen again"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={character.asset}
          alt="Stone Monkey"
          data-testid="jtw-p6-stone-monkey"
          data-visible={sprite.visible}
          className={clsx(
            'absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200',
            !sprite.visible && 'invisible',
          )}
          style={{ left, top }}
        />
        {say && (
          <div
            data-testid="jtw-p6-say-bubble"
            className="absolute max-w-[45%] -translate-x-1/2 rounded-2xl border border-hairline bg-canvas-pure px-3 py-2 text-[13px] font-bold text-ink shadow-card-soft"
            style={{ left, top: `calc(${top} - 34%)` }}
          >
            {say}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-soft">
          Bug recurrence track (read-only) - This is not a fixed version, take a complete look at
          what went wrong with it first:
        </p>
        <div className="flex flex-wrap items-center gap-1" data-testid="jtw-p6-bug-chain">
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
        data-testid="jtw-p6-run"
      >
        {running ? 'Running…' : ran ? '▶ Repeat it again' : '▶ run this bug'}
      </button>
    </div>
  );
}

export function JourneyWestPart6Page({
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
    queryKey: ['jtw-c1-p6-build', kidId],
    queryFn: () => findDebugBuild(kidId!),
    enabled: !!kidId,
  });

  const [expectation, setExpectation] = useState<string | null>(null);
  const [bugRan, setBugRan] = useState(false);
  const [actual, setActual] = useState<string | null>(null);
  const [deviation, setDeviation] = useState<string | null>(null);
  const [deviationMissed, setDeviationMissed] = useState(false);
  const [fixMove, setFixMove] = useState<string | null>(null);
  const [rerun, setRerun] = useState<string | null>(null);
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
    setFixMove(evidence.selections?.fix_move?.[0] ?? null);
    setRerun(evidence.selections?.rerun_result?.[0] ?? null);
    setBugRan(true);
    setRestored(true);
  }

  const expectationDone =
    C1_P6_EXPECT_OPTIONS.find((option) => option.id === expectation)?.correct === true;
  const actualDone = C1_P6_ACTUAL_OPTIONS.find((option) => option.id === actual)?.correct === true;
  const deviationDone =
    C1_P6_DEVIATION_OPTIONS.find((option) => option.id === deviation)?.correct === true;
  const fixDone = C1_P6_FIX_OPTIONS.find((option) => option.id === fixMove)?.correct === true;
  const rerunDone = C1_P6_RERUN_OPTIONS.find((option) => option.id === rerun)?.correct === true;
  const completed = Boolean(savedEntry);
  const buildDone = Boolean(build.data?.programMatches && build.data.runCompleted);
  const resolved =
    expectationDone && bugRan && actualDone && deviationDone && buildDone && fixDone && rerunDone;

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: 'Journey to the West · Fix out-of-order appearances',
        template: 'blocks_jtw_c1_p6',
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
          project_diff: build.data?.projectDiff ?? [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
        },
        prediction: deviation ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">The chaotic stage is happening again...</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-p6-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          First choose your greeting method in Part 5, and then fix this out-of-order story.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p6">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 1 The Stone Monkey is Born · Part 6 · Debug
        </p>
        <h1 className="text-[28px] font-black text-ink">Why did the sound come from the air?</h1>
      </header>

      {/* ── story_before：完整儿童正文 ──────────────────────────────── */}
      <section data-testid="jtw-p6-story">
        <p className="text-[16px] leading-8 text-ink">{C1_P6_STORY_BEFORE}</p>
      </section>

      {/* ── 五段解释 1：预期 ────────────────────────────────────────── */}
      <section data-testid="jtw-p6-expectation">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P6_EXPECT_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C1_P6_EXPECT_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={expectation === option.id}
              onPick={() => setExpectation(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── bug 复现：真实 Runner 运行乱序链 ────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[15px] font-bold text-ink">Run this bug (read-only reproduction)</h2>
        <JourneyWestBugPreview onRunDone={() => setBugRan(true)} sleep={previewSleep} />
      </section>

      {bugRan && (
        <>
          {/* ── 五段解释 2：实际 ──────────────────────────────────── */}
          <section data-testid="jtw-p6-actual">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P6_ACTUAL_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C1_P6_ACTUAL_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={actual === option.id}
                  onPick={() => setActual(option.id)}
                />
              ))}
            </div>
          </section>

          {/* ── 五段解释 3：第一次偏离（轨迹点选 = 本 Part 预测） ──── */}
          <section data-testid="jtw-p6-deviation">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P6_DEVIATION_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C1_P6_DEVIATION_OPTIONS.map((option) => (
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
                {C1_P6_DEVIATION_RETRY_HINT}
              </p>
            )}
          </section>

          {/* ── 真实修复：进入 Blocks Studio ────────────────────────── */}
          <section
            className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
            data-testid="jtw-p6-build"
            data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
          >
            <h2 className="text-[15px] font-bold text-ink">
              Go to the real workspace and fix the order
            </h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              The program in the workspace has this bug. First press Go to run it through, then move
              only Show, Hop, Say Three pieces, change the order to appear first, then action, then
              greeting, then rerun and save. It is not allowed to delete and re-match. You're also
              not allowed to change the sounds or endpoints - no buttons will fix it for you.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="btn-pill-primary"
                data-testid="jtw-p6-open-studio"
                disabled={creating}
                onClick={() => void openStudio()}
              >
                {creating
                  ? 'Opening the chaotic stage...'
                  : buildDone
                    ? 'Take another look at my fix'
                    : build.data?.projectId
                      ? 'Continue to repair →'
                      : 'Start repair →'}
              </button>
              {buildDone && (
                <span
                  className="text-[13px] font-bold text-brand-mint"
                  data-testid="jtw-p6-build-done"
                >
                  ✓ The bug has been reproduced, the sequence has been fixed and rerun
                </span>
              )}
              {!buildDone && build.data?.projectId && (
                <span className="text-[13px] font-semibold text-ink-soft">
                  The sequence has not been fixed to the target chain, or the bug has not been run
                  before re-running and saving.
                </span>
              )}
            </div>
            {buildDone && build.data && build.data.projectDiff.length > 0 && (
              <p className="mt-2 text-[12px] font-semibold text-ink-soft" data-testid="jtw-p6-diff">
                Real modification record:{build.data.projectDiff.join(' · ')}
              </p>
            )}
            {createError && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
                Failed to open workspace, please try again.
              </p>
            )}
          </section>

          {/* ── 五段解释 4 + 5：修改与重跑结果 ───────────────────────── */}
          {buildDone && (
            <>
              <section data-testid="jtw-p6-fix">
                <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P6_FIX_QUESTION}</h2>
                <div className="flex flex-col gap-2">
                  {C1_P6_FIX_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={fixMove === option.id}
                      onPick={() => setFixMove(option.id)}
                    />
                  ))}
                </div>
              </section>

              <section data-testid="jtw-p6-rerun">
                <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P6_RERUN_QUESTION}</h2>
                <div className="flex flex-col gap-2">
                  {C1_P6_RERUN_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={rerun === option.id}
                      onPick={() => setRerun(option.id)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p6-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C1_P6_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C1_P6_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← Back to story map
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-p6-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : C1_P6_CONTINUE_LABEL}
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
