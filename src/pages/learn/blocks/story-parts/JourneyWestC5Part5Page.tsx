import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import {
  createBlocksProject,
  EMPTY_BLOCKS_STORY_PROGRESS,
  listBlocksProjects,
  loadBlocksProject,
  saveBlocksProject,
} from '../blocksApi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C5_P5_CONTINUE_LABEL,
  C5_P5_ENVIRONMENT_OPTIONS,
  C5_P5_NEXT_PART_ID,
  C5_P5_PART_ID,
  C5_P5_PREDICTION_OPTIONS,
  C5_P5_RESOLVED_WORLD_CHANGE,
  C5_P5_STORY_AFTER,
  C5_P5_STORY_BEFORE,
  C5_P5_USE_OPTIONS,
  c5p5BuildEvidence,
  c5p5EnvironmentValid,
  c5p5PredictionCorrect,
  c5p5UsesValid,
  type C5P5BuildEvidence,
} from './journeyWestC5Part5Program'

const RECENT_PROJECTS_TO_SCAN = 10
type Uses = Record<'large' | 'original' | 'small', string>
const C5_P5_PLAN_KEY = 'story-blocks:jtw:c5-p5-plan'

interface C5P5Plan { environment: string[]; uses: Uses; prediction: string | null }

function p5PlanKey(kidId: string | null): string { return `${C5_P5_PLAN_KEY}:${kidId ?? 'anonymous'}` }

function readP5Plan(kidId: string | null): C5P5Plan {
  try {
    const value = sessionStorage.getItem(p5PlanKey(kidId))
    return value ? JSON.parse(value) as C5P5Plan : {
      environment: [], uses: { large: '', original: '', small: '' }, prediction: null,
    }
  } catch {
    return { environment: [], uses: { large: '', original: '', small: '' }, prediction: null }
  }
}

async function createP5WorkspaceFromP4(sourceProjectId: string): Promise<{ id: string }> {
  const source = await loadBlocksProject(sourceProjectId)
  if (source.project.lessonId !== 'jtw-s1-c5-p4') {
    throw new Error('C5-P5 requires the child\'s C5-P4 project')
  }
  const created = await createBlocksProject({
    title: 'Ruyi Staff Size Story Choice',
    template: 'blocks_jtw_c5_p4',
  })
  const target = await loadBlocksProject(created.id)
  const cloned = structuredClone(source.project)
  cloned.name = 'Ruyi Staff Size Story Choice'
  cloned.lessonId = C5_P5_PART_ID
  const saved = await saveBlocksProject({
    projectId: created.id,
    project: cloned,
    version: target.version,
    otherFiles: target.otherFiles,
    history: { past: [], future: [] },
    storyProgress: EMPTY_BLOCKS_STORY_PROGRESS,
  })
  if (saved.status !== 'saved') throw new Error('C5-P5 clone lost a version race')
  return created
}

async function findP5Build(kidId: string, beforeAst: readonly string[]): Promise<C5P5BuildEvidence | null> {
  for (const project of (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)) {
    try {
      const loaded = await loadBlocksProject(project.id)
      if (loaded.project.lessonId !== C5_P5_PART_ID) continue
      return await c5p5BuildEvidence(
        project.id,
        loaded.project,
        Object.keys(loaded.storyProgress?.completed ?? {}),
        beforeAst,
      )
    } catch {
      // Keep scanning after an unreadable legacy project.
    }
  }
  return null
}

export interface JourneyWestC5Part5PageProps {
  loadBuild?: (kidId: string, beforeAst: readonly string[]) => Promise<C5P5BuildEvidence | null>
  createWorkspaceFromP4?: (sourceProjectId: string) => Promise<{ id: string }>
}

