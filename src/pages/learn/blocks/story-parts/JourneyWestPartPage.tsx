// Journey to the West · C1-P1 "清晨的花果山" — the Read & Why chapter-entry
// Story Part (scene-specs JTW-S1-C1-P1). The child reads the full story
// screens, collects environment + motive evidence, watches the read-only
// system preview run for real, answers the picture-grounded prediction, sees
// the resolved world change and story_after, then continues — which records
// the Part complete server-side and unlocks ONLY jtw-s1-c1-p2 (never the
// chapter). Evidence persists via /story-parts and survives refresh.

import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  C1_P1_CLASSIC_CARD,
  C1_P1_CONTINUE_LABEL,
  C1_P1_ENVIRONMENT_MIN,
  C1_P1_ENVIRONMENT_OPTIONS,
  C1_P1_PREDICTION_OPTIONS,
  C1_P1_PREDICTION_QUESTION,
  C1_P1_PREDICTION_RETRY_HINT,
  C1_P1_REASON_OPTIONS,
  C1_P1_RESOLVED_WORLD_CHANGE,
  C1_P1_SO_OPTIONS,
  C1_P1_STORY_AFTER,
  C1_P1_STORY_BEFORE,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { JourneyWestPartPreview } from './JourneyWestPartPreview';
import { JourneyWestPart2Page } from './JourneyWestPart2Page';
import { JourneyWestPart3Page } from './JourneyWestPart3Page';
import { JourneyWestPart4Page } from './JourneyWestPart4Page';
import { JourneyWestPart5Page } from './JourneyWestPart5Page';
import { JourneyWestPart6Page } from './JourneyWestPart6Page';
import { JourneyWestPart7Page } from './JourneyWestPart7Page';
import { JourneyWestPart8Page } from './JourneyWestPart8Page';
import { JourneyWestC2Part1Page } from './JourneyWestC2Part1Page';
import { JourneyWestC2Part2Page } from './JourneyWestC2Part2Page';
import { JourneyWestC2Part3Page } from './JourneyWestC2Part3Page';
import { JourneyWestC2Part4Page } from './JourneyWestC2Part4Page';
import { JourneyWestC2Part5Page } from './JourneyWestC2Part5Page';
import { JourneyWestC2Part6Page } from './JourneyWestC2Part6Page';
import { JourneyWestC2Part7Page } from './JourneyWestC2Part7Page';
import { JourneyWestC2Part8Page } from './JourneyWestC2Part8Page';
import { JourneyWestC3Part1Page } from './JourneyWestC3Part1Page';
import { JourneyWestC3Part2Page } from './JourneyWestC3Part2Page';
import { JourneyWestC3Part3Page } from './JourneyWestC3Part3Page';
import { JourneyWestC3Part4Page } from './JourneyWestC3Part4Page';
import { JourneyWestC3Part5Page } from './JourneyWestC3Part5Page';
import { JourneyWestC3Part6Page } from './JourneyWestC3Part6Page';
import { JourneyWestC3Part7Page } from './JourneyWestC3Part7Page';
import { JourneyWestC3Part8Page } from './JourneyWestC3Part8Page';
import { JourneyWestC4Part1Page } from './JourneyWestC4Part1Page';
import { JourneyWestC4Part2Page } from './JourneyWestC4Part2Page';
import { JourneyWestC4Part3Page } from './JourneyWestC4Part3Page';
import { JourneyWestC4Part4Page } from './JourneyWestC4Part4Page';
import { JourneyWestC4Part5Page } from './JourneyWestC4Part5Page';
import { JourneyWestC4Part6Page } from './JourneyWestC4Part6Page';
import { JourneyWestC4Part7Page } from './JourneyWestC4Part7Page';
import { JourneyWestC4Part8Page } from './JourneyWestC4Part8Page';
import { JourneyWestC5PartsPage } from './JourneyWestC5PartsPage';
import { JourneyWestC5FinalPartsPage } from './JourneyWestC5FinalPartsPage';
import { JourneyWestC6IntroPartsPage } from './JourneyWestC6IntroPartsPage';
import { Choice, EvidenceGroup } from './partUi';

const PART_ID = 'jtw-s1-c1-p1';
const NEXT_PART_ID = 'jtw-s1-c1-p2';

