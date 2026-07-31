import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C4_P2_CONTINUE_LABEL,
  C4_P2_PREDICTION_OPTIONS,
  C4_P2_RESOLVED_WORLD_CHANGE,
  C4_P2_START_TRACE,
  C4_P2_STORY_AFTER,
  C4_P2_STORY_BEFORE,
  C4_P2_STORY_SCREEN_IDS,
  C4_P2_TAP_TRACE,
  c4p2PredictionCorrect,
  c4p2StoryRead,
  c4p2TraceMatches,
} from './journeyWestC4Part2Program';
import {
  JourneyWestC4Part2Observation,
  type C4Part2ObservationEvidence,
} from './JourneyWestC4Part2Observation';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c4-p2';
const NEXT_PART_ID = 'jtw-s1-c4-p3';
const EMPTY_OBSERVATION: C4Part2ObservationEvidence = {
  startTrace: [],
  tapTrace: [],
  resetDone: false,
};

export function JourneyWestC4Part2Page({
  previewSleep,
}: {
  previewSleep?: (ms: number) => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C4_P2_STORY_SCREEN_IDS[0]]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [observation, setObservation] = useState<C4Part2ObservationEvidence>(EMPTY_OBSERVATION);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P2_STORY_SCREEN_IDS]);
    setPrediction(evidence.prediction ?? null);
    setObservation({
      startTrace: evidence.selections?.start_event_trace ?? [],
      tapTrace: evidence.selections?.tap_event_trace ?? [],
      resetDone: evidence.selections?.teaching_reset?.includes('completed') ?? false,
    });
    setRestored(true);
  }

  const storyDone = c4p2StoryRead(screensRead);
  const predictionDone = c4p2PredictionCorrect(prediction);
  const startDone = c4p2TraceMatches(observation.startTrace, C4_P2_START_TRACE);
  const tapDone = c4p2TraceMatches(observation.tapTrace, C4_P2_TAP_TRACE);
  const resolved = storyDone && predictionDone && startDone && observation.resetDone && tapDone;
  const completed = Boolean(savedEntry);
  const handleEvidence = useCallback((value: C4Part2ObservationEvidence) => {
    setObservation(value);
  }, []);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          start_event_trace: observation.startTrace,
          tap_event_trace: observation.tapTrace,
          teaching_reset: observation.resetDone ? ['completed'] : [],
          event_comparison: ['go-ran-start-only', 'tap-ran-tap-only', 'hop-ran-too-early'],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">正在打开两条事件轨道…</p>;
  }
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p2-locked">
        <p className="text-[16px] font-bold text-ink">先在山门前讲清楚来路，再看名字牌。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第四章 你有名字了 · Part 2
        </p>
        <h1 className="text-[28px] font-black text-ink">一个名字，两个开始</h1>
      </header>

      <section className="space-y-4" data-testid="jtw-c4p2-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P2_STORY_BEFORE[screenIndex]}</p>
        <p className="text-[12px] font-bold text-ink-soft">
          {screensRead.length} / {C4_P2_STORY_SCREEN_IDS.length}
        </p>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p2-story-next"
          disabled={screenIndex === C4_P2_STORY_BEFORE.length - 1}
          onClick={() => {
            const next = screenIndex + 1;
            setScreenIndex(next);
            setScreensRead((current) => [
              ...new Set([...current, C4_P2_STORY_SCREEN_IDS[next]]),
            ]);
          }}
        >
          读下一张故事卡
        </button>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">故事—程序桥：</span>
          Start在等场景开始；On Tap在等观众邀请。动作在哪条链上，就决定它什么时候发生。
        </aside>
      </section>

      <section data-testid="jtw-c4p2-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">如果不点悟空，他会自己展示本领吗？</h2>
        <div className="space-y-2">
          {C4_P2_PREDICTION_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => setPrediction(option.id)}
            />
          ))}
        </div>
      </section>

      <JourneyWestC4Part2Observation
        enabled={storyDone && predictionDone}
        restored={restored ? observation : undefined}
        onEvidence={handleEvidence}
        sleep={previewSleep}
      />

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p2-resolved">
          <p className="text-[15px] leading-7 text-ink">{C4_P2_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C4_P2_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p2-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C4_P2_CONTINUE_LABEL}
        </button>
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          事件证据没有保存上，请再试一次。
        </p>
      )}
    </div>
  );
}
