import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  C4_P1_CLASSIC_CARD,
  C4_P1_CONTINUE_LABEL,
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_NEXT_PART_ID,
  C4_P1_PART_ID,
  C4_P1_PREDICTION_OPTIONS,
  C4_P1_PREDICTION_QUESTION,
  C4_P1_RESOLVED_WORLD_CHANGE,
  C4_P1_ROUTE_CARDS,
  C4_P1_SCREEN_IDS,
  C4_P1_STORY_AFTER,
  C4_P1_STORY_SCREENS,
  C4_P1_WHY_OPTIONS,
  c4p1Correct,
  c4p1MotivesDone,
  c4p1RouteDone,
  c4p1StoryRead,
} from './journeyWestC4Part1Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice, EvidenceGroup, OrderCards } from './partUi'

export function JourneyWestC4Part1Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [screen, setScreen] = useState(0)
  const [screensRead, setScreensRead] = useState<string[]>([C4_P1_SCREEN_IDS[0]])
  const [routeOrder, setRouteOrder] = useState<string[]>([])
  const [motives, setMotives] = useState<string[]>([])
  const [why, setWhy] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P1_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P1_PART_ID) ?? false
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
  const routeDone = c4p1RouteDone(routeOrder)
  const motivesDone = c4p1MotivesDone(motives)
  const whyDone = c4p1Correct(why, C4_P1_WHY_OPTIONS)
  const predictionDone = c4p1Correct(prediction, C4_P1_PREDICTION_OPTIONS)
  const resolved = storyDone && routeDone && motivesDone && whyDone && predictionDone
  const completed = Boolean(savedEntry)

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P1_PART_ID, {
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
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P1_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">山门前的雾正在散开…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p1-locked">
        <p className="font-bold text-ink">先把三页远行故事讲完整，山门才会打开。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第四章 你的名字叫孙悟空 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">山门前，把来路讲清楚</h1>
      </header>

      <section className="space-y-4 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c4p1-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P1_STORY_SCREENS[screen]}</p>
        <p className="text-[13px] leading-6 text-ink-soft">{C4_P1_CLASSIC_CARD}</p>
        <div className="flex gap-2">
          {screen === 1 && <button className="btn-pill-ghost" type="button" onClick={() => setScreen(0)}>读上一段</button>}
          {screen === 0 && (
            <button
              className="btn-pill-primary"
              data-testid="jtw-c4p1-story-next"
              type="button"
              onClick={() => {
                setScreen(1)
                setScreensRead((current) => current.includes(C4_P1_SCREEN_IDS[1])
                  ? current
                  : [...current, C4_P1_SCREEN_IDS[1]])
              }}
            >
              读师父的问题
            </button>
          )}
          <span data-testid="jtw-c4p1-story-count">{screensRead.length} / 2</span>
        </div>
      </section>

      <section
        className="rounded-2xl border border-hairline bg-gradient-to-r from-wash-mint via-canvas-pure to-wash-sunshine p-5"
        data-testid="jtw-c4p1-stage"
        data-world-state={resolved ? 'gate-open' : 'gate-closed'}
      >
        <div className="grid grid-cols-3 gap-3 text-center text-[14px] font-bold">
          <span>🍑 花果山</span><span>🌊 海路</span><span>⛩ 师门</span>
        </div>
        <div className="mt-5 text-center text-4xl" aria-label={resolved ? '山门暖灯亮起，通往庭院的门打开' : '山门关闭，空名字牌还在雾里'}>
          {resolved ? '🏮🚪▯' : '🌫️⛩️'}
        </div>
      </section>

      <OrderCards
        title="把真实来路按顺序排好"
        options={C4_P1_ROUTE_CARDS}
        order={routeOrder}
        onChange={setRouteOrder}
        done={routeDone}
        testId="jtw-c4p1-route"
      />

      {!storyDone ? (
        <p className="rounded-xl bg-wash-sunshine p-3 text-[14px] text-ink" data-testid="jtw-c4p1-unread">
          先读完师父的问题和石猴的回答，才能从正文找动机。
        </p>
      ) : (
        <EvidenceGroup
          title="选出正文里的两条动机证据"
          options={C4_P1_MOTIVE_OPTIONS}
          selected={motives}
          onToggle={(id) => setMotives((current) => current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id])}
          done={motivesDone}
          testId="jtw-c4p1-motives"
        />
      )}

      <section className="space-y-3">
        <h2 className="font-bold text-ink">为什么走这么远？</h2>
        {C4_P1_WHY_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={why === option.id} onPick={() => setWhy(option.id)} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-ink">{C4_P1_PREDICTION_QUESTION}</h2>
        {C4_P1_PREDICTION_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
        ))}
      </section>

      {resolved && (
        <section className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p1-resolved">
          <h2 className="font-black text-ink">{C4_P1_RESOLVED_WORLD_CHANGE}</h2>
          <p className="text-[15px] leading-7 text-ink">{C4_P1_STORY_AFTER}</p>
        </section>
      )}

      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p1-continue"
        type="button"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {completed ? '回到地图' : C4_P1_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">这一 Part 只解锁下一 Part，不会完成第四章，也不会创建项目。</p>
    </div>
  )
}
