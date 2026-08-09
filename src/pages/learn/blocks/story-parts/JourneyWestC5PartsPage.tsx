import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import type { Block, BlockOp } from '../blocksModel'
import { BlocksRunner } from '../interpreter'
import { Choice, EvidenceGroup, OrderCards } from './partUi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { C5_NEXT, C5_REVERSED_DEMO, C5_ROUTE_ORDER, C5_STATE_DEMO, c5BuildValid, c5Page, c5Portable, type C5EarlyPartId } from './journeyWestC5Program'

const MAP = '/learn/story/journey-west'
const STORY: Record<C5EarlyPartId, string[]> = {
  'jtw-s1-c5-p1': ['悟空学成回到花果山。木棍弯了，石锤又不便使用；他需要一件拿得动、能改变大小、也便于携带的工具。', '海面深处出现柱影。它不是敌人，也不是师父送来的礼物；悟空决定到东海龙宫看清它。'],
  'jtw-s1-c5-p2': ['柱厅有大、原、小三层刻度。金箍棒会依次 Grow、Reset、Shrink，最后执行的状态块决定结尾。', 'Reset 不是倒带故事，它只把大小恢复到最初状态。'],
  'jtw-s1-c5-p3': ['孩子用伸展、站回原姿、收拢记住三个状态，再比较两种顺序。', '身体动作只是模型；真正证据仍来自同一解释器的两次完整轨迹。'],
  'jtw-s1-c5-p4': ['窄门仍被柱影遮住。请亲手把 Grow、Wait、Reset、Shrink 放进 Start 与 End 之间。', 'Turn 能运行，却不能回答大小问题；完整运行后才会点亮半枚如意印。'],
  'jtw-s1-c5-p5': ['最大不一定最合适。窄门、弯曲水道和回程水帘都要求金箍棒最后能安全携带。', '请改变 P4 的状态顺序或节奏，为三段选择用途，并用真实运行证明最后是小状态。'],
}

const ROUTE_CARDS = [
  { id: 'learned-home', label: '学成回家', correct: true }, { id: 'tools-unfit', label: '旧工具不合适', correct: true }, { id: 'pillar-shadow', label: '海底出现柱影', correct: true },
]
const MOTIVES = [
  { id: 'wood-bent', label: '木棍弯了', correct: true }, { id: 'hammer-awkward', label: '石锤不便使用', correct: true }, { id: 'defeat-enemy', label: '为了打败本章敌人', correct: false },
]
const STATE_OPTIONS = [{ id: 'small', label: '最后是小，因为最后状态块是 Shrink', correct: true }, { id: 'large', label: '最后一定是最大' }]
const RESET_OPTIONS = [{ id: 'restore', label: 'Reset 恢复初始大小，不是什么也没做', correct: true }, { id: 'rewind', label: 'Reset 会倒带整个故事' }]
const PALETTE: Array<{ op: BlockOp; label: string }> = [
  { op: 'grow', label: '🔼 Grow 2' }, { op: 'wait', label: '⏱ Wait 5' }, { op: 'reset_size', label: '🔄 Reset' }, { op: 'shrink', label: '🔽 Shrink 2' }, { op: 'turn_right', label: '↪️ Turn（干扰）' },
]

