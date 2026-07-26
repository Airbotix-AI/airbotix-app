// Journey to the West · C3-P3 "页面出口不是门牌装饰" — chapter three's page-model
// Part (scene-specs JTW-S1-C3-P3).
//
// Part 2 found WHERE the route breaks. Part 3 builds the MODEL: the number on a
// page's exit block is the address of the next page, not a plaque on a door.
//
// The child reads Part 2's own saved footprints (fetched back from /story-parts,
// never re-narrated here), explains why the raft came home, names the ONE card
// that has to change, walks that loop on three floor cards, says the password —
// and only then predicts and tries the three candidate exit cards 1 / 2 / 3.
// Trying a card RUNS the C3-P2 starter with that one number swapped through the
// real page-flow runner, so "1 仍循环 / 2 停留重入 / 只有 3 到达" is measured on
// screen instead of asserted in a hint.
//
// Nothing is written to a project: the candidate projects are ephemeral copies,
// the shipped starter keeps its `goto_page 1`, and no editor is opened. Continue
// persists the evidence server-side and unlocks ONLY jtw-s1-c3-p4.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { BlockChip } from '../BlockChip';
import type { BlocksProject } from '../blocksModel';
import { startState, type SpriteState } from '../interpreter';
import { PageFlowRunner, type PageFlowRunResult } from '../pageFlowRun';
import { sfx } from '../sounds';
import { JTW_C3_MONKEY_KING_ID } from '../jtwC3Stage';
import { JourneyWestC3Stage } from './JourneyWestC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C3_P2_SCRIPT_IDS,
  C3_P2_STARTER_PROJECT,
  c3p2DecodeFootprints,
  c3p2EncodeFootprints,
  c3p2PageLabel,
  type C3P2Footprint,
} from './journeyWestC3Part2Program';
import {
  C3_P3_CANDIDATES,
  C3_P3_CLASSIC_CARD,
  C3_P3_CONNECTED_LABEL,
  C3_P3_CONTINUE_LABEL,
  C3_P3_FADED_LABEL,
  C3_P3_FOOTPRINT_MISSING_HINT,
  C3_P3_FOOTPRINT_TITLE,
  C3_P3_LOADING_HINT,
  C3_P3_LOCKED_HINT,
  C3_P3_LOOP_PAGE,
  C3_P3_NEXT_SCREEN_LABEL,
  C3_P3_NO_EDITOR_NOTE,
  C3_P3_OUTCOME_OPTIONS,
  C3_P3_PART2_ID,
  C3_P3_PASSWORD_OPTIONS,
  C3_P3_PASSWORD_QUESTION,
  C3_P3_PREDICT_RETRY_HINT,
  C3_P3_PREDICT_TITLE,
  C3_P3_PREV_SCREEN_LABEL,
  C3_P3_REASON_OPTIONS,
  C3_P3_REASON_QUESTION,
  C3_P3_REHEARSAL_TITLE,
  C3_P3_RESOLVED_WORLD_CHANGE,
  C3_P3_SCREEN_IDS,
  C3_P3_STARTER_TITLE,
  C3_P3_STORY_AFTER,
  C3_P3_STORY_BRIDGE,
  C3_P3_STORY_SCREENS,
  C3_P3_SWAP_OPTIONS,
  C3_P3_SWAP_QUESTION,
  C3_P3_TARGET_CARD_ID,
  C3_P3_TRY_BUSY_LABEL,
  C3_P3_TRY_LABEL,
  C3_P3_TRY_LOCKED_HINT,
  C3_P3_TRY_TITLE,
  C3_P3_WALK_CARDS,
  C3_P3_WALK_HINT,
  C3_P3_WALK_RESET_LABEL,
  C3_P3_WALK_TITLE,
  c3p3CandidateProject,
  c3p3DecodePredictions,
  c3p3EncodePredictions,
  c3p3FootprintsOf,
  c3p3HintFor,
  c3p3OutcomeSentence,
  c3p3PasswordDone,
  c3p3PredictionsAnswered,
  c3p3PredictionsCorrect,
  c3p3ReasonDone,
  c3p3RehearsalReached,
  c3p3StoryRead,
  c3p3SwapDone,
  c3p3TraceReached,
  c3p3WalkDone,
  type C3P3Candidate,
} from './journeyWestC3Part3Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c3-p3';
const NEXT_PART_ID = 'jtw-s1-c3-p4';

