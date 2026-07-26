// Journey to the West · C2-P1 "水声把大家带到哪里" — chapter two's Read & Why
// entry (scene-specs JTW-S1-C2-P1). The C1 clear-spring viewpoint joins the
// SAME waterfall before-background: the stone monkey and the troop wait at the
// left, the entrance is NOT highlighted and the cave mouth stays hidden. The
// child reads 故事卡A in full, states the monkey's motive, collects the three
// environment clues (水声变大/石头变湿/水雾变浓 — 看见洞口 is rejected),
// completes the 因为/所以 sentence, watches the read-only chime preview run
// through the REAL BlocksRunner (three visible water ripples make the sound
// readable in mute), and answers the do-we-know-yet prediction from the
// picture. No blocks are edited and no project is written in this part.
// Continue persists the evidence server-side and unlocks ONLY jtw-s1-c2-p2;
// kids who have not finished C1-P8 get the locked screen (server truth).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BlockChip } from '../BlockChip';
import { BlocksRunner, pageById } from '../interpreter';
import { sfx } from '../sounds';
import {
  C2_P1_CLASSIC_CARD,
  C2_P1_CLUE_LIGHT_SEQUENCE,
  C2_P1_CLUE_OPTIONS,
  C2_P1_CLUE_REJECT_HINT,
  C2_P1_CONTINUE_LABEL,
  C2_P1_MOTIVE_OPTIONS,
  C2_P1_PREDICTION_OPTIONS,
  C2_P1_PREDICTION_QUESTION,
  C2_P1_PREDICTION_RETRY_HINT,
  C2_P1_PREVIEW_PROJECT,
  C2_P1_RESOLVED_WORLD_CHANGE,
  C2_P1_SO_OPTIONS,
  C2_P1_STORY_AFTER,
  C2_P1_STORY_BEFORE,
  C2_P1_STORY_BRIDGE,
  JTW_C1_BACKGROUND_ASSET,
  JTW_S1_STORY_LINE_ID,
  JTW_STONE_MONKEY_ASSET,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, EvidenceGroup } from './partUi';

const PART_ID = 'jtw-s1-c2-p1';
const NEXT_PART_ID = 'jtw-s1-c2-p2';

type PreviewRunState = 'idle' | 'running' | 'done';