export function JourneyWestC5PartsPage({ partId, previewSleep = async () => undefined }: { partId: C5EarlyPartId; previewSleep?: (ms: number) => Promise<void> }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) })
  const saved = progress.data?.completed.find((entry) => entry.part_id === partId)
  const priorP4 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p4')
  const unlocked = progress.data?.unlocked_part_ids.includes(partId) ?? false
  const [route, setRoute] = useState<string[]>([])
  const [evidence, setEvidence] = useState<string[]>([])
  const [prediction, setPrediction] = useState<string | null>(null)
  const [reset, setReset] = useState<string | null>(null)
  const [ops, setOps] = useState<BlockOp[]>([])
  const [trace, setTrace] = useState<string[]>([])
  const [secondTrace, setSecondTrace] = useState<string[]>([])
  const [uses, setUses] = useState<string[]>([])
  const [restored, setRestored] = useState(false)
  const [priorLoaded, setPriorLoaded] = useState(false)
  const runningTrace = useRef<'first' | 'second'>('first')

  if (saved && !restored) {
    const selections = (saved.evidence as StoryPartEvidence).selections
    setRoute(selections.route_order ?? [])
    setEvidence(selections.motive_evidence ?? selections.environment_evidence ?? [])
    setPrediction((saved.evidence as StoryPartEvidence).prediction ?? null)
    setReset(selections.reset_explanation?.[0] ?? null)
    setOps((selections.build_ops ?? selections.choice_ops ?? []) as BlockOp[])
    setTrace(selections.run_trace ?? [])
    setSecondTrace(selections.second_run_trace ?? [])
    setUses(selections.use_labels ?? [])
    setRestored(true)
  }
  if (partId === 'jtw-s1-c5-p5' && priorP4 && !saved && !priorLoaded) {
    setOps(((priorP4.evidence as StoryPartEvidence).selections.build_ops ?? []) as BlockOp[])
    setPriorLoaded(true)
  }

  const run = async (blocks: Block[], destination: 'first' | 'second' = 'first') => {
    runningTrace.current = destination
    const values: string[] = []
    const runner = new BlocksRunner(c5Page(blocks), {
      onSprite: (_id, state) => values.push(String(state.size)), onSay: () => undefined,
      onNote: () => undefined, onSound: () => undefined, onGotoPage: () => undefined,
      onStep: (_id, _script, index) => { if (index >= 0) values.push(blocks[index]?.op ?? '') },
    }, previewSleep)
    await runner.runFlag()
    const result = [...values, `final:${runner.state('ruyi-staff')?.size}`]
    if (destination === 'first') setTrace(result); else setSecondTrace(result)
  }

  const addOp = (op: BlockOp) => setOps((current) => [...current, op])
  const removeOp = (index: number) => setOps((current) => current.filter((_, itemIndex) => itemIndex !== index))
  const blocksFromOps = (selected: BlockOp[], includeSay = false): Block[] => [
    { op: 'when_flag' }, ...selected.map((op) => op === 'grow' || op === 'shrink' ? { op, n: 2 } : op === 'wait' ? { op, n: 5 } : { op }),
    ...(includeSay ? [{ op: 'say' as const, text: '合适才是目标' }] : []), { op: 'end' },
  ]

  const p1Done = route.join('|') === C5_ROUTE_ORDER.join('|') && evidence.includes('wood-bent') && evidence.includes('hammer-awkward') && prediction === 'fit-not-biggest'
  const p2Done = prediction === 'small' && reset === 'restore' && trace.includes('shrink') && trace.some((item) => item.startsWith('final:'))
  const p3Done = reset === 'restore' && trace.at(-1) === 'final:1.8' && secondTrace.at(-1) === 'final:2.2'
  const p4Done = c5BuildValid(ops) && trace.at(-1) === 'final:1.8'
  const priorOps = (priorP4?.evidence as StoryPartEvidence | undefined)?.selections.build_ops ?? []
  const p5Done = evidence.length >= 2 && uses.length === 3 && c5Portable(ops) && ops.join('|') !== priorOps.join('|') && trace.at(-1) === 'final:1.8'
  const done = ({ 'jtw-s1-c5-p1': p1Done, 'jtw-s1-c5-p2': p2Done, 'jtw-s1-c5-p3': p3Done, 'jtw-s1-c5-p4': p4Done, 'jtw-s1-c5-p5': p5Done })[partId]

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, partId, { schema_version: 1, prediction: prediction ?? undefined, selections: {
      route_order: route, motive_evidence: partId === 'jtw-s1-c5-p1' ? evidence : [], environment_evidence: partId === 'jtw-s1-c5-p5' ? evidence : [],
      reset_explanation: reset ? [reset] : [], build_ops: partId === 'jtw-s1-c5-p4' ? ops : [], choice_ops: partId === 'jtw-s1-c5-p5' ? ops : [], run_trace: trace, second_run_trace: secondTrace, use_labels: uses,
    } }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] }); navigate(MAP, { state: { unlocked: C5_NEXT[partId] } }) },
  })

  if (progress.isLoading) return <p className="p-8 text-center">龙宫水纹正在变清…</p>
  if (!unlocked && !saved) return <div className="p-8 text-center" data-testid="jtw-c5-locked"><Link to={MAP}>先完成上一段故事</Link></div>

  return <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid={`jtw-${partId}`}>
    <header><p className="text-xs font-bold text-brand-sky">西游记 · 第五章 · Part {partId.at(-1)}</p><h1 className="text-3xl font-black">如意金箍棒：大小随心</h1></header>
    <section className="space-y-3" data-testid="jtw-c5-story">{STORY[partId].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
    {partId === 'jtw-s1-c5-p1' && <><OrderCards title="排列三张故事卡" options={ROUTE_CARDS} order={route} onChange={setRoute} done={route.join('|') === C5_ROUTE_ORDER.join('|')} testId="jtw-c5p1-route" /><EvidenceGroup title="选两项工具不合适的证据" options={MOTIVES} selected={evidence} onToggle={(id) => setEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} done={evidence.includes('wood-bent') && evidence.includes('hammer-awkward')} testId="jtw-c5p1-evidence" /><Choice option={{ id: 'fit-not-biggest', label: '合适的线索最重要，不是越大越好', correct: true }} active={prediction === 'fit-not-biggest'} onPick={() => setPrediction('fit-not-biggest')} /></>}
    {partId === 'jtw-s1-c5-p2' && <><ChoiceList title="先预测最后大小" options={STATE_OPTIONS} selected={prediction} onSelect={setPrediction} /><button className="btn-pill-primary" disabled={!prediction} data-testid="jtw-c5p2-run" onClick={() => void run(C5_STATE_DEMO)}>Go：运行真实大小轨迹</button><Trace value={trace} /><ChoiceList title="Reset 是什么" options={RESET_OPTIONS} selected={reset} onSelect={setReset} /></>}
    {partId === 'jtw-s1-c5-p3' && <><ChoiceList title="说明 Reset" options={RESET_OPTIONS} selected={reset} onSelect={setReset} /><div className="flex gap-3"><button className="btn-pill-primary" data-testid="jtw-c5p3-first" onClick={() => void run(C5_STATE_DEMO, 'first')}>运行 大→原→小</button><button className="btn-pill-secondary" data-testid="jtw-c5p3-second" onClick={() => void run(C5_REVERSED_DEMO, 'second')}>运行 小→原→大</button></div><Trace value={trace} /><Trace value={secondTrace} /></>}
    {partId === 'jtw-s1-c5-p4' && <BuildEditor ops={ops} addOp={addOp} removeOp={removeOp} onRun={() => void run(blocksFromOps(ops))} />}
    {partId === 'jtw-s1-c5-p5' && <><p data-testid="jtw-c5p5-prior">P4 保存链：{(priorP4?.evidence as StoryPartEvidence | undefined)?.selections.build_ops?.join(' → ') ?? '等待 P4'}</p><EvidenceGroup title="找出两项环境限制" options={[{ id: 'narrow-door', label: '窄门', correct: true }, { id: 'curved-waterway', label: '弯曲水道', correct: true }, { id: 'water-curtain', label: '回程水帘', correct: true }]} selected={evidence} onToggle={(id) => setEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} done={evidence.length >= 2} testId="jtw-c5p5-environment" /><BuildEditor ops={ops} addOp={addOp} removeOp={removeOp} onRun={() => void run(blocksFromOps(ops, true))} /><EvidenceGroup title="为三段状态选择用途" options={[{ id: 'show-origin', label: '看见原貌', correct: true }, { id: 'compare-start', label: '比较初始', correct: true }, { id: 'carry-home', label: '准备携带', correct: true }]} selected={uses} onToggle={(id) => setUses((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} done={uses.length === 3} testId="jtw-c5p5-uses" /></>}
    <Trace value={partId === 'jtw-s1-c5-p4' || partId === 'jtw-s1-c5-p5' ? trace : []} />
    {(done || saved) && <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c5-resolved"><strong>世界变化：</strong>{partId === 'jtw-s1-c5-p5' ? '窄门安全线出现；悟空知道合适才是目标。下一次要检查藏在末尾的 Reset。' : '柱影按证据改变，下一段故事已经显现。'}</section>}
    <button className="btn-pill-primary w-full" data-testid="jtw-c5-complete" disabled={(!done && !saved) || complete.isPending} onClick={() => complete.mutate()}>继续到下一 Part</button>
  </div>
}

function ChoiceList({ title, options, selected, onSelect }: { title: string; options: Array<{ id: string; label: string; correct?: boolean }>; selected: string | null; onSelect: (id: string) => void }) {
  return <section><h2 className="mb-2 font-bold">{title}</h2><div className="flex flex-col gap-2">{options.map((option) => <Choice key={option.id} option={option} active={selected === option.id} onPick={() => onSelect(option.id)} />)}</div></section>
}

function BuildEditor({ ops, addOp, removeOp, onRun }: { ops: BlockOp[]; addOp: (op: BlockOp) => void; removeOp: (index: number) => void; onRun: () => void }) {
  return <section className="space-y-3" data-testid="jtw-c5-editor"><div className="flex flex-wrap gap-2">{PALETTE.map((item) => <button className="btn-pill-secondary" key={item.op} onClick={() => addOp(item.op)}>{item.label}</button>)}</div><div className="flex flex-wrap gap-2"><span>🚩 Start</span>{ops.map((op, index) => <button key={`${op}-${index}`} onClick={() => removeOp(index)} className="rounded-xl bg-wash-sky px-3 py-2">{op} ×</button>)}<span>🏁 End</span></div><button className="btn-pill-primary" disabled={!c5BuildValid(ops)} data-testid="jtw-c5-run-build" onClick={onRun}>Go：运行孩子搭出的链</button></section>
}

function Trace({ value }: { value: string[] }) { return value.length ? <p className="rounded-xl bg-wash-sky p-3" data-testid="jtw-c5-trace">{value.join(' → ')}</p> : null }
