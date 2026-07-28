// Journey to the West · C3-P8 "到达不是学会，而是准备开始" — chapter three's
// Retell and the server-side chapter aggregation (scene-specs JTW-S1-C3-P8).
//
// The child orders the chapter's five cause cards, then REOPENS the C3-P7
// three-page route they really saved and walks it from Page 1 to Page 3's End
// through the real `PageFlowRunner`. This page never builds an answer project —
// it reads the SAME saved document C3-P7 wrote, through the same VFS read path,
// and refuses to go on when that work is missing or no longer satisfies the P7
// structure contract. Only a run that really reaches `1 → 2 → 3` with every page
// boundary continuous opens the retell, and the 程序/运行证据 the child then
// names has to be something THAT run measured. 远行印 is lit ONLY by the SERVER
// aggregation over the stored C3 evidence rows; continue offers 现在去敲门
// (→ jtw-s1-c4-p1) or 以后继续, which records the resume position and never
// auto-advances into C4.

import { useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import {
  jtwC3JumpBoundaries,
  jtwC3JumpBoundariesContinuous,
  jtwC3JumpDecodeBoundaries,
  jtwC3JumpEncodeBoundaries,
  type JtwC3Boundary,
} from '../jtwC3JumpFix';
import {
  jtwC3RouteEncodeExits,
  jtwC3RouteEncodeLedger,
  jtwC3RouteEncodeOps,
} from '../jtwC3PersonalRoute';
import { JTW_C3_FAR_SHORE_PAGE } from '../jtwC3SeaBuild';
import { JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage';
import { jtwC3WeatherVersion } from '../jtwC3WeatherBuild';
import { JourneyWestC3BoundaryTable } from './JourneyWestC3BoundaryTable';
import { JourneyWestC3Stage } from './JourneyWestC3Stage';
import { useJtwC3RouteRun } from './journeyWestC3RouteRun';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { c3p2EncodeFootprints, c3p2FootprintsOf, c3p2PageLabel } from './journeyWestC3Part2Program';
import { c3p7BuildDone, findC3PersonalRouteBuild } from './journeyWestC3Part7Program';
import {
  C3_P8_BOUNDARY_TITLE,
  C3_P8_CAUSE_CARDS,
  C3_P8_CAUSE_CARD_TITLE,
  C3_P8_CLASSIC_CARD,
  C3_P8_CONTINUE_LATER_LABEL,
  C3_P8_CONTINUE_NOW_LABEL,
  C3_P8_DESIGN_TITLE,
  C3_P8_DIALOGUE_INTRO,
  C3_P8_DIALOGUE_MONKEYS,
  C3_P8_DIALOGUE_MONKEY_KING,
  C3_P8_LIGHT_SEAL_LABEL,
  C3_P8_LOADING_HINT,
  C3_P8_LOCKED_HINT,
  C3_P8_NEXT_PART_ID,
  C3_P8_PART_ID,
  C3_P8_PREV_PART_PATH,
  C3_P8_PROGRAM_EVIDENCE_OPTIONS,
  C3_P8_PROGRAM_EVIDENCE_RETRY_HINT,
  C3_P8_PROGRAM_EVIDENCE_TITLE,
  C3_P8_RESOLVED_TITLE,
  C3_P8_RESOLVED_WORLD_CHANGE,
  C3_P8_RETELL_OPTIONS,
  C3_P8_RETELL_QUESTION,
  C3_P8_RETELL_RETRY_HINT,
  C3_P8_RUN_AGAIN_LABEL,
  C3_P8_RUN_BUSY_LABEL,
  C3_P8_RUN_GATE_HINT,
  C3_P8_RUN_LABEL,
  C3_P8_RUN_NOTE,
  C3_P8_RUN_TITLE,
  C3_P8_RUN_TRACE_TITLE,
  C3_P8_SEAL_ID,
  C3_P8_SEAL_LINE,
  C3_P8_SEAL_TITLE,
  C3_P8_STORY_AFTER,
  C3_P8_STORY_BEFORE,
  C3_P8_TEXT_EVIDENCE_OPTIONS,
  C3_P8_TEXT_EVIDENCE_RETRY_HINT,
  C3_P8_TEXT_EVIDENCE_TITLE,
  C3_P8_TRACE_MISMATCH_HINT,
  C3_P8_WORK_MISSING,
  C3_P8_WORK_MISSING_LINK,
  c3p8CardsOrdered,
  c3p8ProgramEvidenceAccepted,
  c3p8ProgramEvidenceMeasured,
  c3p8RetellAccepted,
  c3p8TextEvidenceAccepted,
  c3p8TraceReached,
  type C3P8ContinueChoice,
} from './journeyWestC3Part8Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const STORY_MAP_PATH = '/learn/story/journey-west';

export function JourneyWestC3Part8Page({
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
  // The SAME read path C3-P7 uses — the saved three-page route, off the VFS.
  const build = useQuery({
    queryKey: ['jtw-c3-p7-build', kidId],
    queryFn: () => findC3PersonalRouteBuild(kidId!),
    enabled: !!kidId,
  });

  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [retell, setRetell] = useState<string | null>(null);
  const [retellMissed, setRetellMissed] = useState(false);
  const [textEvidence, setTextEvidence] = useState<string | null>(null);
  const [textMissed, setTextMissed] = useState(false);
  const [programEvidence, setProgramEvidence] = useState<string | null>(null);
  const [programMissed, setProgramMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const { stagePage, sprites, saying, running, run, runProject } = useJtwC3RouteRun(previewSleep);
  const [savedTrace, setSavedTrace] = useState<number[]>([]);
  const [savedBoundaries, setSavedBoundaries] = useState<JtwC3Boundary[]>([]);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C3_P8_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C3_P8_PART_ID) ?? false;
  // Seal state comes from the SERVER aggregation only — never from local state.
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === C3_P8_SEAL_ID);

  // A refreshed page restores the saved retell evidence exactly once, so
  // choosing 以后继续 and coming back still lands on the chapter-three ending.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setCardOrder(evidence.selections?.cause_card_order ?? []);
    setRetell(evidence.selections?.retell_links?.[0] ?? null);
    setTextEvidence(evidence.selections?.text_evidence?.[0] ?? null);
    setProgramEvidence(evidence.selections?.program_evidence?.[0] ?? null);
    setSavedTrace((evidence.selections?.page_trace ?? []).map(Number));
    setSavedBoundaries(jtwC3JumpDecodeBoundaries(evidence.selections?.run_boundaries ?? []));
    setRestored(true);
  }

  const design = build.data?.design ?? null;
  /** The saved document itself — what this Part runs, and the only thing it can. */
  const savedProject = build.data?.project ?? null;
  const savedVersion = build.data?.savedVersion ?? null;
  const workFound = c3p7BuildDone(build.data);
  const weather = build.data?.startedWeather ? jtwC3WeatherVersion(build.data.startedWeather) : null;
  const cardsDone = c3p8CardsOrdered(cardOrder);

  // A live run is judged on what the runner measured; a restored one can only be
  // re-read off the rows the run itself stored.
  const boundaries = run ? jtwC3JumpBoundaries(run) : savedBoundaries;
  const trace = run ? run.trace : savedTrace;
  const stoppedAtEnd = run ? run.stoppedBy === 'end' : savedTrace.length > 0;
  const runOk =
    c3p8TraceReached(trace) && stoppedAtEnd && jtwC3JumpBoundariesContinuous(boundaries);

  const retellDone = c3p8RetellAccepted(retell);
  const textDone = c3p8TextEvidenceAccepted(textEvidence);
  const programMeasured = c3p8ProgramEvidenceMeasured(design, run);
  const completed = Boolean(savedEntry);
  // A live run is what accepts a program-evidence card. A restored page has no
  // run to re-measure against, so it can only re-read the row a run once wrote.
  const programDone = run
    ? c3p8ProgramEvidenceAccepted(programEvidence, design, run)
    : completed && programEvidence !== null;

  const resolved = cardsDone && workFound && runOk && retellDone && textDone && programDone;

  /**
   * One writer for the row. `null` is the 点亮远行印 save (the child has not
   * chosen how to continue yet); 'now'/'later' re-save the same evidence with
   * the resume position, so 以后继续 is server truth rather than a page claim.
   * Only 'now' leaves the page, and even then it goes to the map — the chapter
   * never auto-advances into C4.
   */
  const finish = useMutation({
    mutationFn: (choice: C3P8ContinueChoice | null) =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C3_P8_PART_ID, {
        schema_version: 1,
        selections: {
          // Continue choices re-save an already completed row after a reload.
          // Keep every measurement from the real run instead of replacing
          // run-only fields with empty arrays when no live runner exists.
          ...savedEntry?.evidence.selections,
          cause_card_order: cardOrder,
          retell_links: retell ? [retell] : [],
          text_evidence: textEvidence ? [textEvidence] : [],
          program_evidence: programEvidence ? [programEvidence] : [],
          // The Personal Ship this Part really reopened, and its server version.
          run_project: build.data?.projectId ? [build.data.projectId] : [],
          run_saved_version: savedVersion === null ? [] : [String(savedVersion)],
          // The structure, read back off that SAVED document.
          route_ops: design ? jtwC3RouteEncodeOps(design) : [],
          route_exits: design ? jtwC3RouteEncodeExits(design) : [],
          block_ledger: design ? jtwC3RouteEncodeLedger(design) : [],
          // The rerun of the saved work, measured page by page.
          page_trace: trace.map(String),
          run_footprints: run
            ? c3p2EncodeFootprints(c3p2FootprintsOf(run))
            : (savedEntry?.evidence.selections?.run_footprints ?? []),
          run_boundaries: jtwC3JumpEncodeBoundaries(boundaries),
          run_stop: run
            ? [run.stoppedBy]
            : (savedEntry?.evidence.selections?.run_stop ?? []),
          exit_page: [String(JTW_C3_FAR_SHORE_PAGE)],
          rerun_result: run
            ? [`trace:${run.trace.join('-')}`, `stop:${run.stoppedBy}`]
            : (savedEntry?.evidence.selections?.rerun_result ?? []),
          continue_choice: choice ? [choice] : [],
        },
      }),
    onSuccess: async (_data, choice) => {
      // The refetched SERVER aggregation — not this page — decides the seal.
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      if (choice === 'now') navigate(STORY_MAP_PATH, { state: { unlocked: C3_P8_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P8_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p8-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P8_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to={STORY_MAP_PATH}>
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p8">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第三章 一叶木筏求师路 · Part 8 · Retell
        </p>
        <h1 className="text-[28px] font-black text-ink">到达不是学会，而是准备开始</h1>
      </header>

      {/* ── story_before：故事卡D 全文 + 原著卡 + 岸边的两句对白 ─────────── */}
      <section className="space-y-4" data-testid="jtw-c3p8-story">
        {C3_P8_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C3_P8_CLASSIC_CARD}
        </aside>
        <div className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <p className="mb-2 font-bold">{C3_P8_DIALOGUE_INTRO}</p>
          <p>群猴：「{C3_P8_DIALOGUE_MONKEYS}」</p>
          <p>美猴王：「{C3_P8_DIALOGUE_MONKEY_KING}」</p>
        </div>
      </section>

      {/* ── 五张因果卡（运行之前排列） ─────────────────────────────────── */}
      <OrderCards
        title={C3_P8_CAUSE_CARD_TITLE}
        options={C3_P8_CAUSE_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={cardsDone}
        testId="jtw-c3p8-cause-cards"
      />

      {/* ── 运行 P7 真实保存的作品：不另载答案项目 ─────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c3p8-saved-run" data-reached={runOk ? '1' : '0'}>
        <h2 className="text-[15px] font-bold text-ink">{C3_P8_RUN_TITLE}</h2>
        <p className="text-[13px] leading-6 text-ink-soft">{C3_P8_RUN_NOTE}</p>
        {build.isLoading && <p className="text-[13px] text-ink-soft">正在打开你保存的作品…</p>}
        {!build.isLoading && !workFound && (
          <p
            className="rounded-2xl border border-brand-coral/50 bg-canvas-pure p-4 text-[14px] font-semibold text-ink"
            data-testid="jtw-c3p8-work-missing"
          >
            {C3_P8_WORK_MISSING}
            <Link className="ml-1 font-bold text-brand-sky" to={C3_P8_PREV_PART_PATH}>
              {C3_P8_WORK_MISSING_LINK}
            </Link>
          </p>
        )}
        {workFound && design && savedProject && (
          <>
            <div className="space-y-3" data-testid="jtw-c3p8-design">
              <p className="text-[13px] font-bold text-ink">{C3_P8_DESIGN_TITLE}</p>
              <ul className="space-y-3">
                {design.pages.map((page) => (
                  <li
                    key={page.page}
                    data-testid={`jtw-c3p8-design-page-${page.page}`}
                    data-actions={page.actions.length}
                    data-exit={page.ends ? 'end' : String(page.exitTo)}
                    className="rounded-2xl border border-hairline bg-canvas-pure p-3"
                  >
                    <p className="text-[14px] font-bold text-ink">
                      Page {page.page} · {c3p2PageLabel(page.page)}
                      <span className="ml-2 text-[12px] font-semibold text-ink-soft">
                        {page.actions.length} 块动作 ·{' '}
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
              <p className="text-[13px] font-semibold text-ink-soft">
                共 {design.childBlocks} 块由你主导
                {savedVersion !== null && (
                  <span data-testid="jtw-c3p8-saved-version"> · 保存版本 #{savedVersion}</span>
                )}
              </p>
            </div>

            <JourneyWestC3Stage
              testIdPrefix="jtw-c3p8"
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
                data-testid="jtw-c3p8-run-button"
                disabled={!cardsDone || running}
                onClick={() => void runProject(savedProject)}
              >
                {running ? C3_P8_RUN_BUSY_LABEL : run ? C3_P8_RUN_AGAIN_LABEL : C3_P8_RUN_LABEL}
              </button>
              {!cardsDone && (
                <span className="text-[13px] font-semibold text-ink-soft">
                  {C3_P8_RUN_GATE_HINT}
                </span>
              )}
            </div>
            {trace.length > 0 && (
              <div className="space-y-2" data-testid="jtw-c3p8-trace" data-trace={trace.join('-')}>
                <p className="text-[13px] font-bold text-ink">
                  {C3_P8_RUN_TRACE_TITLE} · {trace.map((page) => `Page ${page}`).join(' → ')}
                </p>
                {boundaries.length > 0 && (
                  <>
                    <p className="text-[13px] font-bold text-ink">{C3_P8_BOUNDARY_TITLE}</p>
                    <JourneyWestC3BoundaryTable
                      boundaries={boundaries}
                      testId="jtw-c3p8-boundaries"
                    />
                  </>
                )}
              </div>
            )}
            {trace.length > 0 && !runOk && (
              <p className="text-[13px] font-semibold text-brand-coral" role="status">
                {C3_P8_TRACE_MISMATCH_HINT}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Retell：因为—所以—结果—后来 ───────────────────────────────── */}
      {runOk && (
        <>
          <section data-testid="jtw-c3p8-retell" data-done={retellDone ? '1' : '0'}>
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C3_P8_RETELL_QUESTION}</h2>
            <div className="flex flex-col gap-2">
              {C3_P8_RETELL_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={retell === option.id}
                  onPick={() => {
                    setRetell(option.id);
                    setRetellMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {retellMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C3_P8_RETELL_RETRY_HINT}
              </p>
            )}
          </section>

          {/* ── 一处文字动机证据 ─────────────────────────────────────── */}
          <section data-testid="jtw-c3p8-text-evidence" data-done={textDone ? '1' : '0'}>
            <h2 className="mb-2 text-[15px] font-bold text-ink">{C3_P8_TEXT_EVIDENCE_TITLE}</h2>
            <div className="flex flex-col gap-2">
              {C3_P8_TEXT_EVIDENCE_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={textEvidence === option.id}
                  onPick={() => {
                    setTextEvidence(option.id);
                    setTextMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {textMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C3_P8_TEXT_EVIDENCE_RETRY_HINT}
              </p>
            )}
          </section>

          {/* ── 一处程序/运行证据：只有这一遍真的量到的才算 ───────────── */}
          <section
            data-testid="jtw-c3p8-program-evidence"
            data-done={programDone ? '1' : '0'}
            data-measured={programMeasured.join(',')}
          >
            <h2 className="mb-2 text-[15px] font-bold text-ink">
              {C3_P8_PROGRAM_EVIDENCE_TITLE}
            </h2>
            <div className="flex flex-col gap-2">
              {C3_P8_PROGRAM_EVIDENCE_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={programEvidence === option.id}
                  onPick={() => {
                    setProgramEvidence(option.id);
                    setProgramMissed(!programMeasured.includes(option.id));
                  }}
                />
              ))}
            </div>
            {programMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C3_P8_PROGRAM_EVIDENCE_RETRY_HINT}
              </p>
            )}
          </section>
        </>
      )}

      {/* ── 远行印：只由服务端章节聚合点亮 ─────────────────────────────── */}
      {completed && (
        <section
          className={clsx(
            'relative rounded-2xl p-5 text-center',
            seal?.lit
              ? 'border-4 border-brand-sunshine bg-wash-sunshine'
              : 'border border-hairline bg-canvas-pure',
          )}
          data-testid="jtw-c3p8-seal"
          data-lit={seal?.lit === true}
        >
          {seal?.lit ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-1 rounded-xl border-2 border-brand-sunshine/60 motion-safe:animate-pulse"
              />
              <p className="text-[24px]" aria-hidden>
                ⛩
              </p>
              <p className="text-[20px] font-black text-ink">{C3_P8_SEAL_TITLE}</p>
              <p className="mt-1 text-[15px] font-semibold text-ink">{C3_P8_SEAL_LINE}</p>
            </>
          ) : (
            <p className="text-[14px] font-semibold text-ink-soft">
              远行印还没亮——服务器记录里这一章还缺
              {seal ? ` ${seal.missing.length} ` : '若干'}
              项证据。补齐 C3 P1–P8 的阅读、解释、搭建、选择运行、修理、保存版本、重开重跑和讲回证据后它才会点亮。
            </p>
          )}
        </section>
      )}

      {/* ── resolved + story_after ────────────────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="space-y-3 rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p8-resolved"
        >
          <img
            src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
            alt="彼岸山林：木筏靠在浅滩上，上山的石阶亮着，师门的石牌在雾里显出来"
            data-testid="jtw-c3p8-resolved-art"
            className="w-full rounded-2xl"
          />
          <p className="text-[13px] font-bold text-ink-soft">{C3_P8_RESOLVED_TITLE}</p>
          <p className="text-[15px] leading-7 text-ink">{C3_P8_RESOLVED_WORLD_CHANGE}</p>
          <p className="text-[15px] font-semibold text-ink">{C3_P8_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to={STORY_MAP_PATH}>
          ← 回到故事地图
        </Link>
        {!completed ? (
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c3p8-light-seal"
            disabled={!resolved || finish.isPending}
            onClick={() => void finish.mutate(null)}
          >
            {finish.isPending ? '保存中…' : C3_P8_LIGHT_SEAL_LABEL}
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-pill-ghost"
              data-testid="jtw-c3p8-continue-later"
              disabled={finish.isPending}
              onClick={() => void finish.mutate('later')}
            >
              {C3_P8_CONTINUE_LATER_LABEL}
            </button>
            <button
              type="button"
              className="btn-pill-primary"
              data-testid="jtw-c3p8-continue-now"
              disabled={finish.isPending}
              onClick={() => void finish.mutate('now')}
            >
              {C3_P8_CONTINUE_NOW_LABEL}
            </button>
          </div>
        )}
      </footer>
      {finish.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          没有保存上，请再点一次试试。
        </p>
      )}
    </div>
  );
}
