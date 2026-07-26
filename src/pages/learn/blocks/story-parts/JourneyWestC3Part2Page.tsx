// Journey to the West · C3-P2 "把出发和到达排成一条路" — chapter three's Story
// Hook (scene-specs JTW-S1-C3-P2).
//
// The child arranges the expected route (three page cards + two exit arrows),
// reads the Page 2 exit number and predicts what it will really do, then RUNS
// the UNMODIFIED three-page starter through the real interpreter on this page:
// the raft leaves the home shore, crosses the morning-mist sea — and Page 2's
// exit sends it straight back to Page 1, where the finite-step page-flow driver
// stops it. Two rows of footprints stay on screen (expected 1 → 2 → 3, actual
// 1 → 2 → 1) and only then can the child circle Page 2 as the first deviation.
//
// This Part LOCATES the error and nothing else: there is no fix affordance, the
// Page 2 exit is never edited, and NO project is written. Continue persists the
// evidence server-side and unlocks ONLY jtw-s1-c3-p3.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { BlockChip } from '../BlockChip';
import { GRID_H, GRID_W } from '../blocksModel';
import { startState, type SpriteState } from '../interpreter';
import { PageFlowRunner, type PageFlowRunResult } from '../pageFlowRun';
import { sfx } from '../sounds';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE2_BACKGROUND,
  JTW_C3_PAGE3_BACKGROUND,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SPRITE,
} from '../jtwC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C3_P2_ACTUAL_TRACE_TITLE,
  C3_P2_ARRIVAL_CLUE,
  C3_P2_CLASSIC_CARD,
  C3_P2_CONTINUE_LABEL,
  C3_P2_DEVIATION_OPTIONS,
  C3_P2_DEVIATION_PAGE,
  C3_P2_DEVIATION_QUESTION,
  C3_P2_DEVIATION_RETRY_HINT,
  C3_P2_EXIT_CARDS,
  C3_P2_EXIT_CARD_TITLE,
  C3_P2_EXIT_REJECT_HINT,
  C3_P2_EXPECTED_TRACE,
  C3_P2_EXPECTED_TRACE_TITLE,
  C3_P2_LOADING_HINT,
  C3_P2_LOCKED_HINT,
  C3_P2_NEVER_REACHED_NOTE,
  C3_P2_NEXT_SCREEN_LABEL,
  C3_P2_PAGE_CARDS,
  C3_P2_PAGE_CARD_TITLE,
  C3_P2_PREDICTION_OPTIONS,
  C3_P2_PREDICTION_QUESTION,
  C3_P2_PREDICTION_RETRY_HINT,
  C3_P2_PREV_SCREEN_LABEL,
  C3_P2_RESOLVED_WORLD_CHANGE,
  C3_P2_RUN_AGAIN_LABEL,
  C3_P2_RUN_BUSY_LABEL,
  C3_P2_RUN_FIRST_HINT,
  C3_P2_RUN_LABEL,
  C3_P2_RUN_NOTE,
  C3_P2_SCREEN_IDS,
  C3_P2_STARTER_PROJECT,
  C3_P2_STORY_AFTER,
  C3_P2_STORY_BRIDGE,
  C3_P2_STORY_SCREENS,
  c3p2DecodeFootprints,
  c3p2DeviationDone,
  c3p2EncodeFootprints,
  c3p2ExitsOrdered,
  c3p2FootprintsOf,
  c3p2PageLabel,
  c3p2PageOrdered,
  c3p2PagesNeverVisited,
  c3p2PredictionDone,
  c3p2RunReproducedLoop,
  c3p2TraceMatches,
  c3p2WrongExitPicked,
  type C3P2Footprint,
} from './journeyWestC3Part2Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c3-p2';
const NEXT_PART_ID = 'jtw-s1-c3-p3';

const PAGE_BACKGROUNDS: readonly string[] = [
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE2_BACKGROUND,
  JTW_C3_PAGE3_BACKGROUND,
];
const PAGE_ALTS: readonly string[] = [
  '花果山海岸：左边是长着桃树的山，右边的海一直连到天边',
  '海上中段：晨雾里的海面，远处的岛一层一层退向天边',
  '彼岸山林：靠岸的浅滩、上山的小路，山上是师门的石门',
];

/** Every sprite of a page in its start pose (what a page entry shows). */
function startSprites(pageNumber: number): Record<string, SpriteState> {
  const page = C3_P2_STARTER_PROJECT.pages[pageNumber - 1];
  const sprites: Record<string, SpriteState> = {};
  for (const character of page?.characters ?? []) sprites[character.id] = startState(character);
  return sprites;
}

