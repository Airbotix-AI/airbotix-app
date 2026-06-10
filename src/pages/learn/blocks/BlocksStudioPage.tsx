// Blocks Studio — `/learn/blocks/:projectId` (learn-blocks-studio-prd.md §4).
//
// The junior block-coding editor: stage + character rail + pages rail + the
// six-category coding band. Tap a palette block to snap it onto the program;
// tap a chained block to pluck it off; tap a number tile to change it; drag a
// character on the stage to set its start spot; Go runs every 🚩 script;
// Present hides the editing chrome. The program persists as
// `project.blocks.json` in the project VFS (debounced autosave, server wins
// on conflict) — same versioned persistence as the sibling studios.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  loadBlocksProject,
  saveBlocksProject,
} from './blocksApi';
import {
  type BlockCategory,
  BLOCK_DEFS,
  CATEGORIES,
  GRID_H,
  GRID_W,
  MAX_PAGES,
} from './blocksModel';
import { useBlocksStore } from './blocksStore';
import { BlocksRunner, startState, type SpriteState } from './interpreter';
import { BlockChip } from './BlockChip';
import './blocks.css';

const SAVE_DEBOUNCE_MS = 800;
const FRIEND_CHOICES = [
  { emoji: '🐶', name: 'Dog' },
  { emoji: '🐰', name: 'Bunny' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🤖', name: 'Robot' },
  { emoji: '🦄', name: 'Unicorn' },
  { emoji: '🚀', name: 'Rocket' },
  { emoji: '⚽', name: 'Ball' },
  { emoji: '🐸', name: 'Frog' },
];

type SaveStatus = 'saved' | 'saving' | 'offline';

/** A short "pop" via WebAudio — no asset needed. */
function usePop(): () => void {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      ctxRef.current ??= new AudioContext();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // no audio — fine
    }
  }, []);
}

