import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Choice } from './partUi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C5_P2_CLASSIC_CARD,
  C5_P2_COMPARISONS,
  C5_P2_NEXT_PART_ID,
  C5_P2_PART_ID,
  C5_P2_PREDICTIONS,
  C5_P2_PROJECT,
  C5_P2_RESET_EXPLANATIONS,
  C5_P2_STORY,
  c5p2ComparisonDone,
  c5p2PredictionDone,
  c5p2ResetDone,
  c5p2RunDone,
  c5SizeTraceEvidence,
  restoreC5SizeRun,
  runC5SizeProject,
  type C5SizeRunResult,
} from './journeyWestC5Part2Program'

export function JourneyWestC5Part2Page({
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
  const [prediction, setPrediction] = useState<string | null>(null)
  const [run, setRun] = useState<C5SizeRunResult | null>(null)
  const [resetExplanation, setResetExplanation] = useState<string | null>(null)
  const [comparison, setComparison] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C5_P2_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C5_P2_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-screen-2'))
    setPrediction(evidence.prediction ?? null)
    setRun(restoreC5SizeRun(
      evidence.selections?.op_trace,
      evidence.selections?.size_trace,
      evidence.selections?.actual_final_state?.[0],
      C5_P2_PROJECT,
    ))
    setResetExplanation(evidence.selections?.reset_explanation?.[0] ?? null)
    setComparison(evidence.selections?.prediction_actual_comparison?.[0] ?? null)
    setRestored(true)
  }

  const predictionDone = c5p2PredictionDone(prediction)
  const runDone = c5p2RunDone(run)
  const explanationDone = c5p2ResetDone(resetExplanation)
  const comparisonDone = c5p2ComparisonDone(comparison)
  const resolved = storyRead && predictionDone && runDone && explanationDone && comparisonDone
  const completed = Boolean(savedEntry)

  const runStarter = async () => {
    if (!storyRead || !predictionDone || running || run) return
    setRunning(true)
    try {
      setRun(await runC5SizeProject(C5_P2_PROJECT, runnerSleep))
    } finally {
      setRunning(false)
    }
  }

  const complete = useMutation({
    mutationFn: () => {
      if (!run || !resolved) throw new Error('C5-P2 evidence is incomplete')
      return completeStoryPart(JTW_S1_STORY_LINE_ID, C5_P2_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: ['story-screen-2', 'classic-card'],
          op_trace: run.opTrace,
          size_trace: c5SizeTraceEvidence(run),
          actual_final_state: [`size:${run.finalSize.toFixed(1)}`],
          reset_explanation: [resetExplanation!],
          prediction_actual_comparison: [comparison!],
        },
        prediction: prediction ?? undefined,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate(`/learn/story/journey-west/${C5_P2_NEXT_PART_ID}`)
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">柱厅刻度正在亮起…</p>
  if (!unlocked && !completed) {
    return <div className="p-10 text-center" data-testid="jtw-c5p2-locked">先沿着水纹找到海底柱厅。</div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c5-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第五章 · Part 2</p>
        <h1 className="text-[28px] font-black text-ink">最后一块会留下什么大小</h1>
      </header>

      <section className="space-y-3" data-testid="jtw-c5p2-story">
        {C5_P2_STORY.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <aside className="rounded-2xl bg-wash-sunshine p-4 text-[14px] text-ink">{C5_P2_CLASSIC_CARD}</aside>
        <button type="button" className="btn-pill-primary" data-testid="jtw-c5p2-read" onClick={() => setStoryRead(true)}>
          {storyRead ? 'Story Screen 2 与 Classic Card 已共读 ✓' : '共读大小线索'}
        </button>
      </section>

      <section className="rounded-2xl border border-hairline bg-gradient-to-b from-wash-sky to-canvas-pure p-5" data-testid="jtw-c5p2-stage" data-final-state={runDone ? 'small' : 'huge-shadow'}>
        <p className="text-center text-5xl" aria-label={runDone ? '金箍棒停在小轮廓，窄门露出一角' : '巨大金箍棒遮住窄门'}>{runDone ? '🐒　•　🚪' : '🐒　🟨　🚪'}</p>
        <p className="mt-3 text-center text-[13px] text-ink-soft">{runDone ? '大、原、小三层轮廓依次亮起；小轮廓稳定保留。' : '悟空站在刻度外观察，没有拿起金箍棒。'}</p>
      </section>

      <section data-testid="jtw-c5p2-prediction" className="space-y-2">
        <h2 className="font-bold text-ink">运行前先预测：End 时会留下什么大小？</h2>
        <div className="flex flex-col gap-2">{C5_P2_PREDICTIONS.map((option) => <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => !run && setPrediction(option.id)} />)}</div>
        {run && <p className="text-[12px] font-bold text-brand-mint">预测已在第一次 Go 前锁定。</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-hairline p-5" data-testid="jtw-c5p2-program">
        <h2 className="font-bold text-ink">只读 starter</h2>
        <p className="font-mono text-[13px] text-ink-soft">Start → Grow 2 → Wait 5 → Reset → Wait 5 → Shrink 2 → End</p>
        <button type="button" className="btn-pill-secondary" data-testid="jtw-c5p2-go" disabled={!storyRead || !predictionDone || running || Boolean(run)} onClick={() => void runStarter()}>{running ? '正在逐步运行…' : 'Go：只运行一次'}</button>
      </section>

      {run && <section className="space-y-3 rounded-2xl border border-brand-sky/40 bg-wash-sky p-5" data-testid="jtw-c5p2-trace" data-op-trace={run.opTrace.join(',')} data-size-trace={c5SizeTraceEvidence(run).join(',')}>
        <h2 className="font-black text-ink">真实解释器轨迹</h2>
        <ol className="flex flex-wrap gap-2">{run.stateTrace.map((step) => <li key={`${step.op}-${step.size}`} className="rounded-full bg-canvas-pure px-3 py-2 text-[13px] font-bold">{step.op} → size {step.size.toFixed(1)}</li>)}</ol>
        <p className="font-bold text-ink">实际结尾：size {run.finalSize.toFixed(1)}，小状态。</p>
      </section>}

      {runDone && <>
        <section data-testid="jtw-c5p2-reset" className="space-y-2"><h2 className="font-bold text-ink">Reset 为什么不是“什么也没做”？</h2><div className="flex flex-col gap-2">{C5_P2_RESET_EXPLANATIONS.map((option) => <Choice key={option.id} option={option} active={resetExplanation === option.id} onPick={() => setResetExplanation(option.id)} />)}</div></section>
        <section data-testid="jtw-c5p2-comparison" className="space-y-2"><h2 className="font-bold text-ink">把运行前预测与实际结尾比较</h2><div className="flex flex-col gap-2">{C5_P2_COMPARISONS.map((option) => <Choice key={option.id} option={option} active={comparison === option.id} onPick={() => setComparison(option.id)} />)}</div></section>
      </>}

      {(resolved || completed) && <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c5p2-resolved"><p className="font-black text-ink">巨大阴影缩开一角。</p><p className="mt-2 text-ink">悟空看懂了：Reset只恢复初始大小，最后一个状态块才决定结尾。下一步要用身体和状态卡验证顺序。</p></section>}

      <footer className="flex items-center justify-between gap-4"><Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link><button type="button" className="btn-pill-primary" data-testid="jtw-c5p2-continue" disabled={(!resolved && !completed) || complete.isPending} onClick={() => void complete.mutate()}>排三张大小卡</button></footer>
    </div>
  )
}
