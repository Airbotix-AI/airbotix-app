import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { BlocksProject } from '../blocksModel'
import {
  C5_P6_ACTUAL_OPTIONS,
  C5_P6_CONTINUE_LABEL,
  C5_P6_DEVIATION_OPTIONS,
  C5_P6_EXPECTATION_OPTIONS,
  C5_P6_EXPLANATION_OPTIONS,
  C5_P6_NEXT_PART_ID,
  C5_P6_PART_ID,
  C5_P6_PREDICTION,
  C5_P6_STORY_AFTER,
  C5_P6_STORY_BEFORE,
  c5p6AnswerCorrect,
  c5p6Ast,
  c5p6BugMatches,
  c5p6FixedMatches,
  c5p6RunMatchesProject,
  c5p6RunsEqual,
  c5p6SingleResetDiff,
  createC5P6BugProject,
  moveOnlyC5P6Reset,
  runC5P6Project,
  type C5P6RunEvidence,
} from './journeyWestC5Part6Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

function traceLabel(run: C5P6RunEvidence): string {
  return run.opTrace.join(' → ')
}

export function JourneyWestC5Part6Page({
  initialProject = createC5P6BugProject(),
  previewSleep = async () => undefined,
}: {
  initialProject?: BlocksProject
  previewSleep?: (ms: number) => Promise<void>
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [project, setProject] = useState<BlocksProject>(() => structuredClone(initialProject))
  const [expectation, setExpectation] = useState<string | null>(null)
  const [actual, setActual] = useState<string | null>(null)
  const [deviation, setDeviation] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [beforeAst, setBeforeAst] = useState<string[]>([])
  const [afterAst, setAfterAst] = useState<string[]>([])
  const [wrongRun, setWrongRun] = useState<C5P6RunEvidence | null>(null)
  const [fixedRun, setFixedRun] = useState<C5P6RunEvidence | null>(null)
  const [repeatRun, setRepeatRun] = useState<C5P6RunEvidence | null>(null)
  const [running, setRunning] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C5_P6_PART_ID)
  const p5Entry = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p5')
  const p5Evidence = p5Entry?.evidence as StoryPartEvidence | undefined
  const sourceP5Ast = p5Evidence?.selections?.after_ast ?? []
  const savedEvidence = savedEntry?.evidence as StoryPartEvidence | undefined
  const restoredResolved = Boolean(
    savedEvidence?.selections?.before_ast?.length &&
    savedEvidence.selections?.after_ast?.length &&
    savedEvidence.selections?.wrong_run_trace?.length &&
    savedEvidence.selections?.fixed_run_trace?.length &&
    savedEvidence.selections?.repeat_run_trace?.length &&
    savedEvidence.selections?.source_p5_ast?.length,
  )
  const unlocked = progress.data?.unlocked_part_ids.includes(C5_P6_PART_ID) ?? false

  const answersDone =
    c5p6AnswerCorrect(C5_P6_EXPECTATION_OPTIONS, expectation) &&
    c5p6AnswerCorrect(C5_P6_ACTUAL_OPTIONS, actual) &&
    c5p6AnswerCorrect(C5_P6_DEVIATION_OPTIONS, deviation)
  const exactDiff = beforeAst.length > 0 && afterAst.length > 0
    ? c5p6SingleResetDiff(initialProject, project)
    : []
  const currentResolved = Boolean(
    answersDone &&
    c5p6AnswerCorrect(C5_P6_EXPLANATION_OPTIONS, explanation) &&
    c5p6RunMatchesProject(wrongRun, initialProject) &&
    exactDiff.length === 1 &&
    c5p6RunMatchesProject(fixedRun, project) &&
    c5p6RunsEqual(fixedRun, repeatRun) &&
    sourceP5Ast.length > 0,
  )
  const resolved = currentResolved || restoredResolved

  const runWrong = async () => {
    if (!c5p6BugMatches(project)) return
    setRunning(true)
    try {
      setBeforeAst(c5p6Ast(project))
      setWrongRun(await runC5P6Project(project, previewSleep))
    } finally {
      setRunning(false)
    }
  }

  const moveReset = () => {
    const repaired = moveOnlyC5P6Reset(project)
    if (!repaired) return
    setProject(repaired)
    setAfterAst(c5p6Ast(repaired))
    setFixedRun(null)
    setRepeatRun(null)
  }

  const runFixed = async () => {
    if (!c5p6FixedMatches(project)) return
    setRunning(true)
    try {
      const run = await runC5P6Project(project, previewSleep)
      if (!fixedRun) setFixedRun(run)
      else setRepeatRun(run)
    } finally {
      setRunning(false)
    }
  }

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C5_P6_PART_ID, {
      schema_version: 1,
      selections: {
        expectation: expectation ? [expectation] : [],
        source_p5_ast: sourceP5Ast,
        actual: actual ? [actual] : [],
        first_deviation: deviation ? [deviation] : [],
        before_ast: beforeAst,
        after_ast: afterAst,
        order_diff: exactDiff,
        wrong_run_trace: wrongRun?.opTrace ?? [],
        wrong_state_trace: wrongRun?.stateTrace ?? [],
        fixed_run_trace: fixedRun?.opTrace ?? [],
        fixed_state_trace: fixedRun?.stateTrace ?? [],
        repeat_run_trace: repeatRun?.opTrace ?? [],
        repeat_state_trace: repeatRun?.stateTrace ?? [],
        final_size: fixedRun ? [fixedRun.finalSize.toFixed(1)] : [],
        explanation: explanation ? [explanation] : [],
      },
      prediction: C5_P6_PREDICTION,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C5_P6_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在放好大、原、小三道轮廓…</p>
  if (!unlocked && !savedEntry) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c5p6-locked">
        <p className="font-bold text-ink">先完成三段大小用途选择，才能检查末尾 Reset。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c5-p6">
      <header>
        <p className="text-xs font-bold text-brand-sky">西游记 · 第五章 · Part 6 · Debug</p>
        <h1 className="text-[28px] font-black text-ink">Reset站错了结尾</h1>
      </header>

      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c5p6-story">
        {C5_P6_STORY_BEFORE.map((paragraph) => <p key={paragraph} className="leading-8 text-ink">{paragraph}</p>)}
        <p className="rounded-xl bg-wash-sunshine p-3 font-bold text-ink">Prediction：{C5_P6_PREDICTION}</p>
      </section>

      <section className="space-y-2" data-testid="jtw-c5p6-expectation">
        <h2 className="font-bold text-ink">运行前，你预期结尾是什么？</h2>
        {C5_P6_EXPECTATION_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={expectation === option.id} onPick={() => setExpectation(option.id)} />
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-coral/50 bg-wash-coral p-5" data-testid="jtw-c5p6-wrong-run">
        <h2 className="font-bold text-ink">从 Start 运行稳定错误版</h2>
        <p className="font-mono text-xs text-ink-soft">Start → Grow 2 → Wait 5 → Shrink 2 → Reset → End</p>
        <button type="button" className="btn-pill-primary" disabled={!c5p6BugMatches(project) || running || !c5p6AnswerCorrect(C5_P6_EXPECTATION_OPTIONS, expectation)} onClick={() => void runWrong()}>
          {wrongRun ? '✓ 错误轨迹已保留' : '运行错误版'}
        </button>
        {wrongRun && <p data-testid="jtw-c5p6-wrong-trace">{traceLabel(wrongRun)}<br />{wrongRun.stateTrace.join(' → ')}</p>}
      </section>

      {wrongRun && <>
        <section className="space-y-2" data-testid="jtw-c5p6-actual">
          <h2 className="font-bold text-ink">实际发生了什么？</h2>
          {C5_P6_ACTUAL_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={actual === option.id} onPick={() => setActual(option.id)} />
          ))}
        </section>
        <section className="space-y-2" data-testid="jtw-c5p6-deviation">
          <h2 className="font-bold text-ink">第一次偏离在哪里？</h2>
          {C5_P6_DEVIATION_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={deviation === option.id} onPick={() => setDeviation(option.id)} />
          ))}
        </section>
      </>}

      <section className="space-y-3 rounded-2xl border border-brand-sky p-5" data-testid="jtw-c5p6-repair">
        <h2 className="font-bold text-ink">只移动唯一的 Reset</h2>
        <p>块的集合、Grow 2、Wait 5、Shrink 2、角色、背景与初始大小都不变。</p>
        <button type="button" className="btn-pill-secondary" disabled={!wrongRun || !answersDone || !c5p6BugMatches(project)} onClick={moveReset}>
          把 Reset 移到 Shrink 2 前面
        </button>
        {afterAst.length > 0 && <p data-testid="jtw-c5p6-ast-diff">修复前：{beforeAst.join(' → ')}<br />修复后：{afterAst.join(' → ')}</p>}
      </section>

      {c5p6FixedMatches(project) && (
        <section className="space-y-3 rounded-2xl border border-brand-mint p-5" data-testid="jtw-c5p6-fixed-runs">
          <h2 className="font-bold text-ink">从 Start 完整重跑两次</h2>
          <button type="button" className="btn-pill-primary" disabled={running || Boolean(repeatRun)} onClick={() => void runFixed()}>
            {!fixedRun ? '运行修复版' : !repeatRun ? '第二次一致重跑' : '✓ 两次轨迹一致'}
          </button>
          {fixedRun && <p data-testid="jtw-c5p6-fixed-trace">第一次：{traceLabel(fixedRun)}<br />{fixedRun.stateTrace.join(' → ')}</p>}
          {repeatRun && <p data-testid="jtw-c5p6-repeat-trace">第二次：{traceLabel(repeatRun)}<br />{repeatRun.stateTrace.join(' → ')}</p>}
        </section>
      )}

      {repeatRun && (
        <section className="space-y-2" data-testid="jtw-c5p6-explanation">
          <h2 className="font-bold text-ink">最后是什么？为什么？</h2>
          {C5_P6_EXPLANATION_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={explanation === option.id} onPick={() => setExplanation(option.id)} />
          ))}
        </section>
      )}

      {resolved && (
        <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c5p6-resolved">
          <h2 className="font-black text-ink">最终小轮廓稳定，窄门重开。</h2>
          <p className="mt-2 leading-7 text-ink">{C5_P6_STORY_AFTER}</p>
        </section>
      )}

      <button type="button" className="btn-pill-primary w-full" data-testid="jtw-c5p6-continue" disabled={!resolved || complete.isPending} onClick={() => savedEntry ? navigate('/learn/story/journey-west') : complete.mutate()}>
        {savedEntry ? '回到地图' : C5_P6_CONTINUE_LABEL}
      </button>
      <p className="text-center text-xs text-ink-soft">本 Part 只解锁 P7，不完成第五章，也不显示章节庆祝。</p>
    </div>
  )
}
