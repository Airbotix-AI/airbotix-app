import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { JTW_C3_MONKEY_KING_SPRITE, JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C4_P1_CLASSIC_CARD,
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_NEXT_PART_ID,
  C4_P1_PART_ID,
  C4_P1_PREDICTION_OPTIONS,
  C4_P1_ROUTE_CARDS,
  C4_P1_SCREEN_IDS,
  C4_P1_STORY_SCREENS,
  C4_P1_WHY_OPTIONS,
  c4p1CorrectChoice,
  c4p1MotivesComplete,
  c4p1RouteOrdered,
  c4p1StoryRead,
} from './journeyWestC4Part1Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

export function JourneyWestC4Part1Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C4_P1_SCREEN_IDS[0]]);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [routeOrder, setRouteOrder] = useState<string[]>([]);
  const [motives, setMotives] = useState<string[]>([]);
  const [why, setWhy] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P1_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P1_PART_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P1_SCREEN_IDS]);
    setAudioPlayed((evidence.selections?.audio_replay ?? []).length > 0);
    setRouteOrder(evidence.selections?.route_order ?? []);
    setMotives(evidence.selections?.motive_evidence ?? []);
    setWhy(evidence.selections?.why_sentence?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const storyDone = c4p1StoryRead(screensRead);
  const routeDone = c4p1RouteOrdered(routeOrder);
  const motivesDone = c4p1MotivesComplete(motives);
  const whyDone = c4p1CorrectChoice(C4_P1_WHY_OPTIONS, why);
  const predictionDone = c4p1CorrectChoice(C4_P1_PREDICTION_OPTIONS, prediction);
  const resolved = storyDone && routeDone && motivesDone && whyDone && predictionDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P1_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          audio_replay: audioPlayed ? ['story-card-a'] : [],
          route_order: routeOrder,
          motive_evidence: motives,
          why_sentence: why ? [why] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P1_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">山门的灯正在亮起…</p>;
  if (!unlocked && !savedEntry) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c4p1-locked"
      >
        <p className="font-bold text-ink">先把第三章的远行故事讲完整，再来敲山门。</p>
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
          西游记 · 第四章 你有名字了：孙悟空 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">山门前，把来路讲清楚</h1>
      </header>

      <section className="space-y-4" data-testid="jtw-c4p1-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P1_STORY_SCREENS[screenIndex]}</p>
        {screenIndex === 0 ? (
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c4p1-story-next"
            onClick={() => {
              setScreenIndex(1);
              setScreensRead([...C4_P1_SCREEN_IDS]);
            }}
          >
            听石猴说明来意
          </button>
        ) : (
          <button type="button" className="btn-pill-ghost" onClick={() => setScreenIndex(0)}>
            回读第一段
          </button>
        )}
        <span
          className="ml-3 text-[12px] font-bold text-ink-soft"
          data-testid="jtw-c4p1-story-count"
        >
          {screensRead.length} / 2 段
        </span>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C4_P1_CLASSIC_CARD}
        </aside>
        <button
          type="button"
          className="btn-pill-ghost"
          data-testid="jtw-c4p1-audio"
          onClick={() => setAudioPlayed(true)}
        >
          {audioPlayed ? '再听一次故事卡A' : '▶ 听故事卡A'}
        </button>
      </section>

      <section
        className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c4p1-stage"
        data-world-state={resolved || savedEntry ? 'courtyard-open' : 'gate-closed'}
      >
        <img
          src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
          alt="师门山门外的石阶与暖灯"
          className="h-full w-full object-cover"
        />
        <img
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt="从花果山远行而来的石猴"
          className="absolute bottom-[8%] left-[42%] w-[14%]"
        />
        <div
          className={clsx(
            'absolute right-[8%] top-[13%] rounded-xl border-2 bg-amber-50 px-4 py-3 text-center font-black text-amber-950',
            resolved || savedEntry ? 'border-amber-300 shadow-lg' : 'border-stone-400 opacity-70',
          )}
          data-testid="jtw-c4p1-name-board"
        >
          空名字牌
        </div>
        {(resolved || savedEntry) && (
          <div
            className="absolute inset-y-0 right-0 w-2 bg-amber-200/90 shadow-[0_0_30px_14px_rgba(253,230,138,0.8)]"
            data-testid="jtw-c4p1-warm-light"
          />
        )}
      </section>

      <OrderCards
        title="把真正的来路按顺序摆好"
        options={[...C4_P1_ROUTE_CARDS]}
        order={routeOrder}
        onChange={setRouteOrder}
        done={routeDone}
        testId="jtw-c4p1-route"
      />

      {storyDone ? (
        <section data-testid="jtw-c4p1-motives">
          <h2 className="mb-2 text-[15px] font-bold text-ink">从正文选出两条真正的动机证据</h2>
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
                      : [...current, option.id],
                  )
                }
              />
            ))}
          </div>
          {motives.some(
            (id) => !C4_P1_MOTIVE_OPTIONS.find((option) => option.id === id)?.correct,
          ) && (
            <p role="status" className="mt-2 text-[13px] font-semibold text-brand-coral">
              正文说他愿意学习、还想把所学带回家；没有说寻宝或讨厌伙伴。
            </p>
          )}
        </section>
      ) : (
        <p data-testid="jtw-c4p1-unread" className="text-[13px] font-semibold text-brand-coral">
          先读完两段正文，动机证据才会打开。
        </p>
      )}

      <section>
        <h2 className="mb-2 text-[15px] font-bold text-ink">用“因为—所以”把来意讲清楚</h2>
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

      <section data-testid="jtw-c4p1-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          如果石猴只为寻宝，正文中哪两处会互相矛盾？
        </h2>
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
        {prediction && !predictionDone && (
          <p role="status" className="mt-2 text-[13px] font-semibold text-brand-coral">
            回到石猴自己的回答：找出“认真学习”和“带回家”两处。
          </p>
        )}
      </section>

      {(resolved || savedEntry) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c4p1-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">
            山门暖灯亮起，门只打开通往庭院的一条路，空名字牌进入视野。
          </p>
          <p className="mt-2 font-semibold text-ink">
            门内听见了石猴的来处和理由；下一步要理解为什么一个名字会连接过去与未来。
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
          data-testid="jtw-c4p1-continue"
          disabled={(!resolved && !savedEntry) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : '看看空木牌'}
        </button>
      </footer>
    </div>
  );
}