const percent = (value: number, span: number) => `${(value / (span - 1)) * 100}%`;

/**
 * The three-page stage. One page is on screen at a time — exactly what the
 * runtime does — with the raft as its own layer under the monkey king, because
 * asset bible §6 forbids baking it into the background and §2.4 forbids leaving
 * his feet on open water.
 */
function ThreePageStage({
  pageNumber,
  sprites,
  saying,
}: {
  pageNumber: number;
  sprites: Record<string, SpriteState>;
  saying: string | null;
}) {
  const monkey = sprites[JTW_C3_MONKEY_KING_ID];
  const raft = sprites[JTW_C3_RAFT_ID];
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
      data-testid="jtw-c3p2-stage"
      data-page={pageNumber}
    >
      <img
        src={PAGE_BACKGROUNDS[pageNumber - 1]}
        alt={PAGE_ALTS[pageNumber - 1]}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {raft?.visible && (
        <img
          src={JTW_C3_RAFT_SPRITE}
          alt=""
          aria-hidden
          data-testid="jtw-c3p2-raft"
          data-gx={raft.gx}
          data-gy={raft.gy}
          className="absolute w-[22%] -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
          style={{ left: percent(raft.gx, GRID_W), top: percent(raft.gy, GRID_H) }}
        />
      )}
      {monkey?.visible && (
        <img
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt="Monkey King"
          data-testid="jtw-c3p2-monkey-king"
          data-gx={monkey.gx}
          data-gy={monkey.gy}
          data-size={monkey.size}
          className="absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200"
          style={{ left: percent(monkey.gx, GRID_W), top: percent(monkey.gy, GRID_H) }}
        />
      )}
      {saying && (
        <span
          data-testid="jtw-c3p2-say"
          className="absolute left-1/2 top-[8%] max-w-[52%] -translate-x-1/2 rounded-2xl border border-hairline bg-canvas-pure px-3 py-1 text-[13px] font-semibold text-ink"
        >
          {saying}
        </span>
      )}
    </div>
  );
}

