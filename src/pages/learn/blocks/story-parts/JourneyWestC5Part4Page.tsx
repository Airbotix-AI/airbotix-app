import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C5_P4_CONTINUE_LABEL,
  C5_P4_NEXT_PART_ID,
  C5_P4_PART_ID,
  C5_P4_PREDICTION_OPTIONS,
  C5_P4_RESOLVED_WORLD_CHANGE,
  C5_P4_STORY_AFTER,
  C5_P4_STORY_BEFORE,
  C5_P4_TARGET_OPTIONS,
  C5_P4_WAIT_OPTIONS,
  c5p4BuildEvidence,
  c5p4Correct,
  type C5P4BuildEvidence,
} from './journeyWestC5Part4Program'

const RECENT_PROJECTS_TO_SCAN = 10
const C5_P4_PLAN_KEY = 'story-blocks:jtw:c5-p4-plan'

interface C5P4Plan { target: string | null; prediction: string | null; waitPrediction: string | null }

function p4PlanKey(kidId: string | null): string { return `${C5_P4_PLAN_KEY}:${kidId ?? 'anonymous'}` }

function readP4Plan(kidId: string | null): C5P4Plan {
  try {
    const value = sessionStorage.getItem(p4PlanKey(kidId))
    return value ? JSON.parse(value) as C5P4Plan : { target: null, prediction: null, waitPrediction: null }
  } catch {
    return { target: null, prediction: null, waitPrediction: null }
  }
}

const createP4Workspace = () => createBlocksProject({
  title: 'Ruyi Staff Size Experiment',
  template: 'blocks_jtw_c5_p4',
})

async function findP4Build(kidId: string): Promise<C5P4BuildEvidence | null> {
  for (const project of (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)) {
    try {
      const loaded = await loadBlocksProject(project.id)
      if (loaded.project.lessonId !== C5_P4_PART_ID) continue
      return await c5p4BuildEvidence(
        project.id,
        loaded.project,
        Object.keys(loaded.storyProgress?.completed ?? {}),
      )
    } catch {
      // Keep scanning after an unreadable legacy project.
    }
  }
  return null
}

export interface JourneyWestC5Part4PageProps {
  loadBuild?: (kidId: string) => Promise<C5P4BuildEvidence | null>
  createWorkspace?: () => Promise<{ id: string }>
}

