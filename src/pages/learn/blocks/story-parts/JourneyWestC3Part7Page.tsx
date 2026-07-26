// Journey to the West · C3-P7 "我的三页求师路" — chapter three's Personal Ship
// (scene-specs JTW-S1-C3-P7).
//
// The public route works, so the whole three-page journey is handed over: all
// three script slots ship with a bare Start, and every meaningful action, both
// page exits and the closing End are blocks the CHILD places. 星夜/晨雾, the wait
// rhythm, the preset dialogue and how the raft's leg is paced are four real
// choices, and the sea is a template BRANCH — the card decides which whitelisted
// starter seeds the project, so the sea they picked is the sea the studio paints
// and the sea the saved document stores.
//
// Nothing on this page is asserted; four different things are measured:
//   * the SAVED `BlocksProject` must satisfy the personal-route grammar
//     (`jtwC3RouteDesign`) AND carry the studio's own run+save marker, so
//     "未保存不通过" and "循环、死页、空Page 2 不通过" are structural;
//   * the peer's page-by-page prediction is compared against a REAL run, and the
//     first page they disagree on is named — the scene's 第一次不一致, not a
//     fixed answer key;
//   * 关闭重开 really re-fetches the document from the server and compares the
//     two loads byte for byte ("JSON一致"), citing the server's own version id;
//   * and the rerun walks THAT reopened document from Page 1 through the real
//     `PageFlowRunner`, requiring `1 → 2 → 3`, `stoppedBy === 'end'` and every
//     page boundary continuous.
//
// Continue persists the evidence server-side and unlocks ONLY jtw-s1-c3-p8. No
// seal element exists on this page: 远行印 is C3-P8's server-side aggregation.

