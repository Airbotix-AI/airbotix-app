// DEV-ONLY engine sandbox (`/playground-sandbox`, gated by import.meta.env.DEV in
// router.tsx). A no-auth surface to exercise the REAL game runtime — the same
// GameFrame + buildGamePreview + vendored engine globals + opaque-origin sandbox the
// kid studio uses — across both engines (learn-game-studio-3d-prd.md M3D-2). Pick
// 2D (Phaser) or 3D (three.js) via the buttons or `?engine=phaser|three`. Not a
// product surface and not wired into navigation; it's a verification harness.

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { GameFrame } from './GameFrame';
import { STARTER_GAME } from './starterGame';
import { STARTER_GAME_3D } from './threeStarter';
import type { GameEngine } from './buildGamePreview';

export function EngineSandboxDevPage() {
  const [params, setParams] = useSearchParams();
  const engine: GameEngine = params.get('engine') === 'three' ? 'three' : 'phaser';
  const [runKey, setRunKey] = useState(0);
  const [fps, setFps] = useState(0);
  const files = engine === 'three' ? STARTER_GAME_3D : STARTER_GAME;

  const pick = (e: GameEngine) => {
    setParams({ engine: e });
    setRunKey((k) => k + 1);
  };

  const tab = (e: GameEngine, label: string) => (
    <button
      type="button"
      data-testid={`pick-${e}`}
      onClick={() => pick(e)}
      className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
        engine === e ? 'bg-brand-mint text-ink' : 'bg-pg-surface text-pg-text-dim hover:text-pg-text'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-screen min-h-0 flex-col bg-pg-desktop text-pg-text">
      <header className="flex shrink-0 items-center gap-3 border-b border-pg-border px-4 py-2">
        <strong className="text-sm">Engine sandbox</strong>
        <span className="rounded bg-wash-sky px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
          DEV
        </span>
        {tab('phaser', '2D · Phaser')}
        {tab('three', '3D · three.js')}
        <button
          type="button"
          onClick={() => setRunKey((k) => k + 1)}
          className="rounded-full bg-pg-surface px-3 py-1.5 text-sm text-pg-text-dim hover:text-pg-text"
        >
          ↻ Re-run
        </button>
        <span className="ml-auto font-mono text-xs text-pg-text-dim" data-testid="engine-label">
          engine: <b className="text-pg-text">{engine}</b>
        </span>
        <span className="font-mono text-xs text-pg-text-dim" data-testid="fps-readout">
          fps: <b className="text-pg-text">{fps}</b>
        </span>
      </header>
      <div className="min-h-0 flex-1">
        <GameFrame key={engine} files={files} runKey={runKey} engine={engine} onFps={setFps} />
      </div>
    </div>
  );
}
