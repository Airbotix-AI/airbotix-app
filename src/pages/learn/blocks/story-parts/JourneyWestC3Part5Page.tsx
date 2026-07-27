// Journey to the West · C3-P5 "星夜和晨雾都需要观察" — chapter three's expression
// choice (scene-specs JTW-S1-C3-P5).
//
// C3-P4 gave the middle of the sea a story and an exit. Here the child makes the
// chapter's REAL choice — 星夜 or 晨雾 — and then builds that version's 2–3
// expression blocks in the REAL Blocks Studio, in front of the
// `move_right(4) → goto_page(3)` route both versions must keep.
//
// The choice is a template branch, not a page flag: picking a card decides which
// whitelisted starter (`blocks_jtw_c3_p5_starry` / `blocks_jtw_c3_p5_morning`)
// seeds the project, so the sea the child chose is the sea the studio paints and
// the sea the saved document stores. Which version a build IS gets read back off
// that saved document (`jtwC3WeatherBuildVersion`), where the background and the
// chain have to agree — so repainting the sea without building the expression
// matches nothing at all.
//
// Completion is measured twice, never asserted:
//   * the SAVED BlocksProject must BE one of the two valid versions AND carry
//     the studio's own run+save marker;
//   * and because the studio's runner only ever runs ONE page, this page walks
//     that saved project through the real `PageFlowRunner` from Page 1 and
//     requires a measured `1 → 2 → 3` whose sea-leg exit is still Page 3.
//
// Continue persists the evidence server-side and unlocks ONLY jtw-s1-c3-p6.

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
  JTW_C3_P5_ROUTE_TAIL,
  jtwC3ParseWeather,
  jtwC3WeatherExitTarget,
  jtwC3WeatherPlacedBlocks,
  jtwC3WeatherSavedScene,
  jtwC3WeatherVersion,
  JTW_C3_WEATHER_VERSIONS,
  jtwC3WeatherBuildVersion,
  type JtwC3Weather,
} from '../jtwC3WeatherBuild';
import { JTW_C3_FAR_SHORE_PAGE } from '../jtwC3SeaBuild';
import { JTW_C3_MONKEY_KING_ID } from '../jtwC3Stage';
import { JourneyWestC3Stage } from './JourneyWestC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { c3p2EncodeFootprints, c3p2FootprintsOf, c3p2PageLabel } from './journeyWestC3Part2Program';
import {
  C3_P5_ACTUAL_TRACE_TITLE,
  C3_P5_AUDIENCE_READS,
  C3_P5_BUILD_DONE_LABEL,
  C3_P5_BUILD_NOTE,
  C3_P5_BUILD_PENDING_LABEL,
  C3_P5_BUILD_TITLE,
  C3_P5_CLASSIC_CARD,
  C3_P5_CONTINUE_LABEL,
  C3_P5_CREATE_ERROR,
  C3_P5_EXPECTED_TRACE_TITLE,
  C3_P5_LESSON_ID,
  C3_P5_LOADING_HINT,
  C3_P5_LOCKED_HINT,
  C3_P5_MUTED_TITLE,
  C3_P5_NEXT_PART_ID,
  C3_P5_NEXT_SCREEN_LABEL,
  C3_P5_OPEN_STUDIO_BUSY,
  C3_P5_OPEN_STUDIO_DONE,
  C3_P5_OPEN_STUDIO_LOCKED,
  C3_P5_OPEN_STUDIO_NEW,
  C3_P5_OPEN_STUDIO_RESUME,
  C3_P5_PART_ID,
  C3_P5_PREDICTION_ROWS,
  C3_P5_PREDICTION_TITLE,
  C3_P5_PREV_SCREEN_LABEL,
  C3_P5_PROJECT_TITLE,
  C3_P5_RECENT_PROJECTS_TO_SCAN,
  C3_P5_RESOLVED_TITLE,
  C3_P5_RUN_AGAIN_LABEL,
  C3_P5_RUN_BUSY_LABEL,
  C3_P5_RUN_LABEL,
  C3_P5_RUN_LOCKED_HINT,
  C3_P5_RUN_NOTE,
  C3_P5_RUN_TITLE,
  C3_P5_SAVED_CHAIN_TITLE,
  C3_P5_SCREEN_IDS,
  C3_P5_SHARED_TAIL_TITLE,
  C3_P5_STORY_AFTER,
  C3_P5_STORY_BRIDGE,
  C3_P5_STORY_SCREENS,
  C3_P5_TARGET_CHAIN_TITLE,
  C3_P5_TARGET_TRACE,
  C3_P5_TRACE_MISMATCH_HINT,
  C3_P5_VERSION_CARDS,
  C3_P5_VERSION_CHANGE_LOCKED,
  C3_P5_VERSION_NOTE,
  C3_P5_VERSION_TITLE,
  C3_P5_WHY_OPTIONS,
  C3_P5_WHY_QUESTION,
  C3_P5_WHY_RETRY_HINT,
  c3p5DecodePredictions,
  c3p5EncodePredictions,
  c3p5ExitStillFarShore,
  c3p5MeasuredExitPage,
  c3p5PredictionsAnswered,
  c3p5PredictionsCorrect,
  c3p5ResolvedWorldChange,
  c3p5RunReachedFarShore,
  c3p5StoryRead,
  c3p5TargetChain,
  c3p5TraceReached,
  c3p5WhyAnswered,
} from './journeyWestC3Part5Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