export function JourneyWestC5Part5Page({
  loadBuild = findP5Build,
  createWorkspaceFromP4 = createP5WorkspaceFromP4,
}: JourneyWestC5Part5PageProps = {}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) })
  const p4Entry = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p4')
  const p4Evidence = p4Entry?.evidence as StoryPartEvidence | undefined
  const beforeAst = p4Evidence?.selections?.build_ast ?? []
  const sourceProjectId = p4Evidence?.selections?.build_project?.[0] ?? null
  const build = useQuery({
    queryKey: ['jtw-c5-p5-build', kidId, beforeAst.join('|')],
    queryFn: () => loadBuild(kidId!, beforeAst),
    enabled: Boolean(kidId && beforeAst.length > 0),
  })
  const [initialPlan] = useState(() => readP5Plan(kidId))
  const [environment, setEnvironment] = useState<string[]>(initialPlan.environment)
  const [uses, setUses] = useState<Uses>(initialPlan.uses)
  const [prediction, setPrediction] = useState<string | null>(initialPlan.prediction)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(false)
  const [restored, setRestored] = useState(false)
  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C5_P5_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C5_P5_PART_ID) ?? false

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setEnvironment(evidence.selections?.environment_evidence ?? [])
    setUses({
      large: evidence.selections?.use_large?.[0] ?? '',
      original: evidence.selections?.use_original?.[0] ?? '',
      small: evidence.selections?.use_small?.[0] ?? '',
    })
    setPrediction(evidence.prediction ?? null)
    setRestored(true)
  }

  const readingDone = c5p5EnvironmentValid(environment)
  const usesDone = c5p5UsesValid(uses)
  const predictionDone = c5p5PredictionCorrect(prediction)
  const buildDone = Boolean(
    build.data?.validAst && build.data.changedOrderOrRhythm && build.data.runCompleted && build.data.carrying,
  )
  const resolved = readingDone && usesDone && predictionDone && buildDone

  const toggleEnvironment = (id: string) => {
    setEnvironment((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 2 ? [...current, id] : current)
  }

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`)
      return
    }
    if (!createWorkspaceFromP4 || !sourceProjectId) {
      setCreateError(true)
      return
    }
    sessionStorage.setItem(p5PlanKey(kidId), JSON.stringify({ environment, uses, prediction }))
    setCreating(true)
    setCreateError(false)
    try {
      const { id } = await createWorkspaceFromP4(sourceProjectId)
      navigate(`/learn/blocks/${id}`)
    } catch {
      setCreateError(true)
      setCreating(false)
    }
  }

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C5_P5_PART_ID, {
      schema_version: 1,
      selections: {
        environment_evidence: environment,
        use_large: uses.large ? [uses.large] : [],
        use_original: uses.original ? [uses.original] : [],
        use_small: uses.small ? [uses.small] : [],
        source_project: sourceProjectId ? [sourceProjectId] : [],
        build_project: build.data?.projectId ? [build.data.projectId] : [],
        before_ast: build.data?.beforeAst ?? beforeAst,
        after_ast: build.data?.afterAst ?? [],
        state_trace: build.data?.sizeTrace.map((stop) => `${stop.op}:${stop.size.toFixed(1)}`) ?? [],
        final_state: build.data?.carrying ? ['carrying-safe-line'] : [],
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C5_P5_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在读取Part 4的大小链…</p>
  if (!unlocked && !savedEntry) return <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c5p5-locked"><p className="font-bold text-ink">先完成自己的完整大小试验，才能选择用途。</p><Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link></div>

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c5-p5">
      <header><p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第五章 · Part 5</p><h1 className="text-[28px] font-black text-ink">最大不等于最合适</h1></header>
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c5p5-story">{C5_P5_STORY_BEFORE.map((paragraph) => <p key={paragraph.slice(0, 18)} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}</section>
      <section className="space-y-2" data-testid="jtw-c5p5-environment"><h2 className="font-bold text-ink">从环境中找出两项限制</h2>{C5_P5_ENVIRONMENT_OPTIONS.map((option) => <Choice key={option.id} option={option} active={environment.includes(option.id)} onPick={() => toggleEnvironment(option.id)} />)}</section>
      <section className="space-y-3" data-testid="jtw-c5p5-uses"><h2 className="font-bold text-ink">给三个状态分配用途</h2>{(['large', 'original', 'small'] as const).map((state) => <label key={state} className="block font-bold text-ink">{state === 'large' ? '大状态' : state === 'original' ? '原状态' : '小状态'}<select className="ml-3 rounded-xl border border-hairline p-2" value={uses[state]} onChange={(event) => setUses((current) => ({ ...current, [state]: event.target.value }))}><option value="">选择用途</option>{C5_P5_USE_OPTIONS[state].map((use) => <option key={use} value={use}>{use}</option>)}</select></label>)}</section>
      <section className="space-y-2" data-testid="jtw-c5p5-prediction"><h2 className="font-bold text-ink">观众会读到什么，结尾为什么合适？</h2>{C5_P5_PREDICTION_OPTIONS.map((option) => <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />)}</section>
      <section className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5" data-testid="jtw-c5p5-build">
        <p>从Part 4自己的成功链继续，重排状态或Wait节奏，并加入一个预设Say；必须保留三次状态变化且以携带状态结束。</p>
        <p data-testid="jtw-c5p5-source">来源：{sourceProjectId ?? '等待Part 4服务端证据'}</p>
        <button className="btn-pill-primary" type="button" disabled={!readingDone || !usesDone || !predictionDone || !sourceProjectId || creating} onClick={() => void openStudio()}>{build.data?.projectId ? '回到用途工作区' : '载入我的Part 4链'}</button>
        {createError && <p className="text-sm text-red-700">Part 4工作区尚未接通，请重试。</p>}
        <p data-testid="jtw-c5p5-build-status">{buildDone ? '✓ 顺序或节奏已真实改变；最终携带状态让安全线亮起' : '等待before/after AST、真实运行和最终窄门判定'}</p>
      </section>
      {resolved && <section className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c5p5-resolved"><h2 className="font-black text-ink">{C5_P5_RESOLVED_WORLD_CHANGE}</h2><p>{C5_P5_STORY_AFTER}</p></section>}
      <button className="btn-pill-primary w-full" data-testid="jtw-c5p5-continue" type="button" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>{savedEntry ? '回到地图' : C5_P5_CONTINUE_LABEL}</button>
      <p className="text-center text-[12px] text-ink-soft">本Part只解锁P6，不完成第五章，也不显示章节庆祝。</p>
    </div>
  )
}
