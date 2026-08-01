import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { BlockChip } from '../BlockChip'
import { BlocksRunner, startState, type SpriteState } from '../interpreter'
import {
  C4_P2_CHARACTER_ID,
  C4_P2_CLASSIC_CARD,
  C4_P2_COMPARISON_OPTIONS,
  C4_P2_EXPECTED_FLAG_TRACE,
  C4_P2_EXPECTED_TAP_TRACE,
  C4_P2_FLAG_SCRIPT_ID,
  C4_P2_NEXT_PART_ID,
  C4_P2_PART_ID,
  C4_P2_PREDICTION_OPTIONS,
  C4_P2_STARTER,
  C4_P2_STORY_BRIDGE,
  C4_P2_STORY_SCREEN_IDS,
  C4_P2_STORY_SCREENS,
  C4_P2_TAP_SCRIPT_ID,
  c4p2ComparisonCorrect,
  c4p2PredictionCorrect,
  c4p2TraceMatches,
} from './journeyWestC4Part2Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { Choice } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'

const character = C4_P2_STARTER.pages[0].characters[0]
const flagScript = character.scripts.find((script) => script.id === C4_P2_FLAG_SCRIPT_ID)!
const tapScript = character.scripts.find((script) => script.id === C4_P2_TAP_SCRIPT_ID)!
const instantSleep = () => Promise.resolve()

function Track({ scriptId, litIndex }: { scriptId: string; litIndex: number | null }) {
  const script = character.scripts.find((candidate) => candidate.id === scriptId)!
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid={`jtw-c4p2-track-${scriptId}`}>
      {script.blocks.map((block, index) => (
        <BlockChip
          key={`${block.op}-${index}`}
          block={block}
          inChain
          isLast={index === script.blocks.length - 1}
          lit={litIndex === index}
        />
      ))}
    </div>
  )
}

