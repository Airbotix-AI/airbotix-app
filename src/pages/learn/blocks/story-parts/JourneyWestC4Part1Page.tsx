import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE2_BACKGROUND,
  JTW_C3_PAGE3_BACKGROUND,
  JTW_C3_PAGE3_RESOLVED_BACKGROUND,
} from '../jtwC3Stage'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
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
  c4p1MotivesCorrect,
  c4p1RouteOrdered,
  c4p1StoryRead,
  c4p1WrongMotiveSelected,
} from './journeyWestC4Part1Program'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice, EvidenceGroup, OrderCards } from './partUi'

const ROUTE_ART = [
  { id: 'flower-fruit-mountain', src: JTW_C3_PAGE1_BACKGROUND, alt: '花果山海岸' },
  { id: 'sea-road', src: JTW_C3_PAGE2_BACKGROUND, alt: '海上的长路' },
  { id: 'master-gate', src: JTW_C3_PAGE3_BACKGROUND, alt: '师门山门' },
] as const

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
  const [whyChoice, setWhyChoice] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P1_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P1_PART_ID) ?? false

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P1_SCREEN_IDS])
    setRouteOrder(evidence.selections?.route_order ?? [])
    setMotives(evidence.selections?.motive_evidence ?? [])
    setWhyChoice(evidence.selections?.why_sentence?.[0] ?? null)
    setPrediction(evidence.prediction ?? null)
    setRestored(true)
  }

  const storyDone = c4p1StoryRead(screensRead)
  const routeDone = c4p1RouteOrdered(routeOrder)
  const motivesDone = c4p1MotivesCorrect(motives)
  const whyDone = c4p1CorrectChoice(C4_P1_WHY_OPTIONS, whyChoice)
  const predictionDone = c4p1CorrectChoice(C4_P1_PREDICTION_OPTIONS, prediction)
  const resolved = storyDone && routeDone && motivesDone && whyDone && predictionDone
  const completed = Boolean(savedEntry)

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P1_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          route_order: routeOrder,
          motive_evidence: motives,
          why_sentence: whyChoice ? [whyChoice] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P1_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在走到山门前…</p>

  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p1-locked">
        <p className="font-bold text-ink">先完成远行印，再来敲山门。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
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

      <section className="space-y-4" data-testid="jtw-c4p1-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C4_P1_STORY_SCREENS[screenIndex]}</p>
        <div className="flex items-center gap-2">
          {screenIndex === 0 ? (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c4p1-story-next"
              onClick={() => {
                setScreenIndex(1)
                setScreensRead((current) =>
                  current.includes(C4_P1_SCREEN_IDS[1]) ? current : [...current, C4_P1_SCREEN_IDS[1]],
                )
              }}
            >
              听师父问来意
            </button>
          ) : (
            <button type="button" className="btn-pill-ghost text-[13px]" onClick={() => setScreenIndex(0)}>
              看上一段
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c4p1-story-count">
            {screensRead.length} / {C4_P1_SCREEN_IDS.length} 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>{C4_P1_CLASSIC_CARD}
        </aside>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-hairline" data-testid="jtw-c4p1-stage" data-world-state={resolved || completed ? 'gate-warm' : 'gate-closed'}>
        <img
          src={resolved || completed ? JTW_C3_PAGE3_RESOLVED_BACKGROUND : JTW_C3_PAGE3_BACKGROUND}
          alt={resolved || completed ? '山门暖灯亮起，通往庭院的路亮了' : '石猴站在安静的师门山门前'}
          className="aspect-[16/10] w-full object-cover"
        />
        <img
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt=""
          aria-hidden
          className="absolute bottom-[8%] left-[18%] w-[14%]"
          data-testid="jtw-c4p1-monkey"
          data-continuity="c3-traveller"
        />
        <span className="absolute right-[15%] top-[22%] rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2 font-bold text-amber-950" data-testid="jtw-c4p1-name-board">
          空名字牌
        </span>
      </section>

      <section data-testid="jtw-c4p1-route-art">
        <div className="grid grid-cols-3 gap-2">
          {ROUTE_ART.map((card) => (
            <img key={card.id} src={card.src} alt={card.alt} data-route={card.id} className="aspect-[4/3] rounded-xl object-cover" />
          ))}
        </div>
      </section>

      <OrderCards
        title="把来路排清楚"
        options={C4_P1_ROUTE_CARDS}
        order={routeOrder}
        onChange={setRouteOrder}
        done={routeDone}
        testId="jtw-c4p1-route"
      />

      {storyDone ? (
        <EvidenceGroup
          title="从正文找出两条真正的来意"
          options={C4_P1_MOTIVE_OPTIONS}
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
      ) : (
        <p className="text-[13px] font-semibold text-brand-coral" data-testid="jtw-c4p1-unread">
          先读完两段正文，才能从文字里找来意。
        </p>
      )}
      {c4p1WrongMotiveSelected(motives) && (
        <p className="text-[13px] font-semibold text-brand-coral" role="status">
          正文说他珍惜伙伴、愿意学习，不是来寻宝或逃开伙伴。
        </p>
      )}

      <section data-testid="jtw-c4p1-why">
        <h2 className="mb-2 text-[15px] font-bold text-ink">把“为什么走这么远”说完整</h2>
        <div className="flex flex-col gap-2">
          {C4_P1_WHY_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={whyChoice === option.id} onPick={() => setWhyChoice(option.id)} />
          ))}
        </div>
      </section>

      <section data-testid="jtw-c4p1-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          如果石猴只为寻宝，正文中哪两处会互相矛盾？
        </h2>
        <div className="flex flex-col gap-2">
          {C4_P1_PREDICTION_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
          ))}
        </div>
      </section>

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p1-resolved">
          <p className="text-[15px] leading-7 text-ink">山门暖灯亮起，门只打开通往庭院的一条路，空名字牌进入视野。</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">门内听见了石猴的来处和理由。下一步要理解为什么一个名字会连接过去与未来。</p>
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
      {complete.isError && <p role="alert" className="text-right text-[13px] font-semibold text-brand-coral">没有保存上，请再试一次。</p>}
    </div>
  )
}
