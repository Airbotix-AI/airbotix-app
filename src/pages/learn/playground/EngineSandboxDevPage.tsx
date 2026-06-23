// DEV-ONLY engine sandbox (`/playground-sandbox`, gated by import.meta.env.DEV in
// router.tsx). A no-auth surface to exercise the REAL game runtime — the same
// GameRunnerPane + GameFrame + buildGamePreview + vendored engine globals +
// opaque-origin sandbox the kid studio uses — across both engines
// (learn-game-studio-3d-prd.md M3D-2). Pick 2D (Phaser) or 3D (three.js) via the
// buttons or `?engine=phaser|three`. Not a product surface; it's a verification
// harness. Crucially it renders GameRunnerPane and toggles `engine` as a PROP on the
// MOUNTED runner (no remount, no runKey bump) — exactly the studio's 2D⇄3D switch
// path — so it reproduces D-3D-08 (the runner must re-snapshot on an engine change,
// else old-engine files render under the new global → "Phaser/THREE is not defined").

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { GameRunnerPane } from './panes/GameRunnerPane';
import { STARTER_GAME } from './starterGame';
import { STARTER_GAME_3D } from './threeStarter';
import type { GameEngine } from './buildGamePreview';

export function EngineSandboxDevPage() {
  const [params, setParams] = useSearchParams();
  const engine: GameEngine = params.get('engine') === 'three' ? 'three' : 'phaser';
  const [runKey, setRunKey] = useState(1);
  const files = engine === 'three' ? STARTER_GAME_3D : STARTER_GAME;

  // Switch the engine WITHOUT bumping runKey — the runner must re-snapshot off the
  // engine change alone (the studio switch does exactly this).
  const pick = (e: GameEngine) => setParams({ engine: e });

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
      </header>
      <div className="min-h-0 flex-1">
        <GameRunnerPane
          files={files}
          runKey={runKey}
          running
          engine={engine}
          onRun={() => setRunKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
