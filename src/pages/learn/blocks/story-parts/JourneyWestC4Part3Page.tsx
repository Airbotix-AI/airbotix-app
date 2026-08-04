import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { JTW_C3_MONKEY_KING_SPRITE, JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage'
import { Choice, EvidenceGroup } from './partUi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C4_P3_CARDS,
  C4_P3_PREDICTIONS,
  C4_P3_STORY,
  C4_P3_TRIGGER_OPTIONS,
  c4p3AssignmentsDone,
} from './journeyWestC4Part3Program'

const PART_ID = 'jtw-s1-c4-p3'
const NEXT_PART_ID = 'jtw-s1-c4-p4'

type Trigger = 'start' | 'tap' | 'unassigned'

export function JourneyWestC4Part3Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, Trigger>>({})
  const [triggers, setTriggers] = useState<string[]>([])
  const [rehearsals, setRehearsals] = useState<string[]>([])
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-screen-3'))
    setPrediction(evidence.prediction ?? null)
    const saved = Object.fromEntries((evidence.selections?.card_assignments ?? []).map((value) => {
      const [id, trigger] = value.split(':')
      return [id, trigger as Trigger]
    })) as Record<string, Trigger>
    setAssignments(saved)
    setTriggers(evidence.selections?.trigger_evidence ?? [])
    setRehearsals(evidence.selections?.rehearsals ?? [])
    setRestored(true)
  }

  const predictionDone = C4_P3_PREDICTIONS.find((option) => option.id === prediction)?.correct === true
  const assignmentDone = c4p3AssignmentsDone(assignments)
  const triggerDone = triggers.length === 2
  const rehearsalDone = rehearsals.length === 2
  const resolved = storyRead && predictionDone && assignmentDone && triggerDone && rehearsalDone
  const completed = Boolean(savedEntry)

  const cycleCard = (id: string) => {
    setAssignments((current) => {
      const next: Trigger = current[id] === 'unassigned' || !current[id] ? 'start' : current[id] === 'start' ? 'tap' : 'unassigned'
      return { ...current, [id]: next }
    })
  }

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-screen-3'] : [],
          card_assignments: Object.entries(assignments).map(([id, trigger]) => `${id}:${trigger}`),
          trigger_evidence: triggers,
          rehearsals,
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">两个入口正在画线…</p>
  if (!unlocked && !completed) return <div className="p-10 text-center" data-testid="jtw-c4p3-locked">先完成名字的两个开始。</div>

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p3">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第四章 · Part 3</p>
        <h1 className="text-[28px] font-black text-ink">两个入口圈</h1>
      </header>
      <section className="space-y-3" data-testid="jtw-c4p3-story">
        {C4_P3_STORY.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p3-read" onClick={() => setStoryRead(true)}>{storyRead ? 'Story Screen 3 已共读 ✓' : '共读 Story Screen 3'}</button>
      </section>
      <section className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-hairline" data-testid="jtw-c4p3-stage">
        <img src={JTW_C3_PAGE3_RESOLVED_BACKGROUND} alt="山门前有两个不同入口" className="absolute inset-0 h-full w-full object-cover" />
        <img src={JTW_C3_MONKEY_KING_SPRITE} alt="悟空等待入口" className="absolute bottom-[18%] left-[42%] w-[15%]" />
        <div className="absolute left-[8%] top-[12%] rounded-2xl border-2 border-brand-sky bg-canvas-pure/90 p-3 text-center font-bold">🚩 Start 圈<br /><span className="text-[12px] font-normal">等场景开始</span></div>
        <div className="absolute right-[8%] top-[12%] rounded-2xl border-2 border-brand-sunshine bg-canvas-pure/90 p-3 text-center font-bold">👆 Tap 圈<br /><span className="text-[12px] font-normal">等观众邀请</span></div>
      </section>
      {storyRead ? <section data-testid="jtw-c4p3-cards" className="space-y-3"><h2 className="font-bold text-ink">每次点卡，整张卡移动到下一个入口</h2><div className="flex flex-wrap gap-2">{C4_P3_CARDS.map((card) => <button key={card.id} type="button" className="rounded-2xl border border-hairline bg-canvas-pure px-4 py-3 text-left" onClick={() => cycleCard(card.id)}>{card.label}<span className="ml-2 text-[12px] font-bold text-brand-sky">{assignments[card.id] ?? '未放入'}</span></button>)}</div>{assignmentDone && <p data-testid="jtw-c4p3-assignment-done" className="font-bold text-brand-mint">两条地面轨迹已经分开。</p>}</section> : <p data-testid="jtw-c4p3-unread" className="font-semibold text-brand-coral">先读故事，入口卡才会打开。</p>}
      <EvidenceGroup title="指认两个等待条件" options={[...C4_P3_TRIGGER_OPTIONS]} selected={triggers} onToggle={(id) => setTriggers((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} done={triggerDone} testId="jtw-c4p3-triggers" />
      <section data-testid="jtw-c4p3-prediction"><h2 className="mb-2 font-bold text-ink">如果转身还在 Start 圈，举旗会怎样？</h2><div className="flex flex-col gap-2">{C4_P3_PREDICTIONS.map((option) => <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />)}</div></section>
      <section data-testid="jtw-c4p3-rehearsal"><h2 className="mb-2 font-bold text-ink">举旗与纸卡 Tap 各演一次</h2><div className="flex gap-2"><button type="button" className="btn-pill-secondary" onClick={() => setRehearsals((current) => current.includes('start') ? current : [...current, 'start'])}>🚩 举旗演练</button><button type="button" className="btn-pill-secondary" onClick={() => setRehearsals((current) => current.includes('tap') ? current : [...current, 'tap'])}>👆 纸卡 Tap 演练</button></div><p data-testid="jtw-c4p3-rehearsal-state">{rehearsals.length}/2 次演练</p></section>
      {(resolved || completed) && <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p3-resolved"><p>名字卡停在 Start，动作卡停在 Tap；两条地面轨迹不再交叉。</p><p className="mt-2 font-semibold">纸卡已经分清，但真正的两条积木链仍有空槽。</p></section>}
      <footer className="flex items-center justify-between gap-4"><Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link><button type="button" className="btn-pill-primary" data-testid="jtw-c4p3-continue" disabled={(!resolved && !completed) || complete.isPending} onClick={() => void complete.mutate()}>搭好两条故事</button></footer>
    </div>
  )
}
