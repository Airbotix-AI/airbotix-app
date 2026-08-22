// Journey to the West · C3-P4 "让海中央既有故事又有出口" — chapter three's main
// Build (scene-specs JTW-S1-C3-P4).
//
// C3-P3 proved the exit number is an address. Here the child finally OWNS a
// page: a `blocks_jtw_c3_p4` project is created from the backend template — its
// Page 2 ships the raft, the sea background and a script slot holding nothing
// but Start — and edited in the REAL Blocks Studio, where the four blocks
// Whoosh · Right 4 · Wait 2 · Page 3 all have to be found, ordered and tuned by
// hand. Pages 1 and 3 keep read-only demo chains.
//
// Completion is measured twice, never asserted:
//   * the SAVED BlocksProject must satisfy the exact three-page contract
//     (`jtwC3SeaBuildComplete`) AND carry the studio's own run+save marker, so
//     "只在编辑器里摆对未运行不通过" holds;
//   * and because the studio's runner only ever runs ONE page, this page runs
//     the saved project through the real `PageFlowRunner` from Page 1 and
//     requires a measured `1 → 2 → 3` that stopped because Page 3 ENDED.
//
// Continue persists the evidence server-side and unlocks ONLY jtw-s1-c3-p5. No
// chapter seal lights here — 远行印 is C3-P8's, aggregated server-side.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import type { Block, BlocksProject } from '../blocksModel';
import { startState, type SpriteState } from '../interpreter';
import { PageFlowRunner, type PageFlowRunResult } from '../pageFlowRun';
import { sfx } from '../sounds';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  JTW_C3_ARRIVAL_CHAIN,
  JTW_C3_DEPART_CHAIN,
  jtwC3SeaExitTarget,
  jtwC3SeaPlacedBlocks,
} from '../jtwC3SeaBuild';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_PAGE2_RESOLVED_BACKGROUND,
  JTW_C3_PAGE3_RESOLVED_BACKGROUND,
} from '../jtwC3Stage';
import { JourneyWestC3Stage } from './JourneyWestC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { c3p2EncodeFootprints, c3p2FootprintsOf, c3p2PageLabel } from './journeyWestC3Part2Program';
import {
  C3_P4_ACTUAL_TRACE_TITLE,
  C3_P4_BUILD_DONE_LABEL,
  C3_P4_BUILD_NOTE,
  C3_P4_BUILD_PENDING_LABEL,
  C3_P4_BUILD_TITLE,
  C3_P4_CLASSIC_CARD,
  C3_P4_CONTINUE_LABEL,
  C3_P4_DEMO_TITLE,
  C3_P4_EXIT_CELL,
  C3_P4_EXPECTED_TRACE_TITLE,
  C3_P4_HALF_SEAL_LABEL,
  C3_P4_HALF_SEAL_NOTE,
  C3_P4_LESSON_ID,
  C3_P4_LOADING_HINT,
  C3_P4_LOCKED_HINT,
  C3_P4_NEXT_PART_ID,
  C3_P4_NEXT_SCREEN_LABEL,
  C3_P4_OPEN_STUDIO_BUSY,
  C3_P4_OPEN_STUDIO_DONE,
  C3_P4_OPEN_STUDIO_NEW,
  C3_P4_OPEN_STUDIO_RESUME,
  C3_P4_PART_ID,
  C3_P4_PREDICTION_OPTIONS,
  C3_P4_PREDICTION_QUESTION,
  C3_P4_PREDICTION_RETRY_HINT,
  C3_P4_PREV_SCREEN_LABEL,
  C3_P4_PROJECT_TITLE,
  C3_P4_RECENT_PROJECTS_TO_SCAN,
  C3_P4_RESOLVED_WORLD_CHANGE,
  C3_P4_ROLE_OPTIONS,
  C3_P4_ROLE_RETRY_HINT,
  C3_P4_ROLE_SLOTS,
  C3_P4_ROLE_TITLE,
  C3_P4_RUN_AGAIN_LABEL,
  C3_P4_RUN_BUSY_LABEL,
  C3_P4_RUN_LABEL,
  C3_P4_RUN_LOCKED_HINT,
  C3_P4_RUN_NOTE,
  C3_P4_RUN_TITLE,
  C3_P4_SAVED_CHAIN_TITLE,
  C3_P4_SCREEN_IDS,
  C3_P4_STORY_AFTER,
  C3_P4_STORY_BRIDGE,
  C3_P4_STORY_SCREENS,
  C3_P4_TARGET_CHAIN,
  C3_P4_TARGET_CHAIN_TITLE,
  C3_P4_TARGET_TRACE,
  C3_P4_TEMPLATE_ID,
  C3_P4_TRACE_MISMATCH_HINT,
  c3p4DecodeRoles,
  c3p4EncodeRoles,
  c3p4MeasuredExitCell,
  c3p4PredictionDone,
  c3p4PredictionMatchedRun,
  c3p4RolesAnswered,
  c3p4RolesCorrect,
  c3p4RunReachedFarShore,
  c3p4StoryRead,
  c3p4TraceReached,
} from './journeyWestC3Part4Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

