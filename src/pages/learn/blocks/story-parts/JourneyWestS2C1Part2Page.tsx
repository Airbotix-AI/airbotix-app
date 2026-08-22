import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Choice } from './partUi'
import { JourneyWestS2Scene } from './JourneyWestS2Scene'
import {
  JTW_S2_C1_P2_ID,
  JTW_S2_C1_P3_ID,
  JTW_S2_STORY_LINE_ID,
  S2_C1_P2_MOTIVE_OPTIONS,
  S2_C1_P2_REASON_OPTIONS,
  S2_C1_P2_STORY,
} from './journeyWestSeason2'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

export function JourneyWestS2C1Part2Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S2_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S2_STORY_LINE_ID),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [motive, setMotive] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === JTW_S2_C1_P2_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(JTW_S2_C1_P2_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-card-2'))
    setMotive(evidence.selections?.motive_choice?.[0] ?? null)
    setReason(evidence.selections?.because_sentence?.[0] ?? null)
    setRestored(true)
  }

  const motiveDone = motive === 'break-down-goal'
  const reasonDone = reason === 'map-long-three-steps'
  const completed = Boolean(savedEntry)
  const resolved = storyRead && motiveDone && reasonDone

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S2_STORY_LINE_ID, JTW_S2_C1_P2_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-card-2'] : [],
          motive_choice: motive ? [motive] : [],
          because_sentence: reason ? [reason] : [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S2_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: JTW_S2_C1_P3_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在展开纸条的第二面…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-s2-c1p2-locked">
        <p className="font-bold text-ink">先完成 Part 1，把今天的三步排清楚。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-s2-c1-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第二季 · 第一章 长安的出发纸条 · Part 2 · Why</p>
        <h1 className="text-[28px] font-black text-ink">纸条为什么只有三行？</h1>
      </header>

      <JourneyWestS2Scene partId={JTW_S2_C1_P2_ID} resolved={resolved || completed} />

      <section className="space-y-4" data-testid="jtw-s2-c1p2-story">
        {S2_C1_P2_STORY.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <button type="button" className="btn-pill-primary" onClick={() => setStoryRead(true)} data-testid="jtw-s2-c1p2-read">
          {storyRead ? '故事卡 2 已共读 ✓' : '我已读完故事卡 2'}
        </button>
      </section>

      <section data-testid="jtw-s2-c1p2-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">玄奘为什么只写今天的三步？</h2>
        <div className="flex flex-col gap-2">
          {S2_C1_P2_MOTIVE_OPTIONS.map((option) => <Choice key={option.id} option={option} active={motive === option.id} onPick={() => setMotive(option.id)} />)}
        </div>
        {motive && !motiveDone && <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">再读玄奘的话：远目标还在，他只是先把今天能做的事拆清楚。</p>}
      </section>

      <section data-testid="jtw-s2-c1p2-reason">
        <h2 className="mb-2 text-[15px] font-bold text-ink">用“因为—所以”把理由讲完整</h2>
        <div className="flex flex-col gap-2">
          {S2_C1_P2_REASON_OPTIONS.map((option) => <Choice key={option.id} option={option} active={reason === option.id} onPick={() => setReason(option.id)} />)}
        </div>
        {reason && !reasonDone && <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">理由要来自故事里的长地图，不是来自系统规则。</p>}
      </section>

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-s2-c1p2-resolved">
          <p className="font-bold text-ink">小纸条展开，三幅图亮起来了。</p>
          <ol className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px] font-bold text-ink" aria-label="纸条上的三幅图">
            <li className="rounded-xl bg-canvas-pure p-3">1 · 行囊</li>
            <li className="rounded-xl bg-canvas-pure p-3">2 · 城门</li>
            <li className="rounded-xl bg-canvas-pure p-3">3 · 山影</li>
          </ol>
          <p className="mt-3 text-[14px] text-ink">图已经有顺序，却还不会自己运行。下一 Part 要先在桌面上排出完整行动，再预测玄奘会停在哪里。</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link>
        <button type="button" className="btn-pill-primary" disabled={(!resolved && !completed) || complete.isPending} onClick={() => complete.mutate()} data-testid="jtw-s2-c1p2-continue">
          {complete.isPending ? '正在保存…' : '继续故事 →'}
        </button>
      </footer>
      {complete.isError && <p role="alert" className="text-[13px] font-semibold text-brand-coral">纸条理由暂时没有保存，请再试一次。</p>}
    </div>
  )
}