/** Route dispatcher: parts without a shipped build bounce back to the map. */
export function JourneyWestPartRoute() {
  const { partId } = useParams();
  if (partId === PART_ID) return <JourneyWestPartPage />;
  if (partId === NEXT_PART_ID) return <JourneyWestPart2Page />;
  if (partId === 'jtw-s1-c1-p3') return <JourneyWestPart3Page />;
  if (partId === 'jtw-s1-c1-p4') return <JourneyWestPart4Page />;
  if (partId === 'jtw-s1-c1-p5') return <JourneyWestPart5Page />;
  if (partId === 'jtw-s1-c1-p6') return <JourneyWestPart6Page />;
  if (partId === 'jtw-s1-c1-p7') return <JourneyWestPart7Page />;
  if (partId === 'jtw-s1-c1-p8') return <JourneyWestPart8Page />;
  if (partId === 'jtw-s1-c2-p1') return <JourneyWestC2Part1Page />;
  if (partId === 'jtw-s1-c2-p2') return <JourneyWestC2Part2Page />;
  if (partId === 'jtw-s1-c2-p3') return <JourneyWestC2Part3Page />;
  if (partId === 'jtw-s1-c2-p4') return <JourneyWestC2Part4Page />;
  if (partId === 'jtw-s1-c2-p5') return <JourneyWestC2Part5Page />;
  if (partId === 'jtw-s1-c2-p6') return <JourneyWestC2Part6Page />;
  if (partId === 'jtw-s1-c2-p7') return <JourneyWestC2Part7Page />;
  if (partId === 'jtw-s1-c2-p8') return <JourneyWestC2Part8Page />;
  if (partId === 'jtw-s1-c3-p1') return <JourneyWestC3Part1Page />;
  if (partId === 'jtw-s1-c3-p2') return <JourneyWestC3Part2Page />;
  if (partId === 'jtw-s1-c3-p3') return <JourneyWestC3Part3Page />;
  if (partId === 'jtw-s1-c3-p4') return <JourneyWestC3Part4Page />;
  if (partId === 'jtw-s1-c3-p5') return <JourneyWestC3Part5Page />;
  if (partId === 'jtw-s1-c3-p6') return <JourneyWestC3Part6Page />;
  if (partId === 'jtw-s1-c3-p7') return <JourneyWestC3Part7Page />;
  if (partId === 'jtw-s1-c3-p8') return <JourneyWestC3Part8Page />;
  if (partId === 'jtw-s1-c4-p1') return <JourneyWestC4Part1Page />;
  if (partId === 'jtw-s1-c4-p2') return <JourneyWestC4Part2Page />;
  if (partId === 'jtw-s1-c4-p3') return <JourneyWestC4Part3Page />;
  if (partId === 'jtw-s1-c4-p4') return <JourneyWestC4Part4Page />;
  if (partId === 'jtw-s1-c4-p5') return <JourneyWestC4Part5Page />;
  if (partId === 'jtw-s1-c4-p6') return <JourneyWestC4Part6Page />;
  if (partId === 'jtw-s1-c4-p7') return <JourneyWestC4Part7Page />;
  if (partId === 'jtw-s1-c4-p8') return <JourneyWestC4Part8Page />;
  if (partId === 'jtw-s1-c5-p1') return <JourneyWestC5PartsPage partId="jtw-s1-c5-p1" />;
  if (partId === 'jtw-s1-c5-p2') return <JourneyWestC5PartsPage partId="jtw-s1-c5-p2" />;
  if (partId === 'jtw-s1-c5-p3') return <JourneyWestC5PartsPage partId="jtw-s1-c5-p3" />;
  if (partId === 'jtw-s1-c5-p4') return <JourneyWestC5PartsPage partId="jtw-s1-c5-p4" />;
  if (partId === 'jtw-s1-c5-p5') return <JourneyWestC5PartsPage partId="jtw-s1-c5-p5" />;
  if (partId === 'jtw-s1-c5-p6') return <JourneyWestC5FinalPartsPage partId="jtw-s1-c5-p6" />;
  if (partId === 'jtw-s1-c5-p7') return <JourneyWestC5FinalPartsPage partId="jtw-s1-c5-p7" />;
  if (partId === 'jtw-s1-c5-p8') return <JourneyWestC5FinalPartsPage partId="jtw-s1-c5-p8" />;
  if (partId === 'jtw-s1-c6-p1') return <JourneyWestC6IntroPartsPage partId="jtw-s1-c6-p1" />;
  if (partId === 'jtw-s1-c6-p2') return <JourneyWestC6IntroPartsPage partId="jtw-s1-c6-p2" />;
  return <Navigate to="/learn/story/journey-west" replace />;
}

