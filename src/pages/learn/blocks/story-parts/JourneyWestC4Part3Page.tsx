import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  C4_P3_CLASSIC_CARD,
  C4_P3_CONTINUE_LABEL,
  C4_P3_NEXT_PART_ID,
  C4_P3_PART_ID,
  C4_P3_PREDICTION_OPTIONS,
  C4_P3_RESOLVED_WORLD_CHANGE,
  C4_P3_SAFETY_NOTE,
  C4_P3_START_OPTIONS,
  C4_P3_STORY_AFTER,
  C4_P3_STORY_BEFORE,
  C4_P3_STORY_BRIDGE,
  C4_P3_TAP_OPTIONS,
  c4p3Correct,
  c4p3Resolved,
} from './journeyWestC4Part3Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

export function JourneyWestC4Part3Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [startMeaning, setStartMeaning] = useState<string | null>(null)
  const [tapMeaning, setTapMeaning] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [turnInTap, setTurnInTap] = useState(false)
  const [rehearsal, setRehearsal] = useState<string[]>([])
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P3_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P3_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStartMeaning(evidence.selections?.trigger_identification?.[0] ?? null)
    setTapMeaning(evidence.selections?.trigger_identification?.[1] ?? null)
    setPrediction(evidence.prediction ?? null)
    setTurnInTap(evidence.selections?.minimal_move?.[0] === 'turn:start-to-tap')
    setRehearsal(evidence.selections?.rehearsal ?? [])
    setRestored(true)
  }

  const meaningsDone =
    c4p3Correct(startMeaning, C4_P3_START_OPTIONS) &&
    c4p3Correct(tapMeaning, C4_P3_TAP_OPTIONS)
  const predictionDone = c4p3Correct(prediction, C4_P3_PREDICTION_OPTIONS)
  const resolved = c4p3Resolved({ startMeaning, tapMeaning, prediction, turnInTap, rehearsal })
  const completed = Boolean(savedEntry)

  const rehearse = (entry: string) => {
    if (!turnInTap) return
    setRehearsal((current) => {
      if (entry === 'start') return ['start']
      if (entry === 'tap' && current[0] === 'start') return ['start', 'tap']
      return current
    })
  }

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P3_PART_ID, {
      schema_version: 1,
      selections: {
        trigger_identification: [startMeaning!, tapMeaning!],
        card_locations: ['name:start', 'turn:tap', 'hop:tap', 'hide-show:tap'],
        minimal_move: ['turn:start-to-tap'],
        rehearsal,
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P3_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在铺开两个入口圈…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p3-locked">
        <p className="font-bold text-ink">先观察Go和Tap的两条真实轨迹，才能摆入口圈。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p3">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第四章 你的名字叫孙悟空 · Part 3
        </p>
        <h1 className="text-[28px] font-black text-ink">两个入口圈</h1>
      </header>

      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5">
        <p className="text-[16px] leading-8 text-ink">{C4_P3_STORY_BEFORE}</p>
        <p className="text-[13px] leading-6 text-ink-soft">{C4_P3_CLASSIC_CARD}</p>
        <p className="rounded-xl bg-wash-sky p-3 text-[14px] leading-6 text-ink">{C4_P3_STORY_BRIDGE}</p>
        <p className="text-[13px] font-bold text-ink">{C4_P3_SAFETY_NOTE}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" data-testid="jtw-c4p3-trigger-meaning">
        <div>
          <h2 className="mb-2 font-bold text-ink">🚩 Start在等什么？</h2>
          {C4_P3_START_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={startMeaning === option.id} onPick={() => setStartMeaning(option.id)} />
          ))}
        </div>
        <div>
          <h2 className="mb-2 font-bold text-ink">👆 Tap在等什么？</h2>
          {C4_P3_TAP_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={tapMeaning === option.id} onPick={() => setTapMeaning(option.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-ink">转身卡误放在Start圈。举旗会发生什么？</h2>
        {C4_P3_PREDICTION_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl border border-hairline bg-wash-mint p-5 sm:grid-cols-2" data-testid="jtw-c4p3-circles">
        <div className="min-h-36 rounded-full border-4 border-dashed border-brand-sunshine p-5 text-center" data-testid="jtw-c4p3-start-circle">
          <p className="font-black text-ink">🚩 Start圈</p>
          <p className="mt-3 rounded-xl bg-canvas-pure p-2">名字：孙悟空</p>
          {!turnInTap && <p className="mt-2 rounded-xl bg-red-50 p-2" data-testid="jtw-c4p3-wrong-turn">↪️ 转身（放错）</p>}
        </div>
        <div className="min-h-36 rounded-full border-4 border-dashed border-brand-sky p-5 text-center" data-testid="jtw-c4p3-tap-circle">
          <p className="font-black text-ink">👆 Tap纸悟空圈</p>
          <p className="mt-3 rounded-xl bg-canvas-pure p-2">🐒 Hop</p>
          <p className="mt-2 rounded-xl bg-canvas-pure p-2">🙈 Hide / Show</p>
          {turnInTap && <p className="mt-2 rounded-xl bg-canvas-pure p-2" data-testid="jtw-c4p3-moved-turn">↪️ 转身</p>}
        </div>
        <button
          className="btn-pill-primary sm:col-span-2"
          data-testid="jtw-c4p3-move-turn"
          type="button"
          disabled={!meaningsDone || !predictionDone || turnInTap}
          onClick={() => {
            setTurnInTap(true)
            setRehearsal([])
          }}
        >
          把整张转身卡移回Tap圈
        </button>
      </section>

      <section className="space-y-3" data-testid="jtw-c4p3-rehearsal">
        <h2 className="font-bold text-ink">按顺序重演两个入口</h2>
        <div className="flex gap-2">
          <button className="btn-pill-ghost" type="button" disabled={!turnInTap} onClick={() => rehearse('start')}>
            1. 举Start旗：只说名字
          </button>
          <button className="btn-pill-ghost" type="button" disabled={!turnInTap || rehearsal[0] !== 'start'} onClick={() => rehearse('tap')}>
            2. 点纸悟空：才做动作
          </button>
        </div>
        <p data-testid="jtw-c4p3-rehearsal-trace">{rehearsal.join(' → ') || '还没演练'}</p>
      </section>

      {resolved && (
        <section className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p3-resolved">
          <h2 className="font-black text-ink">{C4_P3_RESOLVED_WORLD_CHANGE}</h2>
          <p className="text-[15px] leading-7 text-ink">{C4_P3_STORY_AFTER}</p>
        </section>
      )}

      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p3-continue"
        type="button"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {completed ? '回到地图' : C4_P3_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">
        这一Part保存入口模型，不改写下一Part的积木项目，不计Code或真实Run，也不会完成第四章。
      </p>
    </div>
  )
}