interface SeaBuildStatus {
  projectId: string | null;
  /** The SAVED project, so the cross-page run really runs the child's work. */
  project: BlocksProject | null;
  /** The saved document satisfies the exact three-page C3-P4 contract. */
  programMatches: boolean;
  /** The studio recorded a finished run + save for this lesson. */
  runCompleted: boolean;
  /** The blocks the child placed after the shipped Start, from the SAVED doc. */
  placedBlocks: Block[];
  /** The number really written on the saved Page block. */
  exitTarget: number | null;
}

const NO_BUILD: SeaBuildStatus = {
  projectId: null,
  project: null,
  programMatches: false,
  runCompleted: false,
  placedBlocks: [],
  exitTarget: null,
};

/** Find the kid's REAL saved sea build for this lesson by reading the VFS. */
async function findSeaBuild(kidId: string): Promise<SeaBuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, C3_P4_RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== C3_P4_LESSON_ID) continue;
      return {
        projectId: meta.id,
        project: loaded.project,
        programMatches: storyMissionProgramMatches(loaded.project, C3_P4_LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[C3_P4_LESSON_ID]),
        placedBlocks: jtwC3SeaPlacedBlocks(loaded.project),
        exitTarget: jtwC3SeaExitTarget(loaded.project),
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return NO_BUILD;
}

/** Every sprite of a page in its start pose (what a page entry shows). */
function startSprites(project: BlocksProject, pageNumber: number): Record<string, SpriteState> {
  const page = project.pages[pageNumber - 1];
  const sprites: Record<string, SpriteState> = {};
  for (const character of page?.characters ?? []) sprites[character.id] = startState(character);
  return sprites;
}

