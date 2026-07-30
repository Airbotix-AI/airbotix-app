import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { JTW_C3_MONKEY_KING_SPRITE } from '../jtwC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C4_P1_CLASSIC_CARD,
  C4_P1_CONTINUE_LABEL,
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_PREDICTION_OPTIONS,
  C4_P1_PREDICTION_QUESTION,
  C4_P1_RESOLVED_WORLD_CHANGE,
  C4_P1_ROUTE_CARDS,
  C4_P1_SCREEN_IDS,
  C4_P1_STORY_AFTER,
  C4_P1_STORY_SCREENS,
  C4_P1_WHY_OPTIONS,
  c4p1ChoiceCorrect,
  c4p1MotivesDone,
  c4p1RouteOrdered,
  c4p1StoryRead,
} from './journeyWestC4Part1Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c4-p1';
const NEXT_PART_ID = 'jtw-s1-c4-p2';

export function JourneyWestC4Part1Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C4_P1_SCREEN_IDS[0]]);
  const [routeOrder, setRouteOrder] = useState<string[]>([]);
  const [motives, setMotives] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P1_SCREEN_IDS]);
    setRouteOrder(evidence.selections?.route_card_order ?? []);
    setMotives(evidence.selections?.motive_evidence ?? []);
    setPrediction(evidence.prediction ?? null);
    setWhy(evidence.selections?.why_evidence?.[0] ?? null);
    setRestored(true);
  }

  const storyDone = c4p1StoryRead(screensRead);
  const routeDone = c4p1RouteOrdered(routeOrder);
  const motivesDone = c4p1MotivesDone(motives);
  const predictionDone = c4p1ChoiceCorrect(C4_P1_PREDICTION_OPTIONS, prediction);
  const whyDone = c4p1ChoiceCorrect(C4_P1_WHY_OPTIONS, why);
  const resolved = storyDone && routeDone && motivesDone && predictionDone && whyDone;
  const completed = Boolean(savedEntry);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          route_card_order: routeOrder,
          motive_evidence: motives,
          why_evidence: why ? [why] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">正在走到安静的山门前…</p>;
  }
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p1-locked">
        <p className="text-[16px] font-bold text-ink">先完成远行印，再来敲山门。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第四章 你有名字了 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">山门前，把来路讲清楚</h1>
      </header>

      <section className="space-y-4" data-testid="jtw-c4p1-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P1_STORY_SCREENS[screenIndex]}</p>
        <p className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c4p1-story-count">
          {screensRead.length} / {C4_P1_SCREEN_IDS.length}
        </p>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p1-story-next"
          disabled={screenIndex === C4_P1_STORY_SCREENS.length - 1}
          onClick={() => {
            const next = screenIndex + 1;
            setScreenIndex(next);
            setScreensRead((current) => [...new Set([...current, C4_P1_SCREEN_IDS[next]])]);
          }}
        >
          读下一张故事卡
        </button>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic Card：</span>
          {C4_P1_CLASSIC_CARD}
        </aside>
      </section>

      <section
        className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c4p1-stage"
        data-world-state={resolved || completed ? 'gate-open' : 'gate-closed'}
      >
        <img
          src={C4_P1_ROUTE_CARDS[2].asset}
          alt="山路尽头的师门石牌与安静山门"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt="从花果山远行而来的石猴站在山门前"
          className="absolute bottom-[8%] left-[12%] w-[16%]"
          data-testid="jtw-c4p1-monkey"
        />
        <span
          className="absolute right-[11%] top-[18%] rounded-lg border-2 border-amber-800 bg-amber-100 px-5 py-3 text-[15px] font-bold text-amber-950"
          data-testid="jtw-c4p1-name-board"
        >
          空名字牌
        </span>
        {(resolved || completed) && (
          <span
            className="absolute inset-y-[20%] right-[35%] w-3 rounded-full bg-amber-200 shadow-[0_0_32px_18px_rgba(253,230,138,0.7)]"
            data-testid="jtw-c4p1-warm-lamp"
            aria-label="山门暖灯亮起"
          />
        )}
      </section>

      <OrderCards
        title="把真实来路排好"
        options={C4_P1_ROUTE_CARDS.map((card) => ({ ...card, correct: true }))}
        order={routeOrder}
        onChange={setRouteOrder}
        done={routeDone}
        testId="jtw-c4p1-route"
      />

      {storyDone ? (
        <section data-testid="jtw-c4p1-motives">
          <h2 className="mb-2 text-[15px] font-bold text-ink">选出正文里的两条理由</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {C4_P1_MOTIVE_OPTIONS.map((option) => (
              <Choice
                key={option.id}
                option={option}
                active={motives.includes(option.id)}
                onPick={() =>
                  setMotives((current) =>
                    current.includes(option.id)
                      ? current.filter((id) => id !== option.id)
                      : current.length < 2
                        ? [...current, option.id]
                        : [current[1], option.id],
                  )
                }
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="text-[13px] font-semibold text-brand-coral" data-testid="jtw-c4p1-unread">
          先读完两张故事卡，理由卡才会打开。
        </p>
      )}

      <section data-testid="jtw-c4p1-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C4_P1_PREDICTION_QUESTION}</h2>
        <div className="space-y-2">
          {C4_P1_PREDICTION_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => setPrediction(option.id)}
            />
          ))}
        </div>
      </section>

      <section data-testid="jtw-c4p1-why">
        <h2 className="mb-2 text-[15px] font-bold text-ink">用自己的话讲清楚为什么远行</h2>
        <div className="space-y-2">
          {C4_P1_WHY_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={why === option.id}
              onPick={() => setWhy(option.id)}
            />
          ))}
        </div>
      </section>

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p1-resolved">
          <p className="text-[15px] leading-7 text-ink">{C4_P1_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C4_P1_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p1-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C4_P1_CONTINUE_LABEL}
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
