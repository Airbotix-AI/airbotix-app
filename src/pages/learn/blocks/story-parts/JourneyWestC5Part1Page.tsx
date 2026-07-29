import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  C5_P1_CLASSIC_CARD,
  C5_P1_CONTINUE_LABEL,
  C5_P1_MOTIVE_OPTIONS,
  C5_P1_NEXT_PART_ID,
  C5_P1_PART_ID,
  C5_P1_PREDICTION_OPTIONS,
  C5_P1_PREDICTION_QUESTION,
  C5_P1_RESOLVED_WORLD_CHANGE,
  C5_P1_STORY,
  C5_P1_STORY_AFTER,
  C5_P1_STORY_CARDS,
  c5p1MotiveDone,
  c5p1OrderDone,
  c5p1PredictionDone,
} from './journeyWestC5Part1Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice, EvidenceGroup, OrderCards } from './partUi'

export function JourneyWestC5Part1Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [storyRead, setStoryRead] = useState(false)
  const [cardOrder, setCardOrder] = useState<string[]>([])
  const [motives, setMotives] = useState<string[]>([])
  const [prediction, setPrediction] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C5_P1_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C5_P1_PART_ID) ?? false
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence
    setStoryRead(evidence.selections?.story_screens?.includes('story-card-a') ?? false)
    setCardOrder(evidence.selections?.story_card_order ?? [])
    setMotives(evidence.selections?.motive_evidence ?? [])
    setPrediction(evidence.prediction ?? null)
    setRestored(true)
  }

  const orderDone = c5p1OrderDone(cardOrder)
  const motiveDone = c5p1MotiveDone(motives)
  const predictionDone = c5p1PredictionDone(prediction)
  const resolved = storyRead && orderDone && motiveDone && predictionDone
  const completed = Boolean(savedEntry)

  const complete = useMutation({
    mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, C5_P1_PART_ID, {
      schema_version: 1,
      selections: {
        story_screens: ['story-card-a'],
        story_card_order: cardOrder,
        motive_evidence: motives,
      },
      prediction: prediction ?? undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      navigate('/learn/story/journey-west', { state: { unlocked: C5_P1_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">花果山的海风正带来一条新线索…</p>
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c5p1-locked">
        <p className="font-bold text-ink">先讲完整悟空得名与学艺的故事，海底柱影才会出现。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c5-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第五章 如意金箍棒，大小随心 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">海底柱影为什么出现</h1>
      </header>

      <section className="space-y-4 rounded-2xl border border-hairline bg-canvas-pure p-5" data-testid="jtw-c5p1-story">
        <p className="text-[16px] leading-8 text-ink">{C5_P1_STORY}</p>
        <p className="text-[13px] leading-6 text-ink-soft">{C5_P1_CLASSIC_CARD}</p>
        <button
          className="btn-pill-primary"
          data-testid="jtw-c5p1-story-read"
          type="button"
          disabled={storyRead}
          onClick={() => setStoryRead(true)}
        >
          {storyRead ? '故事已读完' : '我读完了，找线索'}
        </button>
      </section>

      <section
        className="rounded-2xl border border-hairline bg-gradient-to-b from-wash-sunshine via-wash-sky to-canvas-pure p-5"
        data-testid="jtw-c5p1-stage"
        data-world-state={resolved ? 'route-lit' : 'shadow-clue'}
      >
        <div className="text-center text-4xl" aria-label={resolved ? '水纹路线通往仍被巨大阴影遮住的柱厅' : '花果山洞外只有模糊金光，悟空没有持棒'}>
          {resolved ? '🐵〰️🌊🏛️' : '🐵　✨'}
        </div>
        <p className="mt-3 text-center text-[13px] text-ink-soft">
          {resolved ? '旧工具已留在安全处；柱厅仍只有一道巨大影子。' : '现在没有金箍棒，只有一道需要读懂的线索。'}
        </p>
      </section>

      <OrderCards
        title="把故事发生的先后顺序排好"
        options={C5_P1_STORY_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={orderDone}
        testId="jtw-c5p1-order"
      />

      {!storyRead ? (
        <p className="rounded-xl bg-wash-sunshine p-3 text-[14px] text-ink" data-testid="jtw-c5p1-unread">
          先读完悟空回家和旧工具的故事，再从正文找两条证据。
        </p>
      ) : (
        <EvidenceGroup
          title="选择至少两条“旧工具为什么不合适”的正文证据"
          options={C5_P1_MOTIVE_OPTIONS}
          selected={motives}
          onToggle={(id) => setMotives((current) => current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id])}
          done={motiveDone}
          testId="jtw-c5p1-motives"
        />
      )}

      <section className="space-y-3">
        <h2 className="font-bold text-ink">{C5_P1_PREDICTION_QUESTION}</h2>
        {C5_P1_PREDICTION_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={prediction === option.id}
            onPick={() => setPrediction(option.id)}
          />
        ))}
      </section>

      {resolved && (
        <section className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c5p1-resolved">
          <h2 className="font-black text-ink">{C5_P1_RESOLVED_WORLD_CHANGE}</h2>
          <p className="text-[15px] leading-7 text-ink">{C5_P1_STORY_AFTER}</p>
        </section>
      )}

      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c5p1-continue"
        type="button"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {completed ? '回到地图' : C5_P1_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">
        这一 Part 没有搭块任务，只记录 Read / Why 证据并解锁 P2；不会获得金箍棒或完成第五章。
      </p>
    </div>
  )
}
