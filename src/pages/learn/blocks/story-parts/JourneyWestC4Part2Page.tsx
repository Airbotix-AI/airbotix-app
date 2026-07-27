import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { BlockChip } from '../BlockChip'
import { BlocksRunner, startState, type SpriteState } from '../interpreter'
import {
  C4_P2_CLASSIC_CARD,
  C4_P2_COMPARISON_OPTIONS,
  C4_P2_CONTINUE_LABEL,
  C4_P2_NEXT_PART_ID,
  C4_P2_PART_ID,
  C4_P2_PREDICTION_OPTIONS,
  C4_P2_RESOLVED_WORLD_CHANGE,
  C4_P2_SCREEN_IDS,
  C4_P2_STARTER_PROJECT,
  C4_P2_STORY_AFTER,
  C4_P2_STORY_BRIDGE,
  C4_P2_STORY_SCREENS,
  C4_P2_WUKONG_ID,
  c4p2Correct,
  c4p2StartMeasured,
  c4p2StoryRead,
  c4p2TapMeasured,
  type C4P2EventRun,
} from './journeyWestC4Part2Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice } from './partUi'

const PAGE = C4_P2_STARTER_PROJECT.pages[0]
const WUKONG = PAGE.characters[0]

function encodeRun(run: C4P2EventRun | null): string[] {
  if (!run) return []
  return [
    `trigger:${run.trigger}`,
    `scripts:${run.scriptIds.join('+')}`,
    `ops:${run.ops.join('>')}`,
    `pose:${run.finalState.gx}/${run.finalState.gy}/${run.finalState.rot}/${run.finalState.visible}`,
    ...run.says.map((line) => `say:${line}`),
  ]
}

function EventTrack({ scriptIndex, circledHop }: { scriptIndex: number; circledHop?: boolean }) {
  const script = WUKONG.scripts[scriptIndex]
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid={`jtw-c4p2-track-${scriptIndex}`}>
      {script.blocks.map((block, index) => (
        <span
          key={`${block.op}-${index}`}
          className={circledHop && block.op === 'hop' ? 'rounded-xl ring-4 ring-brand-coral/60' : ''}
          data-circled={circledHop && block.op === 'hop'}
        >
          <BlockChip block={block} inChain isLast={index === script.blocks.length - 1} />
        </span>
      ))}
    </div>
  )
}

