import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useMe } from '@/auth/useAuth'
import {
  createBlocksProject,
  listBlocksProjects,
  loadBlocksProject,
  type BlocksTemplateId,
} from '../blocksApi'
import { jtwS2BuildMatches } from '../jtwS2Builds'
import { JourneyWestS2Scene } from './JourneyWestS2Scene'
import { Choice, OrderCards } from './partUi'
import {
  JTW_S2_C1_P3_ID,
  JTW_S2_C1_P7_ID,
  JTW_S2_C1_P8_ID,
  JTW_S2_C2_P7_ID,
  JTW_S2_C2_P8_ID,
  JTW_S2_C3_P7_ID,
  JTW_S2_C3_P8_ID,
  JTW_S2_C4_P3_ID,
  JTW_S2_C4_P7_ID,
  JTW_S2_C4_P8_ID,
  JTW_S2_C5_P3_ID,
  JTW_S2_C5_P7_ID,
  JTW_S2_C5_P8_ID,
  JTW_S2_C6_P3_ID,
  JTW_S2_C6_P7_ID,
  JTW_S2_C6_P8_ID,
  JTW_S2_PART_CONFIGS,
  JTW_S2_STORY_LINE_ID,
} from './journeyWestSeason2'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

const RECENT_PROJECTS_TO_SCAN = 20
const P3_ORDER = ['read-note', 'pack-bag', 'pass-gate', 'mountain-stop']
const P3_CARDS = [
  { id: 'read-note', label: '读路条', correct: true },
  { id: 'pack-bag', label: '带行囊', correct: true },
  { id: 'pass-gate', label: '过城门', correct: true },
  { id: 'mountain-stop', label: '停在山下', correct: true },
]
const C4_P3_ORDER = ['wukong-sender', 'send-blue', 'get-blue', 'bajie-receiver']
const C4_P3_CARDS = [
  { id: 'wukong-sender', label: '悟空 · 发送者', correct: true },
  { id: 'send-blue', label: 'Send · 蓝色', correct: true },
  { id: 'get-blue', label: 'Get · 蓝色', correct: true },
  { id: 'bajie-receiver', label: '八戒 · 接收者', correct: true },
]
const C4_P3_CHECKPOINT = '悟空发送蓝色，八戒接收蓝色，所以八戒会行动；如果八戒等橙色，他会继续等待。'
const C5_P3_ORDER = ['wukong-send-blue', 'bajie-get-blue', 'bajie-send-yellow', 'wujing-get-yellow']
const C5_P3_CARDS = [
  { id: 'wukong-send-blue', label: '悟空 · Send 蓝色', correct: true },
  { id: 'bajie-get-blue', label: '八戒 · Get 蓝色', correct: true },
  { id: 'bajie-send-yellow', label: '八戒 · Send 黄色', correct: true },
  { id: 'wujing-get-yellow', label: '悟净 · Get 黄色', correct: true },
]
const C6_P3_ORDER = ['page-one-gather', 'send-blue', 'page-two-bridge', 'send-yellow', 'page-three-west', 'end']
const C6_P3_CARDS = [
  { id: 'page-one-gather', label: '第一页 · 集合', correct: true },
  { id: 'send-blue', label: 'Send · 蓝色', correct: true },
  { id: 'page-two-bridge', label: '第二页 · 过桥', correct: true },
  { id: 'send-yellow', label: 'Send · 黄色', correct: true },
  { id: 'page-three-west', label: '第三页 · 向西', correct: true },
  { id: 'end', label: 'End', correct: true },
]

interface BuildReadback {
  projectId: string | null
  programMatches: boolean
  runCompleted: boolean
  bag: string | null
  pace: string | null
}

async function findBuild(kidId: string, lessonId: string): Promise<BuildReadback> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id)
      if (loaded.project.lessonId !== lessonId) continue
      const blocks = loaded.project.pages[0]?.characters
        .find((character) => character.id === 'xuanzang')?.scripts[0]?.blocks ?? []
      return {
        projectId: meta.id,
        programMatches: jtwS2BuildMatches(loaded.project, lessonId),
        runCompleted: Boolean(loaded.storyProgress?.completed[lessonId]),
        bag: blocks.find((block) => block.op === 'say' && block.text?.startsWith('带'))?.text ?? null,
        pace: blocks.find((block) => block.op === 'set_speed')?.n === 1 ? 'slow' :
          blocks.find((block) => block.op === 'set_speed')?.n === 2 ? 'normal' : null,
      }
    } catch {
      // Ignore an unreadable legacy project and keep scanning.
    }
  }
  return { projectId: null, programMatches: false, runCompleted: false, bag: null, pace: null }
}

