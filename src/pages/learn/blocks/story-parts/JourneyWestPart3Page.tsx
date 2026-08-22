// Journey to the West · C1-P3 "树叶后的顺序排练" — planning-before-code
// (scene-specs JTW-S1-C1-P3). The child reads the rehearsal story, states the
// monkey's motive, arranges the four story cards into the target order, then
// RUNS THE SWAP EXPERIMENT: toggling Hop/Say re-renders the rehearsal line so
// the comparison is replayable, and the child explains which arrangement makes
// the voice appear from thin air (Say before Show) plus the prediction. The
// preset chain is shown read-only — nothing here runs or counts as a Build.
// Continue records the part complete server-side and unlocks ONLY
// jtw-s1-c1-p4.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { BlockChip } from '../BlockChip';
import {
  C1_P3_AIR_VOICE_OPTIONS,
  C1_P3_AIR_VOICE_QUESTION,
  C1_P3_CARD_ORDER,
  C1_P3_CONTINUE_LABEL,
  C1_P3_MOTIVE_OPTIONS,
  C1_P3_PREDICTION_OPTIONS,
  C1_P3_PREDICTION_QUESTION,
  C1_P3_PREDICTION_RETRY_HINT,
  C1_P3_PRESET_CHAIN,
  C1_P3_RESOLVED_WORLD_CHANGE,
  C1_P3_STORY_AFTER,
  C1_P3_STORY_BEFORE,
  C1_P3_STORY_CARDS,
  C1_P3_SWAP_OPTIONS,
  C1_P3_SWAP_QUESTION,
  C1_P3_SWAPPED_ORDER,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c1-p3';
const NEXT_PART_ID = 'jtw-s1-c1-p4';

export function JourneyWestPart3Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const [motive, setMotive] = useState<string | null>(null);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [swapped, setSwapped] = useState(false);
  const [swapTried, setSwapTried] = useState(false);
  const [swapAnswer, setSwapAnswer] = useState<string | null>(null);
  const [airVoice, setAirVoice] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved ordering + explanation evidence once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setCardOrder(evidence.selections?.story_card_order ?? []);
    setSwapAnswer(evidence.selections?.swap_comparison?.[0] ?? null);
    setAirVoice(evidence.selections?.air_voice_version?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setSwapTried(true);
    setRestored(true);
  }

  const motiveDone = C1_P3_MOTIVE_OPTIONS.find((o) => o.id === motive)?.correct === true;
  const cardsDone =
    cardOrder.length === C1_P3_CARD_ORDER.length &&
    cardOrder.every((id, index) => id === C1_P3_CARD_ORDER[index]);
  const swapDone = C1_P3_SWAP_OPTIONS.find((o) => o.id === swapAnswer)?.correct === true;
  const airVoiceDone = C1_P3_AIR_VOICE_OPTIONS.find((o) => o.id === airVoice)?.correct === true;
  const predictionDone =
    C1_P3_PREDICTION_OPTIONS.find((o) => o.id === prediction)?.correct === true;
  const completed = Boolean(savedEntry);
  const resolved =
    motiveDone && cardsDone && swapTried && swapDone && airVoiceDone && predictionDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          story_card_order: cardOrder,
          swap_comparison: swapAnswer ? [swapAnswer] : [],
          air_voice_version: airVoice ? [airVoice] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">The leaves are rustling…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-p3-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          Watch the birth demonstration in Part 2 first, and then rehearse the sequence.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  const rehearsalOrder = swapped ? C1_P3_SWAPPED_ORDER : C1_P3_CARD_ORDER;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p3">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 1 The Stone Monkey is Born · Part 3
        </p>
        <h1 className="text-[28px] font-black text-ink">sequence rehearsal after leaves</h1>
      </header>

      {/* ── story_before：完整儿童正文 ──────────────────────────────── */}
      <section data-testid="jtw-p3-story">
        <p className="text-[16px] leading-8 text-ink">{C1_P3_STORY_BEFORE}</p>
      </section>

      {/* ── 动机证据 ────────────────────────────────────────────────── */}
      <section data-testid="jtw-p3-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          Why is Stone Monkey willing to slow down and rehearse?
        </h2>
        <div className="flex flex-col gap-2">
          {C1_P3_MOTIVE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={motive === option.id}
              onPick={() => setMotive(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 四卡排序 ────────────────────────────────────────────────── */}
      <OrderCards
        title="Arrange the four rehearsal cards in Stone Monkey's planned order"
        options={C1_P3_STORY_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={cardsDone}
        testId="jtw-p3-cards"
      />

      {/* ── 交换实验（可反复切换重放） ───────────────────────────────── */}
      {cardsDone && (
        <section
          className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
          data-testid="jtw-p3-swap-lab"
        >
          <h2 className="text-[15px] font-bold text-ink">
            Like that naughty monkey, try exchanging two leaves:
          </h2>
          <ol
            className="mt-3 flex flex-wrap gap-2"
            data-testid="jtw-p3-rehearsal-line"
            data-swapped={swapped}
          >
            {rehearsalOrder.map((id, index) => {
              const card = C1_P3_STORY_CARDS.find((option) => option.id === id)!;
              return (
                <li
                  key={id}
                  className={clsx(
                    'rounded-2xl border bg-canvas-pure px-4 py-2 text-[14px] font-semibold text-ink',
                    swapped && (id === 'card-hop' || id === 'card-say')
                      ? 'border-brand-coral/60'
                      : 'border-hairline',
                  )}
                >
                  <span className="mr-1 text-[12px] font-black text-ink-soft">{index + 1}</span>
                  {card.label}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            className="btn-pill-secondary mt-4"
            data-testid="jtw-p3-swap-toggle"
            onClick={() => {
              setSwapped((current) => !current);
              setSwapTried(true);
            }}
          >
            {swapped ? 'Change back to original order' : 'Swap Hop and Say'}
          </button>

          {swapTried && (
            <div className="mt-4 space-y-4">
              <div data-testid="jtw-p3-swap-question">
                <h3 className="mb-2 text-[14px] font-bold text-ink">{C1_P3_SWAP_QUESTION}</h3>
                <div className="flex flex-col gap-2">
                  {C1_P3_SWAP_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={swapAnswer === option.id}
                      onPick={() => setSwapAnswer(option.id)}
                    />
                  ))}
                </div>
              </div>
              <div data-testid="jtw-p3-air-voice">
                <h3 className="mb-2 text-[14px] font-bold text-ink">{C1_P3_AIR_VOICE_QUESTION}</h3>
                <div className="flex flex-col gap-2">
                  {C1_P3_AIR_VOICE_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={airVoice === option.id}
                      onPick={() => setAirVoice(option.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 预测 ────────────────────────────────────────────────────── */}
      <section data-testid="jtw-p3-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P3_PREDICTION_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C1_P3_PREDICTION_OPTIONS.map((option) => (
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
            {C1_P3_PREDICTION_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── 预置只读链（不运行，不算 Build） ─────────────────────────── */}
      <section data-testid="jtw-p3-preset-chain">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          This chain has been placed on the real stage (read-only, it will be your turn to build it
          in the next Part):
        </h2>
        <div className="flex flex-wrap items-center gap-1">
          {C1_P3_PRESET_CHAIN.map((block, index) => (
            <BlockChip
              key={`${block.op}-${index}`}
              block={block}
              inChain
              isLast={index === C1_P3_PRESET_CHAIN.length - 1}
            />
          ))}
        </div>
      </section>

      {/* ── resolved + story_after + continue ───────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p3-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C1_P3_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C1_P3_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← Back to story map
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-p3-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : C1_P3_CONTINUE_LABEL}
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
