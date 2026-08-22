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

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { createBlocksProject } from '../blocksApi';
import { JTW_MONKEY_FRIENDS_SPRITE } from '../jtwC2Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { c2EntryRunMatches, type C2EntryRunResult } from './journeyWestC2EntryRun';
import { JourneyWestC2EntryStage } from './JourneyWestC2EntryStage';
import {
  C2_P7_CONTINUE_LABEL,
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
  findC2EntryBuild,
} from './journeyWestC2Part7Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c2-p7';
const NEXT_PART_ID = 'jtw-s1-c2-p8';
const RERUN_LABELS = {
  idle: '▶ Run again after reopening',
  running: 'Running again…',
  again: '▶Run again',
} as const;

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
    queryFn: () => findC2EntryBuild(kidId!),
    enabled: !!kidId,
  });

  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [waitReason, setWaitReason] = useState<string | null>(null);
  const [waitMissed, setWaitMissed] = useState(false);
  const [rerun, setRerun] = useState<C2EntryRunResult | null>(null);
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
  const rerunOk = c2EntryRunMatches(design, rerun);
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
    return (
      <p className="p-8 text-center text-ink-soft">
        Friends are waiting for your route by the water...
      </p>
    );
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p7-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          First fix the return trip in Part 6, and then make this route a road for everyone.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p7">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 2 The Agreement of Water Curtain Cave · Part 7 · Personal
          Ship
        </p>
        <h1 className="text-[28px] font-black text-ink">Make discovery the path for everyone</h1>
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
            <span className="font-bold">Why does Stone Monkey design a route:</span>
            {C2_P7_MOTIVE}
          </p>
          <p className="mt-2">
            <span className="font-bold">Story—Program Bridge:</span>
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
        <h2 className="text-[15px] font-bold text-ink">
          Go to the real workspace and design your entry route
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          2/8 to stay on the left bank, or 12/9 to drag the stone monkey to the right bank - the
          routes on both banks are different, and so are the number of blocks. Connect the one-step
          movement blocks needed on this side in order, and put a Wait block at the end 1 or Wait 2,
          and then pick a sentence of discovery dialogue at the entrance of the cave. Neither the
          water curtain nor the On Bump track at the entrance can be deleted.
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
              ? 'Opening your stage...'
              : buildDone
                ? 'Look at my route again'
                : build.data?.projectId
                  ? 'Continue designing →'
                  : 'Start designing →'}
          </button>
          {buildDone && (
            <span
              className="text-[13px] font-bold text-brand-mint"
              data-testid="jtw-c2p7-build-done"
            >
              ✓ The route has been saved and actually run in the workspace
            </span>
          )}
          {!buildDone && build.data?.projectId && (
            <span className="text-[13px] font-semibold text-ink-soft">
              Not yet established: check whether the starting point is on a certain bank, each step
              of this bank, the Wait at the end, and the two On Bump tracks.
            </span>
          )}
        </div>
        {createError && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            Failed to open workspace, please try again.
          </p>
        )}
      </section>

      {buildDone && design && build.data?.page && (
        <>
          {/* ── 从保存的作品读回：起点、路线、等待、对白、版本号 ─────────── */}
          <section className="space-y-3" data-testid="jtw-c2p7-design">
            <h2 className="text-[15px] font-bold text-ink">
              The design you saved (read from the work, not guessed by the page):
            </h2>
            <p className="text-[14px] font-semibold text-ink" data-testid="jtw-c2p7-side">
              starting point:{design.side.label}
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
                    No.{index + 1}step
                  </span>
                  {cell}
                  {cell === design.side.knockCell ? ' · Just touching the water curtain' : ''}
                </li>
              ))}
            </ol>
            <p className="text-[13px] font-semibold text-ink-soft">
              <span data-testid="jtw-c2p7-wait">wait {design.waitN} beat</span> ·{' '}
              <span data-testid="jtw-c2p7-line">
                Dialogue at the entrance of the cave "{design.evidenceLine}」
              </span>{' '}
              ·{' '}
              <span data-testid="jtw-c2p7-saved-version">
                Save version #{build.data.savedVersion}
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
                This page was just reopened from the server. Run it again and see if the results are
                the same:
              </h2>
              <JourneyWestC2EntryStage
                page={build.data.page}
                testIdPrefix="jtw-c2p7"
                labels={RERUN_LABELS}
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
                    ? `Consistent rerun after restart: Stone Monkey stopped at ${rerun.endCell}, the water curtain hides, the cave entrance appears, and the cave entrance says the same sentence of discovery.`
                    : 'This time the results did not match the saved design - go back to the workspace to check the route and run again.'}
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
            alt="The three group of monkeys followed the stone monkey's path to the entrance of the cave."
            data-testid="jtw-c2p7-friends"
            className="mb-3 w-full max-w-sm"
          />
          <p className="text-[15px] leading-7 text-ink">{C2_P7_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P7_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← Back to story map
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p7-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : C2_P7_CONTINUE_LABEL}
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
