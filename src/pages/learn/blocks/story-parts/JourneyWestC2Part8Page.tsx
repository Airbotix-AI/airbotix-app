// Journey to the West · C2-P8 "守约成为美猴王" — chapter two's Retell and the
// server-side chapter aggregation (scene-specs JTW-S1-C2-P8).
//
// The child orders the chapter's seven cause cards, then REOPENS the C2-P7
// Personal Ship they really saved and runs it Start → End through the real
// BlocksRunner — this page never builds an answer project, and it refuses to go
// on when the saved work is missing or no longer satisfies the P7 contract.
// The run has to reproduce the saved design (the monkey knocks on his own bank's
// cell, the curtain hides, the cave shows and says the saved line) before the
// retell opens. 水帘洞印 is lit ONLY by the SERVER aggregation over the stored
// C2 evidence rows; continue offers 现在看海边 (→ jtw-s1-c3-p1) or 以后继续,
// which records the resume position and never auto-advances into C3.

import { useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { JTW_C2_RESOLVED_BACKGROUND_ASSET, JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { c2EntryRunMatches, type C2EntryRunResult } from './journeyWestC2EntryRun';
import { JourneyWestC2EntryStage } from './JourneyWestC2EntryStage';
import { findC2EntryBuild } from './journeyWestC2Part7Program';
import {
  C2_P8_CAUSE_CARDS,
  C2_P8_CAUSE_CARD_TITLE,
  C2_P8_CLASSIC_CARD,
  C2_P8_CONTINUE_LATER_LABEL,
  C2_P8_CONTINUE_NOW_LABEL,
  C2_P8_DIALOGUE_INTRO,
  C2_P8_DIALOGUE_MONKEYS,
  C2_P8_DIALOGUE_STONE_MONKEY,
  C2_P8_KING_TITLE,
  C2_P8_LIGHT_SEAL_LABEL,
  C2_P8_RESOLVED_WORLD_CHANGE,
  C2_P8_RETELL_OPTIONS,
  C2_P8_RETELL_QUESTION,
  C2_P8_RETELL_RETRY_HINT,
  C2_P8_RUN_GATE_HINT,
  C2_P8_SEAL_ID,
  C2_P8_SEAL_LINE,
  C2_P8_SEAL_TITLE,
  C2_P8_STORY_AFTER,
  C2_P8_STORY_BEFORE,
  c2p8CardsOrdered,
  c2p8RetellAccepted,
  type C2P8ContinueChoice,
} from './journeyWestC2Part8Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c2-p8';
const NEXT_PART_ID = 'jtw-s1-c3-p1';
const P7_PART_PATH = '/learn/story/journey-west/jtw-s1-c2-p7';
const STORY_MAP_PATH = '/learn/story/journey-west';
const RUN_LABELS = {
  idle: '▶ Complete run from Start to End',
  running: 'Running…',
  again: '▶ Run it again',
} as const;

export function JourneyWestC2Part8Page({
  previewSleep,
}: {
  /** Injectable run timing for tests. */
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
  // The SAME reopen C2-P7 uses — the saved Personal Ship, straight off the VFS.
  const build = useQuery({
    queryKey: ['jtw-c2-p7-build', kidId],
    queryFn: () => findC2EntryBuild(kidId!),
    enabled: !!kidId,
  });

  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [run, setRun] = useState<C2EntryRunResult | null>(null);
  const [retell, setRetell] = useState<string | null>(null);
  const [retellMissed, setRetellMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const savedSelections = (savedEntry?.evidence as StoryPartEvidence | undefined)?.selections ?? {};
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  // Seal state comes from the SERVER aggregation only — never from local state.
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === C2_P8_SEAL_ID);

  // A refreshed page restores the saved retell evidence exactly once, so
  // choosing 以后继续 and coming back still lands on the chapter-two ending.
  if (savedEntry && !restored) {
    setCardOrder(savedSelections.cause_card_order ?? []);
    setRetell(savedSelections.retell_links?.[0] ?? null);
    setRestored(true);
  }

  const design = build.data?.design ?? null;
  const workFound = Boolean(design && build.data?.page && build.data?.projectId);
  const cardsDone = c2p8CardsOrdered(cardOrder);
  const runOk = c2EntryRunMatches(design, run);
  const retellDone = c2p8RetellAccepted(retell);
  const completed = Boolean(savedEntry);
  const resolved = cardsDone && workFound && runOk && retellDone;

  /**
   * One writer for the row. `null` is the 点亮水帘洞印 save (the child has not
   * chosen how to continue yet); 'now'/'later' re-save the same evidence with
   * the resume position, so 以后继续 is server truth rather than a page claim.
   * Only 'now' leaves the page, and even then it goes to the map — the chapter
   * never auto-advances into C3.
   */
  const finish = useMutation({
    mutationFn: (choice: C2P8ContinueChoice | null) =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          cause_card_order: cardOrder,
          retell_links: retell ? [retell] : [],
          run_project: build.data?.projectId ? [build.data.projectId] : [],
          run_saved_version:
            build.data?.savedVersion !== null && build.data?.savedVersion !== undefined
              ? [String(build.data.savedVersion)]
              : [],
          rerun_result: run
            ? [run.endCell, 'curtain-hidden', 'cave-shown']
            : (savedSelections.rerun_result ?? []),
          continue_choice: choice ? [choice] : [],
        },
      }),
    onSuccess: async (_data, choice) => {
      // The refetched SERVER aggregation — not this page — decides the seal.
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      if (choice === 'now') navigate(STORY_MAP_PATH, { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return (
      <p className="p-8 text-center text-ink-soft">
        Your friends are waiting for you at the cave entrance to tell this chapter...
      </p>
    );
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p8-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          Save your entry route in Part 7 first, and then check the agreement before the waterfall.
        </p>
        <Link className="btn-pill-primary inline-block" to={STORY_MAP_PATH}>
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p8">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 2 The Agreement of Water Curtain Cave · Part 8 · Retell
        </p>
        <h1 className="text-[28px] font-black text-ink">
          Keep your promise and become the Monkey King
        </h1>
      </header>

      {/* ── story_before：故事卡D 全文 + 原著卡 + 瀑布前的两句对白 ───────── */}
      <section className="space-y-4" data-testid="jtw-c2p8-story">
        {C2_P8_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic story note:</span>
          {C2_P8_CLASSIC_CARD}
        </aside>
        <div className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <p className="mb-2 font-bold">{C2_P8_DIALOGUE_INTRO}</p>
          <p>Group of monkeys: "{C2_P8_DIALOGUE_MONKEYS}」</p>
          <p>Stone Monkey: "{C2_P8_DIALOGUE_STONE_MONKEY}」</p>
        </div>
      </section>

      {/* ── 七张因果卡（运行之前排列） ─────────────────────────────────── */}
      <OrderCards
        title={C2_P8_CAUSE_CARD_TITLE}
        options={C2_P8_CAUSE_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={cardsDone}
        testId="jtw-c2p8-cause-cards"
      />

      {/* ── 运行 P7 真实保存的作品：不另载答案项目 ─────────────────────── */}
      <section className="space-y-4" data-testid="jtw-c2p8-saved-run">
        <h2 className="text-[15px] font-bold text-ink">
          Completely run the route you saved in Part 7
        </h2>
        {build.isLoading && <p className="text-[13px] text-ink-soft">Opening your saved work...</p>}
        {!build.isLoading && !workFound && (
          <p
            className="rounded-2xl border border-brand-coral/50 bg-canvas-pure p-4 text-[14px] font-semibold text-ink"
            data-testid="jtw-c2p8-work-missing"
          >
            The entry route you saved in Part 7 is not found, or it is no longer valid.
            <Link className="ml-1 font-bold text-brand-sky" to={P7_PART_PATH}>
              Go back to Part 7, open the workspace, and confirm that it has been saved →
            </Link>
          </p>
        )}
        {workFound && design && build.data?.page && (
          <>
            <p className="text-[13px] font-semibold text-ink-soft" data-testid="jtw-c2p8-design">
              <span data-testid="jtw-c2p8-side">starting point:{design.side.label}</span> ·{' '}
              <span data-testid="jtw-c2p8-knock">knocking door {design.side.knockCell}</span> ·{' '}
              <span data-testid="jtw-c2p8-saved-version">
                Save version #{build.data.savedVersion}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-1" data-testid="jtw-c2p8-saved-chain">
              {design.side.route.map((block, index) => (
                <BlockChip
                  key={`${block.op}-${index}`}
                  block={block}
                  inChain
                  isLast={index === design.side.route.length - 1}
                />
              ))}
            </div>
            <JourneyWestC2EntryStage
              page={build.data.page}
              testIdPrefix="jtw-c2p8"
              labels={RUN_LABELS}
              disabled={!cardsDone}
              playSound
              onResult={setRun}
              sleep={previewSleep}
            />
            {!cardsDone && (
              <p className="text-[13px] font-semibold text-ink-soft">{C2_P8_RUN_GATE_HINT}</p>
            )}
            {run && (
              <p
                className={clsx(
                  'text-[13px] font-semibold',
                  runOk ? 'text-brand-mint' : 'text-brand-coral',
                )}
                data-testid="jtw-c2p8-run-result"
                data-consistent={runOk}
              >
                {runOk
                  ? `This time is the same as the one you saved: the stone monkey stopped at ${run.endCell}, the water curtain parted, the entrance of the cave appeared, and the entrance of the cave said the same sentence of discovery.`
                  : 'The result of this run does not match the work you saved - go back to Part 7 to check the route, and come back and run it again.'}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Retell：因为—所以—结果—后来 ───────────────────────────────── */}
      {runOk && (
        <section data-testid="jtw-c2p8-retell">
          <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P8_RETELL_QUESTION}</h2>
          <div className="flex flex-col gap-2">
            {C2_P8_RETELL_OPTIONS.map((option) => (
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
              {C2_P8_RETELL_RETRY_HINT}
            </p>
          )}
        </section>
      )}

      {/* ── 水帘洞印：只由服务端章节聚合点亮 ───────────────────────────── */}
      {completed && (
        <section
          className={clsx(
            'relative rounded-2xl p-5 text-center',
            seal?.lit
              ? 'border-4 border-brand-sunshine bg-wash-sunshine'
              : 'border border-hairline bg-canvas-pure',
          )}
          data-testid="jtw-c2p8-seal"
          data-lit={seal?.lit === true}
        >
          {seal?.lit ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-1 rounded-xl border-2 border-brand-sunshine/60 motion-safe:animate-pulse"
              />
              <p className="text-[24px]" aria-hidden>
                👑
              </p>
              <p className="text-[20px] font-black text-ink">
                {C2_P8_SEAL_TITLE} · {C2_P8_KING_TITLE}
              </p>
              <p className="mt-1 text-[15px] font-semibold text-ink">{C2_P8_SEAL_LINE}</p>
            </>
          ) : (
            <p className="text-[14px] font-semibold text-ink-soft">
              The Water Curtain Cave seal is not yet lit - this chapter is still missing in the
              server logs
              {seal ? ` ${seal.missing.length} ` : ' several '}
              {seal?.missing.length === 1 ? 'item' : 'items'} of evidence. It will light up after completing C2 P1–P8 reading, explaining,
              building, crash running, repairing, saving versions, and speaking back evidence.
            </p>
          )}
        </section>
      )}

      {/* ── resolved + story_after ────────────────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p8-resolved"
        >
          <img
            src={JTW_C2_RESOLVED_BACKGROUND_ASSET}
            alt="The entrance of the cave behind the water curtain is illuminated by warm light, and the wet stone road connects the water curtain and the entrance of the cave into a path that everyone can walk on."
            className="mb-3 w-full rounded-xl"
          />
          <p className="text-[15px] leading-7 text-ink">{C2_P8_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P8_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to={STORY_MAP_PATH}>
          ← Back to story map
        </Link>
        {!completed ? (
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c2p8-light-seal"
            disabled={!resolved || finish.isPending}
            onClick={() => void finish.mutate(null)}
          >
            {finish.isPending ? 'Saving…' : C2_P8_LIGHT_SEAL_LABEL}
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-pill-ghost"
              data-testid="jtw-c2p8-continue-later"
              disabled={finish.isPending}
              onClick={() => void finish.mutate('later')}
            >
              {C2_P8_CONTINUE_LATER_LABEL}
            </button>
            <button
              type="button"
              className="btn-pill-primary"
              data-testid="jtw-c2p8-continue-now"
              disabled={finish.isPending}
              onClick={() => void finish.mutate('now')}
            >
              {C2_P8_CONTINUE_NOW_LABEL}
            </button>
          </div>
        )}
      </footer>
      {finish.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          Not saved, please click again to try.
        </p>
      )}
    </div>
  );
}