export function JourneyWestC4Part2Page({ previewSleep = instantSleep }: { previewSleep?: (ms: number) => Promise<void> }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [screenIndex, setScreenIndex] = useState(0)
  const [screensRead, setScreensRead] = useState<string[]>([C4_P2_STORY_SCREEN_IDS[0]])
  const [prediction, setPrediction] = useState<string | null>(null)
  const [comparison, setComparison] = useState<string | null>(null)
  const [flagTrace, setFlagTrace] = useState<string[]>([])
  const [tapTrace, setTapTrace] = useState<string[]>([])
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character))
  const [saying, setSaying] = useState<string | null>(null)
  const [lit, setLit] = useState<{ scriptId: string; index: number } | null>(null)
  const [running, setRunning] = useState(false)
  const [restored, setRestored] = useState(false)
  const runnerRef = useRef<BlocksRunner | null>(null)

  useEffect(() => () => runnerRef.current?.stopAll(), [])

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P2_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P2_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P2_STORY_SCREEN_IDS])
    setFlagTrace(evidence.selections?.flag_trace ?? [])
    setTapTrace(evidence.selections?.tap_trace ?? [])
    setComparison(evidence.selections?.event_comparison?.[0] ?? null)
    setPrediction(evidence.prediction ?? null)
    setRestored(true)
  }

  const storyRead = C4_P2_STORY_SCREEN_IDS.every((id) => screensRead.includes(id))
  const predictionDone = c4p2PredictionCorrect(prediction)
  const flagRan = c4p2TraceMatches(flagTrace, C4_P2_EXPECTED_FLAG_TRACE)
  const tapRan = c4p2TraceMatches(tapTrace, C4_P2_EXPECTED_TAP_TRACE)
  const comparisonDone = c4p2ComparisonCorrect(comparison)
  const resolved = storyRead && predictionDone && flagRan && tapRan && comparisonDone

  const makeRunner = (traceRef: string[]) =>
    new BlocksRunner(
      C4_P2_STARTER.pages[0],
      {
        onSprite: (id, state) => id === C4_P2_CHARACTER_ID && setSprite(state),
        onSay: (id, text) => id === C4_P2_CHARACTER_ID && setSaying(text),
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_id, scriptId, index) => {
          setLit(index < 0 ? null : { scriptId, index })
          if (index < 0) return
          const script = scriptId === C4_P2_FLAG_SCRIPT_ID ? flagScript : tapScript
          const op = script.blocks[index]?.op
          if (op) traceRef.push(op)
        },
      },
      previewSleep,
    )

  const runFlag = async () => {
    if (running || !storyRead || !predictionDone) return
    setRunning(true)
    setFlagTrace([])
    setTapTrace([])
    setComparison(null)
    setSprite(startState(character))
    const measured: string[] = []
    const runner = makeRunner(measured)
    runnerRef.current = runner
    await runner.runFlag()
    runnerRef.current = null
    setFlagTrace(measured)
    setRunning(false)
  }

  const runTap = async () => {
    if (running || !flagRan) return
    setRunning(true)
    setTapTrace([])
    setSprite(startState(character))
    setSaying(null)
    const measured: string[] = []
    const runner = makeRunner(measured)
    runnerRef.current = runner
    runner.resetAll()
    await runner.runTap(C4_P2_CHARACTER_ID)
    runnerRef.current = null
    setTapTrace(measured)
    setRunning(false)
  }

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P2_PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          flag_trace: flagTrace,
          tap_trace: tapTrace,
          event_comparison: comparison ? [comparison] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P2_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在打开师门里的名字牌…</p>
  if (!unlocked && !savedEntry) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p2-locked">
        <p className="font-bold text-ink">先在山门前讲清来路，才能看见名字牌。</p>
        <Link className="btn-pill-ghost inline-flex" to="/learn/story/journey-west">回故事地图</Link>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid="jtw-part-c4-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第四章 · Part 2</p>
        <h1 className="text-[28px] font-black text-ink">一个名字，两个开始</h1>
      </header>

      <section className="space-y-4" data-testid="jtw-c4p2-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P2_STORY_SCREENS[screenIndex]}</p>
        <button
          type="button"
          className="btn-pill-ghost"
          data-testid="jtw-c4p2-story-next"
          disabled={screenIndex === C4_P2_STORY_SCREENS.length - 1}
          onClick={() => {
            const next = Math.min(screenIndex + 1, C4_P2_STORY_SCREENS.length - 1)
            setScreenIndex(next)
            setScreensRead((current) => Array.from(new Set([...current, C4_P2_STORY_SCREEN_IDS[next]])))
          }}
        >
          读下一张故事卡
        </button>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic Card：</span>{C4_P2_CLASSIC_CARD}
        </aside>
        <p className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-4 text-[14px] text-ink">
          <span className="font-bold">故事—程序桥：</span>{C4_P2_STORY_BRIDGE}
        </p>
      </section>

      <section className="space-y-2" data-testid="jtw-c4p2-prediction">
        <h2 className="text-[17px] font-bold text-ink">预测：只按 Go、不点悟空，会发生什么？</h2>
        <div className="grid gap-2">
          {C4_P2_PREDICTION_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-hairline bg-canvas-pure p-4" data-testid="jtw-c4p2-observation">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-hairline" data-testid="jtw-c4p2-stage" data-name-visible={flagRan}>
          <img className="absolute inset-0 h-full w-full object-cover" src="/story-blocks/journey-to-the-west/backgrounds/s1/c3/page3-resolved-v01.webp" alt="师门山门与石牌" />
          <button
            type="button"
            aria-label="点悟空运行 On Tap"
            disabled={!flagRan || running}
            data-testid="jtw-c4p2-wukong"
            onClick={() => void runTap()}
            className="absolute left-[58%] top-[70%] w-[18%] -translate-x-1/2 -translate-y-full disabled:cursor-not-allowed"
            style={{ transform: `translate(-50%, -100%) rotate(${sprite.rot * 30}deg)` }}
          >
            <img src={character.asset} alt="悟空" className="w-full" />
          </button>
          <span className="absolute left-4 top-4 rounded-xl bg-canvas-pure/90 px-3 py-2 text-[14px] font-black text-ink" data-testid="jtw-c4p2-name-board">
            {flagRan ? '孙悟空' : '空名字牌'}
          </span>
          {saying && <span className="absolute left-1/2 top-[12%] -translate-x-1/2 rounded-xl bg-canvas-pure px-3 py-2 text-[13px] font-bold text-ink">{saying}</span>}
        </div>

        <div>
          <p className="mb-1 text-[13px] font-bold text-ink">🚩 Start 链（里面藏着抢跑的 Hop）</p>
          <Track scriptId={C4_P2_FLAG_SCRIPT_ID} litIndex={lit?.scriptId === C4_P2_FLAG_SCRIPT_ID ? lit.index : null} />
        </div>
        <div>
          <p className="mb-1 text-[13px] font-bold text-ink">👆 On Tap 链（只读示范）</p>
          <Track scriptId={C4_P2_TAP_SCRIPT_ID} litIndex={lit?.scriptId === C4_P2_TAP_SCRIPT_ID ? lit.index : null} />
        </div>

        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-run-go" disabled={!storyRead || !predictionDone || running} onClick={() => void runFlag()}>
          {running ? '正在运行…' : '只按 Go，先不 Tap'}
        </button>
        <p data-testid="jtw-c4p2-flag-trace" className="text-[13px] font-semibold text-ink-soft">Go 轨迹：{flagTrace.join(' → ') || '还没有运行'}</p>
        <p data-testid="jtw-c4p2-tap-trace" className="text-[13px] font-semibold text-ink-soft">Tap 轨迹：{tapTrace.join(' → ') || '运行 Go 后，亲自点悟空'}</p>
        {flagRan && <p className="rounded-xl bg-wash-sunshine p-3 text-[14px] font-semibold text-ink" data-testid="jtw-c4p2-runaway-hop">名字出现了，但 Hop 也在 Go 中抢跑了。先圈出来，不在本 Part 修。</p>}
      </section>

      <section className="space-y-2" data-testid="jtw-c4p2-comparison">
        <h2 className="text-[17px] font-bold text-ink">两次真实运行告诉你什么？</h2>
        <div className="grid gap-2">
          {C4_P2_COMPARISON_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={comparison === option.id} onPick={() => setComparison(option.id)} />
          ))}
        </div>
      </section>

      {resolved && (
        <section className="rounded-2xl border border-brand-mint/50 bg-wash-mint p-5" data-testid="jtw-c4p2-resolved">
          <h2 className="font-black text-ink">两条轨迹卡都出现了</h2>
          <p className="mt-2 text-[14px] leading-7 text-ink">名字牌完整显示。悟空知道“会做什么”和“什么时候做”是两个问题；下一步先用两个入口圈解释。</p>
        </section>
      )}

      <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-continue" disabled={!resolved || complete.isPending} onClick={() => complete.mutate()}>
        试试两个入口
      </button>
    </main>
  )
}
