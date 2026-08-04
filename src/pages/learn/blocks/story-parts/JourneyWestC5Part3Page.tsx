import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Choice, OrderCards } from './partUi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { c5SizeTraceEvidence, restoreC5SizeRun, type C5SizeRunResult } from './journeyWestC5Part2Program'
import {
  C5_P3_BODY_ACTIONS,
  C5_P3_FIRST_PREDICTIONS,
  C5_P3_FIRST_PROJECT,
  C5_P3_NEXT_PART_ID,
  C5_P3_ORDER_ONE,
  C5_P3_ORDER_TWO,
  C5_P3_PART_ID,
  C5_P3_RESET_EXPLANATIONS,
  C5_P3_SAFETY_CONFIRMATION,
  C5_P3_SECOND_PREDICTIONS,
  C5_P3_SECOND_PROJECT,
  C5_P3_STATE_CARDS,
  C5_P3_STORY,
  c5p3OrderDone,
  c5p3PredictionDone,
  c5p3ResetDone,
  c5p3RunsDiffer,
  runC5P3Variant,
} from './journeyWestC5Part3Program'

export function JourneyWestC5Part3Page({
  runnerSleep,
}: {
  runnerSleep?: (ms: number) => Promise<void>
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [bodyActions, setBodyActions] = useState<string[]>([])
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [firstOrder, setFirstOrder] = useState<string[]>([])
  const [secondOrder, setSecondOrder] = useState<string[]>([])
  const [firstPrediction, setFirstPrediction] = useState<string | null>(null)
  const [secondPrediction, setSecondPrediction] = useState<string | null>(null)
  const [firstRun, setFirstRun] = useState<C5SizeRunResult | null>(null)
  const [secondRun, setSecondRun] = useState<C5SizeRunResult | null>(null)
  const [resetExplanation, setResetExplanation] = useState<string | null>(null)
  const [running, setRunning] = useState<'first' | 'second' | null>(null)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C5_P3_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C5_P3_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-screen-3'))
    setBodyActions(evidence.selections?.body_state_model ?? [])
    setSafetyConfirmed((evidence.selections?.safety_confirmation ?? []).includes(C5_P3_SAFETY_CONFIRMATION))
    setFirstOrder(evidence.selections?.first_card_order ?? [])
    setSecondOrder(evidence.selections?.second_card_order ?? [])
    setFirstPrediction(evidence.selections?.pre_run_predictions?.[0] ?? null)
    setSecondPrediction(evidence.selections?.pre_run_predictions?.[1] ?? null)
    const finalStates = evidence.selections?.final_state_comparison ?? []
    setFirstRun(restoreC5SizeRun(
      evidence.selections?.first_op_trace,
      evidence.selections?.first_size_trace,
      finalStates[0]?.replace('first:', 'size:'),
      C5_P3_FIRST_PROJECT,
    ))
    setSecondRun(restoreC5SizeRun(
      evidence.selections?.second_op_trace,
      evidence.selections?.second_size_trace,
      finalStates[1]?.replace('second:', 'size:'),
      C5_P3_SECOND_PROJECT,
    ))
    setResetExplanation(evidence.selections?.reset_explanation?.[0] ?? null)
    setRestored(true)
  }

  const firstOrderDone = c5p3OrderDone(firstOrder, C5_P3_ORDER_ONE)
  const secondOrderDone = c5p3OrderDone(secondOrder, C5_P3_ORDER_TWO)
  const firstPredictionDone = c5p3PredictionDone(firstPrediction, 'first')
  const secondPredictionDone = c5p3PredictionDone(secondPrediction, 'second')
  const bodyDone = C5_P3_BODY_ACTIONS.every((action) => bodyActions.includes(action.id))
  const runsDiffer = c5p3RunsDiffer(firstRun, secondRun)
  const resetDone = c5p3ResetDone(resetExplanation)
  const resolved = storyRead && bodyDone && safetyConfirmed && firstOrderDone && secondOrderDone &&
    firstPredictionDone && secondPredictionDone && runsDiffer && resetDone
  const completed = Boolean(savedEntry)

  const runVariant = async (variant: 'first' | 'second') => {
    if (running || (variant === 'first' ? firstRun : secondRun)) return
    setRunning(variant)
    try {
      const result = await runC5P3Variant(
        variant === 'first' ? C5_P3_FIRST_PROJECT : C5_P3_SECOND_PROJECT,
        runnerSleep,
      )
      if (variant === 'first') setFirstRun(result)
      else setSecondRun(result)
    } finally {
      setRunning(null)
    }
  }

  const complete = useMutation({
    mutationFn: () => {
      if (!firstRun || !secondRun || !resolved) throw new Error('C5-P3 evidence is incomplete')
      return completeStoryPart(JTW_S1_STORY_LINE_ID, C5_P3_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: ['story-screen-3'],
          body_state_model: bodyActions,
          safety_confirmation: [C5_P3_SAFETY_CONFIRMATION],
          first_card_order: firstOrder,
          second_card_order: secondOrder,
          pre_run_predictions: [firstPrediction!, secondPrediction!],
          first_op_trace: firstRun.opTrace,
          first_size_trace: c5SizeTraceEvidence(firstRun),
          second_op_trace: secondRun.opTrace,
          second_size_trace: c5SizeTraceEvidence(secondRun),
          final_state_comparison: [
            `first:${firstRun.finalSize.toFixed(1)}`,
            `second:${secondRun.finalSize.toFixed(1)}`,
          ],
          reset_explanation: [resetExplanation!],
        },
        prediction: `${firstPrediction}|${secondPrediction}`,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate(`/learn/story/journey-west/${C5_P3_NEXT_PART_ID}`)
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">干燥圆台正在准备三只大小圈…</p>
  if (!unlocked && !completed) return <div className="p-10 text-center" data-testid="jtw-c5p3-locked">先看完金箍棒的第一次大小轨迹。</div>

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c5-p3">
      <header><p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第五章 · Part 3</p><h1 className="text-[28px] font-black text-ink">身体记住三个状态</h1></header>

      <section className="space-y-3" data-testid="jtw-c5p3-story">{C5_P3_STORY.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}<button type="button" className="btn-pill-primary" data-testid="jtw-c5p3-read" onClick={() => setStoryRead(true)}>{storyRead ? 'Story Screen 3 已共读 ✓' : '共读三个状态'}</button></section>

      <section className="rounded-2xl border border-hairline bg-wash-sky p-5" data-testid="jtw-c5p3-p2-trace"><h2 className="font-bold text-ink">P2 留下的只读轨迹</h2><p className="mt-2 font-mono text-[13px]">grow:2.2 → reset_size:2.0 → shrink:1.8</p></section>

      <section className="space-y-3" data-testid="jtw-c5p3-body"><h2 className="font-bold text-ink">在自己的圆圈里做三种状态</h2><div className="flex flex-wrap gap-2">{C5_P3_BODY_ACTIONS.map((action) => <button key={action.id} type="button" aria-pressed={bodyActions.includes(action.id)} className="rounded-full border border-hairline px-4 py-2 text-[14px]" onClick={() => setBodyActions((current) => current.includes(action.id) ? current.filter((id) => id !== action.id) : [...current, action.id])}>{action.label}</button>)}</div><button type="button" aria-pressed={safetyConfirmed} className="btn-pill-secondary" data-testid="jtw-c5p3-safety" onClick={() => setSafetyConfirmed((value) => !value)}>{safetyConfirmed ? '✓ 我在自己的站位，不接触同伴，也不模拟挥打' : '确认安全站位'}</button><p className="text-[12px] text-ink-soft">身体动作不能单独完成 Part；下面两条程序都必须真实运行。</p></section>

      <section className="space-y-4 rounded-2xl border border-hairline p-5" data-testid="jtw-c5p3-first">
        <OrderCards title="第一条：排出 大 → 原 → 小" options={C5_P3_STATE_CARDS} order={firstOrder} onChange={(order) => !firstRun && setFirstOrder(order)} done={firstOrderDone} testId="jtw-c5p3-first-order" />
        <div className="space-y-2" data-testid="jtw-c5p3-first-prediction"><h3 className="font-bold text-ink">第一次运行前预测结尾</h3>{C5_P3_FIRST_PREDICTIONS.map((option) => <Choice key={option.id} option={option} active={firstPrediction === option.id} onPick={() => !firstRun && setFirstPrediction(option.id)} />)}</div>
        <button type="button" className="btn-pill-secondary" data-testid="jtw-c5p3-run-first" disabled={!storyRead || !firstOrderDone || !firstPredictionDone || Boolean(firstRun) || Boolean(running)} onClick={() => void runVariant('first')}>运行 大 → 原 → 小</button>
        {firstRun && <div data-testid="jtw-c5p3-first-trace" data-trace={c5SizeTraceEvidence(firstRun).join(',')}><p className="font-mono text-[13px]">{c5SizeTraceEvidence(firstRun).join(' → ')}</p><p className="font-bold">结尾 size {firstRun.finalSize.toFixed(1)}（小）</p></div>}
      </section>

      <section className="space-y-4 rounded-2xl border border-hairline p-5" data-testid="jtw-c5p3-second">
        <OrderCards title="第二条：交换为 小 → 原 → 大" options={C5_P3_STATE_CARDS} order={secondOrder} onChange={(order) => !secondRun && setSecondOrder(order)} done={secondOrderDone} testId="jtw-c5p3-second-order" />
        <div className="space-y-2" data-testid="jtw-c5p3-second-prediction"><h3 className="font-bold text-ink">第二次运行前预测结尾</h3>{C5_P3_SECOND_PREDICTIONS.map((option) => <Choice key={option.id} option={option} active={secondPrediction === option.id} onPick={() => !secondRun && setSecondPrediction(option.id)} />)}</div>
        <button type="button" className="btn-pill-secondary" data-testid="jtw-c5p3-run-second" disabled={!firstRun || !secondOrderDone || !secondPredictionDone || Boolean(secondRun) || Boolean(running)} onClick={() => void runVariant('second')}>运行 小 → 原 → 大</button>
        {secondRun && <div data-testid="jtw-c5p3-second-trace" data-trace={c5SizeTraceEvidence(secondRun).join(',')}><p className="font-mono text-[13px]">{c5SizeTraceEvidence(secondRun).join(' → ')}</p><p className="font-bold">结尾 size {secondRun.finalSize.toFixed(1)}（大）</p></div>}
      </section>

      {firstRun && secondRun && <section className="space-y-2" data-testid="jtw-c5p3-reset"><h2 className="font-bold text-ink">为什么两次都有Reset，结尾仍不同？</h2>{C5_P3_RESET_EXPLANATIONS.map((option) => <Choice key={option.id} option={option} active={resetExplanation === option.id} onPick={() => setResetExplanation(option.id)} />)}</section>}

      {(resolved || completed) && <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c5p3-resolved"><p className="font-black text-ink">两条真实轨迹让不同刻度依次亮起。</p><p className="mt-2 text-ink">悟空已经看懂状态，却还没有一条由孩子搭出的完整试验链。下一 Part 才开始主 Build。</p></section>}

      <footer className="flex items-center justify-between gap-4"><Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link><button type="button" className="btn-pill-primary" data-testid="jtw-c5p3-continue" disabled={(!resolved && !completed) || complete.isPending} onClick={() => void complete.mutate()}>搭出大小试验</button></footer>
    </div>
  )
}
