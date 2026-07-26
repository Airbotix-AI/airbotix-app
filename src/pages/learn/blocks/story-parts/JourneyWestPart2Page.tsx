// Journey to the West · C1-P2 "石猴出世运行示范" — the Story Hook + demo run
// part (scene-specs JTW-S1-C1-P2). The child reads the English story hook,
// arranges the four story cards into story order, names the first and last
// block, answers the Show-before-Hop/Say prediction, then presses the real Go
// and watches the arrival chain execute left to right (sound → appear → jump →
// hello). Continue records the part complete server-side and unlocks ONLY
// jtw-s1-c1-p3 — the chapter stays incomplete until all eight parts are done.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  C1_P2_CARD_ORDER,
  C1_P2_CLASSIC_CARD,
  C1_P2_CONTINUE_LABEL,
  C1_P2_FIRST_BLOCK_OPTIONS,
  C1_P2_LAST_BLOCK_OPTIONS,
  C1_P2_MOTIVE,
  C1_P2_PREDICTION_OPTIONS,
  C1_P2_PREDICTION_QUESTION,
  C1_P2_PREDICTION_RETRY_HINT,
  C1_P2_STORY_AFTER,
  C1_P2_STORY_BEFORE,
  C1_P2_STORY_CARDS,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { JourneyWestArrivalDemo } from './JourneyWestArrivalDemo';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c1-p2';
const NEXT_PART_ID = 'jtw-s1-c1-p3';

export function JourneyWestPart2Page({
  demoSleep,
}: {
  /** Injectable demo timing for tests. */
  demoSleep?: (ms: number) => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [firstBlock, setFirstBlock] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [ran, setRan] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setCardOrder(evidence.selections?.story_card_order ?? []);
    setFirstBlock(evidence.selections?.first_block?.[0] ?? null);
    setLastBlock(evidence.selections?.last_block?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRan(true);
    setRestored(true);
  }

  const cardsDone =
    cardOrder.length === C1_P2_CARD_ORDER.length &&
    cardOrder.every((id, index) => id === C1_P2_CARD_ORDER[index]);
  const firstDone =
    C1_P2_FIRST_BLOCK_OPTIONS.find((option) => option.id === firstBlock)?.correct === true;
  const lastDone =
    C1_P2_LAST_BLOCK_OPTIONS.find((option) => option.id === lastBlock)?.correct === true;
  const predictionDone =
    C1_P2_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
  const completed = Boolean(savedEntry);
  const resolved = cardsDone && firstDone && lastDone && predictionDone && ran;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_card_order: cardOrder,
          first_block: firstBlock ? [firstBlock] : [],
          last_block: lastBlock ? [lastBlock] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">Opening the mountain…</p>;
  }

  // Server-side unlock is the truth — a kid who has not finished P1 gets a
  // friendly pointer back instead of a runnable part.
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-p2-locked">
        <p className="text-[16px] font-bold text-ink">先完成 Part 1「清晨的花果山」，石头才会打开。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第一章 石猴出世 · Part 2
        </p>
        <h1 className="text-[28px] font-black text-ink">石猴出世运行示范</h1>
      </header>

      {/* ── story_before + classic card + motive ────────────────────── */}
      <section className="space-y-4" data-testid="jtw-p2-story">
        <p className="text-[16px] leading-8 text-ink">{C1_P2_STORY_BEFORE}</p>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic card: </span>
          {C1_P2_CLASSIC_CARD}
        </aside>
        <p className="text-[14px] font-semibold text-ink-soft">{C1_P2_MOTIVE}</p>
      </section>

      {/* ── story cards in order ────────────────────────────────────── */}
      <OrderCards
        title="按故事顺序点四张卡：先发生什么，后发生什么？"
        options={C1_P2_STORY_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={cardsDone}
        testId="jtw-p2-cards"
      />

      {/* ── first / last block ──────────────────────────────────────── */}
      <section data-testid="jtw-p2-first-last">
        <h2 className="mb-2 text-[15px] font-bold text-ink">哪一块最先运行？</h2>
        <div className="flex flex-wrap gap-2">
          {C1_P2_FIRST_BLOCK_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={firstBlock === option.id}
              onPick={() => setFirstBlock(option.id)}
            />
          ))}
        </div>
        <h2 className="mb-2 mt-4 text-[15px] font-bold text-ink">哪一块最后运行？</h2>
        <div className="flex flex-wrap gap-2">
          {C1_P2_LAST_BLOCK_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={lastBlock === option.id}
              onPick={() => setLastBlock(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── prediction (before Go) ──────────────────────────────────── */}
      <section data-testid="jtw-p2-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P2_PREDICTION_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C1_P2_PREDICTION_OPTIONS.map((option) => (
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
            {C1_P2_PREDICTION_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── the real demo run ───────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[15px] font-bold text-ink">现在按下真正的 Go，看顺序怎么发生</h2>
        <JourneyWestArrivalDemo onRunDone={() => setRan(true)} sleep={demoSleep} />
      </section>

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p2-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C1_P2_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-p2-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : C1_P2_CONTINUE_LABEL}
        </button>
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          Not saved — please tap again.
        </p>
      )}
    </div>
  );
}
