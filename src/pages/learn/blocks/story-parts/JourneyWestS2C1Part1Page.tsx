import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Choice, OrderCards } from './partUi'
import {
  JTW_S2_C1_P1_ID,
  JTW_S2_C1_P2_ID,
  JTW_S2_STORY_LINE_ID,
  S2_C1_P1_CLASSIC_CARD,
  S2_C1_P1_ROUTE_CARDS,
  S2_C1_P1_SCOPE_OPTIONS,
  S2_C1_P1_STORY,
  s2c1p1RouteDone,
} from './journeyWestSeason2'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

export function JourneyWestS2C1Part1Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S2_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S2_STORY_LINE_ID),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [scopeChoice, setScopeChoice] = useState<string | null>(null)
  const [routeOrder, setRouteOrder] = useState<string[]>([])
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === JTW_S2_C1_P1_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(JTW_S2_C1_P1_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-card-1'))
    setScopeChoice(evidence.selections?.scope_choice?.[0] ?? null)
    setRouteOrder(evidence.selections?.route_order ?? [])
    setRestored(true)
  }

  const scopeDone = scopeChoice === 'three-steps'
  const routeDone = s2c1p1RouteDone(routeOrder)
  const completed = Boolean(savedEntry)
  const resolved = storyRead && scopeDone && routeDone

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S2_STORY_LINE_ID, JTW_S2_C1_P1_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-card-1'] : [],
          scope_choice: scopeChoice ? [scopeChoice] : [],
          route_order: routeOrder,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S2_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: JTW_S2_C1_P2_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在展开长安的出发纸条…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-s2-c1p1-locked">
        <p className="font-bold text-ink">第二季入口还没有解锁。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-s2-c1-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第二季 · 第一章 长安的出发纸条 · Part 1</p>
        <h1 className="text-[28px] font-black text-ink">把很远的路，变成今天的三步</h1>
      </header>

      <section className="space-y-4" data-testid="jtw-s2-c1p1-story">
        {S2_C1_P1_STORY.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>{S2_C1_P1_CLASSIC_CARD}
        </aside>
        <button type="button" className="btn-pill-primary" onClick={() => setStoryRead(true)} data-testid="jtw-s2-c1p1-read">
          {storyRead ? '故事卡 1 已共读 ✓' : '我已读完故事卡 1'}
        </button>
      </section>

      <section data-testid="jtw-s2-c1p1-scope">
        <h2 className="mb-2 text-[15px] font-bold text-ink">现在能完成的是整条西行，还是今天的三步？</h2>
        <div className="flex flex-col gap-2">
          {S2_C1_P1_SCOPE_OPTIONS.map((option) => <Choice key={option.id} option={option} active={scopeChoice === option.id} onPick={() => setScopeChoice(option.id)} />)}
        </div>
        {scopeChoice === 'whole-journey' && <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">地图很长，再看看桌上的小纸条。</p>}
      </section>

      {storyRead ? (
        <OrderCards title="按纸条把三件事排好" options={[...S2_C1_P1_ROUTE_CARDS]} order={routeOrder} onChange={setRouteOrder} done={routeDone} testId="jtw-s2-c1p1-route" />
      ) : (
        <p className="font-semibold text-brand-coral">先读完故事卡，三步卡才会打开。</p>
      )}

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-s2-c1p1-resolved">
          <p className="font-bold text-ink">出发纸条展开了：行囊 → 城门 → 第一座山。</p>
          <p className="mt-2 text-[14px] text-ink">远目标没有消失，但今天的第一段路已经讲清楚。下一 Part 会问：玄奘为什么要先写三步？</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link>
        <button type="button" className="btn-pill-primary" disabled={(!resolved && !completed) || complete.isPending} onClick={() => complete.mutate()} data-testid="jtw-s2-c1p1-continue">
          {complete.isPending ? '正在保存…' : '继续故事 →'}
        </button>
      </footer>
      {complete.isError && <p role="alert" className="text-[13px] font-semibold text-brand-coral">出发纸条暂时没有保存，请再试一次。</p>}
    </div>
  )
}