/** A read-only block strip — the target chain, the saved chain, a demo chain. */
function ChainStrip({
  blocks,
  title,
  testId,
}: {
  blocks: readonly Block[];
  title: string;
  testId: string;
}) {
  return (
    <div className="space-y-2" data-testid={testId} data-ops={blocks.map((b) => b.op).join(',')}>
      <p className="text-[13px] font-bold text-ink">{title}</p>
      <div className="flex flex-wrap items-center gap-1">
        {blocks.map((block, index) => (
          <BlockChip
            key={`${block.op}-${index}`}
            block={block}
            inChain
            isLast={index === blocks.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/** One placed block and the four jobs it could be doing. */
function RoleRow({
  slotId,
  blockLabel,
  picked,
  onPick,
}: {
  slotId: string;
  blockLabel: string;
  picked: string | null;
  onPick: (roleId: string) => void;
}) {
  return (
    <li
      className="space-y-2 rounded-2xl border border-hairline bg-canvas-pure p-3"
      data-testid={`jtw-c3p4-role-${slotId}`}
      data-picked={picked ?? ''}
    >
      <p className="text-[14px] font-bold text-ink">{blockLabel}</p>
      <div className="flex flex-col gap-2">
        {C3_P4_ROLE_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={picked === option.id}
            onPick={() => onPick(option.id)}
          />
        ))}
      </div>
    </li>
  );
}

/** The measured page-by-page footprints of one real cross-page run. */
function RunFootprints({ run }: { run: PageFlowRunResult }) {
  return (
    <ul className="flex flex-col gap-1" data-testid="jtw-c3p4-run-footprints">
      {run.visits.map((visit, index) => (
        <li
          key={`${visit.page}-${index}`}
          data-page={visit.page}
          data-enter={visit.enterCell ?? ''}
          data-exit={visit.exitCell ?? ''}
          data-exit-to={visit.exitTo ?? ''}
          className="rounded-2xl border border-hairline bg-canvas-pure px-3 py-2 text-[13px] text-ink"
        >
          <span className="font-bold">
            Page {visit.page} · {c3p2PageLabel(visit.page)}
          </span>
          <span className="ml-2 font-semibold text-ink-soft">
            {visit.enterCell ?? '?'} → {visit.exitCell ?? '?'} ·{' '}
            {visit.exitTo === null ? 'end on this page' : `Exit → Page ${visit.exitTo}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function JourneyWestC3Part4Page({
  previewSleep,
}: {
  /** Injectable run timing for tests (mirrors BlocksRunner's injectable sleep). */
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
    queryKey: ['jtw-c3-p4-build', kidId],
    queryFn: () => findSeaBuild(kidId!),
    enabled: !!kidId,
  });

  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C3_P4_SCREEN_IDS[0]]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const [stagePage, setStagePage] = useState(1);
  const [sprites, setSprites] = useState<Record<string, SpriteState>>({});
  const [saying, setSaying] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<PageFlowRunResult | null>(null);
  const [savedTrace, setSavedTrace] = useState<number[]>([]);
  const runnerRef = useRef<PageFlowRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stop(), []);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C3_P4_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C3_P4_PART_ID) ?? false;

  // A refreshed page restores this Part's own saved evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C3_P4_SCREEN_IDS]);
    setRoles(c3p4DecodeRoles(evidence.selections?.block_roles ?? []));
    setPrediction(evidence.prediction ?? null);
    setSavedTrace((evidence.selections?.page_trace ?? []).map(Number));
    setRestored(true);
  }

  const storyRead = c3p4StoryRead(screensRead);
  const rolesAnswered = c3p4RolesAnswered(roles);
  const rolesCorrect = c3p4RolesCorrect(roles);
  const predictionPicked = Boolean(prediction);
  const predictionCorrect = c3p4PredictionDone(prediction);
  const buildDone = Boolean(build.data?.programMatches && build.data.runCompleted);
  // A live run is judged on the runner's own stop reason; a restored one can
  // only be re-read off the trace the run really stored.
  const runReached = run ? c3p4RunReachedFarShore(run) : c3p4TraceReached(savedTrace);
  const predictionMatched = run ? c3p4PredictionMatchedRun(run) : savedTrace.length > 0;
  const completed = Boolean(savedEntry);
  const resolved =
    storyRead && rolesCorrect && predictionCorrect && buildDone && runReached && predictionMatched;

  const runSavedProject = useCallback(async () => {
    const project = build.data?.project;
    if (!project || running) return;
    setRunning(true);
    setSaying(null);
    const runner = new PageFlowRunner(project, {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: previewSleep,
      onPageEnter: (page) => {
        setStagePage(page);
        setSprites(startSprites(project, page));
        setSaying(null);
      },
      host: {
        onSprite: (charId, state) => setSprites((current) => ({ ...current, [charId]: state })),
        onSay: (_charId, text) => setSaying(text),
        onSound: (soundId) => sfx.playSound(soundId),
      },
    });
    runnerRef.current = runner;
    const result = await runner.run();
    runnerRef.current = null;
    setRun(result);
    setRunning(false);
  }, [build.data?.project, previewSleep, running]);

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: C3_P4_PROJECT_TITLE,
        template: C3_P4_TEMPLATE_ID,
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C3_P4_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          block_roles: c3p4EncodeRoles(roles),
          // Code — the real project id and the chain read back off the SAVED doc.
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          target_chain: (build.data?.placedBlocks ?? []).map(
            (block) => `${block.op}${block.n === undefined ? '' : `:${block.n}`}`,
          ),
          page_target: build.data?.exitTarget === null ? [] : [String(build.data?.exitTarget)],
          // Run — measured by the real page-flow runner over that saved doc.
          page_trace: (run ? run.trace : savedTrace).map(String),
          run_footprints: c3p2EncodeFootprints(c3p2FootprintsOf(run)),
          run_stop: run ? [run.stoppedBy] : [],
          exit_cell: [c3p4MeasuredExitCell(run) ?? C3_P4_EXIT_CELL],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C3_P4_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P4_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p4-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P4_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p4">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 3 One Leaf Raft’s Journey to Seeking a Master · Part 4 ·
          Build 1
        </p>
        <h1 className="text-[28px] font-black text-ink">
          Let the center of the sea have both a story and an outlet
        </h1>
      </header>

      {/* ── story_before：教学脚本 Part 4 全文，两屏 ─────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p4-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C3_P4_STORY_SCREENS[screenIndex]}</p>
        <div className="flex items-center gap-2">
          {screenIndex > 0 ? (
            <button
              type="button"
              className="btn-pill-ghost text-[13px]"
              data-testid="jtw-c3p4-story-prev"
              onClick={() => setScreenIndex(0)}
            >
              {C3_P4_PREV_SCREEN_LABEL}
            </button>
          ) : (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c3p4-story-next"
              onClick={() => {
                setScreenIndex(1);
                setScreensRead((current) =>
                  current.includes(C3_P4_SCREEN_IDS[1])
                    ? current
                    : [...current, C3_P4_SCREEN_IDS[1]],
                );
              }}
            >
              {C3_P4_NEXT_SCREEN_LABEL}
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c3p4-story-count">
            {screensRead.length} / {C3_P4_SCREEN_IDS.length} part
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic story note:</span>
          {C3_P4_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">Story—Program Bridge:</span>
          {C3_P4_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── 三页各做各的事：Page 1 / Page 3 的只读示范链 ─────────────────── */}
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-4">
        <p className="text-[13px] font-bold text-ink-soft">{C3_P4_DEMO_TITLE}</p>
        <ChainStrip
          blocks={JTW_C3_DEPART_CHAIN}
          title="Page 1 · Flower-Fruit Mountain coast · Leaving home (read only)"
          testId="jtw-c3p4-demo-page1"
        />
        <ChainStrip
          blocks={JTW_C3_ARRIVAL_CHAIN}
          title="Page 3 Mountain Forest on the Other Side · Arrival (read only)"
          testId="jtw-c3p4-demo-page3"
        />
        <ChainStrip
          blocks={C3_P4_TARGET_CHAIN}
          title={C3_P4_TARGET_CHAIN_TITLE}
          testId="jtw-c3p4-target-chain"
        />
      </section>

      {/* ── 四块的不同职责 ─────────────────────────────────────────────── */}
      <section data-testid="jtw-c3p4-roles">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P4_ROLE_TITLE}
          {rolesCorrect && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {C3_P4_ROLE_SLOTS.map((slot) => (
            <RoleRow
              key={slot.id}
              slotId={slot.id}
              blockLabel={slot.blockLabel}
              picked={roles[slot.id] ?? null}
              onPick={(roleId) => setRoles((current) => ({ ...current, [slot.id]: roleId }))}
            />
          ))}
        </ul>
        {rolesAnswered && !rolesCorrect && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P4_ROLE_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── 预测：木筏在 Page 2 的哪一格离开 ────────────────────────────── */}
      <section data-testid="jtw-c3p4-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P4_PREDICTION_QUESTION}
          {predictionCorrect && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <div className="flex flex-col gap-2">
          {C3_P4_PREDICTION_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => setPrediction(option.id)}
            />
          ))}
        </div>
        {predictionPicked && !predictionCorrect && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P4_PREDICTION_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── 真实搭建：进入 Blocks Studio ─────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c3p4-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">{C3_P4_BUILD_TITLE}</h2>
        <p className="mt-1 text-[13px] leading-6 text-ink-soft">{C3_P4_BUILD_NOTE}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c3p4-open-studio"
            disabled={creating}
            onClick={() => void openStudio()}
          >
            {creating
              ? C3_P4_OPEN_STUDIO_BUSY
              : buildDone
                ? C3_P4_OPEN_STUDIO_DONE
                : build.data?.projectId
                  ? C3_P4_OPEN_STUDIO_RESUME
                  : C3_P4_OPEN_STUDIO_NEW}
          </button>
          {buildDone ? (
            <span
              className="text-[13px] font-bold text-brand-mint"
              data-testid="jtw-c3p4-build-done"
            >
              {C3_P4_BUILD_DONE_LABEL}
            </span>
          ) : (
            build.data?.projectId && (
              <span className="text-[13px] font-semibold text-ink-soft">
                {C3_P4_BUILD_PENDING_LABEL}
              </span>
            )
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            Failed to open workspace, please try again.
          </p>
        )}
      </section>

      {/* ── 从保存的作品读回来的五块主脚本 ────────────────────────────── */}
      {buildDone && build.data && (
        <section data-testid="jtw-c3p4-saved-chain" data-exit={build.data.exitTarget ?? ''}>
          <ChainStrip
            blocks={[{ op: 'when_flag' }, ...build.data.placedBlocks]}
            title={C3_P4_SAVED_CHAIN_TITLE}
            testId="jtw-c3p4-saved-chain-strip"
          />
        </section>
      )}

      {/* ── 真实跨页运行：舞台 + 预期/实际脚印 ──────────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p4-run">
        <h2 className="text-[15px] font-bold text-ink">{C3_P4_RUN_TITLE}</h2>
        <p className="text-[13px] leading-6 text-ink-soft">{C3_P4_RUN_NOTE}</p>
        <JourneyWestC3Stage
          testIdPrefix="jtw-c3p4"
          pageNumber={stagePage}
          sprites={sprites}
          saying={saying}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary text-[14px]"
            data-testid="jtw-c3p4-run-button"
            disabled={!buildDone || running}
            onClick={() => void runSavedProject()}
          >
            {running ? C3_P4_RUN_BUSY_LABEL : run ? C3_P4_RUN_AGAIN_LABEL : C3_P4_RUN_LABEL}
          </button>
          {!buildDone && (
            <span className="text-[13px] font-semibold text-ink-soft">{C3_P4_RUN_LOCKED_HINT}</span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div data-testid="jtw-c3p4-expected-trace">
            <p className="mb-1 text-[13px] font-bold text-ink-soft">{C3_P4_EXPECTED_TRACE_TITLE}</p>
            <p className="text-[15px] font-black text-ink">
              {C3_P4_TARGET_TRACE.map((page) => `Page ${page}`).join(' → ')}
            </p>
          </div>
          {run && (
            <div data-testid="jtw-c3p4-actual-trace" data-trace={run.trace.join('-')}>
              <p className="mb-1 text-[13px] font-bold text-ink-soft">{C3_P4_ACTUAL_TRACE_TITLE}</p>
              <p
                className={clsx(
                  'text-[15px] font-black',
                  runReached ? 'text-brand-mint' : 'text-brand-coral',
                )}
              >
                {run.trace.map((page) => `Page ${page}`).join(' → ')}
              </p>
            </div>
          )}
        </div>
        {run && <RunFootprints run={run} />}
        {run && !runReached && (
          <p className="text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P4_TRACE_MISMATCH_HINT}
          </p>
        )}
        {run && runReached && (
          <p className="text-[13px] font-semibold text-ink" data-testid="jtw-c3p4-exit-cell">
            The raft really started from {c3p4MeasuredExitCell(run)} left the middle of the sea
            {predictionMatched ? '——Same as your prediction.' : '。'}
          </p>
        )}
      </section>

      {/* ── resolved world change + story_after ────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="space-y-3 rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p4-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C3_P4_RESOLVED_WORLD_CHANGE}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <img
              src={JTW_C3_PAGE2_RESOLVED_BACKGROUND}
              alt="Middle section on the sea: The morning fog disperses, and a sea road connects from one end of the picture to the other."
              data-testid="jtw-c3p4-page2-resolved"
              className="w-full rounded-2xl border border-hairline"
            />
            <img
              src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
              alt="Mountain forest on the other side: The shoal on which the raft rests, the stone steps up the mountain light up, and warm light shines from the door of the master's gate on the mountain."
              data-testid="jtw-c3p4-page3-resolved"
              className="w-full rounded-2xl border border-hairline"
            />
          </div>
          <p className="text-[15px] font-semibold text-ink">{C3_P4_STORY_AFTER}</p>
          <div
            className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-3"
            data-testid="jtw-c3p4-half-seal"
          >
            <p className="text-[14px] font-bold text-ink">{C3_P4_HALF_SEAL_LABEL}</p>
            <p className="mt-1 text-[12px] leading-6 text-ink-soft">{C3_P4_HALF_SEAL_NOTE}</p>
          </div>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← Back to story map
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p4-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : C3_P4_CONTINUE_LABEL}
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
