import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { JTW_C3_MONKEY_KING_SPRITE, JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage'
import {
  C4_P1_CLASSIC_CARD,
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_PREDICTION_OPTIONS,
  C4_P1_PREDICTION_QUESTION,
  C4_P1_RESOLVED_WORLD_CHANGE,
  C4_P1_ROUTE_CARDS,
  C4_P1_SCREEN_IDS,
  C4_P1_STORY_AFTER,
  C4_P1_STORY_SCREENS,
  C4_P1_WHY_OPTIONS,
  c4p1MotivesDone,
  c4p1PredictionDone,
  c4p1RouteOrdered,
  c4p1StoryRead,
  c4p1WhyDone,
} from './journeyWestC4Part1Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice, EvidenceGroup, OrderCards } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

const PART_ID = 'jtw-s1-c4-p1'
const NEXT_PART_ID = 'jtw-s1-c4-p2'

export function JourneyWestC4Part1Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [screenIndex, setScreenIndex] = useState(0)
  const [screensRead, setScreensRead] = useState<string[]>([C4_P1_SCREEN_IDS[0]])
  const [routeOrder, setRouteOrder] = useState<string[]>([])
  const [motives, setMotives] = useState<string[]>([])
  const [why, setWhy] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P1_SCREEN_IDS])
    setRouteOrder(evidence.selections?.route_order ?? [])
    setMotives(evidence.selections?.motive_evidence ?? [])
    setWhy(evidence.selections?.why_sentence?.[0] ?? null)
    setPrediction(evidence.prediction ?? null)
    setRestored(true)
  }

  const storyDone = c4p1StoryRead(screensRead)
  const routeDone = c4p1RouteOrdered(routeOrder)
  const motivesDone = c4p1MotivesDone(motives)
  const whyDone = c4p1WhyDone(why)
  const predictionDone = c4p1PredictionDone(prediction)
  const resolved = storyDone && routeDone && motivesDone && whyDone && predictionDone
  const completed = Boolean(savedEntry)

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          route_order: routeOrder,
          motive_evidence: motives,
          why_sentence: why ? [why] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">山门里的暖灯正在亮起…</p>
  }

  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p1-locked">
        <p className="font-bold text-ink">先完成三页求师路，再来山门前说明来意。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    )
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
        <p data-testid="jtw-c4p1-story-count" className="text-[13px] font-bold text-ink-soft">
          {screenIndex + 1} / {C4_P1_STORY_SCREENS.length}
        </p>
        {screenIndex === 0 ? (
          <button
            type="button"
            className="btn-pill-secondary"
            data-testid="jtw-c4p1-story-next"
            onClick={() => {
              setScreenIndex(1)
              setScreensRead((current) =>
                current.includes(C4_P1_SCREEN_IDS[1])
                  ? current
                  : [...current, C4_P1_SCREEN_IDS[1]],
              )
            }}
          >
            听石猴回答
          </button>
        ) : (
          <button type="button" className="btn-pill-ghost" onClick={() => setScreenIndex(0)}>
            回上一段
          </button>
        )}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C4_P1_CLASSIC_CARD}
        </aside>
      </section>

      <section
        className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c4p1-stage"
        data-world-state={resolved || completed ? 'gate-open' : 'gate-waiting'}
      >
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
          alt="师门山路与石牌；山门的暖灯等待石猴说明来意"
        />
        <img
          className="absolute bottom-[8%] left-[20%] w-[16%]"
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt="从花果山一路来到师门的石猴"
        />
        {(resolved || completed) && (
          <div
            data-testid="jtw-c4p1-name-board"
            className="absolute right-[16%] top-[28%] rounded-xl border-2 border-amber-200 bg-amber-50/90 px-5 py-4 text-center font-black text-amber-950 shadow-lg"
          >
            空名字牌
          </div>
        )}
      </section>

      {!storyDone && (
        <p role="status" className="rounded-xl bg-wash-sunshine p-3 text-[14px] text-ink">
          先读完石猴的回答，卡片上的证据才有正文依据。
        </p>
      )}

      <OrderCards
        title="把来路按故事顺序排好"
        options={[...C4_P1_ROUTE_CARDS]}
        order={routeOrder}
        onChange={setRouteOrder}
        done={routeDone}
        testId="jtw-c4p1-route"
      />

      <EvidenceGroup
        title="从正文选出两条真正的动机证据"
        options={[...C4_P1_MOTIVE_OPTIONS]}
        selected={motives}
        onToggle={(id) =>
          setMotives((current) =>
            current.includes(id)
              ? current.filter((value) => value !== id)
              : current.length < 2
                ? [...current, id]
                : current,
          )
        }
        done={motivesDone}
        testId="jtw-c4p1-motives"
      />

      <section data-testid="jtw-c4p1-why">
        <h2 className="mb-2 text-[15px] font-bold text-ink">用一句“因为—所以”回答师父</h2>
        <div className="grid gap-2">
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
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C4_P1_PREDICTION_QUESTION}</h2>
        <div className="grid gap-2">
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

      {(resolved || completed) && (
        <section className="space-y-3 rounded-2xl border border-brand-mint/50 bg-wash-mint p-5" data-testid="jtw-c4p1-resolved">
          <p className="font-bold text-ink">{C4_P1_RESOLVED_WORLD_CHANGE}</p>
          <p className="text-[15px] leading-7 text-ink">{C4_P1_STORY_AFTER}</p>
        </section>
      )}

      <button
        type="button"
        className="btn-pill-primary"
        data-testid="jtw-c4p1-continue"
        disabled={!resolved || completed || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {completed ? '已把来路讲清楚' : complete.isPending ? '正在保存证据…' : '看看空木牌'}
      </button>
    </div>
  )
}
