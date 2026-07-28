// Journey to the West S1/C2 — the shared stage that RUNS a saved entry project.
//
// The child's C2-P7 personal entry route is handed to a real `BlocksRunner`
// twice in the season: once by C2-P7 as its reopen-and-rerun, and once by C2-P8
// as the chapter Retell run. Both times the curtain hiding, the cave appearing
// and the evidence line are things the interpreter did — never things a part
// page drew — so the stage lives here once and both parts mount it.

import { useCallback, useEffect, useRef, useState } from 'react';

import { GRID_H, GRID_W, type Page } from '../blocksModel';
import { BlocksRunner, startState, type SpriteState } from '../interpreter';
import { sfx } from '../sounds';
import {
  JTW_C2_P7_CAVE_ID,
  JTW_C2_P7_CURTAIN_ID,
  JTW_C2_P7_MONKEY_ID,
} from '../jtwPersonalEntry';
import { c2EntryRunResult, type C2EntryRunResult } from './journeyWestC2EntryRun';

/** The actor-free C2 base plate: both door actors are separate sprites. */
const BASE_ASSET = '/story-blocks/journey-to-the-west/backgrounds/s1/c2/actor-free-v01.png';
const BASE_ALT = '水帘前的湿石路：左岸的石阶和右岸的花丛石滩都通向同一个入口';

export interface C2EntryStageLabels {
  /** Button copy before the first run. */
  idle: string;
  /** Button copy while the runner is executing. */
  running: string;
  /** Button copy once a run has finished. */
  again: string;
}

export function JourneyWestC2EntryStage({
  page,
  testIdPrefix,
  labels,
  disabled = false,
  playSound = false,
  onResult,
  sleep,
}: {
  /** The SAVED page, exactly as the server returned it. */
  page: Page;
  /** Part-scoped test id prefix, e.g. `jtw-c2p7`. */
  testIdPrefix: string;
  labels: C2EntryStageLabels;
  /** True while the Part's own gate (e.g. the cause cards) is still open. */
  disabled?: boolean;
  /** Route the curtain's Chime to the real sound bus during the run. */
  playSound?: boolean;
  onResult: (result: C2EntryRunResult) => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [sprites, setSprites] = useState<Map<string, SpriteState>>(
    () => new Map(page.characters.map((character) => [character.id, startState(character)])),
  );
  const [saidLine, setSaidLine] = useState<string | null>(null);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSaidLine(null);
    setSprites(new Map(page.characters.map((character) => [character.id, startState(character)])));
    let heardLine: string | null = null;
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (charId, state) => setSprites((previous) => new Map(previous).set(charId, state)),
        onSay: (charId, text) => {
          if (charId !== JTW_C2_P7_CAVE_ID || text === null) return;
          heardLine = text;
          setSaidLine(text);
        },
        onNote: () => undefined,
        onSound: (soundId) => {
          if (playSound) sfx.playSound(soundId);
        },
        onGotoPage: () => undefined,
        onStep: () => undefined,
      },
      sleep,
    );
    runnerRef.current = runner;
    await runner.runFlag();
    setRunning(false);
    setRan(true);
    onResult(c2EntryRunResult((charId) => runner.state(charId), heardLine));
  }, [onResult, page, playSound, running, sleep]);

  const monkey = page.characters.find((character) => character.id === JTW_C2_P7_MONKEY_ID);
  const monkeyState = sprites.get(JTW_C2_P7_MONKEY_ID);
  const curtain = page.characters.find((character) => character.id === JTW_C2_P7_CURTAIN_ID);
  const cave = page.characters.find((character) => character.id === JTW_C2_P7_CAVE_ID);
  const curtainVisible = sprites.get(JTW_C2_P7_CURTAIN_ID)?.visible !== false;
  const caveVisible = sprites.get(JTW_C2_P7_CAVE_ID)?.visible === true;

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
        data-testid={`${testIdPrefix}-stage`}
        data-world-state={caveVisible ? 'cave-revealed' : 'curtain-closed'}
      >
        <img src={BASE_ASSET} alt={BASE_ALT} className="absolute inset-0 h-full w-full object-cover" />
        {curtain && curtainVisible && (
          <img
            src={curtain.asset}
            alt="合着的水帘"
            data-testid={`${testIdPrefix}-curtain`}
            data-visible="true"
            className="absolute right-[5%] top-[3%] h-[68%] w-[49%] object-contain"
          />
        )}
        {cave && caveVisible && (
          <img
            src={cave.asset}
            alt="暖光洞口，里面有石桥、干地、石座和清水"
            data-testid={`${testIdPrefix}-cave`}
            data-visible="true"
            className="absolute right-[12%] top-[12%] h-[61%] w-[38%] object-contain"
          />
        )}
        {monkey && monkeyState && (
          <img
            src={monkey.asset}
            alt="Stone Monkey"
            data-testid={`${testIdPrefix}-stone-monkey`}
            data-gx={monkeyState.gx}
            data-gy={monkeyState.gy}
            className="absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200"
            style={{
              left: `${(monkeyState.gx / (GRID_W - 1)) * 100}%`,
              top: `${(monkeyState.gy / (GRID_H - 1)) * 100}%`,
            }}
          />
        )}
      </div>

      {saidLine && (
        <p className="text-[14px] font-semibold text-ink" data-testid={`${testIdPrefix}-said-line`}>
          洞口说：「{saidLine}」
        </p>
      )}

      <button
        type="button"
        className="btn-pill-primary"
        disabled={running || disabled}
        onClick={() => void run()}
        data-testid={`${testIdPrefix}-rerun`}
      >
        {running ? labels.running : ran ? labels.again : labels.idle}
      </button>
    </div>
  );
}
