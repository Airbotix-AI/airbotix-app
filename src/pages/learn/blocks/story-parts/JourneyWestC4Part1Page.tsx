import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
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
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice, OrderCards } from './partUi'

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
  const completed = Boolean(savedEntry)
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P1_SCREEN_IDS])
    setRouteOrder(evidence.selections?.route_card_order ?? [])
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

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          route_card_order: routeOrder,
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

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">山门的灯正亮起来…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p1-locked">
        <p className="font-bold text-ink">先完成第三章的远行讲回，再去敲师门。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
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
        <div className="flex gap-2">
          {screenIndex === 1 ? (
            <button type="button" className="btn-pill-ghost" onClick={() => setScreenIndex(0)}>回上一段</button>
          ) : (
            <button
              type="button"
              className="btn-pill-primary"
              data-testid="jtw-c4p1-story-next"
              onClick={() => {
                setScreenIndex(1)
                setScreensRead([...C4_P1_SCREEN_IDS])
              }}
            >
              读师门前的对话
            </button>
          )}
          <span data-testid="jtw-c4p1-story-count" className="self-center text-[12px] font-bold text-ink-soft">
            {screensRead.length} / 2 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">原著小卡片：</span>{C4_P1_CLASSIC_CARD}
        </aside>
      </section>

      <OrderCards
        title="把真正走过的三段来路按顺序摆好"
        options={[...C4_P1_ROUTE_CARDS]}
        order={routeOrder}
        onChange={setRouteOrder}
        done={routeDone}
        testId="jtw-c4p1-route"
      />
      <div className="grid gap-2 sm:grid-cols-3" data-testid="jtw-c4p1-route-art">
        {C4_P1_ROUTE_CARDS.map((card) => (
          <img key={card.id} src={card.asset} alt={card.alt} className="h-28 w-full rounded-2xl object-cover" />
        ))}
      </div>

      {storyDone ? (
        <section data-testid="jtw-c4p1-motives">
          <h2 className="mb-2 text-[15px] font-bold text-ink">选出正文里的两条动机证据</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {C4_P1_MOTIVE_OPTIONS.map((option) => {
              const active = motives.includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  className={clsx('rounded-2xl border p-3 text-left', active ? 'border-brand-mint bg-wash-mint' : 'border-hairline')}
                  onClick={() => setMotives((current) => active ? current.filter((id) => id !== option.id) : [...current, option.id])}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          {motives.some((id) => !C4_P1_MOTIVE_OPTIONS.find((option) => option.id === id)?.correct) && (
            <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
              “寻宝”和“不喜欢伙伴”都不是正文证据，请回到石猴自己的回答。
            </p>
          )}
        </section>
      ) : (
        <p data-testid="jtw-c4p1-unread" className="text-[13px] font-semibold text-brand-coral">
          先读完两段正文，动机证据才会出现。
        </p>
      )}

      <section>
        <h2 className="mb-2 text-[15px] font-bold text-ink">用自己的话讲清楚 Why</h2>
        <div className="flex flex-col gap-2">
          {C4_P1_WHY_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={why === option.id} onPick={() => setWhy(option.id)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C4_P1_PREDICTION_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C4_P1_PREDICTION_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
          ))}
        </div>
      </section>

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p1-resolved">
          <div className="mb-3 rounded-2xl border border-brand-sunshine bg-canvas-pure p-5" data-testid="jtw-c4p1-nameplate">
            <span className="block text-[12px] font-bold text-ink-soft">空名字牌</span>
            <span className="mt-2 block h-3 rounded-full bg-brand-sunshine/70 motion-safe:animate-pulse" />
          </div>
          <p className="text-[15px] leading-7 text-ink">{C4_P1_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C4_P1_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p1-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : '看看空木牌'}
        </button>
      </footer>
    </div>
  )
}
