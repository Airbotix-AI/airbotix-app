// C1-P2 arrival demo: the REAL BlocksRunner executes the full arrival chain
// when_flag → hide → play_sound(Chime) → wait(2) → show → hop(1) → say → end
// on the Flower Fruit Mountain stage. The track is a read-only demonstration —
// the child watches the blocks light up left to right while the stage shows
// sound → appear → jump → hello in story order. Reduced-motion keeps sound,
// appearance and the speech bubble; the hop stays a small vertical shift
// (already just a grid-step transition here).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import { BlockChip } from '../BlockChip';
import { GRID_H, GRID_W } from '../blocksModel';
import { BlocksRunner, pageById, startState, type SpriteState } from '../interpreter';
import { sfx } from '../sounds';
import { C1_P2_DEMO_PROJECT, JTW_C1_BACKGROUND_ASSET } from './journeyWestSeason1';

export function JourneyWestArrivalDemo({
  onRunDone,
  sleep,
}: {
  onRunDone?: () => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const page = useMemo(() => pageById(C1_P2_DEMO_PROJECT, 'jtw-s1-c1-p2-page'), []);
  const character = page.characters[0];
  const blocks = character.scripts[0].blocks;
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [litIndex, setLitIndex] = useState(-1);
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character));
  const [say, setSay] = useState<string | null>(null);
  const [chimed, setChimed] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSay(null);
    setChimed(false);
    setSprite(startState(character));
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_charId, state) => setSprite(state),
        onSay: (_charId, text) => setSay(text),
        onNote: () => undefined,
        onSound: (soundId) => {
          sfx.playSound(soundId);
          setChimed(true);
        },
        onGotoPage: () => undefined,
        onStep: (_charId, _scriptId, blockIndex) => setLitIndex(blockIndex),
      },
      sleep,
    );
    runnerRef.current = runner;
    await runner.runFlag();
    setLitIndex(-1);
    setRunning(false);
    setRan(true);
    onRunDone?.();
  }, [character, page, running, sleep, onRunDone]);

  // Grid → stage percentage (the sprite's foot anchors on its grid square).
  const left = `${(sprite.gx / (GRID_W - 1)) * 100}%`;
  const top = `${(sprite.gy / (GRID_H - 1)) * 100}%`;

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-p2-stage"
      >
        <img
          src={JTW_C1_BACKGROUND_ASSET}
          alt="花果山的清晨：仙石就要打开了"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {chimed && (
          <span
            data-testid="jtw-p2-sound-ripple"
            aria-hidden
            className="absolute right-[26%] top-[16%] h-10 w-10 rounded-full border-2 border-amber-300/90 motion-safe:animate-ping"
          />
        )}
        <img
          src={character.asset}
          alt="Stone Monkey"
          data-testid="jtw-p2-stone-monkey"
          data-visible={sprite.visible}
          className={clsx(
            'absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200',
            !sprite.visible && 'invisible',
          )}
          style={{ left, top }}
        />
        {say && (
          <div
            data-testid="jtw-p2-say-bubble"
            className="absolute max-w-[45%] -translate-x-1/2 rounded-2xl border border-hairline bg-canvas-pure px-3 py-2 text-[13px] font-bold text-ink shadow-card-soft"
            style={{ left, top: `calc(${top} - 34%)` }}
          >
            {say}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-soft">
          示范轨道（只读）——这一条不算你搭的，先看它从左到右怎么跑：
        </p>
        <div className="flex flex-wrap items-center gap-1" data-testid="jtw-p2-demo-chain">
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
        disabled={running}
        onClick={() => void run()}
        data-testid="jtw-p2-run"
      >
        {running ? '运行中…' : ran ? '▶ 再跑一次' : '▶ Go'}
      </button>
    </div>
  );
}
