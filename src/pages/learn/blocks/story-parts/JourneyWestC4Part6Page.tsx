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
  C4_P6_CONTINUE_LABEL,
  C4_P6_DEVIATION_OPTIONS,
  C4_P6_EXPECT_OPTIONS,
  C4_P6_NEXT_PART_ID,
  C4_P6_PART_ID,
  C4_P6_STORY_BEFORE,
  C4_P6_TEMPLATES,
  c4p6AnswerCorrect,
  c4p6BuildEvidence,
  type C4P6BuildEvidence,
} from './journeyWestC4Part6Program'

const RECENT_PROJECTS_TO_SCAN = 8

async function findBuild(kidId: string): Promise<C4P6BuildEvidence | null> {
  for (const project of (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)) {
    try {
      const loaded = await loadBlocksProject(project.id)
      if (loaded.project.lessonId !== C4_P6_PART_ID) continue
      return c4p6BuildEvidence(project.id, loaded.project, Object.keys(loaded.storyProgress?.completed ?? {}))
    } catch {
      // Keep scanning after an unreadable legacy project.
    }
  }
  return null
}

export function JourneyWestC4Part6Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const build = useQuery({
    queryKey: ['jtw-c4-p6-build', kidId],
    queryFn: () => findBuild(kidId!),
    enabled: Boolean(kidId),
  })
  const [expectation, setExpectation] = useState<string | null>(null)
  const [deviation, setDeviation] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P6_PART_ID)
  const p5Entry = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c4-p5')
  const p5Evidence = p5Entry?.evidence as StoryPartEvidence | undefined
  const selectedVersion = p5Evidence?.selections?.version?.[0] as JtwC4P5Version | undefined
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P6_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setExpectation(evidence.selections?.expectation?.[0] ?? null)
    setDeviation(evidence.selections?.first_deviation?.[0] ?? null)
    setRestored(true)
  }

  const resolved =
    selectedVersion !== undefined &&
    build.data?.version === selectedVersion &&
    build.data.dualRunCompleted &&
    build.data.triggerDiff.length === 1 &&
    c4p6AnswerCorrect(C4_P6_EXPECT_OPTIONS, expectation) &&
    c4p6AnswerCorrect(C4_P6_DEVIATION_OPTIONS, deviation)

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`)
      return
    }
    if (!selectedVersion) return
    setCreating(true)
    try {
      const project = await createBlocksProject({
        title: '西游记 · 第一次偏离',
        template: C4_P6_TEMPLATES[selectedVersion],
      })
      navigate(`/learn/blocks/${project.id}`)
    } finally {
      setCreating(false)
    }
  }

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P6_PART_ID, {
        schema_version: 1,
        selections: {
          expectation: expectation ? [expectation] : [],
          actual: ['flag:name-then-skill-automatic'],
          first_deviation: deviation ? [deviation] : [],
          version: selectedVersion ? [selectedVersion] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          trigger_diff: build.data?.triggerDiff ?? [],
          run_trace: ['bug:flag-name-and-skill', 'fixed:flag-name-wait', 'fixed:tap-skill-end'],
        },
        prediction: 'Go只得名并等待，真实Tap后才完整展示',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P6_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在找两条事件轨迹…</p>
  if (!unlocked && !savedEntry) {
    return <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p6-locked"><p className="font-bold text-ink">先完成自己的Tap展示，才能检查错误入口。</p><Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p6">
      <header><p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第四章 · Part 6</p><h1 className="text-[28px] font-black text-ink">先找第一次偏离</h1></header>
      <section className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c4p6-story">{C4_P6_STORY_BEFORE.map((paragraph) => <p key={paragraph.slice(0, 18)} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}</section>
      <section className="space-y-2" data-testid="jtw-c4p6-expectation"><h2 className="font-bold text-ink">运行前，正确预期是什么？</h2>{C4_P6_EXPECT_OPTIONS.map((option) => <Choice key={option.id} option={option} active={expectation === option.id} onPick={() => setExpectation(option.id)} />)}</section>
      <section className="space-y-2" data-testid="jtw-c4p6-deviation"><h2 className="font-bold text-ink">错误运行第一次在哪里偏离？</h2>{C4_P6_DEVIATION_OPTIONS.map((option) => <Choice key={option.id} option={option} active={deviation === option.id} onPick={() => setDeviation(option.id)} />)}</section>
      <section className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5" data-testid="jtw-c4p6-debug">
        <p>真实Studio会保留你P5选择的全部动作和顺序。先Go复现自动展示，再只把整条本领链的Trigger从Start改成Tap；重跑Go并等待，最后真实Tap悟空。</p>
        <p data-testid="jtw-c4p6-version">保留版本：{selectedVersion ?? '等待P5服务端证据'}</p>
        <button type="button" className="btn-pill-primary" disabled={!selectedVersion || !c4p6AnswerCorrect(C4_P6_EXPECT_OPTIONS, expectation) || creating} onClick={() => void openStudio()}>{build.data?.projectId ? '回到排错工作区' : '打开真实排错工作区'}</button>
        <p data-testid="jtw-c4p6-build-status">{build.data?.dualRunCompleted && build.data.version ? `✓ ${build.data.version}动作组未变；错误run、Go等待和Tap重跑已保存` : '等待错误run、单一Trigger修复与双事件重跑'}</p>
      </section>
      {resolved && <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p6-resolved"><h2 className="font-black text-ink">小旗和指尖回到两条独立的路。</h2><p className="mt-2 text-ink">悟空先以名字与大家相识，再等邀请完整展示。得名印亮起，但第四章还没有完成；下一步要制作可保存、可供同伴发现的个人版本。</p></section>}
      <button type="button" className="btn-pill-primary w-full" data-testid="jtw-c4p6-continue" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>{savedEntry ? '回到地图' : C4_P6_CONTINUE_LABEL}</button>
      <p className="text-center text-[12px] text-ink-soft">本Part只解锁P7，不完成第四章，也不显示章节庆祝。</p>
    </div>
  )
}
