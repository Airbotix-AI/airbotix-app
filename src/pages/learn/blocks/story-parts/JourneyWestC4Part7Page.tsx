import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import { createBlocksProject, loadBlocksProject } from '../blocksApi'
import type { JtwC4P5Version } from '../jtwC4DualBuild'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C4_P7_CONTINUE_LABEL,
  C4_P7_NEXT_PART_ID,
  C4_P7_PART_ID,
  C4_P7_STORY_AFTER,
  C4_P7_STORY_BEFORE,
  C4_P7_VERSIONS,
  c4p7BuildComplete,
  c4p7ReopenRunComplete,
  findC4P7Build,
  runC4P7ReopenedProject,
  type C4P7ReopenRunEvidence,
} from './journeyWestC4Part7Program'

const FIRST_SEEN = ['名字牌', '悟空', '指尖目标'] as const
const TAP_REASONS = ['看见指尖目标，想试试悟空', '大人直接告诉我点哪里'] as const
const HINT_STRENGTHS = ['刚好能发现', '太弱没找到', '太强像自动答案'] as const

export function JourneyWestC4Part7Page() {
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
  const [design, setDesign] = useState<JtwC4P5Version | null>(null)
  const [prediction, setPrediction] = useState(false)
  const [firstSeen, setFirstSeen] = useState<string | null>(null)
  const [tapReason, setTapReason] = useState<string | null>(null)
  const [hintStrength, setHintStrength] = useState<string | null>(null)
  const [reopenVersion, setReopenVersion] = useState<number | null>(null)
  const [reopenMatch, setReopenMatch] = useState(false)
  const [reopenRun, setReopenRun] = useState<C4P7ReopenRunEvidence | null>(null)
  const [creating, setCreating] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P7_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P7_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setDesign((evidence.selections?.design?.[0] as JtwC4P5Version | undefined) ?? null)
    setPrediction(Boolean(evidence.prediction))
    setFirstSeen(evidence.selections?.peer_first_seen?.[0] ?? null)
    setTapReason(evidence.selections?.peer_tap_reason?.[0] ?? null)
    setHintStrength(evidence.selections?.hint_strength?.[0] ?? null)
    setReopenVersion(Number(evidence.selections?.reopen_version?.[0]) || null)
    setReopenMatch(evidence.selections?.reopen_match?.[0] === 'json-identical')
    setReopenRun({
      startTrace: evidence.selections?.reopen_start_trace ?? [],
      tapTrace: evidence.selections?.reopen_tap_trace ?? [],
      startStoppedAtEnd: evidence.selections?.reopen_start_stop?.[0] === 'end',
      tapStoppedAtEnd: evidence.selections?.reopen_tap_stop?.[0] === 'end',
    })
    setRestored(true)
  }

  const startedDesign = build.data?.design ?? design
  const buildDone = c4p7BuildComplete(build.data)
  const peerDone =
    firstSeen !== null &&
    tapReason === TAP_REASONS[0] &&
    hintStrength === HINT_STRENGTHS[0]
  const resolved = Boolean(
    prediction && startedDesign && buildDone && peerDone && reopenMatch && reopenVersion &&
      c4p7ReopenRunComplete(reopenRun),
  )

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`)
      return
    }
    const selected = C4_P7_VERSIONS.find((item) => item.id === design)
    if (!selected) return
    setCreating(true)
    try {
      const project = await createBlocksProject({
        title: `Meet Sun Wukong · ${selected.title}`,
        template: selected.template,
      })
      navigate(`/learn/blocks/${project.id}`)
    } finally {
      setCreating(false)
    }
  }

  const closeAndReopen = async () => {
    if (!build.data) return
    const before = await loadBlocksProject(build.data.projectId)
    const reopened = await loadBlocksProject(build.data.projectId)
    setReopenVersion(reopened.version)
    setReopenMatch(
      before.version === reopened.version &&
      JSON.stringify(before.project) === JSON.stringify(reopened.project),
    )
    setReopenRun(await runC4P7ReopenedProject(reopened.project))
  }

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P7_PART_ID, {
        schema_version: 1,
        selections: {
          design: startedDesign ? [startedDesign] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          saved_version: build.data ? [String(build.data.version)] : [],
          reopen_version: reopenVersion ? [String(reopenVersion)] : [],
          reopen_match: reopenMatch ? ['json-identical'] : [],
          peer_first_seen: firstSeen ? [firstSeen] : [],
          peer_tap_reason: tapReason ? [tapReason] : [],
          hint_strength: hintStrength ? [hintStrength] : [],
          event_trace: ['go:name:end', 'wait:skill-still', 'tap:skill:end'],
          reopen_start_trace: reopenRun?.startTrace ?? [],
          reopen_tap_trace: reopenRun?.tapTrace ?? [],
          reopen_start_stop: reopenRun?.startStoppedAtEnd ? ['end'] : [],
          reopen_tap_stop: reopenRun?.tapStoppedAtEnd ? ['end'] : [],
          block_ledger: build.data
            ? [`child-led:${build.data.childLedBlockCount}`, `end:${build.data.endCount}`]
            : [],
        },
        prediction: prediction ? 'Go只得名；同伴自己发现并Tap后才展示本领' : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P7_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在摆好认识卡…</p>
  if (!unlocked && !savedEntry) {
    return <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p7-locked"><p className="font-bold text-ink">先修好错误Trigger，才能制作认识卡。</p><Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid="jtw-part-c4-p7">
      <header><p className="text-xs font-bold text-brand-sky">西游记 · 第四章 · Part 7</p><h1 className="text-[28px] font-black text-ink">让同伴真正认识悟空</h1></header>
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c4p7-story">{C4_P7_STORY_BEFORE.map((text) => <p key={text} className="leading-8 text-ink">{text}</p>)}</section>
      <section className="space-y-3" data-testid="jtw-c4p7-design"><h2 className="font-bold text-ink">选择个人版本</h2>{C4_P7_VERSIONS.map((item) => <button key={item.id} type="button" disabled={Boolean(build.data)} data-active={design === item.id} className="mr-2 rounded-xl border border-hairline p-3" onClick={() => setDesign(item.id)}>{item.title}</button>)}</section>
      <section className="rounded-2xl bg-wash-sky p-5"><p className="font-bold">先预测：Go只得名；Tap才展示。</p><button type="button" className="btn-pill-secondary mt-3" onClick={() => setPrediction(true)}>{prediction ? '✓ 已记录预测' : '记录双事件预测'}</button></section>
      <section className="space-y-3 rounded-2xl border border-brand-sky p-5" data-testid="jtw-c4p7-build"><p>两个入口只预放Trigger。亲手搭到至少八块总结构、两个End，再在真实Studio先Go等待、后Tap悟空并保存。</p><button type="button" className="btn-pill-primary" disabled={!design || !prediction || creating} onClick={() => void openStudio()}>{build.data ? '回到我的认识卡' : '打开真实工作区'}</button><p>{buildDone ? `✓ ${build.data?.blockCount}块、Go/Tap双运行和保存证据已读回` : '等待真实积木、双运行和保存证据'}</p></section>
      <section className="space-y-3 rounded-2xl border border-hairline p-5" data-testid="jtw-c4p7-peer"><h2 className="font-bold">同伴无口头答案测试</h2><label>先看见什么？ <select value={firstSeen ?? ''} onChange={(event) => setFirstSeen(event.target.value)}><option value="">请选择</option>{FIRST_SEEN.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block">为什么Tap？ <select value={tapReason ?? ''} onChange={(event) => setTapReason(event.target.value)}><option value="">请选择</option>{TAP_REASONS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block">提示强度 <select value={hintStrength ?? ''} onChange={(event) => setHintStrength(event.target.value)}><option value="">请选择</option>{HINT_STRENGTHS.map((value) => <option key={value}>{value}</option>)}</select></label></section>
      <section className="space-y-3 rounded-2xl border border-hairline p-5" data-testid="jtw-c4p7-reopen"><h2 className="font-bold">关闭、重开、再次核对</h2><button type="button" className="btn-pill-secondary" disabled={!buildDone} onClick={() => void closeAndReopen()}>关闭并从服务端重开，再次Go/Tap</button><p>{reopenMatch && c4p7ReopenRunComplete(reopenRun) ? `✓ 版本 ${reopenVersion}：JSON一致，重开后Go与Tap都再次运行到End` : '尚未完成服务端重开一致性与再次运行核对'}</p></section>
      {resolved && <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p7-resolved"><h2 className="font-black">名字牌与目标点都留在个人作品里。</h2><p className="mt-2">{C4_P7_STORY_AFTER}</p></section>}
      <button type="button" className="btn-pill-primary w-full" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>{savedEntry ? '回到地图' : C4_P7_CONTINUE_LABEL}</button>
      <p className="text-center text-xs text-ink-soft">本Part只解锁P8，不完成第四章。</p>
    </div>
  )
}
