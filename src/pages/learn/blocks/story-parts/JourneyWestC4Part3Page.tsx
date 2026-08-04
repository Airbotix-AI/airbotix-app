import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import {
  C4_P3_PREDICTIONS,
  C4_P3_STORY,
  C4_P3_TRIGGER_CHOICES,
  c4p3ModelComplete,
} from './journeyWestC4Part3Program'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice } from './partUi'

const PART_ID = 'jtw-s1-c4-p3'
const NEXT_PART_ID = 'jtw-s1-c4-p4'

export function JourneyWestC4Part3Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [startMeaning, setStartMeaning] = useState<string | null>(null)
  const [tapMeaning, setTapMeaning] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [actionCircle, setActionCircle] = useState('start')
  const [movedCards, setMovedCards] = useState<string[]>([])
  const [rehearsals, setRehearsals] = useState<string[]>([])
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID)
  const completed = Boolean(savedEntry)
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-screen-3'))
    setStartMeaning(evidence.selections?.trigger_meanings?.[0] ?? null)
    setTapMeaning(evidence.selections?.trigger_meanings?.[1] ?? null)
    setPrediction(evidence.prediction ?? null)
    setActionCircle((evidence.selections?.action_circle ?? [])[0] ?? 'start')
    setMovedCards(evidence.selections?.card_moves ?? [])
    setRehearsals(evidence.selections?.rehearsals ?? [])
    setRestored(true)
  }

  const meaningsDone = startMeaning === 'scene-start' && tapMeaning === 'audience-tap'
  const predicted = prediction === 'turn-before-invite'
  const resolved = storyRead && c4p3ModelComplete({ startMeaning, tapMeaning, prediction, actionCircle, movedCards, rehearsals })

  const moveTurn = () => {
    if (!storyRead || !meaningsDone || !predicted || actionCircle !== 'start') return
    setActionCircle('tap')
    setMovedCards(['turn:start-to-tap'])
    setRehearsals([])
  }

  const addRehearsal = (value: string) => {
    if (actionCircle !== 'tap') return
    setRehearsals((current) => current.includes(value) ? current : [...current, value])
  }

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
      schema_version: 1,
      selections: {
        story_screens: storyRead ? ['story-screen-3'] : [],
        trigger_meanings: [startMeaning, tapMeaning].filter((value): value is string => Boolean(value)),
        action_circle: [actionCircle],
        card_moves: movedCards,
        rehearsals,
        model_evidence: resolved ? ['name-in-start', 'turn-in-tap', 'paths-not-crossed'] : [],
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在铺好两个入口圈…</p>
  if (!unlocked && !completed) return <div className="p-10 text-center" data-testid="jtw-c4p3-locked">先观察名字和动作的两个开始。</div>

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p3">
      <header><p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第四章 · Part 3</p><h1 className="text-[28px] font-black text-ink">两个入口圈</h1></header>

      <section className="space-y-3" data-testid="jtw-c4p3-story">
        {C4_P3_STORY.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p3-read" onClick={() => setStoryRead(true)}>{storyRead ? '故事卡D已共读 ✓' : '共读故事卡D'}</button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" data-testid="jtw-c4p3-meanings">
        <div><h2 className="mb-2 font-bold">🚩 Start入口在等什么？</h2>{C4_P3_TRIGGER_CHOICES.start.map((option) => <Choice key={option.id} option={option} active={startMeaning === option.id} onPick={() => setStartMeaning(option.id)} />)}</div>
        <div><h2 className="mb-2 font-bold">👆 Tap入口在等什么？</h2>{C4_P3_TRIGGER_CHOICES.tap.map((option) => <Choice key={option.id} option={option} active={tapMeaning === option.id} onPick={() => setTapMeaning(option.id)} />)}</div>
      </section>

      <section data-testid="jtw-c4p3-prediction"><h2 className="mb-2 font-bold">转身卡还在Start圈，举旗会怎样？</h2>{C4_P3_PREDICTIONS.map((option) => <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />)}</section>

      <section className="rounded-2xl border border-hairline p-5" data-testid="jtw-c4p3-circles">
        <p className="mb-4 text-sm font-semibold">安全提醒：只点纸悟空卡，不碰同伴身体。</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-h-32 rounded-full border-4 border-brand-sky/50 p-6 text-center"><strong>🚩 Start圈</strong><p>名字卡：我是孙悟空</p>{actionCircle === 'start' && <p data-testid="jtw-c4p3-turn-card">动作卡：转身（放错了）</p>}</div>
          <div className="min-h-32 rounded-full border-4 border-brand-coral/40 p-6 text-center"><strong>👆 Tap圈</strong>{actionCircle === 'tap' && <p data-testid="jtw-c4p3-turn-card">动作卡：转身</p>}</div>
        </div>
        <button type="button" className="btn-pill-primary mt-4" data-testid="jtw-c4p3-move" disabled={!storyRead || !meaningsDone || !predicted || actionCircle !== 'start'} onClick={moveTurn}>只把转身卡移到Tap圈</button>
      </section>

      <section className="space-y-3" data-testid="jtw-c4p3-rehearsals">
        <button type="button" className="btn-pill-secondary" data-testid="jtw-c4p3-flag-rehearsal" disabled={actionCircle !== 'tap'} onClick={() => addRehearsal('flag:name-only')}>🚩 举旗演练：只介绍名字</button>
        <button type="button" className="btn-pill-secondary" data-testid="jtw-c4p3-tap-rehearsal" disabled={actionCircle !== 'tap'} onClick={() => addRehearsal('paper-tap:turn')}>👆 点纸卡演练：再转身</button>
        <p data-testid="jtw-c4p3-rehearsal-count">已完成 {rehearsals.length}/2 次不同入口演练</p>
      </section>

      {(resolved || completed) && <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p3-resolved"><p>两条地面轨迹不再交叉：名字卡留在Start，转身卡停在Tap。</p><p className="mt-2 font-semibold">纸卡已经分清，但真正的两条积木链仍有空槽。</p></section>}

      <footer className="flex items-center justify-between gap-4"><Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link><button type="button" className="btn-pill-primary" data-testid="jtw-c4p3-continue" disabled={(!resolved && !completed) || complete.isPending} onClick={() => void complete.mutate()}>搭好两条故事</button></footer>
    </div>
  )
}
