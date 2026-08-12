import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C4_P5_CONTINUE_LABEL,
  C4_P5_MOTIVE_OPTIONS,
  C4_P5_NEXT_PART_ID,
  C4_P5_PART_ID,
  C4_P5_PREDICTION_OPTIONS,
  C4_P5_STORY_BEFORE,
  C4_P5_TEMPLATE_ID,
  C4_P5_VERSION_OPTIONS,
  c4p5BuildEvidence,
  c4p5MotiveCorrect,
  c4p5PredictionCorrect,
  type C4P5BuildEvidence,
} from './journeyWestC4Part5Program'

const RECENT_PROJECTS_TO_SCAN = 8

async function findBuild(kidId: string): Promise<C4P5BuildEvidence | null> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)
  for (const project of projects) {
    try {
      const loaded = await loadBlocksProject(project.id)
      if (loaded.project.lessonId !== C4_P5_PART_ID) continue
      return c4p5BuildEvidence(project.id, loaded.project, Object.keys(loaded.storyProgress?.completed ?? {}))
    } catch {
      // Keep scanning after an unreadable legacy project.
    }
  }
  return null
}

export function JourneyWestC4Part5Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const build = useQuery({
    queryKey: ['jtw-c4-p5-build', kidId], queryFn: () => findBuild(kidId!), enabled: Boolean(kidId),
  })
  const [motive, setMotive] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P5_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P5_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setMotive(evidence.selections?.motive?.[0] ?? null)
    setVersion(evidence.selections?.version?.[0] ?? null)
    setPrediction(evidence.prediction ?? null)
    setRestored(true)
  }
  const readingDone = c4p5MotiveCorrect(motive) && c4p5PredictionCorrect(prediction) && Boolean(version)
  const buildDone = Boolean(build.data?.dualRunCompleted && build.data.version === version)
  const resolved = readingDone && buildDone
  const completed = Boolean(savedEntry)

  const openStudio = async () => {
    if (build.data?.projectId) return navigate(`/learn/blocks/${build.data.projectId}`)
    setCreating(true)
    try {
      const { id } = await createBlocksProject({ title: '西游记 · 本领不是为了抢先', template: C4_P5_TEMPLATE_ID })
      navigate(`/learn/blocks/${id}`)
    } finally {
      setCreating(false)
    }
  }

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P5_PART_ID, {
      schema_version: 1,
      selections: {
        motive: motive ? [motive] : [], version: version ? [version] : [],
        build_project: build.data?.projectId ? [build.data.projectId] : [],
        placed_blocks: build.data?.placedBlocks ?? [],
        run_trace: ['flag:name-only-end', 'partner-prediction', `tap:${version}:visible-end`],
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P5_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在准备三种回应…</p>
  if (!unlocked && !completed) return <div className="mx-auto max-w-3xl p-8 text-center" data-testid="jtw-c4p5-locked"><p>先完成名字链和本领链。</p><Link to="/learn/story/journey-west">回到故事地图</Link></div>

  return <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p5">
    <header><p className="text-[12px] font-bold text-brand-sky">西游记 · 第四章 · Part 5</p><h1 className="text-[28px] font-black text-ink">本领不是为了抢先</h1></header>
    <section className="space-y-3 rounded-2xl border border-hairline p-5" data-testid="jtw-c4p5-story">{C4_P5_STORY_BEFORE.map((text) => <p key={text.slice(0, 16)}>{text}</p>)}</section>
    <section className="space-y-2"><h2 className="font-bold">悟空为什么等Tap？</h2>{C4_P5_MOTIVE_OPTIONS.map((option) => <Choice key={option.id} option={option} active={motive === option.id} onPick={() => setMotive(option.id)} />)}</section>
    <section className="space-y-2" data-testid="jtw-c4p5-versions"><h2 className="font-bold">选择一个会改变程序的版本</h2>{C4_P5_VERSION_OPTIONS.map((option) => <Choice key={option.id} option={option} active={version === option.id} onPick={() => setVersion(option.id)} />)}</section>
    <section className="space-y-2"><h2 className="font-bold">请同伴先预测</h2>{C4_P5_PREDICTION_OPTIONS.map((option) => <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />)}</section>
    <section className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5"><h2 className="font-black">保留名字链，搭好所选Tap链</h2><p>先Go确认只有名字，再请同伴真实Tap悟空。只有与你选择一致的3–5块链和两次真实运行才算完成。</p><button className="btn-pill-primary" disabled={!readingDone || creating} onClick={() => void openStudio()}>{build.data?.projectId ? '回到我的选择工作区' : '打开选择工作区'}</button><p data-testid="jtw-c4p5-build-status">{buildDone ? `✓ ${version}版本已保存并完成Go/Tap双测试` : '等待真实选择、积木编辑、保存和双测试'}</p></section>
    {resolved && <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p5-resolved"><h2 className="font-black">所选动作只在Tap后出现，名字仍由Start控制。</h2><p>悟空说明自己是在观众准备好后回应。一阵风随后把整段本领链吹到了错误入口。</p></section>}
    <button className="btn-pill-primary w-full" data-testid="jtw-c4p5-continue" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>{completed ? '回到地图' : C4_P5_CONTINUE_LABEL}</button>
    <p className="text-center text-[12px] text-ink-soft">本Part只解锁P6，不完成第四章。</p>
  </div>
}
