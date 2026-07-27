import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { BlockChip } from '../BlockChip'
import { BlocksRunner, startState, type SpriteState } from '../interpreter'
import {
  C4_P2_CHARACTER_ID,
  C4_P2_CLASSIC_CARD,
  C4_P2_CONTINUE_LABEL,
  C4_P2_NEXT_PART_ID,
  C4_P2_PART_ID,
  C4_P2_PREDICTION_OPTIONS,
  C4_P2_RESOLVED_WORLD_CHANGE,
  C4_P2_SCREEN_IDS,
  C4_P2_STARTER_PROJECT,
  C4_P2_START_TRACE,
  C4_P2_STORY_AFTER,
  C4_P2_STORY_BRIDGE,
  C4_P2_STORY_SCREENS,
  C4_P2_TAP_TRACE,
  c4p2PredictionDone,
  c4p2StoryRead,
  c4p2TraceMatches,
} from './journeyWestC4Part2Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

const START_SCRIPT_ID = 'wrong-start'
const TAP_SCRIPT_ID = 'tap-example'

function Track({ scriptId, trace }: { scriptId: string; trace: readonly string[] }) {
  const character = C4_P2_STARTER_PROJECT.pages[0].characters[0]
  const script = character.scripts.find((candidate) => candidate.id === scriptId)
  if (!script) return null
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid={`jtw-c4p2-track-${scriptId}`}>
      {script.blocks.map((block, index) => (
        <BlockChip
          key={`${block.op}-${index}`}
          block={block}
          inChain
          isLast={index === script.blocks.length - 1}
          lit={trace.includes(block.op)}
        />
      ))}
    </div>
  )
}

