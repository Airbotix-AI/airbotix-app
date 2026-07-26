// Journey to the West · C3-P6 "木筏跳了位置" — chapter three's Fix (scene-specs
// JTW-S1-C3-P6).
//
// The route works and the weather is the child's own, but the picture breaks:
// Page 2's start cell ships as `16/8`, so the raft leaves Page 1 on the right
// and turns up on Page 2 on the right AGAIN. The child states the expectation
// FIRST, runs the shipped bug for real, points at the boundary where the picture
// first breaks, chooses the smallest repair, drags Page 2's start back in the
// REAL studio, and reruns from Page 1.
//
// Everything here is measured, never asserted:
//   * the buggy run is a REAL `PageFlowRunner` run of the exact program the
//     whitelisted starter seeds — the discontinuity is watched, not narrated;
//   * the repair is read back off the SAVED document (`jtwC3JumpFixVersion`),
//     which accepts ONLY Page 2's start moved to the contract cell with every
//     other page, chain, exit, actor and size still the shipped one;
//   * and the fixed run is a second REAL cross-page run whose每一次跨页 the page
//     measures for continuity — the far shore alone is not enough.
//
// The sea being debugged is the one the child chose in C3-P5: that Part's stored
// `weather_version` decides which whitelisted starter seeds this project, so the
// weather chain "保持不变" means their own chain, not a default one. If the row
// cannot be read the page says so and offers no studio — it never guesses a sea.
//
// Continue persists the evidence server-side and unlocks ONLY jtw-s1-c3-p7. No
// seal element exists on this page: 远行印 is C3-P8's server-side aggregation.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import type { BlocksProject } from '../blocksModel';
import { startState, type SpriteState } from '../interpreter';
import { PageFlowRunner, type PageFlowRunResult } from '../pageFlowRun';
import { sfx } from '../sounds';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  JTW_C3_P6_TARGET_START_CELL,
  JTW_C3_P6_TEMPLATES,
  JTW_C3_P6_WRONG_START_CELL,
  jtwC3CellLabel,
  jtwC3JumpBoundaries,
  jtwC3JumpBoundariesContinuous,
  jtwC3JumpBugProject,
  jtwC3JumpDecodeBoundaries,
  jtwC3JumpEncodeBoundaries,
  jtwC3JumpFirstBreak,
  jtwC3JumpFixVersion,
  jtwC3JumpStartDiff,
  type JtwC3Boundary,
} from '../jtwC3JumpFix';
import { JTW_C3_FAR_SHORE_PAGE, JTW_C3_SEA_PAGE } from '../jtwC3SeaBuild';
import { JTW_C3_MONKEY_KING_ID } from '../jtwC3Stage';
import { jtwC3ParseWeather, jtwC3WeatherVersion, type JtwC3Weather } from '../jtwC3WeatherBuild';
import { JourneyWestC3Stage } from './JourneyWestC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { c3p2EncodeFootprints, c3p2FootprintsOf, c3p2PageLabel } from './journeyWestC3Part2Program';
import {
  C3_P6_BOUNDARY_BREAK,
  C3_P6_BOUNDARY_OK,
  C3_P6_BOUNDARY_TITLE,
  C3_P6_BREAK_OPTIONS,
  C3_P6_BREAK_QUESTION,
  C3_P6_BREAK_RETRY_HINT,
  C3_P6_BREAK_RUN_FIRST_HINT,
  C3_P6_BUG_RUN_AGAIN_LABEL,
  C3_P6_BUG_RUN_BUSY_LABEL,
  C3_P6_BUG_RUN_LABEL,
  C3_P6_BUG_RUN_LOCKED_HINT,
  C3_P6_BUG_RUN_NOTE,
  C3_P6_BUG_RUN_TITLE,
  C3_P6_BUG_TRACE_TITLE,
  C3_P6_BUILD_DONE_LABEL,
  C3_P6_BUILD_NOTE,
  C3_P6_BUILD_PENDING_LABEL,
  C3_P6_BUILD_TITLE,
  C3_P6_CLASSIC_CARD,
  C3_P6_CONTINUE_LABEL,
  C3_P6_CREATE_ERROR,
  C3_P6_DIFF_EMPTY,
  C3_P6_DIFF_NOTE,
  C3_P6_DIFF_TITLE,
  C3_P6_EXPECT_OPTIONS,
  C3_P6_EXPECT_RETRY_HINT,
  C3_P6_EXPECT_TITLE,
  C3_P6_FIXED_TRACE_TITLE,
  C3_P6_FIX_OPTIONS,
  C3_P6_FIX_QUESTION,
  C3_P6_FIX_RETRY_HINT,
  C3_P6_LESSON_ID,
  C3_P6_LOADING_HINT,
  C3_P6_LOCKED_HINT,
  C3_P6_NEXT_PART_ID,
  C3_P6_NEXT_SCREEN_LABEL,
  C3_P6_NO_VERSION_HINT,
  C3_P6_OPEN_STUDIO_BUSY,
  C3_P6_OPEN_STUDIO_DONE,
  C3_P6_OPEN_STUDIO_LOCKED,
  C3_P6_OPEN_STUDIO_NEW,
  C3_P6_OPEN_STUDIO_RESUME,
  C3_P6_PART_ID,
  C3_P6_PEER_ROWS,
  C3_P6_PEER_TITLE,
  C3_P6_PREV_PART_ID,
  C3_P6_PREV_SCREEN_LABEL,
  C3_P6_PROJECT_TITLE,
  C3_P6_RECENT_PROJECTS_TO_SCAN,
  C3_P6_RESOLVED_TITLE,
  C3_P6_RESOLVED_WORLD_CHANGE,
  C3_P6_RUN_AGAIN_LABEL,
  C3_P6_RUN_BUSY_LABEL,
  C3_P6_RUN_LABEL,
  C3_P6_RUN_LOCKED_HINT,
  C3_P6_RUN_NOTE,
  C3_P6_RUN_TITLE,
  C3_P6_SCREEN_IDS,
  C3_P6_SEAL_NOTE,
  C3_P6_STORY_AFTER,
  C3_P6_STORY_BRIDGE,
  C3_P6_STORY_SCREENS,
  C3_P6_TARGET_TRACE,
  C3_P6_TRACE_MISMATCH_HINT,
  c3p6BreakFound,
  c3p6DecodePeer,
  c3p6EncodePeer,
  c3p6ExpectationStated,
  c3p6FixChosen,
  c3p6PeerCorrect,
  c3p6StoryRead,
} from './journeyWestC3Part6Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

