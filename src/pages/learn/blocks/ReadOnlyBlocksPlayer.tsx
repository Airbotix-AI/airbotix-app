// Read-only Blocks player — the view/play-only surface for a shared blocks
// project (the public `/play/:shareId` page, mirroring the Game Studio's
// ReadOnlyGameFrame). It renders the frozen stage and lets a visitor press ▶
// Play to run every 🚩 script or tap a character to run its 👆 scripts. NO
// editing chrome, NO blocks palette, NO auth — just the playable stage.
//
// The public play container defaults to the DARK theme (matching the game
// surface), so the bright scene art floats on a dark frame. Scene art is constant
// in both themes; only the chrome (bg/border/text/dots) follows `data-theme`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

import { GRID_H, GRID_W, type BlocksProject } from './blocksModel';
import { BlocksRunner, startState, type SpriteState } from './interpreter';
import { sceneId } from './library';
import './blocks.css';
import { CharacterVisual } from './CharacterVisual';

export function ReadOnlyBlocksPlayer({ project }: { project: BlocksProject }) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = project.pages[pageIndex] ?? project.pages[0];
  const [runStates, setRunStates] = useState<Map<string, { st: SpriteState; dur: number }> | null>(null);
  const [says, setSays] = useState<Map<string, string>>(new Map());
  const [running, setRunning] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);

  const makeRunner = useCallback(() => {
    const runner = new BlocksRunner(page, {
      onSprite: (id, st, dur) =>
        setRunStates((prev) => {
          const next = new Map(prev ?? []);
          next.set(id, { st, dur });
          return next;
        }),
      onSay: (id, text) =>
        setSays((prev) => {
          const next = new Map(prev);
          if (text === null) next.delete(id);
          else next.set(id, text);
          return next;
        }),
      onPop: () => {},
      onGotoPage: (idx) => {
        if (project.pages[idx]) setPageIndex(idx);
      },
    });
    runnerRef.current = runner;
    return runner;
  }, [page, project.pages]);

  // switching page (start or via goto) shows everyone at their start pose
  useEffect(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    setRunStates(null);
    setSays(new Map());
    setRunning(false);
  }, [pageIndex]);

  const play = useCallback(async () => {
    if (running) return;
    runnerRef.current?.stopAll();
    const runner = makeRunner();
    setRunStates(null);
    setSays(new Map());
    setRunning(true);
    try {
      await runner.runFlag();
    } finally {
      setRunning(false);
    }
  }, [makeRunner, running]);

  const tapSprite = (id: string) => {
    const runner = runnerRef.current ?? makeRunner();
    void runner.runTap(id);
  };

  return (
    <div className="bsx bsx-play" data-theme="dark" data-testid="blocks-play-root">
      <div className="bsx-play-stagewrap">
        <div data-testid="blocks-play-stage" data-scene={sceneId(page.background)} className="bsx-stage bsx-play-stage">
          <div className="bsx-grid" />
          <div className="bsx-deco bsx-deco-a" />
          <div className="bsx-deco bsx-deco-b" />
          <div className="bsx-deco bsx-deco-c" />
          <div className="bsx-hill" />
          {page.characters.map((c) => {
            const run = runStates?.get(c.id);
            const st = run?.st ?? startState(c);
            const dur = run?.dur ?? 0;
            const say = says.get(c.id);
            return (
              <div key={c.id}>
                {say && (
                  <div
                    className="bsx-say"
                    style={{
                      left: `${((st.gx + 0.5) / GRID_W) * 100}%`,
                      top: `${((st.gy - 0.9) / GRID_H) * 100}%`,
                    }}
                  >
                    {say}
                  </div>
                )}
                <div
                  data-testid={`play-sprite-${c.id}`}
                  className="bsx-sprite"
                  style={{
                    cursor: 'pointer',
                    left: `${((st.gx + 0.5) / GRID_W) * 100}%`,
                    top: `${((st.gy + 0.5) / GRID_H) * 100}%`,
                    fontSize: 'clamp(40px,5.5vw,72px)',
                    opacity: st.visible ? 1 : 0.12,
                    transform: `translate(-50%,-50%) rotate(${st.rot}deg) scale(${st.size})`,
                    transition: dur > 0 ? `left ${dur}ms ease, top ${dur}ms ease, transform ${dur}ms ease, opacity ${dur}ms ease` : 'none',
                  }}
                  onClick={() => tapSprite(c.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  title={`Tap ${c.name}`}
                >
                  <CharacterVisual character={c} className={c.asset ? 'bsx-character-asset' : undefined} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bsx-play-bar">
          {project.pages.length > 1 && (
            <div className="bsx-play-dots" aria-label="Pages">
              {project.pages.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`bsx-play-dot${i === pageIndex ? ' on' : ''}`}
                  aria-label={`Page ${i + 1}`}
                  onClick={() => setPageIndex(i)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            data-testid="blocks-play-go"
            className="bsx-play-go"
            onClick={play}
            disabled={running}
          >
            <Play size={22} fill="currentColor" /> {running ? 'Playing…' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