function TraceCard({ title, trace, testId }: { title: string; trace: readonly string[]; testId: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-canvas-pure p-3" data-testid={testId}>
      <p className="text-[13px] font-bold text-ink">{title}</p>
      <p className="mt-1 text-[13px] text-ink-soft">{trace.join(' → ')}</p>
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
  const character = C4_P2_STARTER_PROJECT.pages[0].characters[0]
  const [screen, setScreen] = useState(0)
  const [screensRead, setScreensRead] = useState<string[]>([C4_P2_SCREEN_IDS[0]])
  const [prediction, setPrediction] = useState<string | null>(null)
  const [startTrace, setStartTrace] = useState<string[]>([])
  const [tapTrace, setTapTrace] = useState<string[]>([])
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character))
  const [saying, setSaying] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P2_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P2_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P2_SCREEN_IDS])
    setPrediction(evidence.prediction ?? null)
    setStartTrace(evidence.selections?.start_trace ?? [])
    setTapTrace(evidence.selections?.tap_trace ?? [])
    setRestored(true)
  }

  const starterPage = C4_P2_STARTER_PROJECT.pages[0]
  const makeRunner = (onTrace: (trace: string[]) => void) => {
    const measured: string[] = []
    const runner = new BlocksRunner(starterPage, {
      onSprite: (_characterId, next) => setSprite(next),
      onSay: (_characterId, text) => setSaying(text),
      onNote: () => undefined,
      onSound: () => undefined,
      onGotoPage: () => undefined,
      onStep: (_characterId, scriptId, index) => {
        if (index < 0) return
        const script = character.scripts.find((candidate) => candidate.id === scriptId)
        const op = script?.blocks[index]?.op
        if (op) {
          measured.push(op)
          onTrace([...measured])
        }
      },
    }, previewSleep)
    return runner
  }

  const storyDone = c4p2StoryRead(screensRead)
  const predictionDone = c4p2PredictionDone(prediction)
  const startDone = c4p2TraceMatches(startTrace, C4_P2_START_TRACE)
  const tapDone = c4p2TraceMatches(tapTrace, C4_P2_TAP_TRACE)
  const resolved = storyDone && predictionDone && startDone && tapDone
  const completed = Boolean(savedEntry)

  const runStart = async () => {
    if (!storyDone || !predictionDone || running) return
    setRunning(true)
    setTapTrace([])
    setStartTrace([])
    setSprite(startState(character))
    setSaying(null)
    const runner = makeRunner(setStartTrace)
    await runner.runFlag()
    setRunning(false)
  }

  const runTap = async () => {
    if (!startDone || running) return
    setRunning(true)
    setTapTrace([])
    setSprite(startState(character))
    setSaying(null)
    const runner = makeRunner(setTapTrace)
    runner.resetAll()
    await runner.runTap(C4_P2_CHARACTER_ID)
    setRunning(false)
  }

  useEffect(() => () => setRunning(false), [])

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P2_PART_ID, {
      schema_version: 1,
      selections: {
        story_screens: screensRead,
        start_trace: startTrace,
        tap_trace: tapTrace,
        event_comparison: ['start-has-premature-hop', 'tap-only-turns-after-invitation'],
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P2_NEXT_PART_ID } })
    },
  })

  const stageTransform = useMemo(
    () => `translate(${(sprite.gx - 7) * 8}px, ${(sprite.gy - 8) * 8}px) rotate(${sprite.rot}deg)`,
    [sprite],
  )

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">庭院里的名字牌正在挂好…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p2-locked">
        <p className="font-bold text-ink">先在山门前讲清来路，才能看见名字牌。</p>
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
        <p className="text-[16px] leading-8 text-ink">{C4_P2_STORY_SCREENS[screen]}</p>
        <p className="text-[13px] leading-6 text-ink-soft">{C4_P2_CLASSIC_CARD}</p>
        <p className="rounded-xl bg-wash-sky p-3 text-[14px] leading-6 text-ink">{C4_P2_STORY_BRIDGE}</p>
        <div className="flex gap-2">
          {screen === 1 && <button className="btn-pill-ghost" type="button" onClick={() => setScreen(0)}>读上一段</button>}
          {screen === 0 && (
            <button
              className="btn-pill-primary"
              data-testid="jtw-c4p2-story-next"
              type="button"
              onClick={() => {
                setScreen(1)
                setScreensRead((current) => current.includes(C4_P2_SCREEN_IDS[1])
                  ? current
                  : [...current, C4_P2_SCREEN_IDS[1]])
              }}
            >
              读第二种开始
            </button>
          )}
          <span data-testid="jtw-c4p2-story-count">{screensRead.length} / 2</span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-ink">如果不点悟空，他会自己展示吗？先预测，再运行。</h2>
        {C4_P2_PREDICTION_OPTIONS.map((option) => (
          <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
        ))}
      </section>

      <section className="space-y-4 rounded-2xl border border-hairline bg-wash-mint p-5" data-testid="jtw-c4p2-observation">
        <div
          className="relative flex min-h-44 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-wash-sky to-wash-mint"
          data-testid="jtw-c4p2-stage"
          data-start-ran={startDone}
          data-tap-ran={tapDone}
        >
          <div className="absolute top-4 rounded-lg bg-amber-100 px-4 py-2 font-black text-amber-900" data-testid="jtw-c4p2-name-board">
            孙悟空
          </div>
          <button
            type="button"
            aria-label="Tap 孙悟空"
            data-testid="jtw-c4p2-tap-wukong"
            disabled={!startDone || running}
            onClick={() => void runTap()}
            className="mt-12 text-6xl transition-transform"
            style={{ transform: stageTransform }}
          >
            🐵
          </button>
          {saying && <span className="absolute bottom-3 rounded-xl bg-canvas-pure px-3 py-2 text-[13px] font-bold">{saying}</span>}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-bold text-ink">🚩 Start 链（含故意放错的 Hop）</p>
          <Track scriptId={START_SCRIPT_ID} trace={startTrace} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-bold text-ink">👆 On Tap 链（只读示范）</p>
          <Track scriptId={TAP_SCRIPT_ID} trace={tapTrace} />
        </div>

        <button
          className="btn-pill-primary w-full"
          data-testid="jtw-c4p2-run-start"
          type="button"
          disabled={!storyDone || !predictionDone || running}
          onClick={() => void runStart()}
        >
          {running ? '真实运行中…' : startDone ? '重置并再跑 Go' : '只按 Go，不 Tap'}
        </button>
        {!startDone && <p className="text-[13px] text-ink-soft">Go 跑完前，Tap 入口不会开放。</p>}
      </section>

      {startDone && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TraceCard title="Go 的真实轨迹（抢跑被圈出）" trace={startTrace} testId="jtw-c4p2-start-trace" />
          {tapDone
            ? <TraceCard title="Tap 的真实轨迹" trace={tapTrace} testId="jtw-c4p2-tap-trace" />
            : <p className="rounded-2xl border border-hairline p-3 text-[13px] text-ink-soft">现在重置后点悟空，第二条链才会运行。</p>}
        </div>
      )}

      {resolved && (
        <section className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c4p2-resolved">
          <h2 className="font-black text-ink">{C4_P2_RESOLVED_WORLD_CHANGE}</h2>
          <p className="text-[15px] leading-7 text-ink">{C4_P2_STORY_AFTER}</p>
        </section>
      )}

      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p2-continue"
        type="button"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {completed ? '回到地图' : C4_P2_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">
        这一 Part 只观察真实事件轨迹，不开放编辑器、不创建项目、不移动错误块，也不会完成第四章。
      </p>
    </div>
  )
}