interface JumpFixStatus {
  projectId: string | null;
  /** The SAVED project, so the rerun really runs the child's own repair. */
  project: BlocksProject | null;
  /** The version the SAVED document is once Page 2's start is back on cell. */
  fixedVersion: JtwC3Weather | null;
  /** The saved document satisfies the whole repair contract. */
  programMatches: boolean;
  /** The studio recorded a finished run + save for this lesson. */
  runCompleted: boolean;
  /** The one position row the repair really changed (empty until it does). */
  positionDiff: string[];
}

const NO_BUILD: JumpFixStatus = {
  projectId: null,
  project: null,
  fixedVersion: null,
  programMatches: false,
  runCompleted: false,
  positionDiff: [],
};

/** Find the kid's REAL saved repair for this lesson by reading the VFS. */
async function findJumpFix(kidId: string): Promise<JumpFixStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, C3_P6_RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== C3_P6_LESSON_ID) continue;
      return {
        projectId: meta.id,
        project: loaded.project,
        fixedVersion: jtwC3JumpFixVersion(loaded.project),
        programMatches: storyMissionProgramMatches(loaded.project, C3_P6_LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[C3_P6_LESSON_ID]),
        positionDiff: jtwC3JumpStartDiff(loaded.project),
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

/** The measured page boundaries of one real cross-page run. */
function BoundaryTable({
  boundaries,
  testId,
}: {
  boundaries: readonly JtwC3Boundary[];
  testId: string;
}) {
  return (
    <ul className="flex flex-col gap-1" data-testid={testId}>
      {boundaries.map((boundary) => (
        <li
          key={`${boundary.from}-${boundary.to}`}
          data-boundary={`${boundary.from}-${boundary.to}`}
          data-exit={boundary.exitCell}
          data-enter={boundary.enterCell}
          data-continuous={boundary.continuous ? '1' : '0'}
          className={clsx(
            'rounded-2xl border px-3 py-2 text-[13px]',
            boundary.continuous
              ? 'border-brand-mint/50 bg-wash-mint text-ink'
              : 'border-brand-coral/50 bg-canvas-pure text-ink',
          )}
        >
          <span className="font-bold">
            Page {boundary.from} · {c3p2PageLabel(boundary.from)} → Page {boundary.to} ·{' '}
            {c3p2PageLabel(boundary.to)}
          </span>
          <span className="ml-2 font-semibold text-ink-soft">
            {boundary.exitCell} 离开 → {boundary.enterCell} 出现 ·{' '}
            {boundary.continuous ? C3_P6_BOUNDARY_OK : C3_P6_BOUNDARY_BREAK}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function JourneyWestC3Part6Page({
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
    queryKey: ['jtw-c3-p6-build', kidId],
    queryFn: () => findJumpFix(kidId!),
    enabled: !!kidId,
  });

  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C3_P6_SCREEN_IDS[0]]);
  const [expectation, setExpectation] = useState<string | null>(null);
  const [breakPick, setBreakPick] = useState<string | null>(null);
  const [fixPick, setFixPick] = useState<string | null>(null);
  const [peer, setPeer] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const [bugPage, setBugPage] = useState(1);
  const [bugSprites, setBugSprites] = useState<Record<string, SpriteState>>({});
  const [bugSaying, setBugSaying] = useState<string | null>(null);
  const [bugRunning, setBugRunning] = useState(false);
  const [bugRun, setBugRun] = useState<PageFlowRunResult | null>(null);
  const [savedBugBoundaries, setSavedBugBoundaries] = useState<JtwC3Boundary[]>([]);

  const [fixPage, setFixPage] = useState(1);
  const [fixSprites, setFixSprites] = useState<Record<string, SpriteState>>({});
  const [fixSaying, setFixSaying] = useState<string | null>(null);
  const [fixRunning, setFixRunning] = useState(false);
  const [fixRun, setFixRun] = useState<PageFlowRunResult | null>(null);
  const [savedFixBoundaries, setSavedFixBoundaries] = useState<JtwC3Boundary[]>([]);
  const [savedTrace, setSavedTrace] = useState<number[]>([]);

  const bugRunnerRef = useRef<PageFlowRunner | null>(null);
  const fixRunnerRef = useRef<PageFlowRunner | null>(null);
  useEffect(
    () => () => {
      bugRunnerRef.current?.stop();
      fixRunnerRef.current?.stop();
    },
    [],
  );

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C3_P6_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C3_P6_PART_ID) ?? false;

  // The sea the child really chose in C3-P5, read back off THAT Part's row.
  const previousEntry = progress.data?.completed.find(
    (entry) => entry.part_id === C3_P6_PREV_PART_ID,
  );
  const version = jtwC3ParseWeather(
    (previousEntry?.evidence as StoryPartEvidence | undefined)?.selections?.weather_version?.[0],
  );
  const weather = version ? jtwC3WeatherVersion(version) : null;

  // A refreshed page restores this Part's own saved evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C3_P6_SCREEN_IDS]);
    setExpectation(evidence.selections?.expectation?.[0] ?? null);
    setBreakPick(evidence.selections?.first_break?.[0] ?? null);
    setFixPick(evidence.selections?.fix_choice?.[0] ?? null);
    setPeer(c3p6DecodePeer(evidence.selections?.peer_continuity ?? []));
    setSavedBugBoundaries(jtwC3JumpDecodeBoundaries(evidence.selections?.bug_boundaries ?? []));
    setSavedFixBoundaries(jtwC3JumpDecodeBoundaries(evidence.selections?.run_boundaries ?? []));
    setSavedTrace((evidence.selections?.page_trace ?? []).map(Number));
    setRestored(true);
  }

  const storyRead = c3p6StoryRead(screensRead);
  const expectationDone = c3p6ExpectationStated(expectation);
  // A live run is judged on what the runner measured; a restored one can only
  // be re-read off the boundary rows the run itself stored.
  const bugBoundaries = bugRun ? jtwC3JumpBoundaries(bugRun) : savedBugBoundaries;
  const bugRunDone = bugBoundaries.length > 0;
  const bugBreak = bugRun
    ? jtwC3JumpFirstBreak(bugRun)
    : (savedBugBoundaries.find((boundary) => !boundary.continuous) ?? null);
  const breakFound = c3p6BreakFound(breakPick);
  const fixChosen = c3p6FixChosen(fixPick);

  const buildDone = Boolean(
    build.data?.programMatches && build.data.runCompleted && build.data.fixedVersion === version,
  );
  const positionDiff = build.data?.positionDiff ?? [];

  const fixBoundaries = fixRun ? jtwC3JumpBoundaries(fixRun) : savedFixBoundaries;
  const trace = fixRun ? fixRun.trace : savedTrace;
  const traceReached =
    trace.length === C3_P6_TARGET_TRACE.length &&
    C3_P6_TARGET_TRACE.every((page, index) => trace[index] === page);
  const runContinuous = jtwC3JumpBoundariesContinuous(fixBoundaries);
  const stoppedAtEnd = fixRun ? fixRun.stoppedBy === 'end' : savedTrace.length > 0;
  const fixRunDone = traceReached && runContinuous && stoppedAtEnd;
  const peerCorrect = c3p6PeerCorrect(peer);

  const completed = Boolean(savedEntry);
  const resolved = Boolean(
    storyRead &&
      version &&
      expectationDone &&
      bugRunDone &&
      breakFound &&
      fixChosen &&
      buildDone &&
      fixRunDone &&
      positionDiff.length === 1 &&
      peerCorrect,
  );

  const runBug = useCallback(async () => {
    if (!version || bugRunning) return;
    const project = jtwC3JumpBugProject(version);
    setBugRunning(true);
    setBugSaying(null);
    const runner = new PageFlowRunner(project, {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: previewSleep,
      onPageEnter: (page) => {
        setBugPage(page);
        setBugSprites(startSprites(project, page));
        setBugSaying(null);
      },
      host: {
        onSprite: (charId, state) => setBugSprites((current) => ({ ...current, [charId]: state })),
        onSay: (_charId, text) => setBugSaying(text),
        onSound: (soundId) => sfx.playSound(soundId),
      },
    });
    bugRunnerRef.current = runner;
    const result = await runner.run();
    bugRunnerRef.current = null;
    setBugRun(result);
    setBugRunning(false);
  }, [bugRunning, previewSleep, version]);

  const runSavedProject = useCallback(async () => {
    const project = build.data?.project;
    if (!project || fixRunning) return;
    setFixRunning(true);
    setFixSaying(null);
    const runner = new PageFlowRunner(project, {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: previewSleep,
      onPageEnter: (page) => {
        setFixPage(page);
        setFixSprites(startSprites(project, page));
        setFixSaying(null);
      },
      host: {
        onSprite: (charId, state) => setFixSprites((current) => ({ ...current, [charId]: state })),
        onSay: (_charId, text) => setFixSaying(text),
        onSound: (soundId) => sfx.playSound(soundId),
      },
    });
    fixRunnerRef.current = runner;
    const result = await runner.run();
    fixRunnerRef.current = null;
    setFixRun(result);
    setFixRunning(false);
  }, [build.data?.project, fixRunning, previewSleep]);

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    if (!version) return;
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: C3_P6_PROJECT_TITLE,
        template: JTW_C3_P6_TEMPLATES[version],
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C3_P6_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          expectation: expectation ? [expectation] : [],
          // Debug — the buggy run really happened, and where it broke.
          bug_boundaries: jtwC3JumpEncodeBoundaries(bugBoundaries),
          bug_footprints: c3p2EncodeFootprints(c3p2FootprintsOf(bugRun)),
          first_break: breakPick ? [breakPick] : [],
          fix_choice: fixPick ? [fixPick] : [],
          // The single position the SAVED document really moved.
          position_diff: positionDiff,
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          weather_version: version ? [version] : [],
          // Run — measured by the real page-flow runner over that saved doc.
          run_boundaries: jtwC3JumpEncodeBoundaries(fixBoundaries),
          run_footprints: c3p2EncodeFootprints(c3p2FootprintsOf(fixRun)),
          page_trace: trace.map(String),
          run_stop: fixRun ? [fixRun.stoppedBy] : [],
          exit_page: [String(JTW_C3_FAR_SHORE_PAGE)],
          peer_continuity: c3p6EncodePeer(peer),
        },
        prediction: expectation ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C3_P6_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P6_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p6-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P6_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p6">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第三章 一叶木筏求师路 · Part 6 · Debug
        </p>
        <h1 className="text-[28px] font-black text-ink">木筏跳了位置</h1>
      </header>

      {/* ── story_before：教学脚本 Part 6 全文，两屏 ─────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p6-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C3_P6_STORY_SCREENS[screenIndex]}</p>
        <div className="flex items-center gap-2">
          {screenIndex > 0 ? (
            <button
              type="button"
              className="btn-pill-ghost text-[13px]"
              data-testid="jtw-c3p6-story-prev"
              onClick={() => setScreenIndex(0)}
            >
              {C3_P6_PREV_SCREEN_LABEL}
            </button>
          ) : (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c3p6-story-next"
              onClick={() => {
                setScreenIndex(1);
                setScreensRead((current) =>
                  current.includes(C3_P6_SCREEN_IDS[1]) ? current : [...current, C3_P6_SCREEN_IDS[1]],
                );
              }}
            >
              {C3_P6_NEXT_SCREEN_LABEL}
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c3p6-story-count">
            {screensRead.length} / {C3_P6_SCREEN_IDS.length} 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C3_P6_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C3_P6_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── ①预期：先说，再跑 ─────────────────────────────────────────── */}
      <section data-testid="jtw-c3p6-expect" data-answered={expectationDone ? '1' : '0'}>
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P6_EXPECT_TITLE}
          {expectationDone && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <div className="flex flex-col gap-2">
          {C3_P6_EXPECT_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={expectation === option.id}
              onPick={() => setExpectation(option.id)}
            />
          ))}
        </div>
        {expectation && !expectationDone && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P6_EXPECT_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── ②错误版真实运行 ───────────────────────────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p6-bug-run" data-ran={bugRunDone ? '1' : '0'}>
        <h2 className="text-[15px] font-bold text-ink">{C3_P6_BUG_RUN_TITLE}</h2>
        <p className="text-[13px] leading-6 text-ink-soft">{C3_P6_BUG_RUN_NOTE}</p>
        <JourneyWestC3Stage
          testIdPrefix="jtw-c3p6-bug"
          pageNumber={bugPage}
          sprites={bugSprites}
          saying={bugSaying}
          backgroundSrc={weather && bugPage === JTW_C3_SEA_PAGE ? weather.background : undefined}
          backgroundAlt={weather?.label}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary text-[14px]"
            data-testid="jtw-c3p6-bug-run-button"
            disabled={!expectationDone || !version || bugRunning}
            onClick={() => void runBug()}
          >
            {bugRunning
              ? C3_P6_BUG_RUN_BUSY_LABEL
              : bugRun
                ? C3_P6_BUG_RUN_AGAIN_LABEL
                : C3_P6_BUG_RUN_LABEL}
          </button>
          {!expectationDone && (
            <span className="text-[13px] font-semibold text-ink-soft">
              {C3_P6_BUG_RUN_LOCKED_HINT}
            </span>
          )}
        </div>
        {bugRunDone && (
          <div className="space-y-2" data-testid="jtw-c3p6-bug-boundaries-panel">
            <p className="text-[13px] font-bold text-ink">
              {C3_P6_BUG_TRACE_TITLE} · {C3_P6_BOUNDARY_TITLE}
            </p>
            <BoundaryTable boundaries={bugBoundaries} testId="jtw-c3p6-bug-boundaries" />
            {bugBreak && (
              <p
                className="text-[13px] font-semibold text-brand-coral"
                data-testid="jtw-c3p6-bug-break"
                data-boundary={`${bugBreak.from}-${bugBreak.to}`}
              >
                第一处断开：Page {bugBreak.from} 的 {bugBreak.exitCell} 离开，Page {bugBreak.to} 却从{' '}
                {bugBreak.enterCell} 出现——起点是 {jtwC3CellLabel(JTW_C3_P6_WRONG_START_CELL)}，不是{' '}
                {jtwC3CellLabel(JTW_C3_P6_TARGET_START_CELL)}。
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── ③第一次不连续 ─────────────────────────────────────────────── */}
      <section data-testid="jtw-c3p6-break">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P6_BREAK_QUESTION}
          {breakFound && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        {bugRunDone ? (
          <>
            <div className="flex flex-col gap-2">
              {C3_P6_BREAK_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={breakPick === option.id}
                  onPick={() => setBreakPick(option.id)}
                />
              ))}
            </div>
            {breakPick && !breakFound && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C3_P6_BREAK_RETRY_HINT}
              </p>
            )}
          </>
        ) : (
          <p className="text-[13px] font-semibold text-ink-soft" data-testid="jtw-c3p6-break-locked">
            {C3_P6_BREAK_RUN_FIRST_HINT}
          </p>
        )}
      </section>

      {/* ── ④最小修复 ─────────────────────────────────────────────────── */}
      {breakFound && (
        <section data-testid="jtw-c3p6-fix">
          <h2 className="mb-2 text-[15px] font-bold text-ink">
            {C3_P6_FIX_QUESTION}
            {fixChosen && <span className="ml-2 text-brand-mint">✓</span>}
          </h2>
          <div className="flex flex-col gap-2">
            {C3_P6_FIX_OPTIONS.map((option) => (
              <Choice
                key={option.id}
                option={option}
                active={fixPick === option.id}
                onPick={() => setFixPick(option.id)}
              />
            ))}
          </div>
          {fixPick && !fixChosen && (
            <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
              {C3_P6_FIX_RETRY_HINT}
            </p>
          )}
        </section>
      )}

      {/* ── ⑤真实工作区：拖回 Page 2 的起点 ───────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c3p6-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
        data-version={version ?? ''}
      >
        <h2 className="text-[15px] font-bold text-ink">{C3_P6_BUILD_TITLE}</h2>
        <p className="mt-1 text-[13px] leading-6 text-ink-soft">{C3_P6_BUILD_NOTE}</p>
        {!version && (
          <p
            className="mt-3 text-[13px] font-semibold text-brand-coral"
            data-testid="jtw-c3p6-no-version"
            role="alert"
          >
            {C3_P6_NO_VERSION_HINT}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c3p6-open-studio"
            disabled={creating || !version || !fixChosen}
            onClick={() => void openStudio()}
          >
            {creating
              ? C3_P6_OPEN_STUDIO_BUSY
              : buildDone
                ? C3_P6_OPEN_STUDIO_DONE
                : build.data?.projectId
                  ? C3_P6_OPEN_STUDIO_RESUME
                  : C3_P6_OPEN_STUDIO_NEW}
          </button>
          {!fixChosen && (
            <span className="text-[13px] font-semibold text-ink-soft">
              {C3_P6_OPEN_STUDIO_LOCKED}
            </span>
          )}
          {buildDone ? (
            <span className="text-[13px] font-bold text-brand-mint" data-testid="jtw-c3p6-build-done">
              {C3_P6_BUILD_DONE_LABEL}
            </span>
          ) : (
            build.data?.projectId && (
              <span className="text-[13px] font-semibold text-ink-soft">
                {C3_P6_BUILD_PENDING_LABEL}
              </span>
            )
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            {C3_P6_CREATE_ERROR}
          </p>
        )}
        <div className="mt-4 rounded-2xl border border-hairline bg-canvas-pure p-3">
          <p className="text-[13px] font-bold text-ink">{C3_P6_DIFF_TITLE}</p>
          <ul className="mt-1 flex flex-col gap-1" data-testid="jtw-c3p6-diff">
            {positionDiff.length === 0 ? (
              <li className="text-[13px] font-semibold text-ink-soft">{C3_P6_DIFF_EMPTY}</li>
            ) : (
              positionDiff.map((row) => (
                <li key={row} data-row={row} className="text-[14px] font-black text-ink">
                  {row}
                </li>
              ))
            )}
          </ul>
          {positionDiff.length === 1 && (
            <p className="mt-1 text-[12px] font-semibold text-ink-soft">{C3_P6_DIFF_NOTE}</p>
          )}
        </div>
      </section>

      {/* ── ⑥修复版真实跨页运行 ───────────────────────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p6-run" data-reached={fixRunDone ? '1' : '0'}>
        <h2 className="text-[15px] font-bold text-ink">{C3_P6_RUN_TITLE}</h2>
        <p className="text-[13px] leading-6 text-ink-soft">{C3_P6_RUN_NOTE}</p>
        <JourneyWestC3Stage
          testIdPrefix="jtw-c3p6-fix"
          pageNumber={fixPage}
          sprites={fixSprites}
          saying={fixSaying}
          backgroundSrc={weather && fixPage === JTW_C3_SEA_PAGE ? weather.background : undefined}
          backgroundAlt={weather?.label}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary text-[14px]"
            data-testid="jtw-c3p6-run-button"
            disabled={!buildDone || fixRunning}
            onClick={() => void runSavedProject()}
          >
            {fixRunning ? C3_P6_RUN_BUSY_LABEL : fixRun ? C3_P6_RUN_AGAIN_LABEL : C3_P6_RUN_LABEL}
          </button>
          {!buildDone && (
            <span className="text-[13px] font-semibold text-ink-soft">{C3_P6_RUN_LOCKED_HINT}</span>
          )}
        </div>
        {fixBoundaries.length > 0 && (
          <div className="space-y-2" data-testid="jtw-c3p6-fix-boundaries-panel" data-trace={trace.join('-')}>
            <p className="text-[13px] font-bold text-ink">
              {C3_P6_FIXED_TRACE_TITLE} · {trace.map((page) => `Page ${page}`).join(' → ')}
            </p>
            <BoundaryTable boundaries={fixBoundaries} testId="jtw-c3p6-fix-boundaries" />
          </div>
        )}
        {fixBoundaries.length > 0 && !fixRunDone && (
          <p className="text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P6_TRACE_MISMATCH_HINT}
          </p>
        )}
      </section>

      {/* ── ⑦同伴只看画面 ─────────────────────────────────────────────── */}
      {fixRunDone && (
        <section data-testid="jtw-c3p6-peer" data-correct={peerCorrect ? '1' : '0'}>
          <h2 className="mb-2 text-[15px] font-bold text-ink">
            {C3_P6_PEER_TITLE}
            {peerCorrect && <span className="ml-2 text-brand-mint">✓</span>}
          </h2>
          <ul className="space-y-3">
            {C3_P6_PEER_ROWS.map((row) => {
              const picked = peer[row.id] ?? null;
              const wrong =
                Boolean(picked) &&
                row.options.find((option) => option.id === picked)?.correct !== true;
              return (
                <li
                  key={row.id}
                  className="space-y-2 rounded-2xl border border-hairline bg-canvas-pure p-3"
                  data-testid={`jtw-c3p6-peer-${row.id}`}
                  data-picked={picked ?? ''}
                >
                  <p className="text-[14px] font-bold text-ink">{row.question}</p>
                  <div className="flex flex-col gap-2">
                    {row.options.map((option) => (
                      <Choice
                        key={option.id}
                        option={option}
                        active={picked === option.id}
                        onPick={() => setPeer((current) => ({ ...current, [row.id]: option.id }))}
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

      {/* ── resolved world change + story_after ────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="space-y-3 rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p6-resolved"
        >
          <p className="text-[13px] font-bold text-ink-soft">{C3_P6_RESOLVED_TITLE}</p>
          <p className="text-[15px] leading-7 text-ink">{C3_P6_RESOLVED_WORLD_CHANGE}</p>
          <p className="text-[13px] font-semibold text-ink-soft" data-testid="jtw-c3p6-seal-note">
            {C3_P6_SEAL_NOTE}
          </p>
          <p className="text-[15px] font-semibold text-ink">{C3_P6_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p6-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C3_P6_CONTINUE_LABEL}
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
