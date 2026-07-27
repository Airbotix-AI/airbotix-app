// Journey to the West · C2-P2 "瀑布前的约定" — Why + off-screen planning
// (scene-specs JTW-S1-C2-P2). The stone monkey faces the CLOSED water curtain
// while the troop waits on the dry high rock; the four agreement cards start
// unsorted. The child reads 故事卡B in full plus the two dialogue lines, picks
// the TWO motives that hold together (curious about the inside AND the promise
// to come back and share — 被夸奖/最快 are rejected with a hint), orders the
// agreement cards 进去→看清→回来→分享 with the accessible replayable
// tap-to-order component, explains why "进去" alone never completes the
// agreement, and answers the what-if-he-never-returns prediction. Resolved
// world change pins the four-cell agreement to the STAGE SIDE as the evidence
// track the later parts will light. No blocks are edited, no project is
// written and no chapter completes here. Continue persists the evidence
// server-side and unlocks ONLY jtw-s1-c2-p3; kids who have not finished C2-P1
// get the locked screen (server truth).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  C2_P2_AGREEMENT_CARDS,
  C2_P2_AGREEMENT_ORDER,
  C2_P2_CLASSIC_CARD,
  C2_P2_CONTINUE_LABEL,
  C2_P2_DIALOGUE,
  C2_P2_ENTER_OPTIONS,
  C2_P2_ENTER_QUESTION,
  C2_P2_MOTIVE_OPTIONS,
  C2_P2_MOTIVE_REJECT_HINT,
  C2_P2_PREDICTION_OPTIONS,
  C2_P2_PREDICTION_QUESTION,
  C2_P2_PREDICTION_RETRY_HINT,
  C2_P2_RESOLVED_WORLD_CHANGE,
  C2_P2_STORY_AFTER,
  C2_P2_STORY_BEFORE,
  C2_P2_STORY_BRIDGE,
  JTW_C1_BACKGROUND_ASSET,
  JTW_S1_STORY_LINE_ID,
  JTW_STONE_MONKEY_ASSET,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, EvidenceGroup, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c2-p2';
const NEXT_PART_ID = 'jtw-s1-c2-p3';

const WRONG_MOTIVE_IDS = C2_P2_MOTIVE_OPTIONS.filter((option) => !option.correct).map(
  (option) => option.id,
);
const CORRECT_MOTIVE_IDS = C2_P2_MOTIVE_OPTIONS.filter((option) => option.correct).map(
  (option) => option.id,
);

/** The waterfall Before stage: monkey facing the closed curtain, troop waiting
 *  on the dry high rock; when resolved, the four-cell agreement track pins to
 *  the stage side (the evidence rail later parts will light). */
