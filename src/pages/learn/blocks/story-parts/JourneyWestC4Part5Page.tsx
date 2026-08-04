import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi'
import type { JtwC4P5Version } from '../jtwC4DualBuild'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C4_P5_CONTINUE_LABEL,
  C4_P5_MOTIVE_OPTIONS,
  C4_P5_NEXT_PART_ID,
  C4_P5_PART_ID,
  C4_P5_STORY_BEFORE,
  C4_P5_VERSIONS,
  c4p5BuildEvidence,
  c4p5MotiveCorrect,
  type C4P5BuildEvidence,
} from './journeyWestC4Part5Program'

const RECENT_PROJECTS_TO_SCAN = 8
const C4_P5_PLAN_KEY = 'story-blocks:jtw:c4-p5-plan'

interface C4P5Plan {
  motive: string | null
  version: JtwC4P5Version | null
  prediction: boolean
}

function planKey(kidId: string | null): string { return `${C4_P5_PLAN_KEY}:${kidId ?? 'anonymous'}` }

function readPlan(kidId: string | null): C4P5Plan {
  try {
    const value = sessionStorage.getItem(planKey(kidId))
    return value ? JSON.parse(value) as C4P5Plan : { motive: null, version: null, prediction: false }
  } catch {
    return { motive: null, version: null, prediction: false }
  }
}

async function findBuild(kidId: string): Promise<C4P5BuildEvidence | null> {
  for (const project of (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)) {
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

export interface JourneyWestC4Part5PageProps {
  loadBuild?: (kidId: string) => Promise<C4P5BuildEvidence | null>
  createWorkspace?: (args: { title: string; template: typeof C4_P5_VERSIONS[number]['template'] }) => Promise<{ id: string }>
}

export function JourneyWestC4Part5Page({
  loadBuild = findBuild,
  createWorkspace = createBlocksProject,
}: JourneyWestC4Part5PageProps = {}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const build = useQuery({
    queryKey: ['jtw-c4-p5-build', kidId],
    queryFn: () => loadBuild(kidId!),
    enabled: Boolean(kidId),
  })
  const [initialPlan] = useState(() => readPlan(kidId))
  const [motive, setMotive] = useState<string | null>(initialPlan.motive)
  const [version, setVersion] = useState<JtwC4P5Version | null>(initialPlan.version)
  const [prediction, setPrediction] = useState(initialPlan.prediction)
  const [creating, setCreating] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P5_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P5_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setMotive(evidence.selections?.motive?.[0] ?? null)
    setVersion((evidence.selections?.version?.[0] as JtwC4P5Version | undefined) ?? null)
    setPrediction(Boolean(evidence.prediction))
    setRestored(true)
  }

  const savedVersion = build.data?.version ?? null
  const selectionLocked = Boolean(build.data?.projectId)
  const resolved =
    c4p5MotiveCorrect(motive) &&
    prediction &&
    version !== null &&
    savedVersion === version &&
    Boolean(build.data?.dualRunCompleted)

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`)
      return
    }
    const selected = C4_P5_VERSIONS.find((candidate) => candidate.id === version)
    if (!selected) return
    sessionStorage.setItem(planKey(kidId), JSON.stringify({ motive, version, prediction }))
    setCreating(true)
    try {
      const project = await createWorkspace({
        title: `西游记 · ${selected.title}`,
        template: selected.template,
      })
      navigate(`/learn/blocks/${project.id}`)
    } finally {
      setCreating(false)
    }
  }

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P5_PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          version: version ? [version] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          placed_blocks: build.data?.placedBlocks ?? [],
          run_trace: ['flag:name-only', `tap:${version}:visible-result`, 'stable:end'],
        },
        prediction: version ? C4_P5_VERSIONS.find((item) => item.id === version)?.prediction : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P5_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在摆好三个展示选择…</p>
  if (!unlocked && !savedEntry) {
    return <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p5-locked"><p className="font-bold text-ink">先完成名字链和本领链，才能选择小展示。</p><Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p5">
      <header><p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第四章 · Part 5</p><h1 className="text-[28px] font-black text-ink">本领不是为了抢先</h1></header>
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c4p5-story">
        {C4_P5_STORY_BEFORE.map((paragraph) => <p key={paragraph.slice(0, 18)} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
      </section>
      <section className="space-y-2" data-testid="jtw-c4p5-motive">
        <h2 className="font-bold text-ink">悟空为什么要等Tap？</h2>
        {C4_P5_MOTIVE_OPTIONS.map((option) => <Choice key={option.id} option={option} active={motive === option.id} onPick={() => setMotive(option.id)} />)}
      </section>
      <section className="grid gap-3" data-testid="jtw-c4p5-versions">
        <h2 className="font-bold text-ink">选择一个会真正改变Tap链的版本</h2>
        {C4_P5_VERSIONS.map((item) => <button key={item.id} type="button" disabled={selectionLocked} data-active={version === item.id} className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-left disabled:opacity-70" onClick={() => { setVersion(item.id); setPrediction(false) }}><strong>{item.title}</strong><span className="block text-sm text-ink-soft">{item.description}</span></button>)}
      </section>
      {version && <section className="space-y-3 rounded-2xl bg-wash-sky p-5" data-testid="jtw-c4p5-prediction"><p className="font-bold text-ink">同伴预测：{C4_P5_VERSIONS.find((item) => item.id === version)?.prediction}</p><button type="button" className="btn-pill-secondary" onClick={() => setPrediction(true)}>{prediction ? '✓ 已先说出预测' : '先记录同伴预测'}</button></section>}
      <section className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5" data-testid="jtw-c4p5-build">
        <p>名字链完整保留。你要在真实Studio里为Tap链放入所选版本的3–5块，再先Go等待、后Tap悟空。</p>
        <button type="button" className="btn-pill-primary" disabled={!c4p5MotiveCorrect(motive) || !prediction || !version || creating} onClick={() => void openStudio()}>{build.data?.projectId ? '回到我的展示工作区' : '打开真实展示工作区'}</button>
        <p data-testid="jtw-c4p5-build-status">{build.data?.dualRunCompleted && savedVersion ? `✓ ${savedVersion}版本已保存，Go与Tap双运行完成` : '等待真实积木、保存和双运行证据'}</p>
      </section>
      {resolved && <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p5-resolved"><h2 className="font-black text-ink">悟空在观众准备好后才回应。</h2><p className="mt-2 text-ink">不同本领得到不同回应，但师父问：“你能说清楚，它为什么要等Tap才开始吗？”一阵风随后把整段本领链吹到了错误入口。</p></section>}
      <button type="button" className="btn-pill-primary w-full" data-testid="jtw-c4p5-continue" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>{savedEntry ? '回到地图' : C4_P5_CONTINUE_LABEL}</button>
      <p className="text-center text-[12px] text-ink-soft">本Part只解锁P6，不完成第四章，也不显示章节庆祝。</p>
    </div>
  )
}