/** The waterfall Before stage + the read-only chime preview (REAL runner). */
function WaterSoundPreview({
  resolved,
  onRunDone,
  sleep,
}: {
  /** Evidence + prediction complete — light the clues from near to far. */
  resolved: boolean;
  onRunDone?: () => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const page = useMemo(() => pageById(C2_P1_PREVIEW_PROJECT, 'jtw-s1-c2-p1-page'), []);
  const blocks = page.characters[0].scripts[0].blocks;
  const [runState, setRunState] = useState<PreviewRunState>('idle');
  const [litIndex, setLitIndex] = useState(-1);
  // The sound stays READABLE in mute: three water-ripple rings appear with
  // every chime and remain once the run has happened.
  const [ripples, setRipples] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (runState === 'running') return;
    setRunState('running');
    const runner = new BlocksRunner(
      page,
      {
        onSprite: () => undefined,
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: (soundId) => {
          sfx.playSound(soundId);
          setRipples(true);
        },
        onGotoPage: () => undefined,
        onStep: (_charId, _scriptId, blockIndex) => setLitIndex(blockIndex),
      },
      sleep,
    );
    runnerRef.current = runner;
    await runner.runFlag();
    setLitIndex(-1);
    setRunState('done');
    onRunDone?.();
  }, [page, runState, sleep, onRunDone]);

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c2p1-stage"
      >
        <img
          src={JTW_C1_BACKGROUND_ASSET}
          alt="瀑布前：石猴和三只群猴停在湿石左侧，白色水帘合着，入口没有亮起，洞口藏在水帘后面"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* 石猴与群猴停在左侧 — the monkey stays visible; no show/hide runs here. */}
        <img
          src={JTW_STONE_MONKEY_ASSET}
          alt=""
          aria-hidden
          data-testid="jtw-c2p1-stone-monkey"
          data-visible="true"
          className="absolute bottom-[8%] left-[8%] w-[14%]"
        />
        {/* 洞口初始隐藏、入口未高亮 — nothing behind the curtain is rendered. */}
        <span data-testid="jtw-c2p1-cave-mouth" data-visible="false" hidden aria-hidden />
        {/* 三圈水纹 — the chime made visible; still readable with sound muted. */}
        {(ripples || resolved) && (
          <span
            data-testid="jtw-c2p1-water-ripples"
            aria-hidden
            className="absolute right-[30%] top-[22%] block h-14 w-14"
          >
            <span className="absolute inset-0 rounded-full border-2 border-sky-200/90 motion-safe:animate-ping" />
            <span className="absolute inset-2 rounded-full border-2 border-sky-200/80" />
            <span className="absolute inset-4 rounded-full border-2 border-sky-200/70" />
          </span>
        )}
        {/* resolved_world_change：三类线索从近到远点亮，视线停在关闭的水帘。 */}
        {resolved && (
          <>
            <div
              className="absolute bottom-[4%] left-[6%] flex gap-2"
              data-testid="jtw-c2p1-clue-lights"
            >
              {C2_P1_CLUE_LIGHT_SEQUENCE.map((clue, index) => (
                <span
                  key={clue.id}
                  data-clue={clue.id}
                  data-lit="true"
                  className="rounded-full border border-brand-sunshine/70 bg-wash-sunshine px-3 py-1 text-[12px] font-bold text-ink motion-safe:animate-pulse"
                  style={{ animationDelay: `${index * 400}ms` }}
                >
                  {clue.label}
                </span>
              ))}
            </div>
            <span
              data-testid="jtw-c2p1-curtain-gaze"
              aria-hidden
              className="absolute right-[24%] top-[12%] h-1/3 w-[16%] rounded-full border-2 border-sky-100/80 blur-[1px]"
            />
          </>
        )}
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-soft">
          系统预览轨道（只读）——这不是你的程序，听听山谷里是什么在响：
        </p>
        <div className="flex flex-wrap items-center gap-1" data-testid="jtw-c2p1-preview-chain">
          {blocks.map((block, index) => (
            <BlockChip
              key={`${block.op}-${index}`}
              block={block}
              inChain
              isLast={index === blocks.length - 1}
              lit={index === litIndex}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn-pill-primary"
        disabled={runState === 'running'}
        onClick={() => void run()}
        data-testid="jtw-c2p1-run"
      >
        {runState === 'running' ? '播放中…' : runState === 'done' ? '再听一次' : '▶ 听一听'}
      </button>
    </div>
  );
}

export function JourneyWestC2Part1Page({
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

  const [motive, setMotive] = useState<string | null>(null);
  const [clues, setClues] = useState<string[]>([]);
  const [soChoice, setSoChoice] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [previewRan, setPreviewRan] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved Read/Why evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setClues(evidence.selections?.clue_evidence ?? []);
    setSoChoice(evidence.selections?.so_sentence?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setPreviewRan(true);
    setRestored(true);
  }

  const correctClueIds = useMemo(
    () => C2_P1_CLUE_OPTIONS.filter((option) => option.correct).map((option) => option.id),
    [],
  );
  const caveMouthPicked = clues.includes('see-cave-mouth');
  const motiveDone = C2_P1_MOTIVE_OPTIONS.find((o) => o.id === motive)?.correct === true;
  // Exactly the three real clues — 看见洞口 must be excluded.
  const cluesDone =
    !caveMouthPicked &&
    clues.length === correctClueIds.length &&
    correctClueIds.every((id) => clues.includes(id));
  const soDone = C2_P1_SO_OPTIONS.find((o) => o.id === soChoice)?.correct === true;
  const predictionDone =
    C2_P1_PREDICTION_OPTIONS.find((o) => o.id === prediction)?.correct === true;
  const completed = Boolean(savedEntry);
  const resolved = motiveDone && cluesDone && soDone && previewRan && predictionDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          clue_evidence: clues,
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
    return <p className="p-8 text-center text-ink-soft">水声在前面等着大家…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p1-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          先在第一章 Part 8 讲回石猴的出世故事，再跟着水声来到瀑布前。
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二章 水帘洞的约定 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">水声把大家带到哪里</h1>
      </header>

      {/* ── story_before：故事卡A 全文，两屏 + 原著卡 + 因果桥 ─────────── */}
      <section className="space-y-4" data-testid="jtw-c2p1-story">
        {C2_P1_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C2_P1_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C2_P1_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── 动机证据 ────────────────────────────────────────────────── */}
      <section data-testid="jtw-c2p1-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">石猴为什么先停下来观察？</h2>
        <div className="flex flex-col gap-2">
          {C2_P1_MOTIVE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={motive === option.id}
              onPick={() => setMotive(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 三条 Read 证据（“看见洞口”被排除） ───────────────────────── */}
      <EvidenceGroup
        title="路上有哪三条线索告诉大家瀑布近了？"
        options={C2_P1_CLUE_OPTIONS}
        selected={clues}
        onToggle={(id) =>
          setClues((current) =>
            current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
          )
        }
        done={cluesDone}
        testId="jtw-c2p1-clues"
      />
      {caveMouthPicked && (
        <p className="text-[13px] font-semibold text-brand-coral" role="status">
          {C2_P1_CLUE_REJECT_HINT}
        </p>
      )}

      {/* ── 因为…所以… 句子 ─────────────────────────────────────────── */}
      <section data-testid="jtw-c2p1-so">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          把句子说完整：“因为水声、湿石和水雾都指向前面的瀑布，所以石猴先——”
        </h2>
        <div className="flex flex-wrap gap-2">
          {C2_P1_SO_OPTIONS.map((option) => (
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
        <h2 className="text-[15px] font-bold text-ink">听一听山谷里的声音（只读预览）</h2>
        <WaterSoundPreview
          resolved={resolved || completed}
          onRunDone={() => setPreviewRan(true)}
          sleep={previewSleep}
        />
        {previewRan && (
          <div data-testid="jtw-c2p1-prediction">
            <h3 className="mb-2 text-[15px] font-bold text-ink">{C2_P1_PREDICTION_QUESTION}</h3>
            <div className="flex flex-col gap-2">
              {C2_P1_PREDICTION_OPTIONS.map((option) => (
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
                {C2_P1_PREDICTION_RETRY_HINT}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── resolved world change + story_after + continue ──────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p1-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C2_P1_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P1_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p1-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C2_P1_CONTINUE_LABEL}
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
