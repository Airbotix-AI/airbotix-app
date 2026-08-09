import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import {
  C4_P4_CLASSIC_CARD,
  C4_P4_CONTINUE_LABEL,
  C4_P4_NEXT_PART_ID,
  C4_P4_PART_ID,
  C4_P4_PREDICTION_OPTIONS,
  C4_P4_RESOLVED_WORLD_CHANGE,
  C4_P4_STORY_AFTER,
  C4_P4_STORY_BEFORE,
  C4_P4_STORY_BRIDGE,
  C4_P4_TAP_OPTIONS,
  C4_P4_TEMPLATE_ID,
  c4p4BuildEvidence,
  c4p4PredictionCorrect,
  c4p4TapPredictionCorrect,
  type C4P4BuildEvidence,
} from './journeyWestC4Part4Program'

const RECENT_PROJECTS_TO_SCAN = 8

async function findBuild(kidId: string): Promise<C4P4BuildEvidence | null> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)
  for (const project of projects) {
    try {
      const loaded = await loadBlocksProject(project.id)
      if (loaded.project.lessonId !== C4_P4_PART_ID) continue
      return c4p4BuildEvidence(
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

export function JourneyWestC4Part4Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const build = useQuery({
    queryKey: ['jtw-c4-p4-build', kidId],
    queryFn: () => findBuild(kidId!),
    enabled: Boolean(kidId),
  })
  const [goPrediction, setGoPrediction] = useState<string | null>(null)
  const [tapPrediction, setTapPrediction] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P4_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P4_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setGoPrediction(evidence.prediction ?? null)
    setTapPrediction(evidence.selections?.tap_prediction?.[0] ?? null)
    setRestored(true)
  }

  const predictionDone =
    c4p4PredictionCorrect(goPrediction) && c4p4TapPredictionCorrect(tapPrediction)
  const buildDone = Boolean(build.data?.programMatches && build.data.dualRunCompleted)
  const resolved = predictionDone && buildDone
  const completed = Boolean(savedEntry)

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`)
      return
    }
    setCreating(true)
    setCreateError(false)
    try {
      const { id } = await createBlocksProject({
        title: '西游记 · 名字先站稳，本领再回应',
        template: C4_P4_TEMPLATE_ID,
      })
      navigate(`/learn/blocks/${id}`)
    } catch {
      setCreateError(true)
      setCreating(false)
    }
  }

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P4_PART_ID, {
        schema_version: 1,
        selections: {
          tap_prediction: tapPrediction ? [tapPrediction] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          placed_blocks: build.data?.placedBlocks ?? [],
          run_trace: ['flag:name-show-say-end', 'wait:skill-quiet', 'tap:hop-say-end'],
        },
        prediction: goPrediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P4_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在铺开两条事件链…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p4-locked">
        <p className="font-bold text-ink">先完成两个入口圈，才能打开真实的双事件工作区。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p4">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第四章 你的名字叫孙悟空 · Part 4
        </p>
        <h1 className="text-[28px] font-black text-ink">名字先站稳，本领再回应</h1>
      </header>

      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c4p4-story">
        {C4_P4_STORY_BEFORE.map((paragraph) => <p key={paragraph.slice(0, 16)} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <p className="text-[13px] leading-6 text-ink-soft">{C4_P4_CLASSIC_CARD}</p>
        <p className="rounded-xl bg-wash-sky p-3 text-[14px] leading-6 text-ink">{C4_P4_STORY_BRIDGE}</p>
      </section>

      <section className="space-y-2" data-testid="jtw-c4p4-go-prediction">
        <h2 className="font-bold text-ink">只按Go，哪条链应该保持安静？</h2>
        {C4_P4_PREDICTION_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={goPrediction === option.id} onPick={() => setGoPrediction(option.id)} />
        ))}
      </section>
      <section className="space-y-2" data-testid="jtw-c4p4-tap-prediction">
        <h2 className="font-bold text-ink">真实Tap悟空后，哪个目标才亮起？</h2>
        {C4_P4_TAP_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={tapPrediction === option.id} onPick={() => setTapPrediction(option.id)} />
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5" data-testid="jtw-c4p4-build">
        <h2 className="font-black text-ink">真实工作区：六块分进两条链</h2>
        <p className="text-[14px] leading-6 text-ink">
          Trigger已经固定。由你放入Start链的Show、名字Say、End，以及Tap链的Hop 2、邀请Say、End。
          完成后先按Go等待，再点舞台上的悟空。
        </p>
        <button className="btn-pill-primary" type="button" disabled={!predictionDone || creating} onClick={() => void openStudio()}>
          {build.data?.projectId ? '回到我的双事件工作区' : '打开双事件工作区'}
        </button>
        {createError && <p className="text-sm text-red-700">工作区暂时没有打开，请重试。</p>}
        <p data-testid="jtw-c4p4-build-status">
          {buildDone ? '✓ 六块已保存；Go等待与真实Tap两次轨迹都到End' : '等待真实积木、保存和双测试证据'}
        </p>
      </section>

      {resolved && (
        <section className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p4-resolved">
          <h2 className="font-black text-ink">{C4_P4_RESOLVED_WORLD_CHANGE}</h2>
          <p className="text-[15px] leading-7 text-ink">{C4_P4_STORY_AFTER}</p>
        </section>
      )}

      <button className="btn-pill-primary w-full" data-testid="jtw-c4p4-continue" type="button" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>
        {completed ? '回到地图' : C4_P4_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">本Part只解锁P5，不完成第四章，也不显示章节庆祝。</p>
    </div>
  )
}