export function JourneyWestC5Part4Page({
  loadBuild = findP4Build,
  createWorkspace = createP4Workspace,
}: JourneyWestC5Part4PageProps = {}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const build = useQuery({
    queryKey: ['jtw-c5-p4-build', kidId],
    queryFn: () => loadBuild(kidId!),
    enabled: Boolean(kidId),
  })
  const [initialPlan] = useState(() => readP4Plan(kidId))
  const [target, setTarget] = useState<string | null>(initialPlan.target)
  const [prediction, setPrediction] = useState<string | null>(initialPlan.prediction)
  const [waitPrediction, setWaitPrediction] = useState<string | null>(initialPlan.waitPrediction)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C5_P4_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C5_P4_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setTarget(evidence.selections?.target_state?.[0] ?? null)
    setPrediction(evidence.prediction ?? null)
    setWaitPrediction(evidence.selections?.wait_prediction?.[0] ?? null)
    setRestored(true)
  }

  const predictionsDone = c5p4Correct(C5_P4_TARGET_OPTIONS, target) &&
    c5p4Correct(C5_P4_PREDICTION_OPTIONS, prediction) &&
    c5p4Correct(C5_P4_WAIT_OPTIONS, waitPrediction)
  const buildDone = Boolean(
    build.data?.exactAst &&
    build.data.runCompleted &&
    build.data.placedBlocks.length >= 4 &&
    build.data.sizeTrace.length === 3 &&
    build.data.carrying,
  )
  const resolved = predictionsDone && buildDone

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`)
      return
    }
    if (!createWorkspace) {
      setCreateError(true)
      return
    }
    sessionStorage.setItem(p4PlanKey(kidId), JSON.stringify({ target, prediction, waitPrediction }))
    setCreating(true)
    setCreateError(false)
    try {
      const { id } = await createWorkspace()
      navigate(`/learn/blocks/${id}`)
    } catch {
      setCreateError(true)
      setCreating(false)
    }
  }

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C5_P4_PART_ID, {
      schema_version: 1,
      selections: {
        target_state: target ? [target] : [],
        wait_prediction: waitPrediction ? [waitPrediction] : [],
        build_project: build.data?.projectId ? [build.data.projectId] : [],
        build_ast: build.data?.ast ?? [],
        placed_blocks: build.data?.placedBlocks ?? [],
        state_trace: build.data?.sizeTrace.map((stop) => `${stop.op}:${stop.size.toFixed(1)}`) ?? [],
        final_state: build.data?.carrying ? ['carrying'] : [],
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C5_P4_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在摆好大小状态卡…</p>
  if (!unlocked && !savedEntry) {
    return <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c5p4-locked"><p className="font-bold text-ink">先完成身体状态试验，才能搭完整大小链。</p><Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c5-p4">
      <header><p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第五章 · Part 4</p><h1 className="text-[28px] font-black text-ink">搭出完整大小试验</h1></header>
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c5p4-story">{C5_P4_STORY_BEFORE.map((paragraph) => <p key={paragraph.slice(0, 18)} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}</section>
      <section className="space-y-2" data-testid="jtw-c5p4-target"><h2 className="font-bold text-ink">先选目标状态卡</h2>{C5_P4_TARGET_OPTIONS.map((option) => <Choice key={option.id} option={option} active={target === option.id} onPick={() => setTarget(option.id)} />)}</section>
      <section className="space-y-2" data-testid="jtw-c5p4-prediction"><h2 className="font-bold text-ink">三个变化后分别是什么大小？</h2>{C5_P4_PREDICTION_OPTIONS.map((option) => <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />)}</section>
      <section className="space-y-2" data-testid="jtw-c5p4-wait"><h2 className="font-bold text-ink">哪次停顿帮助观众比较？</h2>{C5_P4_WAIT_OPTIONS.map((option) => <Choice key={option.id} option={option} active={waitPrediction === option.id} onPick={() => setWaitPrediction(option.id)} />)}</section>
      <section className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5" data-testid="jtw-c5p4-build">
        <h2 className="font-black text-ink">真实工作区：四块由你放置</h2>
        <p>Start和End之间放入Grow 2、Wait 5、Reset、Shrink 2。Turn Right不会通过完整AST检查。</p>
        <button className="btn-pill-primary" type="button" disabled={!predictionsDone || creating} onClick={() => void openStudio()}>{build.data?.projectId ? '回到大小工作区' : '打开大小工作区'}</button>
        {createError && <p className="text-sm text-red-700">工作区尚未接通，请重试。</p>}
        <p data-testid="jtw-c5p4-build-status">{buildDone ? `✓ ${build.data?.placedBlocks.length ?? 0}块已保存；真实轨迹为${build.data?.sizeTrace.map((stop) => stop.size.toFixed(1)).join(' → ')}` : '等待四块真实编辑、保存与完整运行'}</p>
      </section>
      {resolved && <section className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c5p4-resolved"><h2 className="font-black text-ink">{C5_P4_RESOLVED_WORLD_CHANGE}</h2><p>{C5_P4_STORY_AFTER}</p></section>}
      <button className="btn-pill-primary w-full" data-testid="jtw-c5p4-continue" type="button" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>{savedEntry ? '回到地图' : C5_P4_CONTINUE_LABEL}</button>
      <p className="text-center text-[12px] text-ink-soft">本Part只解锁P5，不完成第五章，也不显示章节庆祝。</p>
    </div>
  )
}