export function JourneyWestPartPage({
  previewSleep,
}: {
  /** Injectable preview timing for tests. */
  previewSleep?: (ms: number) => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const [environment, setEnvironment] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [soChoice, setSoChoice] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [previewRan, setPreviewRan] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);

  // A refreshed page restores the saved Read/Why evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setEnvironment(evidence.selections?.environment_evidence ?? []);
    setReasons(evidence.selections?.observe_reasons ?? []);
    setSoChoice(evidence.selections?.so_sentence?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setPreviewRan(true);
    setRestored(true);
  }

  const correctReasonIds = useMemo(
    () => C1_P1_REASON_OPTIONS.filter((option) => option.correct).map((option) => option.id),
    [],
  );
  const environmentDone = environment.length >= C1_P1_ENVIRONMENT_MIN;
  const reasonsDone =
    reasons.length === correctReasonIds.length &&
    correctReasonIds.every((id) => reasons.includes(id));
  const soDone = C1_P1_SO_OPTIONS.find((option) => option.id === soChoice)?.correct === true;
  const predictionDone =
    C1_P1_PREDICTION_OPTIONS.find((option) => option.id === prediction)?.correct === true;
  const evidenceDone = environmentDone && reasonsDone && soDone;
  const resolved = evidenceDone && predictionDone && previewRan;
  const completed = Boolean(savedEntry);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          environment_evidence: environment,
          observe_reasons: reasons,
          so_sentence: soChoice ? [soChoice] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">正在打开花果山的清晨…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第一章 石猴出世 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">清晨的花果山</h1>
      </header>

      {/* ── story_before：完整儿童正文，两屏 ─────────────────────────── */}
      <section className="space-y-4" data-testid="jtw-p1-story">
        {C1_P1_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C1_P1_CLASSIC_CARD}
        </aside>
      </section>

      {/* ── 阅读证据：环境 ≥3 项 ───────────────────────────────────── */}
      <EvidenceGroup
        title={`故事里有哪些景物？至少选 ${C1_P1_ENVIRONMENT_MIN} 项`}
        options={C1_P1_ENVIRONMENT_OPTIONS}
        selected={environment}
        onToggle={(id) =>
          setEnvironment((current) =>
            current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
          )
        }
        done={environmentDone}
        testId="jtw-p1-environment"
      />

      {/* ── 动机证据：停下来观察的两条原因 ──────────────────────────── */}
      <EvidenceGroup
        title="群猴为什么停下来观察？选出两条真正的原因"
        options={C1_P1_REASON_OPTIONS}
        selected={reasons}
        onToggle={(id) =>
          setReasons((current) =>
            current.includes(id)
              ? current.filter((v) => v !== id)
              : current.length < 2
                ? [...current, id]
                : current,
          )
        }
        done={reasonsDone}
        testId="jtw-p1-reasons"
      />

      {/* ── 因为…所以… 句子 ─────────────────────────────────────────── */}
      <section data-testid="jtw-p1-so">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          把句子说完整：“因为石缝发光、石头有声音，所以群猴——”
        </h2>
        <div className="flex flex-wrap gap-2">
          {C1_P1_SO_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={soChoice === option.id}
              onPick={() => setSoChoice(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 只读系统预览 + 预测 ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[15px] font-bold text-ink">听一听这个清晨（只读预览）</h2>
        <JourneyWestPartPreview
          resolved={resolved || completed}
          onRunDone={() => setPreviewRan(true)}
          sleep={previewSleep}
        />
        {previewRan && (
          <div data-testid="jtw-p1-prediction">
            <h3 className="mb-2 text-[15px] font-bold text-ink">{C1_P1_PREDICTION_QUESTION}</h3>
            <div className="flex flex-col gap-2">
              {C1_P1_PREDICTION_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={prediction === option.id}
                  onPick={() => {
                    setPrediction(option.id);
                    setPredictionMissed(!option.correct);
                  }}
                />
              ))}
            </div>
            {predictionMissed && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                {C1_P1_PREDICTION_RETRY_HINT}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── resolved world change + story_after + continue ──────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p1-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C1_P1_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C1_P1_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-p1-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C1_P1_CONTINUE_LABEL}
        </button>
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          没有保存上，请再点一次试试。
        </p>
      )}
    </div>
  );
}