function AgreementStage({ resolved }: { resolved: boolean }) {
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
      data-testid="jtw-c2p2-stage"
    >
      <img
        src={JTW_C1_BACKGROUND_ASSET}
        alt="瀑布前：石猴面对合着的白色水帘，三只群猴退到干燥的高石上等待，洞口仍藏在水帘后面"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* 石猴面对水帘 — closer to the curtain than in P1, still outside it. */}
      <img
        src={JTW_STONE_MONKEY_ASSET}
        alt=""
        aria-hidden
        data-testid="jtw-c2p2-stone-monkey"
        data-visible="true"
        data-facing="curtain"
        className="absolute bottom-[8%] left-[32%] w-[14%]"
      />
      {/* 洞口初始隐藏、水帘仍然合着 — nothing behind the curtain is rendered. */}
      <span data-testid="jtw-c2p2-cave-mouth" data-visible="false" hidden aria-hidden />
      {/* resolved_world_change：四格约定固定在舞台侧边作为后续证据轨。 */}
      {resolved && (
        <ol
          className="absolute right-[3%] top-[8%] flex flex-col gap-2"
          data-testid="jtw-c2p2-agreement-track"
        >
          {C2_P2_AGREEMENT_ORDER.map((cardId, index) => {
            const card = C2_P2_AGREEMENT_CARDS.find((option) => option.id === cardId)!;
            return (
              <li
                key={cardId}
                data-card={cardId}
                data-slot={index + 1}
                className="rounded-full border border-brand-sunshine/70 bg-wash-sunshine px-3 py-1 text-[12px] font-bold text-ink"
              >
                {index + 1} · {card.label}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function JourneyWestC2Part2Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const [motives, setMotives] = useState<string[]>([]);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [enterAnswer, setEnterAnswer] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved Why/agreement evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotives(evidence.selections?.motive ?? []);
    setCardOrder(evidence.selections?.agreement_card_order ?? []);
    setEnterAnswer(evidence.selections?.enter_not_enough?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const wrongMotivePicked = motives.some((id) => WRONG_MOTIVE_IDS.includes(id));
  // Exactly the two motives that hold together — 被夸奖/最快 break the evidence.
  const motivesDone =
    !wrongMotivePicked &&
    motives.length === CORRECT_MOTIVE_IDS.length &&
    CORRECT_MOTIVE_IDS.every((id) => motives.includes(id));
  // Only 进去→看清→回来→分享 passes.
  const cardsDone =
    cardOrder.length === C2_P2_AGREEMENT_ORDER.length &&
    cardOrder.every((id, index) => id === C2_P2_AGREEMENT_ORDER[index]);
  const enterDone = C2_P2_ENTER_OPTIONS.find((o) => o.id === enterAnswer)?.correct === true;
  const predictionDone =
    C2_P2_PREDICTION_OPTIONS.find((o) => o.id === prediction)?.correct === true;
  const completed = Boolean(savedEntry);
  const resolved = motivesDone && cardsDone && enterDone && predictionDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          motive: motives,
          agreement_card_order: cardOrder,
          enter_not_enough: enterAnswer ? [enterAnswer] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">瀑布前，大家正围着石猴…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p2-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          先在 Part 1 跟着水声找到瀑布，再来听瀑布前的约定。
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二章 水帘洞的约定 · Part 2
        </p>
        <h1 className="text-[28px] font-black text-ink">瀑布前的约定</h1>
      </header>

      {/* ── story_before：故事卡B 全文 + 原创对白 + 原著卡 + 因果桥 ───── */}
      <section className="space-y-4" data-testid="jtw-c2p2-story">
        <p className="text-[16px] leading-8 text-ink">{C2_P2_STORY_BEFORE}</p>
        <div className="rounded-2xl border border-hairline bg-canvas-pure p-4">
          {C2_P2_DIALOGUE.map((line) => (
            <p key={line.slice(0, 6)} className="text-[15px] leading-8 text-ink">
              {line}
            </p>
          ))}
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C2_P2_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C2_P2_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── Before 舞台：石猴面对水帘，群猴在干燥高石等待 ─────────────── */}
      <AgreementStage resolved={resolved || completed} />

      {/* ── 两条同时成立的动机（被夸奖/最快 被拒绝） ─────────────────── */}
      <EvidenceGroup
        title="从两句对白里，找出石猴同时成立的两条动机"
        options={C2_P2_MOTIVE_OPTIONS}
        selected={motives}
        onToggle={(id) =>
          setMotives((current) =>
            current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
          )
        }
        done={motivesDone}
        testId="jtw-c2p2-motives"
      />
      {wrongMotivePicked && (
        <p className="text-[13px] font-semibold text-brand-coral" role="status">
          {C2_P2_MOTIVE_REJECT_HINT}
        </p>
      )}

      {/* ── 四张约定卡排序（可访问、可重放、可持久化） ────────────────── */}
      <OrderCards
        title="把四张约定卡摆成瀑布前说好的顺序"
        options={C2_P2_AGREEMENT_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={cardsDone}
        testId="jtw-c2p2-cards"
      />

      {/* ── 为什么“进去”不等于完成约定 ──────────────────────────────── */}
      {cardsDone && (
        <section data-testid="jtw-c2p2-enter">
          <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P2_ENTER_QUESTION}</h2>
          <div className="flex flex-col gap-2">
            {C2_P2_ENTER_OPTIONS.map((option) => (
              <Choice
                key={option.id}
                option={option}
                active={enterAnswer === option.id}
                onPick={() => setEnterAnswer(option.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 预测 ────────────────────────────────────────────────────── */}
      <section data-testid="jtw-c2p2-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C2_P2_PREDICTION_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C2_P2_PREDICTION_OPTIONS.map((option) => (
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
            {C2_P2_PREDICTION_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── resolved world change + story_after + continue ──────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p2-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C2_P2_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P2_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p2-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C2_P2_CONTINUE_LABEL}
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