interface WeatherBuildStatus {
  projectId: string | null;
  /** The SAVED project, so the cross-page run really runs the child's work. */
  project: BlocksProject | null;
  /** Which valid version the SAVED document really is, or null while unfinished. */
  version: JtwC3Weather | null;
  /** The sea the saved Page 2 paints, even when the chain is not finished yet. */
  startedVersion: JtwC3Weather | null;
  /** The saved document satisfies one of the two whitelisted branches. */
  programMatches: boolean;
  /** The studio recorded a finished run + save for this lesson. */
  runCompleted: boolean;
  /** The blocks the child placed after the shipped Start, from the SAVED doc. */
  placedBlocks: Block[];
  /** The number really written on the saved Page block. */
  exitTarget: number | null;
}

const NO_BUILD: WeatherBuildStatus = {
  projectId: null,
  project: null,
  version: null,
  startedVersion: null,
  programMatches: false,
  runCompleted: false,
  placedBlocks: [],
  exitTarget: null,
};

/** Which weather branch a saved Page 2 background belongs to, if any. */
function versionOfScene(scene: string | null): JtwC3Weather | null {
  return JTW_C3_WEATHER_VERSIONS.find((version) => version.scene === scene)?.id ?? null;
}

/** Find the kid's REAL saved weather build for this lesson by reading the VFS. */
async function findWeatherBuild(kidId: string): Promise<WeatherBuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, C3_P5_RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== C3_P5_LESSON_ID) continue;
      return {
        projectId: meta.id,
        project: loaded.project,
        version: jtwC3WeatherBuildVersion(loaded.project),
        startedVersion: versionOfScene(jtwC3WeatherSavedScene(loaded.project)),
        programMatches: storyMissionProgramMatches(loaded.project, C3_P5_LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[C3_P5_LESSON_ID]),
        placedBlocks: jtwC3WeatherPlacedBlocks(loaded.project),
        exitTarget: jtwC3WeatherExitTarget(loaded.project),
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

/** A read-only block strip — the target chain, the saved chain, the shared tail. */
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

/** The measured page-by-page footprints of one real cross-page run. */
function RunFootprints({ run }: { run: PageFlowRunResult }) {
  return (
    <ul className="flex flex-col gap-1" data-testid="jtw-c3p5-run-footprints">
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
            {visit.exitTo === null ? '在这一页结束' : `出口 → Page ${visit.exitTo}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function JourneyWestC3Part5Page({
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
    queryKey: ['jtw-c3-p5-build', kidId],
    queryFn: () => findWeatherBuild(kidId!),
    enabled: !!kidId,
  });

  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C3_P5_SCREEN_IDS[0]]);
  const [pickedVersion, setPickedVersion] = useState<JtwC3Weather | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, string>>({});
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

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C3_P5_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C3_P5_PART_ID) ?? false;

  // A refreshed page restores this Part's own saved evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C3_P5_SCREEN_IDS]);
    setPickedVersion(jtwC3ParseWeather(evidence.selections?.weather_version?.[0]));
    setWhy(evidence.selections?.why_not_faster?.[0] ?? null);
    setPredictions(c3p5DecodePredictions(evidence.selections?.peer_predictions ?? []));
    setSavedTrace((evidence.selections?.page_trace ?? []).map(Number));
    setRestored(true);
  }

  // The sea the child really committed to is the one their own saved project
  // was seeded with; the card picker only decides which starter to create.
  const startedVersion = build.data?.startedVersion ?? null;
  const version = startedVersion ?? pickedVersion;
  const versionLocked = startedVersion !== null;

  const storyRead = c3p5StoryRead(screensRead);
  const whyCorrect = c3p5WhyAnswered(why);
  const predictionsAnswered = c3p5PredictionsAnswered(predictions);
  const predictionsCorrect = c3p5PredictionsCorrect(predictions, version);
  // The saved document must BE the version on screen, and the studio must have
  // recorded its own run+save marker for it.
  const buildDone = Boolean(
    build.data?.programMatches && build.data.runCompleted && build.data.version === version,
  );
  // A live run is judged on the runner's own stop reason; a restored one can
  // only be re-read off the trace the run really stored.
  const runReached = run ? c3p5RunReachedFarShore(run) : c3p5TraceReached(savedTrace);
  const exitStillFarShore = run
    ? c3p5ExitStillFarShore(run)
    : savedTrace[savedTrace.length - 1] === JTW_C3_FAR_SHORE_PAGE;
  const completed = Boolean(savedEntry);
  const resolved = Boolean(
    storyRead &&
      version &&
      whyCorrect &&
      predictionsCorrect &&
      buildDone &&
      runReached &&
      exitStillFarShore,
  );

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
    if (!pickedVersion) return;
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: C3_P5_PROJECT_TITLE,
        template: jtwC3WeatherVersion(pickedVersion).templateId,
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C3_P5_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          // The real choice — read back off the SAVED document, not off a card.
          weather_version: version ? [version] : [],
          why_not_faster: why ? [why] : [],
          peer_predictions: c3p5EncodePredictions(predictions),
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
          exit_page: [String(c3p5MeasuredExitPage(run) ?? C3_P5_TARGET_TRACE[2])],
        },
        prediction: predictions.page ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C3_P5_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P5_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p5-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P5_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  const chosen = version ? jtwC3WeatherVersion(version) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p5">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第三章 一叶木筏求师路 · Part 5 · 故事选择
        </p>
        <h1 className="text-[28px] font-black text-ink">星夜和晨雾都需要观察</h1>
      </header>

      {/* ── story_before：教学脚本 Part 5 全文，两屏 ─────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p5-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C3_P5_STORY_SCREENS[screenIndex]}</p>
        <div className="flex items-center gap-2">
          {screenIndex > 0 ? (
            <button
              type="button"
              className="btn-pill-ghost text-[13px]"
              data-testid="jtw-c3p5-story-prev"
              onClick={() => setScreenIndex(0)}
            >
              {C3_P5_PREV_SCREEN_LABEL}
            </button>
          ) : (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c3p5-story-next"
              onClick={() => {
                setScreenIndex(1);
                setScreensRead((current) =>
                  current.includes(C3_P5_SCREEN_IDS[1])
                    ? current
                    : [...current, C3_P5_SCREEN_IDS[1]],
                );
              }}
            >
              {C3_P5_NEXT_SCREEN_LABEL}
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c3p5-story-count">
            {screensRead.length} / {C3_P5_SCREEN_IDS.length} 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C3_P5_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C3_P5_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── 两个有效版本：共读证据，再选一个 ───────────────────────────── */}
      <section data-testid="jtw-c3p5-versions" data-chosen={version ?? ''}>
        <h2 className="mb-1 text-[15px] font-bold text-ink">
          {C3_P5_VERSION_TITLE}
          {version && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <p className="mb-3 text-[13px] leading-6 text-ink-soft">{C3_P5_VERSION_NOTE}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {C3_P5_VERSION_CARDS.map((card) => {
            const art = jtwC3WeatherVersion(card.id);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  aria-pressed={version === card.id}
                  disabled={versionLocked && startedVersion !== card.id}
                  data-testid={`jtw-c3p5-version-${card.id}`}
                  className={clsx(
                    'w-full space-y-2 rounded-2xl border p-3 text-left transition',
                    version === card.id
                      ? 'border-brand-sky bg-wash-sky'
                      : 'border-hairline bg-canvas-pure hover:border-brand-sky/60',
                    versionLocked && startedVersion !== card.id && 'opacity-50',
                  )}
                  onClick={() => setPickedVersion(card.id)}
                >
                  <img
                    src={art.background}
                    alt={card.label}
                    className="w-full rounded-xl border border-hairline"
                  />
                  <p className="text-[14px] font-black text-ink">{card.label}</p>
                  <p className="text-[13px] leading-6 text-ink-soft">{card.evidence}</p>
                  <p className="text-[13px] font-bold text-ink">{card.chainLabel}</p>
                </button>
              </li>
            );
          })}
        </ul>
        {versionLocked && (
          <p className="mt-2 text-[12px] font-semibold text-ink-soft" data-testid="jtw-c3p5-version-locked">
            {C3_P5_VERSION_CHANGE_LOCKED}
          </p>
        )}
        {chosen && (
          <div
            className="mt-3 rounded-2xl border border-hairline bg-canvas-pure p-4"
            data-testid="jtw-c3p5-muted"
          >
            <p className="text-[13px] font-bold text-ink">{C3_P5_MUTED_TITLE}</p>
            <p className="mt-1 text-[13px] leading-6 text-ink-soft">{chosen.mutedEvidence}</p>
          </div>
        )}
      </section>

      {/* ── 解释：看不清时为什么不是越快越好 ───────────────────────────── */}
      <section data-testid="jtw-c3p5-why">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P5_WHY_QUESTION}
          {whyCorrect && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <div className="flex flex-col gap-2">
          {C3_P5_WHY_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={why === option.id}
              onPick={() => setWhy(option.id)}
            />
          ))}
        </div>
        {why && !whyCorrect && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P5_WHY_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── Prediction：同伴按天气卡预测三件事 ─────────────────────────── */}
      {chosen && (
        <section data-testid="jtw-c3p5-prediction" data-answered={predictionsAnswered ? '1' : '0'}>
          <h2 className="mb-2 text-[15px] font-bold text-ink">
            {C3_P5_PREDICTION_TITLE}
            <span className="ml-2 text-[13px] font-bold text-brand-sky">{chosen.label}</span>
            {predictionsCorrect && <span className="ml-2 text-brand-mint">✓</span>}
          </h2>
          <ul className="space-y-3">
            {C3_P5_PREDICTION_ROWS.map((row) => {
              const picked = predictions[row.id] ?? null;
              const wrong = Boolean(picked) && picked !== row.answer[chosen.id];
              return (
                <li
                  key={row.id}
                  className="space-y-2 rounded-2xl border border-hairline bg-canvas-pure p-3"
                  data-testid={`jtw-c3p5-predict-${row.id}`}
                  data-picked={picked ?? ''}
                >
                  <p className="text-[14px] font-bold text-ink">{row.question}</p>
                  <div className="flex flex-col gap-2">
                    {row.options.map((option) => (
                      <Choice
                        key={option.id}
                        option={option}
                        active={picked === option.id}
                        onPick={() =>
                          setPredictions((current) => ({ ...current, [row.id]: option.id }))
                        }
                      />
                    ))}
                  </div>
                  {wrong && (
                    <p className="text-[13px] font-semibold text-brand-coral" role="status">
                      {row.hint}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── 真实搭建：进入 Blocks Studio ─────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c3p5-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">{C3_P5_BUILD_TITLE}</h2>
        <p className="mt-1 text-[13px] leading-6 text-ink-soft">{C3_P5_BUILD_NOTE}</p>
        {chosen && (
          <div className="mt-4 space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-3">
            <ChainStrip
              blocks={c3p5TargetChain(chosen.id)}
              title={`${C3_P5_TARGET_CHAIN_TITLE} · ${chosen.label}`}
              testId="jtw-c3p5-target-chain"
            />
            <ChainStrip
              blocks={JTW_C3_P5_ROUTE_TAIL}
              title={C3_P5_SHARED_TAIL_TITLE}
              testId="jtw-c3p5-shared-tail"
            />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c3p5-open-studio"
            disabled={creating || !version}
            onClick={() => void openStudio()}
          >
            {creating
              ? C3_P5_OPEN_STUDIO_BUSY
              : buildDone
                ? C3_P5_OPEN_STUDIO_DONE
                : build.data?.projectId
                  ? C3_P5_OPEN_STUDIO_RESUME
                  : C3_P5_OPEN_STUDIO_NEW}
          </button>
          {!version && (
            <span className="text-[13px] font-semibold text-ink-soft">
              {C3_P5_OPEN_STUDIO_LOCKED}
            </span>
          )}
          {buildDone ? (
            <span className="text-[13px] font-bold text-brand-mint" data-testid="jtw-c3p5-build-done">
              {C3_P5_BUILD_DONE_LABEL}
            </span>
          ) : (
            build.data?.projectId && (
              <span className="text-[13px] font-semibold text-ink-soft">
                {C3_P5_BUILD_PENDING_LABEL}
              </span>
            )
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            {C3_P5_CREATE_ERROR}
          </p>
        )}
      </section>

      {/* ── 从保存的作品读回来的主脚本 ────────────────────────────────── */}
      {buildDone && build.data && (
        <section data-testid="jtw-c3p5-saved-chain" data-exit={build.data.exitTarget ?? ''}>
          <ChainStrip
            blocks={[{ op: 'when_flag' }, ...build.data.placedBlocks]}
            title={C3_P5_SAVED_CHAIN_TITLE}
            testId="jtw-c3p5-saved-chain-strip"
          />
        </section>
      )}

      {/* ── 真实跨页运行：舞台 + 预期/实际脚印 ──────────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p5-run">
        <h2 className="text-[15px] font-bold text-ink">{C3_P5_RUN_TITLE}</h2>
        <p className="text-[13px] leading-6 text-ink-soft">{C3_P5_RUN_NOTE}</p>
        <JourneyWestC3Stage
          testIdPrefix="jtw-c3p5"
          pageNumber={stagePage}
          sprites={sprites}
          saying={saying}
          backgroundSrc={chosen && stagePage === 2 ? chosen.background : undefined}
          backgroundAlt={chosen?.label}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary text-[14px]"
            data-testid="jtw-c3p5-run-button"
            disabled={!buildDone || running}
            onClick={() => void runSavedProject()}
          >
            {running ? C3_P5_RUN_BUSY_LABEL : run ? C3_P5_RUN_AGAIN_LABEL : C3_P5_RUN_LABEL}
          </button>
          {!buildDone && (
            <span className="text-[13px] font-semibold text-ink-soft">{C3_P5_RUN_LOCKED_HINT}</span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div data-testid="jtw-c3p5-expected-trace">
            <p className="mb-1 text-[13px] font-bold text-ink-soft">{C3_P5_EXPECTED_TRACE_TITLE}</p>
            <p className="text-[15px] font-black text-ink">
              {C3_P5_TARGET_TRACE.map((page) => `Page ${page}`).join(' → ')}
            </p>
          </div>
          {run && (
            <div
              data-testid="jtw-c3p5-actual-trace"
              data-trace={run.trace.join('-')}
              data-exit-page={c3p5MeasuredExitPage(run) ?? ''}
            >
              <p className="mb-1 text-[13px] font-bold text-ink-soft">{C3_P5_ACTUAL_TRACE_TITLE}</p>
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
            {C3_P5_TRACE_MISMATCH_HINT}
          </p>
        )}
      </section>

      {/* ── resolved world change + story_after ────────────────────────── */}
      {(resolved || completed) && chosen && (
        <section
          className="space-y-3 rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p5-resolved"
          data-version={chosen.id}
        >
          <p className="text-[13px] font-bold text-ink-soft">{C3_P5_RESOLVED_TITLE}</p>
          <p className="text-[15px] leading-7 text-ink">{c3p5ResolvedWorldChange(chosen.id)}</p>
          <img
            src={chosen.resolvedBackground}
            alt={chosen.resolvedAlt}
            data-testid="jtw-c3p5-page2-resolved"
            className="w-full rounded-2xl border border-hairline"
          />
          <p className="text-[14px] font-bold text-ink">{C3_P5_AUDIENCE_READS}</p>
          <p className="text-[15px] font-semibold text-ink">{C3_P5_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p5-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C3_P5_CONTINUE_LABEL}
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