/** Every sprite of a page in its start pose (what a page entry shows). */
function startSprites(project: BlocksProject, pageNumber: number): Record<string, SpriteState> {
  const page = project.pages[pageNumber - 1];
  const sprites: Record<string, SpriteState> = {};
  for (const character of page?.characters ?? []) sprites[character.id] = startState(character);
  return sprites;
}

/** The Page 2 exit track of a project, read-only — the "出口卡" made visible. */
function ExitTrack({
  project,
  title,
  testId,
}: {
  project: BlocksProject;
  title: string;
  testId: string;
}) {
  const blocks =
    project.pages[C3_P3_LOOP_PAGE - 1]?.characters
      .flatMap((character) => character.scripts)
      .find((script) => script.id === C3_P2_SCRIPT_IDS.wrongExit)?.blocks ?? [];
  const exitNumber = blocks.find((block) => block.op === 'goto_page')?.n ?? null;
  return (
    <div className="space-y-2" data-testid={testId} data-exit={exitNumber ?? ''}>
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

/** Part 2's saved footprints, read-only. Nothing here is re-measured. */
function SavedFootprints({ footprints }: { footprints: readonly C3P2Footprint[] }) {
  return (
    <ul className="flex flex-col gap-1" data-testid="jtw-c3p3-part2-footprints">
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
          <span className="ml-2 font-semibold text-ink-soft">
            {footprint.exitTo === null ? '（路线在这里停下）' : `出口 → Page ${footprint.exitTo}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The three floor cards. A page can be stepped on more than once — that is the
 *  whole point of walking a loop — so this is not `OrderCards`. */
function FloorWalk({
  walk,
  onStep,
  onReset,
  done,
}: {
  walk: readonly string[];
  onStep: (cardId: string) => void;
  onReset: () => void;
  done: boolean;
}) {
  return (
    <section data-testid="jtw-c3p3-walk">
      <h2 className="mb-2 text-[15px] font-bold text-ink">
        {C3_P3_WALK_TITLE}
        {done && <span className="ml-2 text-brand-mint">✓</span>}
      </h2>
      <div className="flex flex-wrap gap-2">
        {C3_P3_WALK_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            className="rounded-2xl border border-hairline bg-canvas-pure px-4 py-3 text-[14px] font-semibold text-ink-soft transition hover:border-brand-sky/60"
            onClick={() => onStep(card.id)}
          >
            {card.label}
          </button>
        ))}
        {walk.length > 0 && (
          <button type="button" className="btn-pill-ghost text-[13px]" onClick={onReset}>
            {C3_P3_WALK_RESET_LABEL}
          </button>
        )}
      </div>
      <ol className="mt-2 flex flex-wrap items-center gap-2" data-testid="jtw-c3p3-walk-steps">
        {walk.map((cardId, index) => (
          <li
            key={`${cardId}-${index}`}
            data-card={cardId}
            className="rounded-2xl border border-brand-sky/60 bg-wash-sky px-3 py-1 text-[13px] font-semibold text-ink"
          >
            {index + 1}. {C3_P3_WALK_CARDS.find((card) => card.id === cardId)?.label}
          </li>
        ))}
      </ol>
      <p className="mt-1 text-[12px] text-ink-soft">{C3_P3_WALK_HINT}</p>
    </section>
  );
}

/** One candidate exit card: its prediction row, its try button and its result. */
function CandidateCard({
  candidate,
  prediction,
  onPredict,
  chosen,
  run,
  canTry,
  running,
  onTry,
}: {
  candidate: C3P3Candidate;
  prediction: string | null;
  onPredict: (outcomeId: string) => void;
  chosen: boolean;
  run: PageFlowRunResult | null;
  canTry: boolean;
  running: boolean;
  onTry: () => void;
}) {
  return (
    <li
      data-testid={`jtw-c3p3-candidate-${candidate.exit}`}
      data-chosen={chosen}
      data-trace={run ? run.trace.join('-') : ''}
      className={clsx(
        'space-y-2 rounded-2xl border p-4',
        chosen ? 'border-brand-sky bg-wash-sky' : 'border-hairline bg-canvas-pure',
      )}
    >
      <p className="text-[14px] font-bold text-ink">{candidate.label}</p>
      <div className="flex flex-col gap-2">
        {C3_P3_OUTCOME_OPTIONS.map((outcome) => (
          <Choice
            key={outcome.id}
            option={outcome}
            active={prediction === outcome.id}
            onPick={() => onPredict(outcome.id)}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn-pill-primary text-[13px]"
        data-testid={`jtw-c3p3-try-${candidate.exit}`}
        disabled={!canTry || running}
        onClick={onTry}
      >
        {running ? C3_P3_TRY_BUSY_LABEL : C3_P3_TRY_LABEL}
      </button>
      {run && (
        <p
          className="text-[13px] font-semibold text-ink"
          data-testid={`jtw-c3p3-result-${candidate.exit}`}
        >
          {c3p3OutcomeSentence(run)}
        </p>
      )}
    </li>
  );
}

export function JourneyWestC3Part3Page({
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
  const [screensRead, setScreensRead] = useState<string[]>([C3_P3_SCREEN_IDS[0]]);
  const [reason, setReason] = useState<string | null>(null);
  const [swap, setSwap] = useState<string | null>(null);
  const [walk, setWalk] = useState<string[]>([]);
  const [password, setPassword] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const [stagePage, setStagePage] = useState(1);
  const [sprites, setSprites] = useState<Record<string, SpriteState>>(() =>
    startSprites(C3_P2_STARTER_PROJECT, 1),
  );
  const [saying, setSaying] = useState<string | null>(null);
  const [runningExit, setRunningExit] = useState<number | null>(null);
  const [runs, setRuns] = useState<Record<string, PageFlowRunResult>>({});
  const [savedFootprints, setSavedFootprints] = useState<C3P2Footprint[]>([]);
  const [savedTrace, setSavedTrace] = useState<number[]>([]);
  const runnerRef = useRef<PageFlowRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stop(), []);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const part2Entry = progress.data?.completed.find((entry) => entry.part_id === C3_P3_PART2_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // Part 2's footprints are READ BACK from the server, never re-narrated here.
  const part2Evidence = part2Entry?.evidence as StoryPartEvidence | undefined;
  const part2Footprints = c3p2DecodeFootprints(part2Evidence?.selections?.run_footprints ?? []);
  const part2Trace = (part2Evidence?.selections?.page_trace ?? [])
    .map(Number)
    .filter((page) => Number.isInteger(page) && page > 0);

  // A refreshed page restores this Part's own saved evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C3_P3_SCREEN_IDS]);
    setReason(evidence.selections?.deviation_reason?.[0] ?? null);
    setSwap(evidence.selections?.card_to_swap?.[0] ?? null);
    setWalk(evidence.selections?.floor_walk ?? []);
    setPassword(evidence.selections?.password?.[0] ?? null);
    setPredictions(c3p3DecodePredictions(evidence.selections?.candidate_predictions ?? []));
    setChosen(evidence.selections?.chosen_exit_card?.[0] ?? null);
    setSavedFootprints(c3p2DecodeFootprints(evidence.selections?.rehearsal_footprints ?? []));
    setSavedTrace((evidence.selections?.rehearsal_trace ?? []).map(Number));
    setRestored(true);
  }

  const storyRead = c3p3StoryRead(screensRead);
  const reasonDone = c3p3ReasonDone(reason);
  const swapDone = c3p3SwapDone(swap);
  const walkDone = c3p3WalkDone(walk, part2Trace);
  const passwordDone = c3p3PasswordDone(password);
  const modelDone = reasonDone && swapDone && walkDone && passwordDone;
  const predictionsAnswered = c3p3PredictionsAnswered(predictions);
  const predictionsCorrect = c3p3PredictionsCorrect(predictions);

  const chosenCandidate = C3_P3_CANDIDATES.find((candidate) => candidate.id === chosen) ?? null;
  const chosenRun = chosen ? (runs[chosen] ?? null) : null;
  // A live run is judged on the runner's own stop reason; a restored one can only
  // be re-read off the trace the run really stored.
  const rehearsalOk = chosenRun ? c3p3RehearsalReached(chosenRun) : c3p3TraceReached(savedTrace);
  const chosenIsTarget = chosen === C3_P3_TARGET_CARD_ID;
  const completed = Boolean(savedEntry);
  const resolved =
    storyRead && modelDone && predictionsCorrect && chosenIsTarget && rehearsalOk;

  const rehearsalFootprints = chosenRun ? c3p3FootprintsOf(chosenRun) : savedFootprints;
  const rehearsalTrace = chosenRun ? chosenRun.trace : savedTrace;

  const tryCandidate = useCallback(
    async (candidate: C3P3Candidate) => {
      if (runningExit !== null) return;
      setRunningExit(candidate.exit);
      setChosen(candidate.id);
      setSaying(null);
      const project = c3p3CandidateProject(candidate.exit);
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
      setRuns((current) => ({ ...current, [candidate.id]: result }));
      setRunningExit(null);
    },
    [previewSleep, runningExit],
  );

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          deviation_reason: reason ? [reason] : [],
          card_to_swap: swap ? [swap] : [],
          floor_walk: walk,
          password: password ? [password] : [],
          candidate_predictions: c3p3EncodePredictions(predictions),
          chosen_exit_card: chosen ? [chosen] : [],
          rehearsal_trace: rehearsalTrace.map(String),
          rehearsal_footprints: c3p2EncodeFootprints(rehearsalFootprints),
        },
        prediction: chosenCandidate ? predictions[chosenCandidate.id] : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P3_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p3-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P3_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  const reasonHint = c3p3HintFor(C3_P3_REASON_OPTIONS, reason);
  const swapHint = c3p3HintFor(C3_P3_SWAP_OPTIONS, swap);
  const passwordHint = c3p3HintFor(C3_P3_PASSWORD_OPTIONS, password);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p3">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第三章 一叶木筏求师路 · Part 3
        </p>
        <h1 className="text-[28px] font-black text-ink">页面出口不是门牌装饰</h1>
      </header>

      {/* ── story_before：教学脚本 Part 3 离屏活动，两屏 ────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p3-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C3_P3_STORY_SCREENS[screenIndex]}</p>
        <div className="flex items-center gap-2">
          {screenIndex > 0 ? (
            <button
              type="button"
              className="btn-pill-ghost text-[13px]"
              data-testid="jtw-c3p3-story-prev"
              onClick={() => setScreenIndex(0)}
            >
              {C3_P3_PREV_SCREEN_LABEL}
            </button>
          ) : (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c3p3-story-next"
              onClick={() => {
                setScreenIndex(1);
                setScreensRead((current) =>
                  current.includes(C3_P3_SCREEN_IDS[1])
                    ? current
                    : [...current, C3_P3_SCREEN_IDS[1]],
                );
              }}
            >
              {C3_P3_NEXT_SCREEN_LABEL}
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c3p3-story-count">
            {screensRead.length} / {C3_P3_SCREEN_IDS.length} 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C3_P3_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C3_P3_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── 系统预置：Part 2 的只读脚印 + 只读出口卡，不开编辑器 ────────── */}
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-4">
        <p className="text-[13px] font-bold text-ink-soft">{C3_P3_FOOTPRINT_TITLE}</p>
        {part2Footprints.length > 0 ? (
          <SavedFootprints footprints={part2Footprints} />
        ) : (
          <p className="text-[13px] font-semibold text-brand-coral" data-testid="jtw-c3p3-no-part2">
            {C3_P3_FOOTPRINT_MISSING_HINT}
          </p>
        )}
        <ExitTrack
          project={C3_P2_STARTER_PROJECT}
          title={C3_P3_STARTER_TITLE}
          testId="jtw-c3p3-starter-exit"
        />
        <p className="text-[12px] leading-6 text-ink-soft">{C3_P3_NO_EDITOR_NOTE}</p>
      </section>

      {/* ── 第一次偏离的解释 ───────────────────────────────────────────── */}
      <section data-testid="jtw-c3p3-reason">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P3_REASON_QUESTION}
          {reasonDone && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <div className="flex flex-col gap-2">
          {C3_P3_REASON_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={reason === option.id}
              onPick={() => setReason(option.id)}
            />
          ))}
        </div>
        {reasonHint && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {reasonHint}
          </p>
        )}
      </section>

      {/* ── 只换哪一张卡 ───────────────────────────────────────────────── */}
      <section data-testid="jtw-c3p3-swap">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P3_SWAP_QUESTION}
          {swapDone && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <div className="flex flex-col gap-2">
          {C3_P3_SWAP_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={swap === option.id}
              onPick={() => setSwap(option.id)}
            />
          ))}
        </div>
        {swapHint && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {swapHint}
          </p>
        )}
      </section>

      {/* ── 地卡演练：孩子扮木筏走 Part 2 真的走过的那条路 ──────────────── */}
      <FloorWalk
        walk={walk}
        onStep={(cardId) => setWalk((current) => [...current, cardId])}
        onReset={() => setWalk([])}
        done={walkDone}
      />

      {/* ── 口令 ───────────────────────────────────────────────────────── */}
      <section data-testid="jtw-c3p3-password">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P3_PASSWORD_QUESTION}
          {passwordDone && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <div className="flex flex-col gap-2">
          {C3_P3_PASSWORD_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={password === option.id}
              onPick={() => setPassword(option.id)}
            />
          ))}
        </div>
        {passwordHint && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {passwordHint}
          </p>
        )}
      </section>

      {/* ── 舞台 + 三张候选出口卡（先预测，再真的走一次） ───────────────── */}
      <section className="space-y-4">
        <JourneyWestC3Stage
          testIdPrefix="jtw-c3p3"
          pageNumber={stagePage}
          sprites={sprites}
          saying={saying}
        />
        <h2 className="text-[15px] font-bold text-ink">{C3_P3_PREDICT_TITLE}</h2>
        <ul className="grid gap-3 sm:grid-cols-3" data-testid="jtw-c3p3-candidates">
          {C3_P3_CANDIDATES.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              prediction={predictions[candidate.id] ?? null}
              onPredict={(outcomeId) =>
                setPredictions((current) => ({ ...current, [candidate.id]: outcomeId }))
              }
              chosen={chosen === candidate.id}
              run={runs[candidate.id] ?? null}
              canTry={predictionsAnswered}
              running={runningExit === candidate.exit}
              onTry={() => void tryCandidate(candidate)}
            />
          ))}
        </ul>
        <p className="text-[13px] font-semibold text-ink-soft" data-testid="jtw-c3p3-try-note">
          {predictionsAnswered ? C3_P3_TRY_TITLE : C3_P3_TRY_LOCKED_HINT}
        </p>
        {predictionsAnswered && !predictionsCorrect && (
          <p className="text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P3_PREDICT_RETRY_HINT}
          </p>
        )}
        {chosenCandidate && (
          <ExitTrack
            project={c3p3CandidateProject(chosenCandidate.exit)}
            title={C3_P3_REHEARSAL_TITLE}
            testId="jtw-c3p3-rehearsal-exit"
          />
        )}
      </section>

      {/* ── resolved world change + story_after ────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="space-y-3 rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p3-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C3_P3_RESOLVED_WORLD_CHANGE}</p>
          <div className="flex flex-wrap gap-2">
            <span
              data-testid="jtw-c3p3-connected-arrow"
              className="rounded-2xl border border-brand-mint bg-canvas-pure px-3 py-2 text-[13px] font-bold text-ink"
            >
              {C3_P3_CONNECTED_LABEL}
            </span>
            <span
              data-testid="jtw-c3p3-faded-arrow"
              className="rounded-2xl border border-hairline bg-canvas-pure px-3 py-2 text-[13px] font-semibold text-ink-soft line-through opacity-50"
            >
              {C3_P3_FADED_LABEL}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-ink">{C3_P3_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p3-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C3_P3_CONTINUE_LABEL}
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