export function JourneyWestC4Part2Page({
  previewSleep,
}: {
  previewSleep?: (ms: number) => Promise<void>
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [screenIndex, setScreenIndex] = useState(0)
  const [screensRead, setScreensRead] = useState<string[]>([C4_P2_SCREEN_IDS[0]])
  const [prediction, setPrediction] = useState<string | null>(null)
  const [comparison, setComparison] = useState<string | null>(null)
  const [startRun, setStartRun] = useState<C4P2EventRun | null>(null)
  const [tapRun, setTapRun] = useState<C4P2EventRun | null>(null)
  const [sprite, setSprite] = useState<SpriteState>(() => startState(WUKONG))
  const [saying, setSaying] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P2_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P2_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P2_SCREEN_IDS])
    setPrediction(evidence.prediction ?? null)
    setComparison(evidence.selections?.event_comparison?.[0] ?? null)
    setStartRun({
      trigger: 'start',
      scriptIds: ['sun-wukong-wrong-start'],
      ops: ['show', 'say', 'hop', 'end'],
      finalState: { gx: 7, gy: 8, size: 3, rot: 0, visible: true },
      says: ['我是孙悟空'],
    })
    setTapRun({
      trigger: 'tap',
      scriptIds: ['sun-wukong-tap-example'],
      ops: ['turn_right', 'end'],
      finalState: { gx: 7, gy: 8, size: 3, rot: 60, visible: true },
      says: [],
    })
    setSprite({ gx: 7, gy: 8, size: 3, rot: 60, visible: true })
    setRestored(true)
  }

  const makeRunner = useCallback((trigger: 'start' | 'tap') => {
    const scriptIds = new Set<string>()
    const ops: string[] = []
    const says: string[] = []
    let finalState = startState(WUKONG)
    const runner = new BlocksRunner(PAGE, {
      onSprite: (_id, state) => {
        finalState = state
        setSprite(state)
      },
      onSay: (_id, text) => {
        setSaying(text)
        if (text) says.push(text)
      },
      onNote: () => undefined,
      onSound: () => undefined,
      onGotoPage: () => undefined,
      onStep: (_id, scriptId, index) => {
        if (index < 0) return
        scriptIds.add(scriptId)
        const block = WUKONG.scripts.find((script) => script.id === scriptId)?.blocks[index]
        if (block && ops.at(-1) !== block.op) ops.push(block.op)
      },
    }, previewSleep)
    return {
      runner,
      result: (): C4P2EventRun => ({
        trigger,
        scriptIds: [...scriptIds],
        ops,
        finalState,
        says,
      }),
    }
  }, [previewSleep])

  const runStart = useCallback(async () => {
    if (running || !c4p2Correct(prediction, C4_P2_PREDICTION_OPTIONS)) return
    setRunning(true)
    setStartRun(null)
    setTapRun(null)
    setSaying(null)
    setSprite(startState(WUKONG))
    const run = makeRunner('start')
    await run.runner.runFlag()
    setStartRun(run.result())
    setRunning(false)
  }, [makeRunner, prediction, running])

  const resetAndTap = useCallback(async () => {
    if (running || !c4p2StartMeasured(startRun)) return
    setRunning(true)
    setTapRun(null)
    setSaying(null)
    const run = makeRunner('tap')
    run.runner.resetAll()
    await run.runner.runTap(C4_P2_WUKONG_ID)
    setTapRun(run.result())
    setRunning(false)
  }, [makeRunner, running, startRun])

  const storyDone = c4p2StoryRead(screensRead)
  const startDone = c4p2StartMeasured(startRun)
  const tapDone = c4p2TapMeasured(tapRun)
  const comparisonDone = c4p2Correct(comparison, C4_P2_COMPARISON_OPTIONS)
  const resolved = storyDone && startDone && tapDone && comparisonDone

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P2_PART_ID, {
      schema_version: 1,
      selections: {
        story_screens: screensRead,
        start_trace: encodeRun(startRun),
        tap_trace: encodeRun(tapRun),
        event_comparison: comparison ? [comparison] : [],
        reset_evidence: ['reset-before-real-tap'],
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P2_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">庭院里的名字牌正在翻过来…</p>
  if (!unlocked && !savedEntry) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p2-locked">
        <p className="font-bold text-ink">先在山门前把来路和理由说清楚。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第四章 你的名字叫孙悟空 · Part 2
        </p>
        <h1 className="text-[28px] font-black text-ink">一个名字，两个开始</h1>
      </header>

      <section className="space-y-4 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c4p2-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P2_STORY_SCREENS[screenIndex]}</p>
        <p className="text-[13px] leading-6 text-ink-soft">{C4_P2_CLASSIC_CARD}</p>
        {screenIndex === 0 && (
          <button
            className="btn-pill-primary"
            data-testid="jtw-c4p2-story-next"
            type="button"
            onClick={() => {
              setScreenIndex(1)
              setScreensRead([...C4_P2_SCREEN_IDS])
            }}
          >
            读“两个开始”
          </button>
        )}
        <p className="text-[13px] font-semibold text-ink">{C4_P2_STORY_BRIDGE}</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-hairline bg-gradient-to-b from-wash-sunshine to-canvas-pure p-5" data-testid="jtw-c4p2-stage">
        <div className="text-center">
          <p className="font-black text-ink" data-testid="jtw-c4p2-name-board">
            {startDone ? '孙悟空' : '空名字牌'}
          </p>
          <button
            type="button"
            data-testid="jtw-c4p2-real-tap"
            disabled={!startDone || running}
            onClick={resetAndTap}
            className="mt-3 rounded-full border border-brand-sky bg-canvas-pure p-3"
            style={{ transform: `rotate(${sprite.rot}deg)` }}
            aria-label="真的 Tap 孙悟空"
          >
            <img
              alt=""
              aria-hidden
              className="h-28 w-28 object-contain"
              src="/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png"
            />
          </button>
          {saying && <p className="mt-2 rounded-full bg-canvas-pure px-3 py-2 text-sm">{saying}</p>}
        </div>
        <EventTrack scriptIndex={0} circledHop={startDone} />
        <EventTrack scriptIndex={1} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-ink">不 Tap，只按 Go，会发生什么？</h2>
        {C4_P2_PREDICTION_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
        ))}
        <button
          className="btn-pill-primary w-full"
          data-testid="jtw-c4p2-go"
          type="button"
          disabled={!storyDone || !c4p2Correct(prediction, C4_P2_PREDICTION_OPTIONS) || running}
          onClick={runStart}
        >
          {running ? '正在运行…' : '▶ Go（不 Tap）'}
        </button>
      </section>

      {startDone && (
        <p className="rounded-xl bg-wash-sunshine p-3 text-sm text-ink" data-testid="jtw-c4p2-start-result">
          实际 Start 轨迹：Show → Say“我是孙悟空” → Hop → End。Hop 抢跑了；Tap 轨迹仍为空。
        </p>
      )}
      {tapDone && (
        <p className="rounded-xl bg-wash-mint p-3 text-sm text-ink" data-testid="jtw-c4p2-tap-result">
          教学重置后，真实 Tap 只运行 On Tap → Turn 2 → End；Start 链没有被重新触发。
        </p>
      )}

      {tapDone && (
        <section className="space-y-3">
          <h2 className="font-bold text-ink">比较两次真实运行</h2>
          {C4_P2_COMPARISON_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={comparison === option.id} onPick={() => setComparison(option.id)} />
          ))}
        </section>
      )}

      {resolved && (
        <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p2-resolved">
          <h2 className="font-black text-ink">{C4_P2_RESOLVED_WORLD_CHANGE}</h2>
          <p className="mt-2 text-[15px] leading-7 text-ink">{C4_P2_STORY_AFTER}</p>
        </section>
      )}

      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p2-continue"
        type="button"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {C4_P2_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">
        这一 Part 只观察真实 starter，不允许移动或修复积木；只解锁下一 Part，不完成第四章。
      </p>
    </div>
  )
}
