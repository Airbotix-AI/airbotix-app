// Journey to the West · chapter three's shared cross-page run driver.
//
// Every C3 Part that watches a saved three-page route walk `1 → 2 → 3` wires the
// SAME thing: a `PageFlowRunner` over the real interpreter, the monkey king as
// the tracked character, the page's start poses painted on each page entry, and
// `stop()` on unmount so an in-flight run never outlives the component.
//
// C3-P7 (the Personal Ship's reopen-and-rerun) and C3-P8 (the chapter Retell's
// run of that same saved work) both need exactly that, so it lives here instead
// of being copied a second time. Nothing here decides what a child got right —
// it returns the measured `PageFlowRunResult` and the Part compares its own
// contract against it.

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BlocksProject } from '../blocksModel';
import { startState, type SpriteState } from '../interpreter';
import { JTW_C3_MONKEY_KING_ID } from '../jtwC3Stage';
import { PageFlowRunner, type PageFlowRunResult } from '../pageFlowRun';
import { sfx } from '../sounds';

/** Every sprite of a page in its start pose (what a page entry shows). */
export function jtwC3StartSprites(
  project: BlocksProject,
  pageNumber: number,
): Record<string, SpriteState> {
  const page = project.pages[pageNumber - 1];
  const sprites: Record<string, SpriteState> = {};
  for (const character of page?.characters ?? []) sprites[character.id] = startState(character);
  return sprites;
}

export interface JtwC3RouteRun {
  /** The page currently on the stage — 1-based, as a child reads it. */
  stagePage: number;
  sprites: Record<string, SpriteState>;
  saying: string | null;
  running: boolean;
  /** The last finished run, or null when nothing has been measured yet. */
  run: PageFlowRunResult | null;
  /** Walk a project from Page 1 through the real page-flow runner. */
  runProject: (project: BlocksProject) => Promise<void>;
  /** Drop the measured result — used when the document under it changed. */
  clearRun: () => void;
}

/**
 * One cross-page run, held as component state. `previewSleep` is the same
 * injectable timing `BlocksRunner` takes, so tests run without real waits.
 */
export function useJtwC3RouteRun(previewSleep?: (ms: number) => Promise<void>): JtwC3RouteRun {
  const [stagePage, setStagePage] = useState(1);
  const [sprites, setSprites] = useState<Record<string, SpriteState>>({});
  const [saying, setSaying] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<PageFlowRunResult | null>(null);
  const runnerRef = useRef<PageFlowRunner | null>(null);
  // A ref, not the state flag: re-entrancy has to be readable inside the
  // callback itself, before React has re-rendered with the new state.
  const busyRef = useRef(false);

  useEffect(() => () => runnerRef.current?.stop(), []);

  const runProject = useCallback(
    async (project: BlocksProject) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setRunning(true);
      setSaying(null);
      const runner = new PageFlowRunner(project, {
        trackCharacterId: JTW_C3_MONKEY_KING_ID,
        sleep: previewSleep,
        onPageEnter: (page) => {
          setStagePage(page);
          setSprites(jtwC3StartSprites(project, page));
          setSaying(null);
        },
        host: {
          onSprite: (charId, state) => setSprites((current) => ({ ...current, [charId]: state })),
          onSay: (_charId, text) => setSaying(text),
          onSound: (soundId) => sfx.playSound(soundId),
        },
      });
      runnerRef.current = runner;
      const result = await runner.run();
      runnerRef.current = null;
      setRun(result);
      setRunning(false);
      busyRef.current = false;
    },
    [previewSleep],
  );

  const clearRun = useCallback(() => setRun(null), []);

  return { stagePage, sprites, saying, running, run, runProject, clearRun };
}