export function BlocksStudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useBlocksStore((s) => s.project);
  const pageId = useBlocksStore((s) => s.pageId);
  const charId = useBlocksStore((s) => s.charId);
  const dirty = useBlocksStore((s) => s.dirty);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [category, setCategory] = useState<BlockCategory>('trigger');
  const [present, setPresent] = useState(false);
  const [running, setRunning] = useState(false);
  const [pickFriend, setPickFriend] = useState(false);
  // live sprite states while/after a run (charId → state+duration); null = start poses
  const [runStates, setRunStates] = useState<Map<string, { st: SpriteState; dur: number }> | null>(null);
  const [says, setSays] = useState<Map<string, string>>(new Map());

  const versionRef = useRef(0);
  const otherFilesRef = useRef<Awaited<ReturnType<typeof loadBlocksProject>>['otherFiles']>([]);
  const runnerRef = useRef<BlocksRunner | null>(null);
  const pop = usePop();

  const page = useMemo(
    () => project.pages.find((p) => p.id === pageId) ?? project.pages[0],
    [project, pageId],
  );
  const selectedChar = page.characters.find((c) => c.id === charId) ?? page.characters[0];

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    loadBlocksProject(projectId)
      .then((loaded) => {
        if (!alive) return;
        versionRef.current = loaded.version;
        otherFilesRef.current = loaded.otherFiles;
        useBlocksStore.getState().load(loaded.project);
        setPhase('ready');
      })
      .catch(() => alive && setPhase('error'));
    return () => {
      alive = false;
    };
  }, [projectId]);

  // ── debounced autosave on any program change (server wins on conflict) ────
  useEffect(() => {
    if (phase !== 'ready' || dirty === 0 || !projectId) return;
    setSaveStatus('saving');
    const t = setTimeout(() => {
      void (async () => {
        try {
          const result = await saveBlocksProject({
            projectId,
            project: useBlocksStore.getState().project,
            version: versionRef.current,
            otherFiles: otherFilesRef.current,
          });
          versionRef.current = result.version;
          if (result.status === 'kept-newest') {
            useBlocksStore.getState().load(result.project);
          }
          setSaveStatus('saved');
        } catch {
          setSaveStatus('offline');
        }
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [dirty, phase, projectId]);

  // edits & page switches invalidate the live run view
  useEffect(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    setRunStates(null);
    setSays(new Map());
    setRunning(false);
  }, [dirty, pageId]);

  // ── run ───────────────────────────────────────────────────────────────────
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
      onPop: pop,
      onGotoPage: (idx) => {
        const target = useBlocksStore.getState().project.pages[idx];
        if (target) useBlocksStore.getState().selectPage(target.id);
      },
    });
    runnerRef.current = runner;
    return runner;
  }, [page, pop]);

  const go = useCallback(() => {
    if (running) return;
    setRunning(true);
    const runner = makeRunner();
    runner.resetAll();
    void runner.runFlag().finally(() => setRunning(false));
  }, [running, makeRunner]);

  const reset = useCallback(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    setRunStates(null);
    setSays(new Map());
    setRunning(false);
  }, []);

  const tapSprite = useCallback(
    (id: string) => {
      const runner = runnerRef.current ?? makeRunner();
      void runner.runTap(id);
    },
    [makeRunner],
  );

  // ── stage drag (pointer events: touch + mouse + pen, D-BLK-7) ─────────────
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragMoved = useRef(false);

  const onSpriteDown = (e: React.PointerEvent, id: string) => {
    if (running || present) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
    dragMoved.current = false;
    useBlocksStore.getState().selectChar(id);
  };
  const onSpriteMove = (e: React.PointerEvent, id: string) => {
    if (dragging !== id || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * GRID_W - 0.5;
    const gy = ((e.clientY - rect.top) / rect.height) * GRID_H - 0.5;
    dragMoved.current = true;
    useBlocksStore.getState().moveCharacter(id, gx, gy);
  };
  const onSpriteUp = (id: string) => {
    const wasDrag = dragMoved.current;
    setDragging(null);
    if (!wasDrag) tapSprite(id); // a clean tap runs the 👆 scripts
  };

  if (phase === 'loading') {
    return (
      <div className="bsx flex h-[60vh] items-center justify-center text-[18px] font-bold text-slate2">
        Opening your blocks… 🧩
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className="bsx flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="text-[18px] font-bold">That project couldn&apos;t open. 🌧️</div>
        <Link to="/learn/create/blocks" className="btn-pill-ghost">
          ← Back to Blocks
        </Link>
      </div>
    );
  }

  const paletteBlocks = BLOCK_DEFS.filter((d) => d.category === category);

  return (
    <div className={`bsx bsx-app${present ? ' present' : ''}`} data-testid="blocks-studio">
      {/* ── toolbar ── */}
      <header className="flex items-center gap-2 rounded-3xl border border-hairline bg-canvas-pure px-3 py-2">
        <Link to="/learn/create/blocks" className="bsx-press grid h-11 w-11 place-items-center text-[20px]" title="Save & back">
          🏠
        </Link>
        <div className="min-w-0 px-1">
          <div className="truncate text-[15px] font-extrabold leading-tight">{project.name}</div>
          <div className="text-[11px] font-semibold text-slate2" data-testid="save-status" data-status={saveStatus}>
            Page {project.pages.indexOf(page) + 1} of {project.pages.length} ·{' '}
            {saveStatus === 'saved' ? '✓ saved' : saveStatus === 'saving' ? 'saving…' : 'saved on this device'}
          </div>
        </div>
        <div className="flex-1" />
        <button type="button" className="bsx-press h-11 px-4 text-[13px]" onClick={reset} title="Everyone back to their start spots">
          ⤺ Reset
        </button>
        <button
          type="button"
          className="bsx-press h-11 px-4 text-[13px]"
          onClick={() => setPresent((p) => !p)}
          data-testid="present-toggle"
          title="Big screen — just the stage"
        >
          {present ? '✕ Exit' : '⛶ Present'}
        </button>
        <button
          type="button"
          data-testid="go-button"
          onClick={go}
          disabled={running}
          className="h-11 rounded-full bg-brand-mint px-6 text-[16px] font-extrabold text-white shadow-brand-mint transition hover:-translate-y-0.5 disabled:opacity-60"
          title="Run every 🚩 start"
        >
          ▶ Go!
        </button>
      </header>

      {/* ── middle: characters · stage · pages ── */}
      <section className="bsx-middle">
        <aside className="bsx-railbox" style={{ gridArea: 'chars' }} aria-label="Characters">
          {page.characters.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`char-thumb-${c.id}`}
              onClick={() => useBlocksStore.getState().selectChar(c.id)}
              className="bsx-press relative grid aspect-square w-full max-w-[72px] place-items-center rounded-2xl text-[30px]"
              style={c.id === selectedChar?.id ? { boxShadow: '0 0 0 4px #5DAEFF, 0 4px 0 var(--bsx-border)' } : undefined}
              title={c.name}
            >
              {c.emoji}
              {c.id === selectedChar?.id && page.characters.length > 1 && (
                <span
                  role="button"
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-coral text-[11px] font-bold text-white"
                  title={`Remove ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    useBlocksStore.getState().removeCharacter(c.id);
                  }}
                >
                  ✕
                </span>
              )}
            </button>
          ))}
          <div className="relative w-full max-w-[72px]">
            <button
              type="button"
              data-testid="add-character"
              onClick={() => setPickFriend((p) => !p)}
              className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-brand-sky/50 text-[26px] text-brand-sky"
              title="Add a character"
            >
              ＋
            </button>
            {pickFriend && (
              <div className="absolute left-full top-0 z-20 ml-2 grid w-44 grid-cols-4 gap-1.5 rounded-2xl border border-hairline bg-canvas-pure p-2 shadow-card-soft">
                {FRIEND_CHOICES.map((f) => (
                  <button
                    key={f.emoji}
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-xl text-[22px] hover:bg-wash-sky"
                    title={f.name}
                    onClick={() => {
                      useBlocksStore.getState().addCharacter(f.emoji, f.name);
                      setPickFriend(false);
                    }}
                  >
                    {f.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-2" style={{ gridArea: 'stage' }}>
          <div
            ref={stageRef}
            data-testid="blocks-stage"
            className={`bsx-stage min-h-[180px] flex-1 scene-${page.background === 'space' ? 'space' : 'meadow'}`}
          >
            <div className="bsx-grid" />
            <div className="bsx-hill" />
            <div className="absolute right-[3%] top-[6%] text-[clamp(28px,4vw,44px)]">
              {page.background === 'space' ? '🌙' : '☀️'}
            </div>
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
                    data-testid={`sprite-${c.id}`}
                    className={`bsx-sprite${dragging === c.id ? ' dragging' : ''}`}
                    onPointerDown={(e) => onSpriteDown(e, c.id)}
                    onPointerMove={(e) => onSpriteMove(e, c.id)}
                    onPointerUp={() => onSpriteUp(c.id)}
                    style={{
                      left: `${((st.gx + 0.5) / GRID_W) * 100}%`,
                      top: `${((st.gy + 0.5) / GRID_H) * 100}%`,
                      fontSize: 'clamp(40px,5.5vw,64px)',
                      opacity: st.visible ? 1 : 0.12,
                      transform: `translate(-50%,-50%) rotate(${st.rot}deg) scale(${st.size})`,
                      transition: dur > 0 ? `left ${dur}ms ease, top ${dur}ms ease, transform ${dur}ms ease, opacity ${dur}ms ease` : 'none',
                    }}
                    title={`${c.name} — drag to set the start spot, tap to run 👆`}
                  >
                    {c.emoji}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bsx-stagefoot flex items-center gap-2">
            <span className="rounded-full border border-hairline bg-canvas-pure px-3 py-1.5 text-[13px] font-extrabold">
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-brand-sky" />
              Coding: {selectedChar?.name}
            </span>
            <span className="flex-1" />
            <span className="text-[12px] font-semibold text-slate2">
              Tap a friend to run 👆 · drag to place
            </span>
          </div>
        </div>

        <aside className="bsx-railbox" style={{ gridArea: 'pages' }} aria-label="Pages">
          {project.pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              data-testid={`page-thumb-${i}`}
              onClick={() => useBlocksStore.getState().selectPage(p.id)}
              className={`bsx-press relative grid w-full max-w-[96px] place-items-center rounded-xl text-[20px]`}
              style={{
                aspectRatio: '4/3',
                background:
                  p.background === 'space'
                    ? 'linear-gradient(180deg,#101B3C,#3A1D55)'
                    : 'linear-gradient(180deg,#9CD7FF,#F1FAFF)',
                ...(p.id === page.id ? { boxShadow: '0 0 0 4px #FF7A66, 0 4px 0 var(--bsx-border)' } : {}),
              }}
              title={`Page ${i + 1}`}
            >
              <span className="absolute left-1.5 top-0.5 text-[10px] font-extrabold text-white drop-shadow">{i + 1}</span>
              {p.characters[0]?.emoji ?? '🧩'}
            </button>
          ))}
          {project.pages.length < MAX_PAGES && (
            <button
              type="button"
              data-testid="add-page"
              onClick={() => useBlocksStore.getState().addPage()}
              className="grid w-full max-w-[96px] place-items-center rounded-xl border-2 border-dashed border-brand-coral/50 text-[22px] text-brand-coral"
              style={{ aspectRatio: '4/3' }}
              title="Add a page (up to 4)"
            >
              ＋
            </button>
          )}
        </aside>
      </section>

      {/* ── coding band ── */}
      <section className="bsx-coder">
        <nav className="bsx-catbar" aria-label="Block categories">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`cat-${c.id}`}
              className={`bsx-cat c-${c.id}`}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              title={`${c.label} blocks`}
            >
              <span>{c.icon}</span>
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          <div className="flex items-center gap-4 overflow-x-auto rounded-3xl border border-hairline bg-canvas-pure/70 px-4 pb-4 pt-3" data-testid="palette">
            <span className="shrink-0 text-[12px] font-extrabold text-slate2">Tap a block ↓</span>
            {paletteBlocks.map((def) => (
              <BlockChip
                key={def.op}
                block={{ op: def.op, ...(def.hasN ? { n: def.defaultN } : {}) }}
                onTap={() => useBlocksStore.getState().addBlock(def.op)}
                title={`Add "${def.label}" to ${selectedChar?.name}'s program`}
              />
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-3xl border border-hairline bg-canvas-pure/70 p-4" data-testid="script-area">
            {selectedChar?.scripts.length === 0 && (
              <div className="grid h-full place-items-center text-[14px] font-bold text-slate2">
                Tap a 🚩 block to start {selectedChar.name}&apos;s program ✨
              </div>
            )}
            {selectedChar?.scripts.map((script) => (
              <div key={script.id} className="mb-3 flex w-max items-center rounded-2xl bg-wash-mint/60 p-2.5 pr-4" data-testid={`script-${script.id}`}>
                {script.blocks.map((b, i) => (
                  <BlockChip
                    key={`${script.id}-${i}`}
                    block={b}
                    inChain
                    isLast={i === script.blocks.length - 1}
                    onTap={() => {
                      if (b.op === 'say') {
                        const text = window.prompt('What should they say?', b.text ?? 'Hi!');
                        if (text !== null) useBlocksStore.getState().setSayText(script.id, i, text);
                        return;
                      }
                      useBlocksStore.getState().removeBlock(script.id, i);
                    }}
                    onTapNum={() => useBlocksStore.getState().cycleParam(script.id, i)}
                    title={b.op === 'say' ? 'Tap to change the words' : 'Tap to take this block off'}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