/** One page's read-only starter track — the exits are visible, never editable. */
function StarterTrack({
  pageNumber,
  lit,
}: {
  pageNumber: number;
  lit: { scriptId: string; index: number } | null;
}) {
  const page = C3_P2_STARTER_PROJECT.pages[pageNumber - 1];
  return (
    <div className="space-y-2" data-testid={`jtw-c3p2-track-${pageNumber}`}>
      <p className="text-[13px] font-bold text-ink">
        Page {pageNumber} · {c3p2PageLabel(pageNumber)}
      </p>
      {page.characters
        .filter((character) => character.scripts.length > 0)
        .map((character) => (
          <div key={character.id} className="flex flex-wrap items-center gap-1">
            {character.scripts[0].blocks.map((block, index) => (
              <BlockChip
                key={`${block.op}-${index}`}
                block={block}
                inChain
                isLast={index === character.scripts[0].blocks.length - 1}
                lit={lit?.scriptId === character.scripts[0].id && lit.index === index}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

/** One row of page chips — the expected route and the real footprints share it. */
function TraceRow({
  title,
  pages,
  deviationPage,
  testId,
}: {
  title: string;
  pages: readonly number[];
  deviationPage: number | null;
  testId: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[13px] font-bold text-ink-soft">{title}</p>
      <ol className="flex flex-wrap items-center gap-2" data-testid={testId}>
        {pages.map((page, index) => (
          <li
            key={`${page}-${index}`}
            data-page={page}
            data-deviation={page === deviationPage}
            className={clsx(
              'rounded-2xl border px-3 py-2 text-[13px] font-semibold text-ink',
              page === deviationPage
                ? 'border-brand-coral/70 bg-wash-sunshine'
                : 'border-hairline bg-canvas-pure',
            )}
          >
            Page {page} · {c3p2PageLabel(page)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The per-page footprints the run measured: where the raft entered and left. */
function FootprintTable({ footprints }: { footprints: readonly C3P2Footprint[] }) {
  return (
    <ul className="flex flex-col gap-1" data-testid="jtw-c3p2-footprints">
      {footprints.map((footprint, index) => (
        <li
          key={`${footprint.page}-${index}`}
          data-page={footprint.page}
          data-enter={footprint.enterCell}
          data-exit={footprint.exitCell ?? ''}
          data-exit-to={footprint.exitTo ?? ''}
          className="rounded-2xl border border-hairline bg-canvas-pure px-3 py-2 text-[13px] text-ink"
        >
          <span className="font-bold">
            Page {footprint.page} · {c3p2PageLabel(footprint.page)}
          </span>
          {footprint.exitCell ? (
            <span className="ml-2">
              木筏从 {footprint.enterCell} 走到 {footprint.exitCell}
            </span>
          ) : (
            <span className="ml-2">木筏又回到这一页，路线在这里停下</span>
          )}
          <span className="ml-2 font-semibold text-ink-soft">
            {footprint.exitTo === null ? '（没有再去别的页）' : `出口 → Page ${footprint.exitTo}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function JourneyWestC3Part2Page({
  previewSleep,
}: {
  /** Injectable run timing for tests (mirrors BlocksRunner's injectable sleep). */
  previewSleep?: (ms: number) => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C3_P2_SCREEN_IDS[0]]);
  const [pageOrder, setPageOrder] = useState<string[]>([]);
  const [exitOrder, setExitOrder] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [deviation, setDeviation] = useState<string | null>(null);
  const [deviationMissed, setDeviationMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const [stagePage, setStagePage] = useState(1);
  const [sprites, setSprites] = useState<Record<string, SpriteState>>(() => startSprites(1));
  const [saying, setSaying] = useState<string | null>(null);
  const [lit, setLit] = useState<{ scriptId: string; index: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<PageFlowRunResult | null>(null);
  const [savedFootprints, setSavedFootprints] = useState<C3P2Footprint[]>([]);
  const [savedTrace, setSavedTrace] = useState<number[]>([]);
  const runnerRef = useRef<PageFlowRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stop(), []);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved plan, run and first-deviation evidence.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C3_P2_SCREEN_IDS]);
    setPageOrder(evidence.selections?.expected_page_order ?? []);
    setExitOrder(evidence.selections?.expected_exits ?? []);
    setDeviation(evidence.selections?.first_deviation?.[0] ?? null);
    setSavedFootprints(c3p2DecodeFootprints(evidence.selections?.run_footprints ?? []));
    setSavedTrace((evidence.selections?.page_trace ?? []).map(Number));
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const pagesOrdered = c3p2PageOrdered(pageOrder);
  const exitsOrdered = c3p2ExitsOrdered(exitOrder);
  const wrongExitPicked = c3p2WrongExitPicked(exitOrder);
  const predictionDone = c3p2PredictionDone(prediction);
  const planDone = pagesOrdered && exitsOrdered && predictionDone;

  const footprints = run ? c3p2FootprintsOf(run) : savedFootprints;
  const actualTrace = run ? run.trace : savedTrace;
  const runOk = run ? c3p2RunReproducedLoop(run) : c3p2TraceMatches(savedTrace);
  const deviationDone = c3p2DeviationDone(deviation);
  const completed = Boolean(savedEntry);
  const resolved = planDone && runOk && deviationDone;
  const neverVisited = c3p2PagesNeverVisited(actualTrace);

  const runStarter = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRun(null);
    setDeviation(null);
    setDeviationMissed(false);
    setSaying(null);
    const runner = new PageFlowRunner(C3_P2_STARTER_PROJECT, {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: previewSleep,
      onPageEnter: (page) => {
        setStagePage(page);
        setSprites(startSprites(page));
        setSaying(null);
      },
      host: {
        onSprite: (charId, state) => setSprites((current) => ({ ...current, [charId]: state })),
        onSay: (_charId, text) => setSaying(text),
        onSound: (soundId) => sfx.playSound(soundId),
        onStep: (_charId, scriptId, index) => setLit({ scriptId, index }),
      },
    });
    runnerRef.current = runner;
    const result = await runner.run();
    runnerRef.current = null;
    setLit(null);
    setRun(result);
    setRunning(false);
  }, [previewSleep, running]);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          expected_page_order: pageOrder,
          expected_exits: exitOrder,
          page_trace: actualTrace.map(String),
          run_footprints: c3p2EncodeFootprints(footprints),
          first_deviation: deviation ? [deviation] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  const runButtonLabel = useMemo(() => {
    if (running) return C3_P2_RUN_BUSY_LABEL;
    return run || savedFootprints.length > 0 ? C3_P2_RUN_AGAIN_LABEL : C3_P2_RUN_LABEL;
  }, [run, running, savedFootprints.length]);

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P2_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p2-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P2_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第三章 一叶木筏求师路 · Part 2
        </p>
        <h1 className="text-[28px] font-black text-ink">把出发和到达排成一条路</h1>
      </header>

      {/* ── story_before：故事卡C 与 Part 2 的任务说明，两屏 ────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p2-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C3_P2_STORY_SCREENS[screenIndex]}</p>
        <div className="flex items-center gap-2">
          {screenIndex > 0 ? (
            <button
              type="button"
              className="btn-pill-ghost text-[13px]"
              data-testid="jtw-c3p2-story-prev"
              onClick={() => setScreenIndex(0)}
            >
              {C3_P2_PREV_SCREEN_LABEL}
            </button>
          ) : (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c3p2-story-next"
              onClick={() => {
                setScreenIndex(1);
                setScreensRead((current) =>
                  current.includes(C3_P2_SCREEN_IDS[1]) ? current : [...current, C3_P2_SCREEN_IDS[1]],
                );
              }}
            >
              {C3_P2_NEXT_SCREEN_LABEL}
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c3p2-story-count">
            {screensRead.length} / {C3_P2_SCREEN_IDS.length} 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C3_P2_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C3_P2_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── 预期路线：三张页面卡 + 两张出口箭头 ────────────────────────── */}
      <OrderCards
        title={C3_P2_PAGE_CARD_TITLE}
        options={[...C3_P2_PAGE_CARDS]}
        order={pageOrder}
        onChange={setPageOrder}
        done={pagesOrdered}
        testId="jtw-c3p2-page-cards"
      />
      <div className="space-y-2">
        <OrderCards
          title={C3_P2_EXIT_CARD_TITLE}
          options={[...C3_P2_EXIT_CARDS]}
          order={exitOrder}
          onChange={setExitOrder}
          done={exitsOrdered}
          testId="jtw-c3p2-exit-cards"
        />
        {wrongExitPicked && (
          <p className="text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P2_EXIT_REJECT_HINT}
          </p>
        )}
      </div>

      {/* ── 预测：从 Page 2 出口积木上的数字读出来 ─────────────────────── */}
      <section data-testid="jtw-c3p2-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C3_P2_PREDICTION_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C3_P2_PREDICTION_OPTIONS.map((option) => (
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
            {C3_P2_PREDICTION_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── 舞台 + 三页只读 starter 轨道 + Go ──────────────────────────── */}
      <section className="space-y-4">
        <ThreePageStage pageNumber={stagePage} sprites={sprites} saying={saying} />
        <div className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-4">
          {C3_P2_STARTER_PROJECT.pages.map((page, index) => (
            <StarterTrack key={page.id} pageNumber={index + 1} lit={lit} />
          ))}
        </div>
        <p className="text-[12px] leading-6 text-ink-soft">{C3_P2_RUN_NOTE}</p>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p2-run"
          disabled={!planDone || running}
          onClick={() => void runStarter()}
        >
          {runButtonLabel}
        </button>
      </section>

      {/* ── 预期路线 vs 实际脚印 ───────────────────────────────────────── */}
      {footprints.length > 0 && (
        <section className="space-y-4" data-testid="jtw-c3p2-traces">
          <TraceRow
            title={C3_P2_EXPECTED_TRACE_TITLE}
            pages={C3_P2_EXPECTED_TRACE}
            deviationPage={null}
            testId="jtw-c3p2-expected-trace"
          />
          <TraceRow
            title={C3_P2_ACTUAL_TRACE_TITLE}
            pages={actualTrace}
            deviationPage={run?.firstLoopPage ?? (runOk ? C3_P2_DEVIATION_PAGE : null)}
            testId="jtw-c3p2-actual-trace"
          />
          <FootprintTable footprints={footprints} />
          {neverVisited.length > 0 && (
            <p className="text-[13px] font-semibold text-brand-coral" data-testid="jtw-c3p2-missed">
              {C3_P2_NEVER_REACHED_NOTE}
            </p>
          )}
        </section>
      )}

      {/* ── 第一次偏离：真的跑过一次才打开 ────────────────────────────── */}
      {footprints.length > 0 ? (
        <section data-testid="jtw-c3p2-deviation">
          <h2 className="mb-2 text-[15px] font-bold text-ink">{C3_P2_DEVIATION_QUESTION}</h2>
          <div className="flex flex-col gap-2">
            {C3_P2_DEVIATION_OPTIONS.map((option) => (
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
              {C3_P2_DEVIATION_RETRY_HINT}
            </p>
          )}
        </section>
      ) : (
        <p className="text-[13px] font-semibold text-brand-coral" data-testid="jtw-c3p2-run-first">
          {C3_P2_RUN_FIRST_HINT}
        </p>
      )}

      {/* ── resolved world change + story_after ────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p2-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C3_P2_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C3_P2_STORY_AFTER}</p>
          <p className="mt-2 text-[13px] text-ink-soft">
            Page 3 的到达对白还没有人听见：“{C3_P2_ARRIVAL_CLUE}”
          </p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p2-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C3_P2_CONTINUE_LABEL}
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
