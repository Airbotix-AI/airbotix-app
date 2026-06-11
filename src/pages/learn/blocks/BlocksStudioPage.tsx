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
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { Redo2, Undo2 } from 'lucide-react';

import {
  loadBlocksProject,
  saveBlocksProject,
} from './blocksApi';
import {
  type BlockCategory,
  type BlockOp,
  BLOCK_DEFS,
  CATEGORIES,
  GRID_H,
  GRID_W,
  MAX_PAGES,
  MAX_PARAM,
  blockDef,
} from './blocksModel';
import { useBlocksStore } from './blocksStore';
import { useBlocksTheme } from './blocksTheme';
import { captureBlocksThumbnail } from './thumbnail';
import { saveThumbnail } from '../playground/projectPersistence';
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
  const canUndo = useBlocksStore((s) => s.past.length > 0);
  const canRedo = useBlocksStore((s) => s.future.length > 0);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [category, setCategory] = useState<BlockCategory>('trigger');
  const [present, setPresent] = useState(false);
  const [running, setRunning] = useState(false);
  // Theme follows the system by default; the toolbar 🌙/☀️ overrides + persists.
  // Shared via a store so the Learn top bar flips with the studio (blocksTheme).
  const theme = useBlocksTheme((s) => s.theme);
  const toggleTheme = useBlocksTheme((s) => s.toggle);
  // The friend picker floats in a portal (the character rail clips overflow +
  // has a backdrop-filter, which would otherwise trap/cut off an absolute popup).
  const [friendPos, setFriendPos] = useState<{ left: number; top: number } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const friendPopRef = useRef<HTMLDivElement>(null);
  const pickFriend = friendPos !== null;
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
        useBlocksStore.getState().setHistory(loaded.history.past, loaded.history.future);
        setPhase('ready');
        // refresh the cover thumbnail on open (device-local; even without an edit)
        try {
          const cover = loaded.project.pages[0];
          if (cover) void saveThumbnail(projectId, captureBlocksThumbnail(cover));
        } catch {
          // best-effort
        }
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
          const st = useBlocksStore.getState();
          const result = await saveBlocksProject({
            projectId,
            project: st.project,
            version: versionRef.current,
            otherFiles: otherFilesRef.current,
            history: { past: st.past, future: st.future },
          });
          versionRef.current = result.version;
          if (result.status === 'kept-newest') {
            useBlocksStore.getState().load(result.project);
          }
          setSaveStatus('saved');
          // refresh the Projects/My Works cover thumbnail (device-local)
          try {
            const cover = useBlocksStore.getState().project.pages[0];
            if (cover) void saveThumbnail(projectId, captureBlocksThumbnail(cover));
          } catch {
            // thumbnail is best-effort
          }
        } catch {
          setSaveStatus('offline');
        }
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [dirty, phase, projectId]);

  // ── undo / redo (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z or Ctrl+Y) ─────────────────
  const undo = useCallback(() => useBlocksStore.getState().undo(), []);
  const redo = useCallback(() => useBlocksStore.getState().redo(), []);
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        useBlocksStore.getState().undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        useBlocksStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

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

  // ── friend picker: anchor a floating panel to the ＋ button (viewport-fixed,
  //    rendered via portal so the rail's overflow/backdrop-filter can't clip it).
  const POP_W = 200;
  const POP_H = 112;
  const toggleFriendPicker = useCallback(() => {
    setFriendPos((cur) => {
      if (cur) return null; // already open → close
      const r = addBtnRef.current?.getBoundingClientRect();
      if (!r) return null;
      let left = r.right + 8;
      let top = r.top;
      if (left + POP_W > window.innerWidth - 8) {
        // no room to the right (e.g. portrait, rail at the bottom) → place above
        left = Math.min(Math.max(8, r.left), window.innerWidth - POP_W - 8);
        top = r.top - POP_H - 8;
      }
      top = Math.min(Math.max(8, top), window.innerHeight - POP_H - 8);
      return { left, top };
    });
  }, []);
  useEffect(() => {
    if (!pickFriend) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (friendPopRef.current?.contains(t) || addBtnRef.current?.contains(t)) return;
      setFriendPos(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFriendPos(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => setFriendPos(null));
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [pickFriend]);

  const stageRef = useRef<HTMLDivElement>(null);

  // ── character (object) drag on the stage: reposition only (remove is the ✕
  //    button, like pages). One undo step per drag via the store's coalescing. ─
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
    dragMoved.current = true;
    const rect = stageRef.current.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * GRID_W - 0.5;
    const gy = ((e.clientY - rect.top) / rect.height) * GRID_H - 0.5;
    useBlocksStore.getState().moveCharacter(id, gx, gy);
  };
  const onSpriteUp = (id: string) => {
    const wasDrag = dragMoved.current;
    setDragging(null);
    useBlocksStore.getState().endCoalesce(); // this drag = one undo step
    if (!wasDrag) tapSprite(id); // a clean tap runs the 👆 scripts
  };

  // ── block drag: reorder within the script, OR drop on the BIN to remove.
  //    The bin is a fixed zone at the end of the block area (block-only). ─────
  const binRef = useRef<HTMLDivElement>(null);
  const [binArmed, setBinArmed] = useState(false);
  const overBin = (x: number, y: number) => {
    const r = binRef.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 16;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };
  const blockDrag = useRef<{ scriptId: string; index: number; x0: number; y0: number; pointerId: number } | null>(null);
  const blockDidDrag = useRef(false);
  const [dragBlk, setDragBlk] = useState<{
    scriptId: string;
    index: number;
    dx: number;
    dy: number;
    onBin: boolean;
    targetSlot: number | null;
    dropX: number | null;
  } | null>(null);

  const onBlockDown = (e: React.PointerEvent, scriptId: string, index: number) => {
    blockDrag.current = { scriptId, index, x0: e.clientX, y0: e.clientY, pointerId: e.pointerId };
    blockDidDrag.current = false;
  };
  const onBlockMove = (e: React.PointerEvent) => {
    const d = blockDrag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!blockDidDrag.current && Math.hypot(dx, dy) > 8) {
      blockDidDrag.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (!blockDidDrag.current) return;
    const onBin = overBin(e.clientX, e.clientY);
    setBinArmed(onBin);
    // when not heading for the bin, compute the reorder drop slot (body blocks
    // only — the trigger stays first). targetSlot is the destination index in
    // the post-removal array; dropX positions the insertion bar.
    let targetSlot: number | null = null;
    let dropX: number | null = null;
    if (!onBin && d.index > 0) {
      const row = document.querySelector(`[data-testid="script-${d.scriptId}"]`);
      if (row) {
        const rowRect = row.getBoundingClientRect();
        const items = [...row.querySelectorAll<HTMLElement>('.bsx-block')];
        let slot = 0;
        let x = items[0] ? items[0].getBoundingClientRect().right - rowRect.left : 0;
        items.forEach((el, i) => {
          if (i === d.index) return;
          const r = el.getBoundingClientRect();
          if (e.clientX > r.left + r.width / 2) {
            slot += 1;
            x = r.right - rowRect.left + 2;
          }
        });
        targetSlot = Math.max(1, slot);
        dropX = x;
      }
    }
    setDragBlk({ scriptId: d.scriptId, index: d.index, dx, dy, onBin, targetSlot, dropX });
  };
  const onBlockUp = () => {
    const info = dragBlk;
    const d = blockDrag.current;
    blockDrag.current = null;
    setDragBlk(null);
    setBinArmed(false);
    if (blockDidDrag.current && info && d) {
      if (info.onBin) useBlocksStore.getState().removeBlock(d.scriptId, d.index);
      else if (info.targetSlot !== null && info.targetSlot !== d.index) {
        useBlocksStore.getState().moveBlock(d.scriptId, d.index, info.targetSlot);
      }
    }
    setTimeout(() => (blockDidDrag.current = false), 0);
  };

  // ── tap a whole block to EDIT it (number stepper / Say text) ─────────────
  const [editBlk, setEditBlk] = useState<{ scriptId: string; index: number; left: number; top: number } | null>(null);
  const onBlockTap = (e: React.MouseEvent, scriptId: string, index: number, op: string) => {
    if (blockDidDrag.current) return; // it was a drag, not a tap
    const def = blockDef(op as BlockOp);
    if (!def.hasN && op !== 'say') return; // nothing to edit on this block
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 230;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
    setEditBlk({ scriptId, index, left, top: Math.max(70, r.top - 132) });
  };
  useEffect(() => {
    if (!editBlk) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-testid="block-editor"]')) setEditBlk(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEditBlk(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      // closing the editor ends the coalescing session → next edit is its own step
      useBlocksStore.getState().endCoalesce();
    };
  }, [editBlk]);
  // keep the editor anchored to a live block; close if the script/block vanished
  const editing = (() => {
    if (!editBlk) return null;
    const script = selectedChar?.scripts.find((s) => s.id === editBlk.scriptId);
    const blk = script?.blocks[editBlk.index];
    return blk ? { ...editBlk, block: blk } : null;
  })();

  if (phase === 'loading') {
    return (
      <div className="bsx flex h-[60vh] items-center justify-center text-[18px] font-bold bsx-muted">
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
    <div className={`bsx bsx-app${present ? ' present' : ''}`} data-theme={theme} data-testid="blocks-studio">
      {/* ── toolbar ── */}
      <header className="bsx-card flex items-center gap-2 rounded-3xl px-3 py-2">
        <Link to="/learn/create/blocks" className="bsx-press grid h-11 w-11 place-items-center text-[20px]" title="Save & back">
          🏠
        </Link>
        <button
          type="button"
          data-testid="undo"
          className="bsx-press grid h-11 w-11 place-items-center disabled:opacity-40"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
        >
          <Undo2 size={20} />
        </button>
        <button
          type="button"
          data-testid="redo"
          className="bsx-press grid h-11 w-11 place-items-center disabled:opacity-40"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
        >
          <Redo2 size={20} />
        </button>
        <div className="min-w-0 px-1">
          <div className="truncate text-[15px] font-extrabold leading-tight">{project.name}</div>
          <div className="bsx-muted text-[11px] font-semibold" data-testid="save-status" data-status={saveStatus}>
            Page {project.pages.indexOf(page) + 1} of {project.pages.length} ·{' '}
            {saveStatus === 'saved' ? '✓ saved' : saveStatus === 'saving' ? 'saving…' : 'saved on this device'}
          </div>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          className="bsx-press grid h-11 w-11 place-items-center text-[18px]"
          onClick={toggleTheme}
          data-testid="theme-toggle"
          title={theme === 'dark' ? 'Day mode' : 'Night mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
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
          <button
            ref={addBtnRef}
            type="button"
            data-testid="add-character"
            onClick={toggleFriendPicker}
            className="grid aspect-square w-full max-w-[72px] place-items-center rounded-2xl border-2 border-dashed border-brand-sky/50 text-[26px] text-brand-sky"
            title="Add a character"
          >
            ＋
          </button>
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
                    title={`${c.name} — drag to move, tap to run 👆, drag to the bin to remove`}
                  >
                    {c.emoji}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bsx-stagefoot flex items-center gap-2">
            <span className="bsx-card rounded-full px-3 py-1.5 text-[13px] font-extrabold">
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-brand-sky" />
              Coding: {selectedChar?.name}
            </span>
            <span className="flex-1" />
            <span className="bsx-muted text-[12px] font-semibold">
              Tap a friend to run 👆 · drag to place
            </span>
          </div>
        </div>

        <aside className="bsx-railbox" style={{ gridArea: 'pages' }} aria-label="Pages">
          {project.pages.map((p, i) => (
            <div key={p.id} className="relative w-full max-w-[96px]">
              <button
                type="button"
                data-testid={`page-thumb-${i}`}
                onClick={() => useBlocksStore.getState().selectPage(p.id)}
                className="bsx-press relative grid w-full place-items-center rounded-xl text-[20px]"
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
              {project.pages.length > 1 && (
                <button
                  type="button"
                  data-testid={`remove-page-${i}`}
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-coral text-[11px] font-bold text-white shadow"
                  title={`Remove page ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    useBlocksStore.getState().removePage(p.id);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
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
          <div className="bsx-soft flex items-center gap-4 overflow-x-auto rounded-3xl px-4 pb-4 pt-3" data-testid="palette">
            <span className="bsx-muted shrink-0 text-[12px] font-extrabold">Tap a block ↓</span>
            {paletteBlocks.map((def) => (
              <BlockChip
                key={def.op}
                block={{ op: def.op, ...(def.hasN ? { n: def.defaultN } : {}) }}
                onTap={() => useBlocksStore.getState().addBlock(def.op)}
                title={`Add "${def.label}" to ${selectedChar?.name}'s program`}
              />
            ))}
          </div>

          <div className="flex min-h-0 flex-1 gap-2">
          <div className="bsx-soft relative min-h-0 flex-1 overflow-auto rounded-3xl p-4" data-testid="script-area">
            {selectedChar?.scripts.length === 0 && (
              <div className="bsx-muted grid h-full place-items-center text-[14px] font-bold">
                Tap a 🚩 block to start {selectedChar.name}&apos;s program ✨
              </div>
            )}
            {selectedChar?.scripts.map((script) => {
              const rowDrag = dragBlk && dragBlk.scriptId === script.id ? dragBlk : null;
              return (
                <div
                  key={script.id}
                  className="bsx-chainwrap relative mb-3 flex w-max items-center rounded-2xl p-2.5 pr-4"
                  data-testid={`script-${script.id}`}
                >
                  {script.blocks.map((b, i) => {
                    const dr = rowDrag && rowDrag.index === i ? rowDrag : null;
                    const def = blockDef(b.op);
                    return (
                      <BlockChip
                        key={`${script.id}-${i}`}
                        block={b}
                        inChain
                        isLast={i === script.blocks.length - 1}
                        dragging={!!dr}
                        removing={!!dr?.onBin}
                        style={
                          dr
                            ? { transform: `translate(${dr.dx}px, ${dr.dy}px) scale(1.05)`, position: 'relative', zIndex: 30 }
                            : undefined
                        }
                        onPointerDown={(e) => onBlockDown(e, script.id, i)}
                        onPointerMove={onBlockMove}
                        onPointerUp={onBlockUp}
                        onTap={(e) => onBlockTap(e, script.id, i, b.op)}
                        title={
                          def.hasN
                            ? 'Tap to change the number · drag to reorder · drag to the bin to remove'
                            : b.op === 'say'
                              ? 'Tap to change the words · drag to reorder · drag to the bin to remove'
                              : 'Drag to reorder · drag to the bin to remove'
                        }
                      />
                    );
                  })}
                  {/* reorder insertion bar */}
                  {rowDrag && !rowDrag.onBin && rowDrag.dropX !== null && (
                    <span className="bsx-dropbar" style={{ left: rowDrag.dropX }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* the trash bin — at the end of the block area; drag a block here to
              remove it. Bigger + glows red when armed. (Blocks only.) */}
          <div
            ref={binRef}
            data-testid="trash-bin"
            aria-label="Trash"
            className={`bsx-bin${dragBlk ? ' active' : ''}${binArmed ? ' armed' : ''}`}
          >
            <div className="bsx-bin-can">
              <span className="bsx-bin-lid" />
              <span className="bsx-bin-body" />
            </div>
            <span className="bsx-bin-label">{binArmed ? 'Drop!' : 'Bin'}</span>
          </div>
          </div>
        </div>
      </section>

      {/* floating friend picker — portalled to <body> so the rail can't clip it */}
      {pickFriend &&
        friendPos &&
        createPortal(
          <div
            ref={friendPopRef}
            data-testid="friend-picker"
            className="bsx bsx-card fixed z-[60] grid grid-cols-4 gap-1.5 rounded-2xl p-2 shadow-card-soft"
            data-theme={theme}
            style={{ left: friendPos.left, top: friendPos.top, width: POP_W }}
          >
            {FRIEND_CHOICES.map((f) => (
              <button
                key={f.emoji}
                type="button"
                className="bsx-friend grid h-10 w-10 place-items-center rounded-xl text-[24px]"
                title={f.name}
                onClick={() => {
                  useBlocksStore.getState().addCharacter(f.emoji, f.name);
                  setFriendPos(null);
                }}
              >
                {f.emoji}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {/* ── tap-to-edit popover: number stepper / Say text ── */}
      {editing &&
        createPortal(
          <div
            data-testid="block-editor"
            className="bsx bsx-card fixed z-[70] rounded-2xl p-3 shadow-card-soft"
            data-theme={theme}
            style={{ left: editing.left, top: editing.top, width: 230 }}
          >
            <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold">
              <span className="text-[20px]">{blockDef(editing.block.op).icon}</span>
              {editing.block.op === 'say'
                ? 'What should they say?'
                : `How many? (${blockDef(editing.block.op).label})`}
            </div>
            {editing.block.op === 'say' ? (
              <input
                data-testid="say-input"
                autoFocus
                maxLength={60}
                defaultValue={editing.block.text ?? 'Hi!'}
                onChange={(e) =>
                  useBlocksStore.getState().setSayText(editing.scriptId, editing.index, e.target.value)
                }
                onKeyDown={(e) => e.key === 'Enter' && setEditBlk(null)}
                className="bsx-card w-full rounded-xl px-3 py-2 text-[15px] font-bold outline-none"
              />
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid="num-minus"
                  className="bsx-step"
                  onClick={() =>
                    useBlocksStore
                      .getState()
                      .setParam(editing.scriptId, editing.index, (editing.block.n ?? 1) - 1)
                  }
                >
                  −
                </button>
                <span data-testid="num-value" className="text-[30px] font-extrabold tabular-nums">
                  {editing.block.n ?? 1}
                </span>
                <button
                  type="button"
                  data-testid="num-plus"
                  className="bsx-step"
                  onClick={() =>
                    useBlocksStore
                      .getState()
                      .setParam(editing.scriptId, editing.index, (editing.block.n ?? 1) + 1)
                  }
                  disabled={(editing.block.n ?? 1) >= MAX_PARAM}
                >
                  +
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