export function JourneyWestS2BatchPartPage({ partId }: { partId: string }) {
  const config = JTW_S2_PART_CONFIGS[partId]
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S2_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S2_STORY_LINE_ID),
    enabled: Boolean(config),
  })
  const retellBuildLesson = partId === JTW_S2_C1_P8_ID ? JTW_S2_C1_P7_ID :
    partId === JTW_S2_C2_P8_ID ? JTW_S2_C2_P7_ID :
      partId === JTW_S2_C3_P8_ID ? JTW_S2_C3_P7_ID :
        partId === JTW_S2_C4_P8_ID ? JTW_S2_C4_P7_ID :
          partId === JTW_S2_C5_P8_ID ? JTW_S2_C5_P7_ID :
            partId === JTW_S2_C6_P8_ID ? JTW_S2_C6_P7_ID : null
  const buildLesson = config?.template ? partId : retellBuildLesson
  const build = useQuery({
    queryKey: ['jtw-s2-build', buildLesson, kidId],
    queryFn: () => findBuild(kidId!, buildLesson!),
    enabled: Boolean(kidId && buildLesson),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [extra, setExtra] = useState<string | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [restored, setRestored] = useState(false)
  const [creating, setCreating] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === partId)
  const unlocked = progress.data?.unlocked_part_ids.includes(partId) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes(`${partId}-story`))
    setAnswer(evidence.selections?.answer?.[0] ?? null)
    setExtra(evidence.selections?.extra_answer?.[0] ?? null)
    setOrder(evidence.selections?.action_order ?? [])
    setRestored(true)
  }

  const answerDone = config.options.find((option) => option.id === answer)?.correct === true
  const extraDone = !config.extraOptions || config.extraOptions.find((option) => option.id === extra)?.correct === true
  const orderDone = partId === JTW_S2_C1_P3_ID
    ? order.join('|') === P3_ORDER.join('|')
    : partId === JTW_S2_C4_P3_ID
      ? order.join('|') === C4_P3_ORDER.join('|')
      : partId === JTW_S2_C5_P3_ID
        ? order.join('|') === C5_P3_ORDER.join('|')
        : partId === JTW_S2_C6_P3_ID
          ? order.join('|') === C6_P3_ORDER.join('|')
          : true
  const buildDone = !buildLesson || Boolean(build.data?.programMatches && build.data.runCompleted)
  const resolved = storyRead && answerDone && extraDone && orderDone && buildDone
  const completed = Boolean(savedEntry)

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`)
      return
    }
    if (!config.template) return
    setCreating(true)
    try {
      const { id } = await createBlocksProject({
        title: config.studioTitle ?? config.title,
        template: config.template as BlocksTemplateId,
      })
      navigate(`/learn/blocks/${id}`)
    } finally {
      setCreating(false)
    }
  }

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S2_STORY_LINE_ID, partId, {
      schema_version: 1,
      selections: {
        story_screens: storyRead ? [`${partId}-story`] : [],
        answer: answer ? [answer] : [],
        extra_answer: extra ? [extra] : [],
        action_order: order,
        build_project: build.data?.projectId ? [build.data.projectId] : [],
        persisted_design: build.data?.bag ? [build.data.bag, build.data.pace ?? ''] : [],
        ...(partId === JTW_S2_C4_P3_ID && resolved ? {
          sender: ['wukong'],
          receiver: ['bajie'],
          matching_pair: ['blue-blue'],
          mismatch_pair: ['blue-orange'],
          matching_prediction: ['bajie-acts'],
          mismatch_prediction: ['bajie-waits'],
          checkpoint_sentence: [C4_P3_CHECKPOINT],
        } : {}),
      },
      prediction: partId.endsWith('-p3') ? answer ?? undefined : undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S2_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: config.nextId } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在准备下一张故事卡…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid={`${partId}-locked`}>
        <p className="font-bold text-ink">先完成前一个 Part，才会打开这一页。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid={partId}>
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二季 · {config.chapter} · {config.part} · {config.scaffold}
        </p>
        <h1 className="text-[28px] font-black text-ink">{config.title}</h1>
      </header>

      <JourneyWestS2Scene partId={partId} resolved={resolved || completed} />

      <section className="space-y-4" data-testid={`${partId}-story`}>
        {config.story.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <button type="button" className="btn-pill-primary" onClick={() => setStoryRead(true)}>
          {storyRead ? '故事已共读 ✓' : '我已读完这张故事卡'}
        </button>
      </section>

      {partId === JTW_S2_C1_P3_ID && storyRead && (
        <OrderCards title="先把完整行动排在桌面上" options={P3_CARDS} order={order} onChange={setOrder} done={orderDone} testId={`${partId}-order`} />
      )}

      {partId === JTW_S2_C4_P3_ID && storyRead && (
        <OrderCards title="把发送者、同色消息和接收者排成完整路线" options={C4_P3_CARDS} order={order} onChange={setOrder} done={orderDone} testId={`${partId}-order`} />
      )}

      {partId === JTW_S2_C5_P3_ID && storyRead && (
        <OrderCards title="把两段接力按发送和接收顺序排好" options={C5_P3_CARDS} order={order} onChange={setOrder} done={orderDone} testId={`${partId}-order`} />
      )}

      {partId === JTW_S2_C6_P3_ID && storyRead && (
        <OrderCards title="把三页、两次消息和最后 End 排好" options={C6_P3_CARDS} order={order} onChange={setOrder} done={orderDone} testId={`${partId}-order`} />
      )}

      <section data-testid={`${partId}-question`}>
        <h2 className="mb-2 text-[15px] font-bold text-ink">{config.question}</h2>
        <div className="flex flex-col gap-2">
          {config.options.map((option) => <Choice key={option.id} option={option} active={answer === option.id} onPick={() => setAnswer(option.id)} />)}
        </div>
        {answer && !answerDone && <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">再回到故事证据和事件顺序看一看。</p>}
      </section>

      {config.extraOptions && (
        <section data-testid={`${partId}-extra`}>
          <h2 className="mb-2 text-[15px] font-bold text-ink">{config.extraQuestion}</h2>
          <div className="flex flex-col gap-2">
            {config.extraOptions.map((option) => <Choice key={option.id} option={option} active={extra === option.id} onPick={() => setExtra(option.id)} />)}
          </div>
        </section>
      )}

      {config.template && (
        <section className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5" data-testid={`${partId}-build`} data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in-progress' : 'none'}>
          <h2 className="font-bold text-ink">在真正的 Blocks Studio 完成、运行并保存</h2>
          <p className="mt-2 text-[13px] leading-6 text-ink-soft">完成按钮读取的是已保存项目和运行记录；只拖积木、只选答案，或没有按 Go 运行，都不会通过。</p>
          <button type="button" className="btn-pill-primary mt-4" disabled={creating} onClick={() => void openStudio()}>
            {creating ? '正在创建…' : buildDone ? '重新打开并运行' : build.data?.projectId ? '继续搭建' : '打开工作区'}
          </button>
          {buildDone && <p className="mt-3 font-bold text-brand-mint">✓ 程序结构匹配，且已真实运行并保存</p>}
          {(partId === JTW_S2_C1_P7_ID || partId === JTW_S2_C2_P7_ID) && build.data?.bag && (
            <p className="mt-2 text-[13px] text-ink">已保存设计：{build.data.bag} · {build.data.pace === 'slow' ? '慢速' : '正常速度'}</p>
          )}
        </section>
      )}

      {retellBuildLesson && (
        <section className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-5" data-testid={`${partId}-p7-readback`}>
          <h2 className="font-bold text-ink">读取上一 Part 的个人作品</h2>
          <p className="mt-2 text-[13px] text-ink-soft">复述页不会另造答案工程；它读取 P7 保存并运行过的真实项目。</p>
          <p className={`mt-3 font-bold ${buildDone ? 'text-brand-mint' : 'text-brand-coral'}`}>
            {buildDone ? `✓ 已读回 P7 的有效保存运行记录${build.data?.bag ? `：${build.data.bag}` : ''}` : '还没有读到 P7 的有效保存运行记录'}
          </p>
        </section>
      )}

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid={`${partId}-resolved`}>
          <p className="font-bold text-ink">这一 Part 的故事证据、程序结果和保存证据已经对齐。</p>
          {partId === JTW_S2_C4_P3_ID && (
            <div className="mt-3 space-y-2 text-[14px] text-ink" data-testid={`${partId}-comparison`}>
              <p>🔵 悟空 Send 蓝色 ─── 八戒 Get 蓝色：八戒会行动</p>
              <p>🔵 悟空 Send 蓝色 ─⨯─ 🟠 八戒 Get 橙色：八戒继续等待</p>
              <p>{C4_P3_CHECKPOINT}</p>
            </div>
          )}
          <p className="mt-2 text-[14px] text-ink">继续只会解锁 {config.nextId}，不会一次打开整章。</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link>
        <button type="button" className="btn-pill-primary" disabled={(!resolved && !completed) || complete.isPending} onClick={() => complete.mutate()} data-testid={`${partId}-continue`}>
          {complete.isPending ? '正在保存…' : '继续故事 →'}
        </button>
      </footer>
      {complete.isError && <p role="alert" className="text-[13px] font-semibold text-brand-coral">证据暂时没有保存，请再试一次。</p>}
    </div>
  )
}
