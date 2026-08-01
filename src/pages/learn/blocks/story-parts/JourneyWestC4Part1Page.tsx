import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C4_P1_CLASSIC_CARD,
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_PREDICTION_OPTIONS,
  C4_P1_ROUTE_CARDS,
  C4_P1_STORY,
  C4_P1_WHY_OPTIONS,
  c4p1CorrectChoice,
  c4p1MotiveDone,
  c4p1RouteDone,
} from './journeyWestC4Part1Program';
import { Choice, EvidenceGroup, OrderCards } from './partUi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';

const PART_ID = 'jtw-s1-c4-p1';
const NEXT_PART_ID = 'jtw-s1-c4-p2';

export function JourneyWestC4Part1Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const [storyRead, setStoryRead] = useState(false);
  const [routeOrder, setRouteOrder] = useState<string[]>([]);
  const [motives, setMotives] = useState<string[]>([]);
  const [why, setWhy] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-card-a'));
    setRouteOrder(evidence.selections?.route_card_order ?? []);
    setMotives(evidence.selections?.motive_evidence ?? []);
    setWhy(evidence.selections?.why_sentence?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const routeDone = c4p1RouteDone(routeOrder);
  const motivesDone = c4p1MotiveDone(motives);
  const whyDone = c4p1CorrectChoice(C4_P1_WHY_OPTIONS, why);
  const predictionDone = c4p1CorrectChoice(C4_P1_PREDICTION_OPTIONS, prediction);
  const resolved = storyRead && routeDone && motivesDone && whyDone && predictionDone;
  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-card-a'] : [],
          route_card_order: routeOrder,
          motive_evidence: motives,
          why_sentence: why ? [why] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">山门的灯正在亮起…</p>;
  if (!unlocked && !savedEntry)
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c4p1-locked"
      >
        <p className="font-bold text-ink">先完成第三章的远行讲回，再到山门说明来意。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第四章 你有名字了 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">山门前，把来路讲清楚</h1>
      </header>
      <section className="space-y-4" data-testid="jtw-c4p1-story">
        <img
          className="aspect-[16/10] w-full rounded-2xl object-cover"
          src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
          alt="雾散后的师门山路与亮起的石牌"
        />
        {C4_P1_STORY.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C4_P1_CLASSIC_CARD}
        </aside>
        <button
          type="button"
          className="btn-pill-primary"
          aria-pressed={storyRead}
          onClick={() => setStoryRead(true)}
        >
          我读完了门前故事
        </button>
      </section>
      <OrderCards
        title="把石猴的来路按顺序排好"
        options={C4_P1_ROUTE_CARDS}
        order={routeOrder}
        onChange={setRouteOrder}
        done={routeDone}
        testId="jtw-c4p1-route"
      />
      {storyRead ? (
        <EvidenceGroup
          title="从正文选出两条真正的来意证据"
          options={C4_P1_MOTIVE_OPTIONS}
          selected={motives}
          onToggle={(id) =>
            setMotives((current) =>
              current.includes(id)
                ? current.filter((item) => item !== id)
                : current.length < 2
                  ? [...current, id]
                  : current,
            )
          }
          done={motivesDone}
          testId="jtw-c4p1-motives"
        />
      ) : (
        <p data-testid="jtw-c4p1-unread" className="text-[14px] font-semibold text-ink-soft">
          先读完正文，证据卡才会打开。
        </p>
      )}
      <section data-testid="jtw-c4p1-why">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          用“因为—所以—后来”回答：石猴为什么来到这里？
        </h2>
        <div className="flex flex-col gap-2">
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
          Prediction：如果石猴只为寻宝，正文中哪两处会互相矛盾？
        </h2>
        <div className="flex flex-col gap-2">
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
      {(resolved || savedEntry) && (
        <section
          className="rounded-2xl border border-brand-mint/50 bg-wash-mint p-5"
          data-testid="jtw-c4p1-resolved"
        >
          <p className="font-bold text-ink">
            山门暖灯亮起，门只打开通往庭院的一条路，空名字牌进入视野。
          </p>
          <p className="mt-2 text-[14px] text-ink">
            门内听见了石猴的来处和理由；下一步要理解为什么一个名字会连接过去与未来。
          </p>
        </section>
      )}
      <button
        type="button"
        className="btn-pill-primary"
        data-testid="jtw-c4p1-continue"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        看看空木牌
      </button>
    </div>
  );
}
