import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { BlockChip } from '../BlockChip';
import { BlocksRunner, startState, type SpriteState } from '../interpreter';
import {
  C4_P2_BACKGROUND,
  C4_P2_CLASSIC_CARD,
  C4_P2_COMPARE_OPTIONS,
  C4_P2_PREDICTION_OPTIONS,
  C4_P2_PROJECT,
  C4_P2_RESOLVED_WORLD_CHANGE,
  C4_P2_SCREEN_IDS,
  C4_P2_STORY_AFTER,
  C4_P2_STORY_SCREENS,
  c4p2ChoiceCorrect,
  c4p2FlagTraceDone,
  c4p2TapTraceDone,
} from './journeyWestC4Part2Program';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c4-p2';
const NEXT_PART_ID = 'jtw-s1-c4-p3';

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
  const page = C4_P2_PROJECT.pages[0];
  const character = page.characters[0];
  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C4_P2_SCREEN_IDS[0]]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [comparison, setComparison] = useState<string | null>(null);
  const [flagTrace, setFlagTrace] = useState<string[]>([]);
  const [tapTrace, setTapTrace] = useState<string[]>([]);
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character));
  const [saying, setSaying] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [restored, setRestored] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);
  const activeEventRef = useRef<'flag' | 'tap' | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C4_P2_SCREEN_IDS]);
    setFlagTrace(evidence.selections?.flag_trace ?? []);
    setTapTrace(evidence.selections?.tap_trace ?? []);
    setComparison(evidence.selections?.event_comparison?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const makeRunner = useCallback(() => {
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_id, state) => setSprite(state),
        onSay: (_id, text) => setSaying(text),
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_characterId, scriptId, blockIndex) => {
          if (blockIndex < 0) return;
          const script = character.scripts.find((candidate) => candidate.id === scriptId);
          const op = script?.blocks[blockIndex]?.op;
          if (!op) return;
          if (activeEventRef.current === 'flag') {
            setFlagTrace((current) => [...current, op]);
          } else if (activeEventRef.current === 'tap') {
            setTapTrace((current) => [...current, op]);
          }
        },
      },
      previewSleep,
    );
    runnerRef.current = runner;
    return runner;
  }, [character.scripts, page, previewSleep]);

  const runFlag = useCallback(async () => {
    if (running || !c4p2ChoiceCorrect(C4_P2_PREDICTION_OPTIONS, prediction)) return;
    runnerRef.current?.stopAll();
    setSprite(startState(character));
    setSaying(null);
    setFlagTrace(['when_flag']);
    setTapTrace([]);
    activeEventRef.current = 'flag';
    setRunning(true);
    try {
      await makeRunner().runFlag();
    } finally {
      activeEventRef.current = null;
      setRunning(false);
    }
  }, [character, makeRunner, prediction, running]);

  const runTap = useCallback(async () => {
    if (running || !c4p2FlagTraceDone(flagTrace)) return;
    runnerRef.current?.stopAll();
    setSprite(startState(character));
    setSaying(null);
    setTapTrace(['when_tap']);
    activeEventRef.current = 'tap';
    const runner = makeRunner();
    runner.resetAll();
    setRunning(true);
    try {
      await runner.runTap(character.id);
    } finally {
      activeEventRef.current = null;
      setRunning(false);
    }
  }, [character, flagTrace, makeRunner, running]);

  const storyDone = C4_P2_SCREEN_IDS.every((id) => screensRead.includes(id));
  const flagDone = c4p2FlagTraceDone(flagTrace);
  const tapDone = c4p2TapTraceDone(tapTrace);
  const comparisonDone = c4p2ChoiceCorrect(C4_P2_COMPARE_OPTIONS, comparison);
  const resolved =
    storyDone &&
    c4p2ChoiceCorrect(C4_P2_PREDICTION_OPTIONS, prediction) &&
    flagDone &&
    tapDone &&
    comparisonDone;
  const completed = Boolean(savedEntry);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          flag_trace: flagTrace,
          tap_trace: tapTrace,
          event_comparison: comparison ? [comparison] : [],
          observed_bug: ['hop-ran-on-flag'],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  const tracks = useMemo(() => character.scripts, [character.scripts]);

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">正在走进师门庭院…</p>;
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-c4p2-locked">
        <p className="font-bold text-ink">先在山门前讲清楚来意，再看两个入口。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">回到故事地图</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">西游记 · 第四章 你有名字了 · Part 2</p>
        <h1 className="text-[28px] font-black text-ink">一个名字，两个开始</h1>
      </header>

      <section className="space-y-4" data-testid="jtw-c4p2-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P2_STORY_SCREENS[screenIndex]}</p>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p2-story-next"
          disabled={screenIndex === C4_P2_STORY_SCREENS.length - 1}
          onClick={() => {
            const next = screenIndex + 1;
            setScreenIndex(next);
            setScreensRead((current) => [...new Set([...current, C4_P2_SCREEN_IDS[next]])]);
          }}
        >
          读下一张故事卡
        </button>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic Card：</span>{C4_P2_CLASSIC_CARD}
        </aside>
      </section>

      <section data-testid="jtw-c4p2-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">不点悟空，只按 Go，应该发生什么？</h2>
        <div className="space-y-2">
          {C4_P2_PREDICTION_OPTIONS.map((option) => (
            <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-4" data-testid="jtw-c4p2-runner">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-hairline">
          <img src={C4_P2_BACKGROUND} alt="师门庭院和写着孙悟空的名字牌" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute right-[10%] top-[16%] rounded-lg border-2 border-amber-800 bg-amber-100 px-4 py-2 font-bold text-amber-950" data-testid="jtw-c4p2-name-board">孙悟空</span>
          {saying && <span className="absolute left-[27%] top-[25%] rounded-xl bg-white px-3 py-2 font-bold text-ink shadow" data-testid="jtw-c4p2-speech">{saying}</span>}
          <button
            type="button"
            aria-label="点悟空运行指尖入口"
            data-testid="jtw-c4p2-sprite"
            className="absolute bottom-[8%] left-[22%] w-[18%]"
            style={{ transform: `rotate(${sprite.rot}deg)` }}
            disabled={!flagDone || running}
            onClick={() => void runTap()}
          >
            <img src={character.asset} alt="孙悟空站在师门庭院等待指尖入口" className="w-full" />
          </button>
        </div>
        {tracks.map((track) => (
          <div key={track.id} data-testid={`jtw-c4p2-track-${track.id}`} className="flex flex-wrap gap-1">
            {track.blocks.map((block, index) => <BlockChip key={`${block.op}-${index}`} block={block} inChain isLast={index === track.blocks.length - 1} />)}
          </div>
        ))}
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-go" disabled={running || !storyDone || !c4p2ChoiceCorrect(C4_P2_PREDICTION_OPTIONS, prediction)} onClick={() => void runFlag()}>
          {running ? '运行中…' : '▶ Go（先不要点悟空）'}
        </button>
      </section>

      {flagDone && (
        <section className="rounded-2xl border border-brand-coral/40 bg-wash-sunshine p-4" data-testid="jtw-c4p2-flag-trace">
          <p className="font-bold text-ink">Go 真实轨迹：{flagTrace.join(' → ')}</p>
          <p className="text-[14px] text-ink">没有 Tap 轨迹；Hop 却在小旗链里抢跑了。</p>
        </section>
      )}
      {tapDone && <p className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-4 font-bold text-ink" data-testid="jtw-c4p2-tap-trace">Tap 真实轨迹：{tapTrace.join(' → ')}</p>}

      <section data-testid="jtw-c4p2-compare">
        <h2 className="mb-2 text-[15px] font-bold text-ink">两次真实运行说明了什么？</h2>
        <div className="space-y-2">
          {C4_P2_COMPARE_OPTIONS.map((option) => <Choice key={option.id} option={option} active={comparison === option.id} onPick={() => setComparison(option.id)} />)}
        </div>
      </section>

      {(resolved || completed) && (
        <section className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5" data-testid="jtw-c4p2-resolved">
          <p className="text-[15px] leading-7 text-ink">{C4_P2_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 font-semibold text-ink">{C4_P2_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">← 回到故事地图</Link>
        <button type="button" className="btn-pill-primary" data-testid="jtw-c4p2-continue" disabled={(!resolved && !completed) || complete.isPending} onClick={() => void complete.mutate()}>
          {complete.isPending ? '保存中…' : '试试两个入口'}
        </button>
      </footer>
    </div>
  );
}
