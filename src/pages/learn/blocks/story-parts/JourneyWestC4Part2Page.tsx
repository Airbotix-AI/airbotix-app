import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { BlockOp } from '../blocksModel'
import { BlocksRunner, startState, type SpriteState } from '../interpreter'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import {
  C4_P2_PREDICTIONS,
  C4_P2_PROJECT,
  C4_P2_STORY,
  c4p2PredictionDone,
  c4p2TraceDone,
} from './journeyWestC4Part2Program'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice } from './partUi'

const PART_ID = 'jtw-s1-c4-p2'
const NEXT_PART_ID = 'jtw-s1-c4-p3'
const CHARACTER_ID = 'sun-wukong'
const page = C4_P2_PROJECT.pages[0]
const character = page.characters[0]

export function JourneyWestC4Part2Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [flagTrace, setFlagTrace] = useState<BlockOp[]>([])
  const [tapTrace, setTapTrace] = useState<BlockOp[]>([])
  const [resetDone, setResetDone] = useState(false)
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character))
  const [running, setRunning] = useState(false)
  const [restored, setRestored] = useState(false)
  const runnerRef = useRef<BlocksRunner | null>(null)
  const activeTrace = useRef<'flag' | 'tap' | null>(null)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-screen-2'))
    setPrediction(evidence.prediction ?? null)
    setFlagTrace((evidence.selections?.flag_trace ?? []) as BlockOp[])
    setTapTrace((evidence.selections?.tap_trace ?? []) as BlockOp[])
    setResetDone((evidence.selections?.teaching_reset ?? []).includes('between-events'))
    setRestored(true)
  }

  const makeRunner = () => {
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (id, state) => {
          if (id === CHARACTER_ID) setSprite(state)
        },
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_characterId, scriptId, blockIndex) => {
          if (blockIndex < 0) return
          const script = character.scripts.find((candidate) => candidate.id === scriptId)
          const op = script?.blocks[blockIndex]?.op
          if (!op) return
          if (activeTrace.current === 'flag') setFlagTrace((current) => [...current, op])
          if (activeTrace.current === 'tap') setTapTrace((current) => [...current, op])
        },
      },
      async () => undefined,
    )
    runnerRef.current = runner
    return runner
  }

  const runFlag = async () => {
    if (!storyRead || !c4p2PredictionDone(prediction) || running) return
    setRunning(true)
    setResetDone(false)
    setTapTrace([])
    setFlagTrace(['when_flag'])
    activeTrace.current = 'flag'
    const runner = makeRunner()
    await runner.runFlag()
    activeTrace.current = null
    setRunning(false)
  }

  const reset = () => {
    const runner = runnerRef.current ?? makeRunner()
    runner.resetAll()
    setResetDone(true)
  }

  const runTap = async () => {
    if (!resetDone || running) return
    setRunning(true)
    setTapTrace(['when_tap'])
    activeTrace.current = 'tap'
    const runner = runnerRef.current ?? makeRunner()
    await runner.runTap(CHARACTER_ID)
    activeTrace.current = null
    setRunning(false)
  }

  const flagDone = c4p2TraceDone(flagTrace, 'when_flag')
  const tapDone = c4p2TraceDone(tapTrace, 'when_tap')
  const resolved = storyRead && c4p2PredictionDone(prediction) && flagDone && resetDone && tapDone
  const completed = Boolean(savedEntry)

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-screen-2'] : [],
          flag_trace: flagTrace,
          tap_trace: tapTrace,
          teaching_reset: resetDone ? ['between-events'] : [],
          event_comparison: resolved ? ['flag-name-plus-early-hop', 'tap-turn-only'] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">名字牌正在挂好…</p>
  if (!unlocked && !completed) {
    return <div className="p-10 text-center" data-testid="jtw-c4p2-locked">先在山门前讲清来路。</div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第四章 · Part 2</p>
        <h1 className="text-[28px] font-black text-ink">一个名字，两个开始</h1>
      </header>

      <section className="space-y-3" data-testid="jtw-c4p2-story">
        {C4_P2_STORY.map((paragraph) => <p key={paragraph} className="text-[16px] leading-8 text-ink">{paragraph}</p>)}
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-read" onClick={() => setStoryRead(true)}>
          {storyRead ? '故事卡B、C已共读 ✓' : '共读故事卡B、C'}
        </button>
      </section>

      <section data-testid="jtw-c4p2-prediction">
        <h2 className="mb-2 font-bold text-ink">如果只按Go、不Tap，应该发生什么？</h2>
        <div className="flex flex-col gap-2">
          {C4_P2_PREDICTIONS.map((option) => <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />)}
        </div>
      </section>

      <section className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-hairline bg-wash-sky" data-testid="jtw-c4p2-stage">
        <div className="absolute right-[10%] top-[12%] rounded-xl bg-canvas-pure px-4 py-2 font-black text-ink">孙悟空</div>
        <img
          src={character.asset}
          alt="孙悟空站在名字牌旁等待两个不同的开始"
          data-testid="jtw-c4p2-wukong"
          className="absolute w-[18%]"
          style={{ left: `${sprite.gx * 5}%`, top: `${sprite.gy * 5}%`, transform: `rotate(${sprite.rot}deg)` }}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-hairline p-4">
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-go" disabled={!storyRead || !c4p2PredictionDone(prediction) || running} onClick={() => void runFlag()}>🚩 Go（先不Tap）</button>
        <p data-testid="jtw-c4p2-flag-trace" data-trace={flagTrace.join(',')}>小旗轨迹：{flagTrace.join(' → ') || '尚未运行'}</p>
        {flagDone && <p className="font-bold text-brand-coral" data-testid="jtw-c4p2-early-hop">Hop在Go里抢跑了；Tap轨迹仍是空的。</p>}
        <button type="button" className="btn-pill-secondary" data-testid="jtw-c4p2-reset" disabled={!flagDone || running} onClick={reset}>⤺ 教学重置</button>
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-tap" disabled={!resetDone || running} onClick={() => void runTap()}>👆 Tap孙悟空</button>
        <p data-testid="jtw-c4p2-tap-trace" data-trace={tapTrace.join(',')}>指尖轨迹：{tapTrace.join(' → ') || '尚未触发'}</p>
      </section>

      {(resolved || completed) && <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p2-resolved"><p>名字牌完整显示，两条轨迹卡出现；抢跑动作被圈出但还没有移动。</p><p className="mt-2 font-semibold">悟空知道“会做什么”和“什么时候做”是两个问题；下一步先用离屏入口圈解释。</p></section>}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link>
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-continue" disabled={(!resolved && !completed) || complete.isPending} onClick={() => void complete.mutate()}>试试两个入口</button>
      </footer>
    </div>
  )
}
