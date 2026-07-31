import { useEffect, useMemo, useRef, useState } from 'react';

import { BlockChip } from '../BlockChip';
import { BlocksRunner, pageById, type SpriteState } from '../interpreter';
import {
  C4_P2_BACKGROUND,
  C4_P2_PROJECT,
  C4_P2_START_TRACE,
  C4_P2_TAP_TRACE,
  c4p2TraceMatches,
} from './journeyWestC4Part2Program';

export interface C4Part2ObservationEvidence {
  startTrace: string[];
  tapTrace: string[];
  resetDone: boolean;
}

export function JourneyWestC4Part2Observation({
  enabled,
  restored,
  onEvidence,
  sleep,
}: {
  enabled: boolean;
  restored?: C4Part2ObservationEvidence;
  onEvidence: (evidence: C4Part2ObservationEvidence) => void;
  sleep?: (ms: number) => Promise<void>;
}) {
  const page = useMemo(() => pageById(C4_P2_PROJECT, 'jtw-s1-c4-p2-page'), []);
  const character = page.characters[0];
  const [startTrace, setStartTrace] = useState<string[]>(restored?.startTrace ?? []);
  const [tapTrace, setTapTrace] = useState<string[]>(restored?.tapTrace ?? []);
  const [resetDone, setResetDone] = useState(restored?.resetDone ?? false);
  const [running, setRunning] = useState(false);
  const [spriteState, setSpriteState] = useState<SpriteState>();
  const [speech, setSpeech] = useState<string | null>(null);
  const [lit, setLit] = useState<{ scriptId: string; blockIndex: number } | null>(null);
  const runnerRef = useRef<BlocksRunner | null>(null);
  const startTraceRef = useRef<string[]>(restored?.startTrace ?? []);
  const tapTraceRef = useRef<string[]>(restored?.tapTrace ?? []);

  useEffect(() => () => runnerRef.current?.stopAll(), []);
  useEffect(() => {
    if (!restored) return;
    startTraceRef.current = restored.startTrace;
    tapTraceRef.current = restored.tapTrace;
    setStartTrace(restored.startTrace);
    setTapTrace(restored.tapTrace);
    setResetDone(restored.resetDone);
  }, [restored]);
  useEffect(() => {
    onEvidence({ startTrace, tapTrace, resetDone });
  }, [onEvidence, resetDone, startTrace, tapTrace]);

  const makeRunner = () => {
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_id, state) => setSpriteState(state),
        onSay: (_id, text) => setSpeech(text),
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_id, scriptId, blockIndex) => {
          setLit(blockIndex >= 0 ? { scriptId, blockIndex } : null);
          if (blockIndex < 0) return;
          const op = character.scripts
            .find((script) => script.id === scriptId)
            ?.blocks[blockIndex]?.op;
          if (!op) return;
          if (scriptId === 'wrong-start') {
            startTraceRef.current = [...startTraceRef.current, op];
            setStartTrace(startTraceRef.current);
          } else {
            tapTraceRef.current = [...tapTraceRef.current, op];
            setTapTrace(tapTraceRef.current);
          }
        },
      },
      sleep,
    );
    runnerRef.current = runner;
    return runner;
  };

  const runStart = async () => {
    if (!enabled || running) return;
    setRunning(true);
    startTraceRef.current = ['when_flag'];
    tapTraceRef.current = [];
    setStartTrace(startTraceRef.current);
    setTapTrace(tapTraceRef.current);
    setResetDone(false);
    setSpeech(null);
    const runner = makeRunner();
    await runner.runFlag();
    onEvidence({
      startTrace: startTraceRef.current,
      tapTrace: tapTraceRef.current,
      resetDone: false,
    });
    setLit(null);
    setRunning(false);
  };

  const reset = () => {
    runnerRef.current?.resetAll();
    setSpeech(null);
    setResetDone(true);
    onEvidence({
      startTrace: startTraceRef.current,
      tapTrace: tapTraceRef.current,
      resetDone: true,
    });
  };

  const runTap = async () => {
    if (!resetDone || running) return;
    setRunning(true);
    tapTraceRef.current = ['when_tap'];
    setTapTrace(tapTraceRef.current);
    const runner = runnerRef.current ?? makeRunner();
    await runner.runTap(character.id);
    onEvidence({
      startTrace: startTraceRef.current,
      tapTrace: tapTraceRef.current,
      resetDone: true,
    });
    setLit(null);
    setRunning(false);
  };

  const startDone = c4p2TraceMatches(startTrace, C4_P2_START_TRACE);
  const tapDone = c4p2TraceMatches(tapTrace, C4_P2_TAP_TRACE);
  const visible = spriteState?.visible ?? startDone;

  return (
    <section className="space-y-4" data-testid="jtw-c4p2-observation">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-hairline">
        <img
          src={C4_P2_BACKGROUND}
          alt="安静师门里的名字牌"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {visible && (
          <button
            type="button"
            data-testid="jtw-c4p2-tap-wukong"
            className="absolute bottom-[8%] left-[26%] w-[18%]"
            onClick={() => void runTap()}
            disabled={!resetDone || running}
            aria-label="点一下孙悟空"
          >
            <img src={character.asset} alt="孙悟空等待观众邀请" className="w-full" />
          </button>
        )}
        {startDone && (
          <span
            className="absolute right-[12%] top-[18%] rounded-lg border-2 border-amber-800 bg-amber-100 px-4 py-2 font-bold text-amber-950"
            data-testid="jtw-c4p2-name-board"
          >
            孙悟空
          </span>
        )}
        {speech && (
          <span className="absolute bottom-[38%] left-[34%] rounded-xl bg-white px-3 py-2 text-[13px] font-bold text-ink">
            {speech}
          </span>
        )}
      </div>

      {character.scripts.map((script) => (
        <div key={script.id} data-testid={`jtw-c4p2-chain-${script.id}`}>
          <p className="mb-2 text-[13px] font-bold text-ink">
            {script.id === 'wrong-start' ? '🚩 Start链（有抢跑）' : '👆 Tap链（只读示范）'}
          </p>
          <div className="flex flex-wrap gap-1">
            {script.blocks.map((block, index) => (
              <BlockChip
                key={`${script.id}-${block.op}-${index}`}
                block={block}
                inChain
                isLast={index === script.blocks.length - 1}
                lit={lit?.scriptId === script.id && lit.blockIndex === index}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p2-run-go"
          disabled={!enabled || running}
          onClick={() => void runStart()}
        >
          {running ? '运行中…' : '▶ Go：先看谁抢跑'}
        </button>
        <button
          type="button"
          className="btn-pill-secondary"
          data-testid="jtw-c4p2-reset"
          disabled={!startDone || running}
          onClick={reset}
        >
          ⤺ 教学重置
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <p data-testid="jtw-c4p2-start-trace" className="rounded-xl bg-wash-sunshine p-3 text-[13px]">
          Start轨迹：{startTrace.join(' → ') || '还没运行'}
        </p>
        <p data-testid="jtw-c4p2-tap-trace" className="rounded-xl bg-wash-sky p-3 text-[13px]">
          Tap轨迹：{tapTrace.join(' → ') || 'Go中没有Tap轨迹'}
        </p>
      </div>
      {startDone && !resetDone && (
        <p className="text-[13px] font-semibold text-brand-coral">
          Hop在Go里抢跑了。先重置，再真正点悟空。
        </p>
      )}
      {tapDone && (
        <p className="text-[13px] font-semibold text-brand-mint">
          真实Tap只启动了指尖链，没有重跑名字链。
        </p>
      )}
    </section>
  );
}
