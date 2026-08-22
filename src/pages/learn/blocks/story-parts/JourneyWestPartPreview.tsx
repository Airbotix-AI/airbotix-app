// C1-P1 read-only system preview: the exact chain
// when_flag → hide → play_sound(Chime) → wait(2) → end running through the REAL
// BlocksRunner on the Flower Fruit Mountain stage. The track is read-only — the
// child watches and listens; nothing here counts as a kid Build. After the
// evidence step resolves the world, the same stage shows the resolved change
// (light onto the stone, one leaf falls, second chime; reduced-motion gets the
// light fade + a single leaf shift with a visible light ripple for the sound).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import { BlockChip } from '../BlockChip';
import { BlocksRunner, pageById, type SpriteState } from '../interpreter';
import { sfx } from '../sounds';
import {
  C1_P1_PREVIEW_PROJECT,
  JTW_C1_BACKGROUND_ASSET,
  JTW_STONE_MONKEY_ASSET,
} from './journeyWestSeason1';

export type PreviewRunState = 'idle' | 'running' | 'done';

export function JourneyWestPartPreview({
  resolved,
  onRunDone,
  sleep,
}: {
  /** Evidence step complete — show the resolved world change on the stage. */
  resolved: boolean;
  onRunDone?: () => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const page = useMemo(() => pageById(C1_P1_PREVIEW_PROJECT, 'jtw-s1-c1-p1-page'), []);
  const blocks = page.characters[0].scripts[0].blocks;
  const [runState, setRunState] = useState<PreviewRunState>('idle');
  const [litIndex, setLitIndex] = useState(-1);
  // The stone monkey must NOT be visible in P1 — before, during or after the
  // run (the prediction's picture-grounded answer depends on it).
  const [monkeyVisible, setMonkeyVisible] = useState(false);
  const [soundRipple, setSoundRipple] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (runState === 'running') return;
    setRunState('running');
    setSoundRipple(false);
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_charId, state: SpriteState) => setMonkeyVisible(state.visible),
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: (soundId) => {
          sfx.playSound(soundId);
          setSoundRipple(true);
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
        data-testid="jtw-p1-stage"
      >
        <img
          src={JTW_C1_BACKGROUND_ASSET}
          alt="Flower-Fruit Mountain in the early morning: The fairy stone is still dark, and the monkeys are hiding behind the leaves"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Morning light — resolves onto the immortal stone after the evidence step. */}
        <div
          data-testid="jtw-p1-stone-light"
          data-resolved={resolved}
          className={clsx(
            'pointer-events-none absolute right-[18%] top-[8%] h-1/3 w-1/4 rounded-full blur-2xl transition-opacity motion-safe:duration-1000',
            resolved ? 'bg-amber-200/80 opacity-100' : 'bg-amber-100/40 opacity-30',
          )}
        />
        {/* One leaf, shaken loose by the second sound (single shift under reduced motion). */}
        {resolved && (
          <span
            data-testid="jtw-p1-leaf"
            aria-hidden
            className="absolute right-[30%] top-[30%] text-2xl motion-safe:animate-bounce"
          >
            🍃
          </span>
        )}
        {/* Sound made visible — the light ripple accompanies every chime. */}
        {(soundRipple || resolved) && (
          <span
            data-testid="jtw-p1-sound-ripple"
            aria-hidden
            className="absolute right-[26%] top-[16%] h-10 w-10 rounded-full border-2 border-amber-300/90 motion-safe:animate-ping"
          />
        )}
        <img
          src={JTW_STONE_MONKEY_ASSET}
          alt=""
          aria-hidden
          data-testid="jtw-p1-stone-monkey"
          data-visible={monkeyVisible}
          className={clsx(
            'absolute bottom-[10%] right-[22%] w-[14%]',
            !monkeyVisible && 'invisible',
          )}
        />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-soft">
          System Preview Track (read only) - This is not your program, see what happened in the
          early morning of Sengoku:
        </p>
        <div className="flex flex-wrap items-center gap-1" data-testid="jtw-p1-preview-chain">
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
        data-testid="jtw-p1-run"
      >
        {runState === 'running'
          ? 'Playing…'
          : runState === 'done'
            ? 'watch again'
            : '▶ Take a look'}
      </button>
    </div>
  );
}