import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { createBlocksProject, loadBlocksProject } from '../blocksApi';
import type { BlocksProject } from '../blocksModel';
// Continuity is measured with chapter three's existing boundary helpers — they
// take a page-flow result and know nothing about C3-P6 in particular.
import {
  jtwC3JumpBoundaries,
  jtwC3JumpBoundariesContinuous,
  jtwC3JumpDecodeBoundaries,
  jtwC3JumpEncodeBoundaries,
  type JtwC3Boundary,
} from '../jtwC3JumpFix';
import {
  JTW_C3_P7_TEMPLATES,
  jtwC3RouteEncodeExits,
  jtwC3RouteEncodeLedger,
  jtwC3RouteEncodeOps,
  jtwC3RouteFingerprint,
} from '../jtwC3PersonalRoute';
import { JTW_C3_FAR_SHORE_PAGE } from '../jtwC3SeaBuild';
import { JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage';
import {
  jtwC3ParseWeather,
  jtwC3WeatherVersion,
  JTW_C3_WEATHER_VERSIONS,
  type JtwC3Weather,
} from '../jtwC3WeatherBuild';
import { JourneyWestC3BoundaryTable } from './JourneyWestC3BoundaryTable';
import { JourneyWestC3Stage } from './JourneyWestC3Stage';
import { useJtwC3RouteRun } from './journeyWestC3RouteRun';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { c3p2EncodeFootprints, c3p2FootprintsOf, c3p2PageLabel } from './journeyWestC3Part2Program';
import {
  C3_P7_BOUNDARY_TITLE,
  C3_P7_BUILD_DONE_LABEL,
  C3_P7_BUILD_NOTE,
  C3_P7_BUILD_PENDING_LABEL,
  C3_P7_BUILD_TITLE,
  C3_P7_CLASSIC_CARD,
  C3_P7_CONTINUE_LABEL,
  C3_P7_CREATE_ERROR,
  C3_P7_DESIGN_TITLE,
  C3_P7_LEDGER_TITLE,
  C3_P7_LOADING_HINT,
  C3_P7_LOCKED_HINT,
  C3_P7_MISMATCH_MATCHED,
  C3_P7_MISMATCH_UNVISITED,
  C3_P7_NEXT_PART_ID,
  C3_P7_NEXT_SCREEN_LABEL,
  C3_P7_OPEN_STUDIO_BUSY,
  C3_P7_OPEN_STUDIO_DONE,
  C3_P7_OPEN_STUDIO_LOCKED,
  C3_P7_OPEN_STUDIO_NEW,
  C3_P7_OPEN_STUDIO_RESUME,
  C3_P7_PART_ID,
  C3_P7_PEER_NOTE,
  C3_P7_PEER_OPTIONS,
  C3_P7_PEER_TITLE,
  C3_P7_PREV_SCREEN_LABEL,
  C3_P7_PROJECT_TITLE,
  C3_P7_REOPEN_AGAIN_LABEL,
  C3_P7_REOPEN_BUSY_LABEL,
  C3_P7_REOPEN_DIFFERS,
  C3_P7_REOPEN_ERROR,
  C3_P7_REOPEN_LABEL,
  C3_P7_REOPEN_LOCKED_HINT,
  C3_P7_REOPEN_MATCH,
  C3_P7_REOPEN_MATCH_MARKER,
  C3_P7_REOPEN_NOTE,
  C3_P7_REOPEN_TITLE,
  C3_P7_RESOLVED_TITLE,
  C3_P7_RESOLVED_WORLD_CHANGE,
  C3_P7_RUN_AGAIN_LABEL,
  C3_P7_RUN_BUSY_LABEL,
  C3_P7_RUN_LABEL,
  C3_P7_RUN_LOCKED_HINT,
  C3_P7_RUN_NOTE,
  C3_P7_RUN_TITLE,
  C3_P7_RUN_TRACE_TITLE,
  C3_P7_SCREEN_IDS,
  C3_P7_SEAL_NOTE,
  C3_P7_STARTER_NOTE,
  C3_P7_STARTER_TITLE,
  C3_P7_STORY_AFTER,
  C3_P7_STORY_BRIDGE,
  C3_P7_STORY_SCREENS,
  C3_P7_STRUCTURE_ROWS,
  C3_P7_STRUCTURE_TITLE,
  C3_P7_TARGET_TRACE,
  C3_P7_TRACE_MISMATCH_HINT,
  C3_P7_WEATHER_LOCKED_NOTE,
  C3_P7_WEATHER_NOTE,
  C3_P7_WEATHER_TITLE,
  C3_P7_WORK_NAME,
  c3p7BuildDone,
  c3p7DecodePeer,
  c3p7EncodePeer,
  c3p7FirstMismatch,
  c3p7MeasuredAnswers,
  c3p7MismatchHint,
  c3p7PeerAnswered,
  c3p7StoryRead,
  findC3PersonalRouteBuild,
} from './journeyWestC3Part7Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

/** What the explicit 关闭重开 really measured. */
interface ReopenResult {
  version: number;
  /** The reopened document — what the rerun below actually runs. */
  project: BlocksProject;
  /** The two loads serialized to the same bytes. */
  identical: boolean;
}

export function JourneyWestC3Part7Page({
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
    queryKey: ['jtw-c3-p7-build', kidId],
    queryFn: () => findC3PersonalRouteBuild(kidId!),
    enabled: !!kidId,
  });

  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C3_P7_SCREEN_IDS[0]]);
  const [pickedWeather, setPickedWeather] = useState<JtwC3Weather | null>(null);
  const [peer, setPeer] = useState<Record<number, string>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState(false);
  const [reopen, setReopen] = useState<ReopenResult | null>(null);
  const [savedReopenOk, setSavedReopenOk] = useState(false);

  const { stagePage, sprites, saying, running, run, runProject, clearRun } =
    useJtwC3RouteRun(previewSleep);
  const [savedTrace, setSavedTrace] = useState<number[]>([]);
  const [savedBoundaries, setSavedBoundaries] = useState<JtwC3Boundary[]>([]);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C3_P7_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C3_P7_PART_ID) ?? false;

  // A refreshed page restores this Part's own saved evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C3_P7_SCREEN_IDS]);
    setPickedWeather(jtwC3ParseWeather(evidence.selections?.weather_version?.[0]));
    setPeer(c3p7DecodePeer(evidence.selections?.peer_predictions ?? []));
    setSavedReopenOk(
      (evidence.selections?.reopen_match ?? []).includes(C3_P7_REOPEN_MATCH_MARKER),
    );
    setSavedTrace((evidence.selections?.page_trace ?? []).map(Number));
    setSavedBoundaries(jtwC3JumpDecodeBoundaries(evidence.selections?.run_boundaries ?? []));
    setRestored(true);
  }

  // The sea the child really committed to is the one their own saved project was
  // seeded with; the card picker only decides which starter to create.
  const startedWeather = build.data?.startedWeather ?? null;
  const weatherId = startedWeather ?? pickedWeather;
  const weatherLocked = startedWeather !== null;
  const weather = weatherId ? jtwC3WeatherVersion(weatherId) : null;

  const storyRead = c3p7StoryRead(screensRead);
  const design = build.data?.design ?? null;
  // VFS truth only: the SAVED document must satisfy the whole structure AND the
  // studio must have recorded its own verified run + save for this lesson.
  const buildDone = c3p7BuildDone(build.data);
  const peerAnswered = c3p7PeerAnswered(peer);
  const reopenOk = reopen ? reopen.identical : savedReopenOk;

  // A live run is judged on what the runner measured; a restored one can only be
  // re-read off the rows the run itself stored.
  const boundaries = run ? jtwC3JumpBoundaries(run) : savedBoundaries;
  const trace = run ? run.trace : savedTrace;
  const traceReached =
    trace.length === C3_P7_TARGET_TRACE.length &&
    C3_P7_TARGET_TRACE.every((page, index) => trace[index] === page);
  const stoppedAtEnd = run ? run.stoppedBy === 'end' : savedTrace.length > 0;
  const runOk = traceReached && stoppedAtEnd && jtwC3JumpBoundariesContinuous(boundaries);
  const mismatch = c3p7FirstMismatch(peer, run);
  // A page the route never opened has no measurement to compare against, which
  // is a different thing to explain than a page that ran and disagreed.
  const mismatchUnvisited =
    mismatch !== null && c3p7MeasuredAnswers(run)[mismatch] === undefined;
  const peerMatched = runOk && (run ? mismatch === null : peerAnswered);

  const completed = Boolean(savedEntry);
  const resolved = Boolean(
    storyRead && weatherId && buildDone && peerAnswered && reopenOk && runOk && peerMatched,
  );

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    if (!weatherId) return;
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: C3_P7_PROJECT_TITLE,
        template: JTW_C3_P7_TEMPLATES[weatherId],
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  /** 关闭重开: fetch the SAME project again and compare the two documents. */
  const reopenProject = useCallback(async () => {
    const projectId = build.data?.projectId;
    const savedProject = build.data?.project;
    if (!projectId || !savedProject || reopening) return;
    setReopening(true);
    setReopenError(false);
    // A reopen invalidates whatever the previous document was measured to do.
    clearRun();
    try {
      const loaded = await loadBlocksProject(projectId);
      setReopen({
        version: loaded.version,
        project: loaded.project,
        identical:
          jtwC3RouteFingerprint(loaded.project) === jtwC3RouteFingerprint(savedProject) &&
          loaded.version === build.data?.savedVersion,
      });
    } catch {
      setReopenError(true);
    }
    setReopening(false);
  }, [build.data?.project, build.data?.projectId, build.data?.savedVersion, clearRun, reopening]);

  /** Walk the REOPENED document from Page 1 through the real page-flow runner. */
  const runReopened = useCallback(async () => {
    if (!reopen?.project) return;
    await runProject(reopen.project);
  }, [reopen?.project, runProject]);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C3_P7_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          weather_version: weatherId ? [weatherId] : [],
          // The structure, read back off the SAVED document.
          route_ops: design ? jtwC3RouteEncodeOps(design) : [],
          route_exits: design ? jtwC3RouteEncodeExits(design) : [],
          block_ledger: design ? jtwC3RouteEncodeLedger(design) : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          // Save · close · reopen — the server's own version ids, twice.
          saved_version:
            build.data?.savedVersion === null || build.data?.savedVersion === undefined
              ? []
              : [String(build.data.savedVersion)],
          reopen_version: reopen ? [String(reopen.version)] : [],
          reopen_match: reopenOk ? [C3_P7_REOPEN_MATCH_MARKER] : [],
          // The peer's reading, and the page it first disagreed with the run on.
          peer_predictions: c3p7EncodePeer(peer),
          first_mismatch: [mismatch === null ? 'none' : `page${mismatch}`],
          // The rerun of the REOPENED document, measured page by page.
          page_trace: trace.map(String),
          run_footprints: c3p2EncodeFootprints(c3p2FootprintsOf(run)),
          run_boundaries: jtwC3JumpEncodeBoundaries(boundaries),
          run_stop: run ? [run.stoppedBy] : [],
          exit_page: [String(JTW_C3_FAR_SHORE_PAGE)],
          reopen_rerun: run ? [`trace:${run.trace.join('-')}`, `stop:${run.stoppedBy}`] : [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C3_P7_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P7_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p7-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P7_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p7">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第三章 一叶木筏求师路 · Part 7 · Personal Ship
        </p>
        <h1 className="text-[28px] font-black text-ink">我的三页求师路</h1>
        <p className="mt-1 text-[13px] font-bold text-ink-soft" data-testid="jtw-c3p7-work-name">
          作品名：{C3_P7_WORK_NAME}
        </p>
      </header>

      {/* ── story_before：教学脚本 Part 7，两屏 ──────────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p7-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C3_P7_STORY_SCREENS[screenIndex]}</p>
        <div className="flex items-center gap-2">
          {screenIndex > 0 ? (
            <button
              type="button"
              className="btn-pill-ghost text-[13px]"
              data-testid="jtw-c3p7-story-prev"
              onClick={() => setScreenIndex(0)}
            >
              {C3_P7_PREV_SCREEN_LABEL}
            </button>
          ) : (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c3p7-story-next"
              onClick={() => {
                setScreenIndex(1);
                setScreensRead((current) =>
                  current.includes(C3_P7_SCREEN_IDS[1])
                    ? current
                    : [...current, C3_P7_SCREEN_IDS[1]],
                );
              }}
            >
              {C3_P7_NEXT_SCREEN_LABEL}
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c3p7-story-count">
            {screensRead.length} / {C3_P7_SCREEN_IDS.length} 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C3_P7_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C3_P7_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── ①选一片海 ─────────────────────────────────────────────────── */}
      <section data-testid="jtw-c3p7-weather" data-chosen={weatherId ?? ''}>
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P7_WEATHER_TITLE}
          {weatherId && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <p className="mb-3 text-[13px] leading-6 text-ink-soft">
          {weatherLocked ? C3_P7_WEATHER_LOCKED_NOTE : C3_P7_WEATHER_NOTE}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {JTW_C3_WEATHER_VERSIONS.map((version) => (
            <button
              key={version.id}
              type="button"
              aria-pressed={weatherId === version.id}
              disabled={weatherLocked && startedWeather !== version.id}
              data-testid={`jtw-c3p7-weather-${version.id}`}
              className={clsx(
                'overflow-hidden rounded-2xl border text-left transition disabled:opacity-50',
                weatherId === version.id
                  ? 'border-brand-sky bg-wash-sky'
                  : 'border-hairline bg-canvas-pure hover:border-brand-sky/60',
              )}
              onClick={() => setPickedWeather(version.id)}
            >
              <img src={version.background} alt={version.label} className="h-28 w-full object-cover" />
              <span className="block px-3 py-2 text-[14px] font-bold text-ink">{version.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── ②真正的工作区 ─────────────────────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c3p7-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">{C3_P7_BUILD_TITLE}</h2>
        <p className="mt-1 text-[13px] leading-6 text-ink-soft">{C3_P7_BUILD_NOTE}</p>
        <div className="mt-3 rounded-2xl border border-hairline bg-canvas-pure p-3">
          <p className="text-[13px] font-bold text-ink">{C3_P7_STRUCTURE_TITLE}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5" data-testid="jtw-c3p7-structure">
            {C3_P7_STRUCTURE_ROWS.map((row) => (
              <li key={row.id} data-rule={row.id} className="text-[13px] leading-6 text-ink">
                {row.label}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] font-semibold text-ink-soft">
            {C3_P7_STARTER_TITLE}：{C3_P7_STARTER_NOTE}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c3p7-open-studio"
            disabled={creating || !weatherId}
            onClick={() => void openStudio()}
          >
            {creating
              ? C3_P7_OPEN_STUDIO_BUSY
              : buildDone
                ? C3_P7_OPEN_STUDIO_DONE
                : build.data?.projectId
                  ? C3_P7_OPEN_STUDIO_RESUME
                  : C3_P7_OPEN_STUDIO_NEW}
          </button>
          {!weatherId && (
            <span className="text-[13px] font-semibold text-ink-soft">
              {C3_P7_OPEN_STUDIO_LOCKED}
            </span>
          )}
          {buildDone ? (
            <span className="text-[13px] font-bold text-brand-mint" data-testid="jtw-c3p7-build-done">
              {C3_P7_BUILD_DONE_LABEL}
            </span>
          ) : (
            build.data?.projectId && (
              <span className="text-[13px] font-semibold text-ink-soft">
                {C3_P7_BUILD_PENDING_LABEL}
              </span>
            )
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            {C3_P7_CREATE_ERROR}
          </p>
        )}
      </section>

      {buildDone && design && (
        <>
          {/* ── 保存的三页，从作品里读回来 ─────────────────────────── */}
          <section className="space-y-3" data-testid="jtw-c3p7-design">
            <h2 className="text-[15px] font-bold text-ink">{C3_P7_DESIGN_TITLE}</h2>
            <ul className="space-y-3">
              {design.pages.map((page) => (
                <li
                  key={page.page}
                  data-testid={`jtw-c3p7-design-page-${page.page}`}
                  data-actions={page.actions.length}
                  data-move-total={page.moveTotal}
                  data-exit={page.ends ? 'end' : String(page.exitTo)}
                  className="rounded-2xl border border-hairline bg-canvas-pure p-3"
                >
                  <p className="text-[14px] font-bold text-ink">
                    Page {page.page} · {c3p2PageLabel(page.page)}
                    <span className="ml-2 text-[12px] font-semibold text-ink-soft">
                      {page.actions.length} 块动作 · 向右 {page.moveTotal} 格 ·{' '}
                      {page.ends ? '🏁 End 结束' : `📄 出口 → Page ${page.exitTo}`}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {page.actions.map((block, index) => (
                      <BlockChip
                        key={`${block.op}-${index}`}
                        block={block}
                        inChain
                        isLast={index === page.actions.length - 1}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p
              className="text-[13px] font-semibold text-ink-soft"
              data-testid="jtw-c3p7-ledger"
              data-blocks={design.childBlocks}
              data-moves={design.moves}
              data-sounds={design.sounds}
              data-pace={design.paces}
            >
              {C3_P7_LEDGER_TITLE}：共 {design.childBlocks} 块 · 移动 {design.moves} · 声音{' '}
              {design.sounds} · Wait/Speed {design.paces} · 对白 {design.says} · 出口 2 · End 1
              {build.data?.savedVersion !== null && build.data?.savedVersion !== undefined && (
                <span data-testid="jtw-c3p7-saved-version"> · 保存版本 #{build.data.savedVersion}</span>
              )}
            </p>
          </section>

          {/* ── ③同伴逐页预测 ─────────────────────────────────────── */}
          <section data-testid="jtw-c3p7-peer" data-answered={peerAnswered ? '1' : '0'}>
            <h2 className="mb-2 text-[15px] font-bold text-ink">
              {C3_P7_PEER_TITLE}
              {peerAnswered && <span className="ml-2 text-brand-mint">✓</span>}
            </h2>
            <p className="mb-3 text-[13px] leading-6 text-ink-soft">{C3_P7_PEER_NOTE}</p>
            <ul className="space-y-3">
              {design.pages.map((page) => (
                <li
                  key={page.page}
                  className="space-y-2 rounded-2xl border border-hairline bg-canvas-pure p-3"
                  data-testid={`jtw-c3p7-peer-page-${page.page}`}
                  data-picked={peer[page.page] ?? ''}
                >
                  <p className="text-[14px] font-bold text-ink">
                    Page {page.page} · {c3p2PageLabel(page.page)} · 出口数字{' '}
                    {page.ends ? '🏁 End' : String(page.exitTo)}
                  </p>
                  <div className="flex flex-col gap-2">
                    {C3_P7_PEER_OPTIONS.map((option) => (
                      <Choice
                        key={option.id}
                        option={option}
                        active={peer[page.page] === option.id}
                        onPick={() => setPeer((current) => ({ ...current, [page.page]: option.id }))}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── ④保存 · 关闭 · 重开 ───────────────────────────────── */}
          <section
            className="space-y-3"
            data-testid="jtw-c3p7-reopen"
            data-match={reopenOk ? '1' : '0'}
          >
            <h2 className="text-[15px] font-bold text-ink">{C3_P7_REOPEN_TITLE}</h2>
            <p className="text-[13px] leading-6 text-ink-soft">{C3_P7_REOPEN_NOTE}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-pill-primary text-[14px]"
                data-testid="jtw-c3p7-reopen-button"
                disabled={!peerAnswered || reopening}
                onClick={() => void reopenProject()}
              >
                {reopening
                  ? C3_P7_REOPEN_BUSY_LABEL
                  : reopen
                    ? C3_P7_REOPEN_AGAIN_LABEL
                    : C3_P7_REOPEN_LABEL}
              </button>
              {!peerAnswered && (
                <span className="text-[13px] font-semibold text-ink-soft">
                  {C3_P7_REOPEN_LOCKED_HINT}
                </span>
              )}
            </div>
            {reopen && (
              <p
                className={clsx(
                  'text-[13px] font-semibold',
                  reopen.identical ? 'text-brand-mint' : 'text-brand-coral',
                )}
                data-testid="jtw-c3p7-reopen-result"
                data-version={reopen.version}
                role="status"
              >
                {reopen.identical ? C3_P7_REOPEN_MATCH : C3_P7_REOPEN_DIFFERS}
              </p>
            )}
            {reopenError && (
              <p className="text-[13px] font-semibold text-brand-coral" role="alert">
                {C3_P7_REOPEN_ERROR}
              </p>
            )}
          </section>

          {/* ── ⑤重开以后从 Page 1 跑一遍 ─────────────────────────── */}
          <section className="space-y-4" data-testid="jtw-c3p7-run" data-reached={runOk ? '1' : '0'}>
            <h2 className="text-[15px] font-bold text-ink">{C3_P7_RUN_TITLE}</h2>
            <p className="text-[13px] leading-6 text-ink-soft">{C3_P7_RUN_NOTE}</p>
            <JourneyWestC3Stage
              testIdPrefix="jtw-c3p7"
              pageNumber={stagePage}
              sprites={sprites}
              saying={saying}
              backgroundSrc={weather && stagePage === 2 ? weather.background : undefined}
              backgroundAlt={weather?.label}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-pill-primary text-[14px]"
                data-testid="jtw-c3p7-run-button"
                disabled={!reopenOk || !reopen || running}
                onClick={() => void runReopened()}
              >
                {running ? C3_P7_RUN_BUSY_LABEL : run ? C3_P7_RUN_AGAIN_LABEL : C3_P7_RUN_LABEL}
              </button>
              {(!reopenOk || !reopen) && (
                <span className="text-[13px] font-semibold text-ink-soft">
                  {C3_P7_RUN_LOCKED_HINT}
                </span>
              )}
            </div>
            {trace.length > 0 && (
              <div className="space-y-2" data-testid="jtw-c3p7-trace" data-trace={trace.join('-')}>
                <p className="text-[13px] font-bold text-ink">
                  {C3_P7_RUN_TRACE_TITLE} · {trace.map((page) => `Page ${page}`).join(' → ')}
                </p>
                {boundaries.length > 0 && (
                  <>
                    <p className="text-[13px] font-bold text-ink">{C3_P7_BOUNDARY_TITLE}</p>
                    <JourneyWestC3BoundaryTable
                      boundaries={boundaries}
                      testId="jtw-c3p7-boundaries"
                    />
                  </>
                )}
              </div>
            )}
            {trace.length > 0 && !runOk && (
              <p className="text-[13px] font-semibold text-brand-coral" role="status">
                {C3_P7_TRACE_MISMATCH_HINT}
              </p>
            )}
            {run && (
              <p
                className={clsx(
                  'text-[13px] font-semibold',
                  mismatch === null ? 'text-brand-mint' : 'text-brand-coral',
                )}
                data-testid="jtw-c3p7-mismatch"
                data-mismatch={mismatch === null ? 'none' : `page${mismatch}`}
              >
                {mismatch === null
                  ? C3_P7_MISMATCH_MATCHED
                  : `${c3p7MismatchHint(mismatch)}${mismatchUnvisited ? ` ${C3_P7_MISMATCH_UNVISITED}` : ''}`}
              </p>
            )}
          </section>
        </>
      )}

      {/* ── resolved world change + story_after ────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="space-y-3 rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p7-resolved"
        >
          <img
            src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
            alt="彼岸山林：木筏靠在浅滩上，上山的石阶亮着，师门的石牌在雾里"
            data-testid="jtw-c3p7-resolved-art"
            className="w-full rounded-2xl"
          />
          <p className="text-[13px] font-bold text-ink-soft">{C3_P7_RESOLVED_TITLE}</p>
          <p className="text-[15px] leading-7 text-ink">{C3_P7_RESOLVED_WORLD_CHANGE}</p>
          <p className="text-[13px] font-semibold text-ink-soft" data-testid="jtw-c3p7-seal-note">
            {C3_P7_SEAL_NOTE}
          </p>
          <p className="text-[15px] font-semibold text-ink">{C3_P7_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p7-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C3_P7_CONTINUE_LABEL}
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
