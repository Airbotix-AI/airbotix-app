import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { c4p7BuildComplete, findC4P7Build } from './journeyWestC4Part7Program'
import {
  C4_P8_CAUSE_CARDS,
  C4_P8_DEBUG_OPTIONS,
  C4_P8_NEXT_PART_ID,
  C4_P8_PART_ID,
  C4_P8_RETELL_OPTIONS,
  C4_P8_SEAL_ID,
  C4_P8_TEXT_OPTIONS,
  c4p8CardsOrdered,
  c4p8Correct,
  c4p8RunComplete,
  runC4P8SavedProject,
  type C4P8RunEvidence,
} from './journeyWestC4Part8Program'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice, OrderCards } from './partUi'

const MAP_PATH = '/learn/story/journey-west'

export function JourneyWestC4Part8Page({
  previewSleep,
}: {
  previewSleep?: (ms: number) => Promise<void>
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const build = useQuery({
    queryKey: ['jtw-c4-p7-build', kidId],
    queryFn: () => findC4P7Build(kidId!),
    enabled: Boolean(kidId),
  })
  const [cards, setCards] = useState<string[]>([])
  const [retell, setRetell] = useState<string | null>(null)
  const [textEvidence, setTextEvidence] = useState<string | null>(null)
  const [debugEvidence, setDebugEvidence] = useState<string | null>(null)
  const [run, setRun] = useState<C4P8RunEvidence | null>(null)
  const [running, setRunning] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P8_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P8_PART_ID) ?? false
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === C4_P8_SEAL_ID)
  if (savedEntry && !restored) {
    const selections = (savedEntry.evidence as StoryPartEvidence).selections
    setCards(selections.cause_card_order ?? [])
    setRetell(selections.retell_links?.[0] ?? null)
    setTextEvidence(selections.text_evidence?.[0] ?? null)
    setDebugEvidence(selections.debug_evidence?.[0] ?? null)
    setRun({
      startTrace: selections.start_trace ?? [],
      tapTrace: selections.tap_trace ?? [],
      startStoppedAtEnd: selections.start_stop?.[0] === 'end',
      tapStoppedAtEnd: selections.tap_stop?.[0] === 'end',
    })
    setRestored(true)
  }

  const workFound = c4p7BuildComplete(build.data)
  const cardsDone = c4p8CardsOrdered(cards)
  const runDone = c4p8RunComplete(run)
  const retellDone = c4p8Correct(retell, C4_P8_RETELL_OPTIONS)
  const textDone = c4p8Correct(textEvidence, C4_P8_TEXT_OPTIONS)
  const debugDone = c4p8Correct(debugEvidence, C4_P8_DEBUG_OPTIONS)
  const ready = workFound && cardsDone && runDone && retellDone && textDone && debugDone

  const runSavedWork = async () => {
    if (!build.data?.project || !cardsDone) return
    setRunning(true)
    try {
      setRun(await runC4P8SavedProject(build.data.project, previewSleep))
    } finally {
      setRunning(false)
    }
  }

  const finish = useMutation({
    mutationFn: (choice: 'now' | 'later' | null) =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P8_PART_ID, {
        schema_version: 1,
        selections: {
          cause_card_order: cards,
          retell_links: retell ? [retell] : [],
          text_evidence: textEvidence ? [textEvidence] : [],
          debug_evidence: debugEvidence ? [debugEvidence] : [],
          run_project: build.data?.projectId ? [build.data.projectId] : [],
          run_saved_version: build.data ? [String(build.data.version)] : [],
          start_trace: run?.startTrace ?? [],
          tap_trace: run?.tapTrace ?? [],
          start_stop: run?.startStoppedAtEnd ? ['end'] : [],
          tap_stop: run?.tapStoppedAtEnd ? ['end'] : [],
          peer_tap: ['no-spoken-hint'],
          continue_choice: choice ? [choice] : [],
        },
      }),
    onSuccess: async (_result, choice) => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      if (choice === 'now') navigate(MAP_PATH, { state: { unlocked: C4_P8_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">名字牌正在回到花果山…</p>
  if (!unlocked && !savedEntry) {
    return <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"><p className="font-bold">先保存并重开你的悟空认识卡。</p><Link to={MAP_PATH} className="btn-pill-primary inline-block">回到故事地图</Link></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid="jtw-part-c4-p8">
      <header><p className="text-xs font-bold text-brand-sky">西游记 · 第四章 · Part 8 · Retell</p><h1 className="text-[28px] font-black text-ink">名字跟着他回家</h1></header>
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c4p8-story">
        <p>师父先听见石猴从花果山来、愿意认真学习，才给他“孙悟空”这个名字。名字没有抹掉他的来处，也不是一按就学会全部本领。</p>
        <p>经过很长时间学习，悟空先用Go介绍名字，确认本领没有抢跑；同伴真正Tap他之后，他才完成展示。</p>
      </section>
      <OrderCards title="按故事顺序排列六张因果卡" options={[...C4_P8_CAUSE_CARDS]} order={cards} onChange={setCards} done={cardsDone} testId="jtw-c4p8-cause-cards" />
      <section className="space-y-3 rounded-2xl border border-brand-sky p-5" data-testid="jtw-c4p8-saved-run">
        <h2 className="font-bold">重跑P7真实保存版本</h2>
        <p>先Go确认名字链稳定结束、本领没有发生；再由真实Tap运行本领链至End。这里不会另载答案项目。</p>
        {!build.isLoading && !workFound && <p className="text-brand-coral">找不到合格的P7保存版本，请回到Part 7完成双事件、保存和重开。</p>}
        <button type="button" className="btn-pill-primary" disabled={!workFound || !cardsDone || running} onClick={() => void runSavedWork()}>{running ? 'Go → 等待 → Tap 运行中…' : '真实Go，再真实Tap'}</button>
        {run && <p data-testid="jtw-c4p8-run-trace">Go：{run.startTrace.join(' → ')}<br />Tap：{run.tapTrace.join(' → ')}</p>}
      </section>
      {runDone && <>
        <section className="space-y-2"><h2 className="font-bold">用“因为—所以—结果—后来”讲回</h2>{C4_P8_RETELL_OPTIONS.map((option) => <Choice key={option.id} option={option} active={retell === option.id} onPick={() => setRetell(option.id)} />)}</section>
        <section className="space-y-2"><h2 className="font-bold">指出一处文字动机证据</h2>{C4_P8_TEXT_OPTIONS.map((option) => <Choice key={option.id} option={option} active={textEvidence === option.id} onPick={() => setTextEvidence(option.id)} />)}</section>
        <section className="space-y-2"><h2 className="font-bold">指出P6第一次偏离</h2>{C4_P8_DEBUG_OPTIONS.map((option) => <Choice key={option.id} option={option} active={debugEvidence === option.id} onPick={() => setDebugEvidence(option.id)} />)}</section>
      </>}
      {ready && <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p8-resolved"><h2 className="font-black">得名印与名字牌稳定点亮</h2><p>悟空带着新名字和来处回到花果山。海面深处出现巨大柱影：下一章要寻找一件大小合适的工具。这里不放烟花，也不把几块积木说成完整修行。</p></section>}
      <button type="button" className="btn-pill-primary w-full" disabled={!ready || finish.isPending} onClick={() => finish.mutate(null)}>点亮得名印</button>
      {savedEntry && <div className="flex gap-3"><button type="button" className="btn-pill-primary flex-1" disabled={!seal?.lit} onClick={() => finish.mutate('now')}>看看海中柱影</button><button type="button" className="btn-pill-secondary flex-1" onClick={() => finish.mutate('later')}>以后继续</button></div>}
      {savedEntry && !seal?.lit && <p>服务器仍报告 {seal?.missing.length ?? 1} 项章节证据缺失；前端不能代替点亮。</p>}
    </div>
  )
}
