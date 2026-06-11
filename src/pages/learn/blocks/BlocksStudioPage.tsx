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
import { Expand, Image as ImageIcon, MoreHorizontal, Moon, Redo2, RotateCcw, Sun, Undo2, Volume2, VolumeX } from 'lucide-react';

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
  MAX_COLOR,
  MAX_PAGES,
  MAX_PARAM,
  MAX_SPEED,
  blockDef,
  isTrigger,
} from './blocksModel';
import { useDemoMode } from '@/pages/try/demoMode';
import { useBlocksStore } from './blocksStore';
import { useBlocksTheme } from './blocksTheme';
import { captureBlocksThumbnail } from './thumbnail';
import { saveThumbnail } from '../playground/projectPersistence';
import { BlocksRunner, startState, type SpriteState } from './interpreter';
import { BlockChip } from './BlockChip';
import { CHARACTER_GROUPS, SCENES, sceneId } from './library';
import { sfx, isMuted, setMuted } from './sounds';
import { BlocksSharePanel } from './BlocksSharePanel';
import './blocks.css';

const SAVE_DEBOUNCE_MS = 800;

// ── block drag tuning (touch-first) ──────────────────────────────────────────
// On a tablet a finger that starts on a block must be free to SCROLL the list;
// only a deliberate HOLD lifts the block to drag. So: touch waits for a short
// long-press (and cancels if the finger moves first = a scroll); mouse starts
// on a tiny move threshold. While a drag is active we lock page scrolling with a
// non-passive touchmove listener (touch-action alone can't be flipped mid-touch).
const LONGPRESS_MS = 180;
const TOUCH_CANCEL_PX = 12; // finger travels this far before the hold fires → it's a scroll
const MOUSE_DRAG_PX = 6; // mouse moves this far → start dragging
const preventTouchMove = (e: TouchEvent) => {
  if (e.cancelable) e.preventDefault();
};
function lockTouchScroll() {
  document.addEventListener('touchmove', preventTouchMove, { passive: false });
}
function unlockTouchScroll() {
  document.removeEventListener('touchmove', preventTouchMove);
}

type SaveStatus = 'saved' | 'saving' | 'offline';

export function BlocksStudioPage({ projectId: projectIdProp }: { projectId?: string } = {}) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  // The public /try/blocks demo mounts this page directly (no route param) with
  // a fixed demo id; everywhere else the authed route param wins (unchanged).
  const projectId = projectIdProp ?? routeProjectId;
  // Try-demo (try-demo-mode-prd D-DEMO-08): cloud share is hidden in the demo —
  // sharing needs a real account; the demo banner explains nothing is saved.
  const demo = useDemoMode();
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
  const [scenePick, setScenePick] = useState(false);
  const [charTab, setCharTab] = useState(0);
  const [muted, setMutedState] = useState(isMuted());
  const [confirmReset, setConfirmReset] = useState(false);
  // secondary toolbar actions collapse into a "⋯ More" menu so the bar stays
  // uncluttered (especially in portrait). Anchored below the button.
  const [moreAnchor, setMoreAnchor] = useState<{ right: number; top: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  // Theme follows the system by default; the toolbar 🌙/☀️ overrides + persists.
  // Shared via a store so the Learn top bar flips with the studio (blocksTheme).
  const theme = useBlocksTheme((s) => s.theme);
  const toggleTheme = useBlocksTheme((s) => s.toggle);
  // The friend picker floats in a portal (the character rail clips overflow +
  // has a backdrop-filter, which would otherwise trap/cut off an absolute popup).
  const [friendPos, setFriendPos] = useState<{ left: number; top: number } | null>(null);
  const pickFriend = friendPos !== null;
  // live sprite states while/after a run (charId → state+duration); null = start poses
  const [runStates, setRunStates] = useState<Map<string, { st: SpriteState; dur: number }> | null>(null);
  const [says, setSays] = useState<Map<string, string>>(new Map());
  // the block each character is executing right now → "lit" glow (charId → "scriptId:index")
  const [activeBlocks, setActiveBlocks] = useState<Map<string, string>>(new Map());

  const versionRef = useRef(0);
  const otherFilesRef = useRef<Awaited<ReturnType<typeof loadBlocksProject>>['otherFiles']>([]);
  const runnerRef = useRef<BlocksRunner | null>(null);

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

  // Immersive tablet mode (page-scroll lock + browser fullscreen) is owned by
  // LearnLayout, keyed on the route — so it survives this page's remounts and
  // can't flicker out/in. Going Home navigates to the (non-immersive) hub, which
  // restores normal browsing.

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
  const undo = useCallback(() => {
    sfx.snap();
    useBlocksStore.getState().undo();
  }, []);
  const redo = useCallback(() => {
    sfx.pop();
    useBlocksStore.getState().redo();
  }, []);
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, undo, redo]);

  // edits & page switches invalidate the live run view
  useEffect(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    setRunStates(null);
    setSays(new Map());
    setActiveBlocks(new Map());
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
      onPop: sfx.pop,
      onGotoPage: (idx) => {
        const target = useBlocksStore.getState().project.pages[idx];
        if (target) useBlocksStore.getState().selectPage(target.id);
      },
      // key the live highlight by SCRIPT, not character — a character can run
      // several tracks at once, and each track's current block must glow
      // simultaneously (ScratchJr highlights the running block in every thread).
      onStep: (_charId, scriptId, index) =>
        setActiveBlocks((prev) => {
          const next = new Map(prev);
          if (index < 0) next.delete(scriptId);
          else next.set(scriptId, `${scriptId}:${index}`);
          return next;
        }),
    });
    runnerRef.current = runner;
    return runner;
  }, [page]);

  // fast lookup for the "lit" glow: the set of "scriptId:index" running now
  const activeKeys = useMemo(() => new Set(activeBlocks.values()), [activeBlocks]);

  const go = useCallback(() => {
    if (running) return;
    setRunning(true);
    const runner = makeRunner();
    runner.resetAll();
    sfx.go();
    void runner.runFlag().finally(() => setRunning(false));
  }, [running, makeRunner]);

  const reset = useCallback(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    setRunStates(null);
    setSays(new Map());
    setActiveBlocks(new Map());
    setRunning(false);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.tap(); // a little blip to confirm sound is back on
  }, []);

  // close the "⋯ More" menu on outside-click / Escape
  useEffect(() => {
    if (!moreAnchor) return undefined;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (moreBtnRef.current?.contains(t) || t.closest('[data-testid="more-menu"]')) return;
      setMoreAnchor(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreAnchor(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [moreAnchor]);

  const tapSprite = useCallback(
    (id: string) => {
      const runner = runnerRef.current ?? makeRunner();
      void runner.runTap(id);
    },
    [makeRunner],
  );

  // ── character picker: a centered modal sheet (big library, kid-friendly) ──
  const openFriendPicker = useCallback(() => {
    sfx.tap();
    setFriendPos({ left: 0, top: 0 });
  }, []);

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
    if (!dragMoved.current) sfx.pickup();
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

  // shared: the script row + insertion slot under a point. Scans EVERY track so
  // a block can be dropped into a different track (cross-track move) and the
  // palette can insert anywhere. `exclude` skips the block being dragged while
  // it's still sitting in its own row.
  const scanRows = (
    x: number,
    y: number,
    exclude?: { scriptId: string; index: number },
  ): { scriptId: string; slot: number; dropX: number } | null => {
    const rows = [
      ...document.querySelectorAll<HTMLElement>('[data-testid^="script-"]:not([data-testid="script-area"])'),
    ];
    for (const row of rows) {
      const rr = row.getBoundingClientRect();
      const pad = 18;
      if (x < rr.left - pad || x > rr.right + pad || y < rr.top - pad || y > rr.bottom + pad) continue;
      const scriptId = row.getAttribute('data-testid')!.slice('script-'.length);
      const items = [...row.querySelectorAll<HTMLElement>('.bsx-block')];
      let slot = items.length;
      let dropX = items.length ? items[items.length - 1].getBoundingClientRect().right - rr.left + 2 : 0;
      for (let i = 1; i < items.length; i += 1) {
        if (exclude && exclude.scriptId === scriptId && i === exclude.index) continue;
        const r = items[i].getBoundingClientRect();
        if (x < r.left + r.width / 2) {
          slot = i;
          dropX = r.left - rr.left - 2;
          break;
        }
      }
      return { scriptId, slot: Math.max(1, slot), dropX };
    }
    return null;
  };

  // ── reorder/move an existing block: HOLD-to-lift, drag across tracks, or drop
  //    on the BIN to remove. (Mouse starts on a tiny move; touch needs a short
  //    hold so a quick swipe still scrolls the program list.) ────────────────
  const binRef = useRef<HTMLDivElement>(null);
  const [binArmed, setBinArmed] = useState(false);
  const overBin = (x: number, y: number) => {
    const r = binRef.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 16;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };
  const blockDrag = useRef<{
    scriptId: string;
    index: number;
    x0: number;
    y0: number;
    lastX: number;
    lastY: number;
    pointerId: number;
    touch: boolean;
    el: HTMLElement;
  } | null>(null);
  const blockLP = useRef<number | undefined>(undefined);
  const blockDidDrag = useRef(false);
  const [dragBlk, setDragBlk] = useState<{
    scriptId: string;
    index: number;
    cx: number;
    cy: number;
    onBin: boolean;
    targetScriptId: string | null;
    targetSlot: number | null;
    dropX: number | null;
  } | null>(null);

  const blockDragUpdate = (x: number, y: number) => {
    const d = blockDrag.current;
    if (!d) return;
    const onBin = overBin(x, y);
    setBinArmed(onBin);
    let targetScriptId: string | null = null;
    let targetSlot: number | null = null;
    let dropX: number | null = null;
    if (!onBin && d.index > 0) {
      const hit = scanRows(x, y, { scriptId: d.scriptId, index: d.index });
      if (hit) {
        targetScriptId = hit.scriptId;
        targetSlot = hit.slot;
        dropX = hit.dropX;
      }
    }
    setDragBlk({ scriptId: d.scriptId, index: d.index, cx: x, cy: y, onBin, targetScriptId, targetSlot, dropX });
  };
  const onBlockDown = (e: React.PointerEvent, scriptId: string, index: number) => {
    if (running || present) return;
    const touch = e.pointerType === 'touch';
    const el = e.currentTarget as HTMLElement;
    const { pointerId, clientX: x0, clientY: y0 } = e;
    blockDrag.current = { scriptId, index, x0, y0, lastX: x0, lastY: y0, pointerId, touch, el };
    blockDidDrag.current = false;
    window.clearTimeout(blockLP.current);
    if (touch) {
      blockLP.current = window.setTimeout(() => {
        const d = blockDrag.current;
        if (!d || blockDidDrag.current) return;
        blockDidDrag.current = true;
        sfx.pickup();
        try { d.el.setPointerCapture(d.pointerId); } catch { /* ignore */ }
        lockTouchScroll();
        navigator.vibrate?.(8);
        blockDragUpdate(d.lastX, d.lastY);
      }, LONGPRESS_MS);
    }
  };
  const onBlockMove = (e: React.PointerEvent) => {
    const d = blockDrag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    if (!blockDidDrag.current) {
      const moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (d.touch) {
        if (moved > TOUCH_CANCEL_PX) {
          window.clearTimeout(blockLP.current);
          blockDrag.current = null; // they're scrolling, not dragging
        }
        return;
      }
      if (moved <= MOUSE_DRAG_PX) return;
      blockDidDrag.current = true;
      sfx.pickup();
      try { d.el.setPointerCapture(d.pointerId); } catch { /* ignore */ }
    }
    blockDragUpdate(e.clientX, e.clientY);
  };
  const endBlockDrag = (commit: boolean) => {
    window.clearTimeout(blockLP.current);
    unlockTouchScroll();
    const info = dragBlk;
    const d = blockDrag.current;
    blockDrag.current = null;
    setDragBlk(null);
    setBinArmed(false);
    if (commit && blockDidDrag.current && info && d) {
      if (info.onBin) {
        sfx.trash();
        useBlocksStore.getState().removeBlock(d.scriptId, d.index);
      } else if (info.targetScriptId && (info.targetScriptId !== d.scriptId || info.targetSlot !== d.index)) {
        sfx.snap();
        useBlocksStore
          .getState()
          .moveBlockAcross(d.scriptId, d.index, info.targetScriptId, info.targetSlot ?? 1);
      }
    }
    setTimeout(() => (blockDidDrag.current = false), 0);
  };
  const onBlockUp = () => endBlockDrag(true);
  const onBlockCancel = () => endBlockDrag(false);

  // ── palette block: TAP appends, HOLD-and-drag drops it at any slot (across any
  //    track). Same hold-to-lift + scroll-lock so the palette stays scrollable. ─
  const palDrag = useRef<{
    op: BlockOp;
    x0: number;
    y0: number;
    lastX: number;
    lastY: number;
    pointerId: number;
    touch: boolean;
    el: HTMLElement;
  } | null>(null);
  const palLP = useRef<number | undefined>(undefined);
  const palDidDrag = useRef(false);
  const [palBlk, setPalBlk] = useState<{
    op: BlockOp;
    cx: number;
    cy: number;
    scriptId: string | null;
    slot: number;
    dropX: number | null;
  } | null>(null);

  const palDragUpdate = (x: number, y: number) => {
    const d = palDrag.current;
    if (!d) return;
    const hit = isTrigger(d.op) ? null : scanRows(x, y);
    setPalBlk({ op: d.op, cx: x, cy: y, scriptId: hit?.scriptId ?? null, slot: hit?.slot ?? 0, dropX: hit?.dropX ?? null });
  };
  const onPalDown = (e: React.PointerEvent, op: BlockOp) => {
    if (running || present) return;
    const touch = e.pointerType === 'touch';
    const el = e.currentTarget as HTMLElement;
    const { pointerId, clientX: x0, clientY: y0 } = e;
    palDrag.current = { op, x0, y0, lastX: x0, lastY: y0, pointerId, touch, el };
    palDidDrag.current = false;
    window.clearTimeout(palLP.current);
    if (touch) {
      palLP.current = window.setTimeout(() => {
        const d = palDrag.current;
        if (!d || palDidDrag.current) return;
        palDidDrag.current = true;
        sfx.pickup();
        try { d.el.setPointerCapture(d.pointerId); } catch { /* ignore */ }
        lockTouchScroll();
        navigator.vibrate?.(8);
        palDragUpdate(d.lastX, d.lastY);
      }, LONGPRESS_MS);
    }
  };
  const onPalMove = (e: React.PointerEvent) => {
    const d = palDrag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    if (!palDidDrag.current) {
      const moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (d.touch) {
        if (moved > TOUCH_CANCEL_PX) {
          window.clearTimeout(palLP.current);
          palDrag.current = null;
        }
        return;
      }
      if (moved <= MOUSE_DRAG_PX) return;
      palDidDrag.current = true;
      sfx.pickup();
      try { d.el.setPointerCapture(d.pointerId); } catch { /* ignore */ }
    }
    palDragUpdate(e.clientX, e.clientY);
  };
  const endPalDrag = (op: BlockOp, commit: boolean) => {
    window.clearTimeout(palLP.current);
    unlockTouchScroll();
    const info = palBlk;
    const d = palDrag.current;
    palDrag.current = null;
    setPalBlk(null);
    const store = useBlocksStore.getState();
    if (commit) {
      if (palDidDrag.current) {
        if (info && info.scriptId) {
          sfx.snap();
          store.insertBlock(d?.op ?? op, info.scriptId, info.slot);
        } else {
          sfx.place();
          store.addBlock(d?.op ?? op);
        }
      } else {
        // a clean tap → add to the bottom of the latest script
        sfx.place();
        store.addBlock(op);
      }
    }
    setTimeout(() => (palDidDrag.current = false), 0);
  };
  const onPalUp = (op: BlockOp) => endPalDrag(op, true);
  const onPalCancel = (op: BlockOp) => endPalDrag(op, false);

  // ── tap a whole block to EDIT it (number stepper / Say text) ─────────────
  const [editBlk, setEditBlk] = useState<{ scriptId: string; index: number; left: number; top: number } | null>(null);
  const onBlockTap = (e: React.MouseEvent, scriptId: string, index: number, op: string) => {
    if (blockDidDrag.current) return; // it was a drag, not a tap
    const def = blockDef(op as BlockOp);
    // speed / message-colour blocks cycle their value on tap (no number editor)
    if (def.param === 'speed') {
      sfx.numUp();
      useBlocksStore.getState().cycleParam(scriptId, index, MAX_SPEED);
      return;
    }
    if (def.param === 'color') {
      sfx.tap();
      useBlocksStore.getState().cycleParam(scriptId, index, MAX_COLOR);
      return;
    }
    if (!def.hasN && op !== 'say') return; // nothing to edit on this block
    sfx.tap();
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
  // the Page block targets an existing page only, so its stepper caps at the page
  // count; every other number tile uses the generic 1..MAX_PARAM range.
  const editMax = editing?.block.op === 'goto_page' ? project.pages.length : MAX_PARAM;
  // the block under the pointer while dragging — rendered as a fixed clone
  const draggingBlock = (() => {
    if (!dragBlk) return null;
    const script = selectedChar?.scripts.find((s) => s.id === dragBlk.scriptId);
    const blk = script?.blocks[dragBlk.index];
    return blk ? { block: blk } : null;
  })();

  // never leave the page-scroll lock on if we unmount mid-drag
  useEffect(() => () => unlockTouchScroll(), []);

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
  const activeCat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

  return (
    <div className={`bsx bsx-app${present ? ' present' : ''}`} data-theme={theme} data-testid="blocks-studio">
      {/* ── toolbar ── */}
      <header className="bsx-card flex items-center gap-2 rounded-3xl px-3 py-2">
        {/* Try-demo: Home exits to the marketing "Try it" page, not the authed hub. */}
        {demo?.exitHref ? (
          <a
            href={demo.exitHref}
            data-testid="demo-home"
            className="bsx-press grid h-11 w-11 place-items-center text-[20px]"
            title="Back to Try it"
          >
            🏠
          </a>
        ) : (
          <Link
            to="/learn/create/blocks"
            className="bsx-press grid h-11 w-11 place-items-center text-[20px]"
            title="Save & back"
          >
            🏠
          </Link>
        )}
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
          className={`bsx-press grid h-11 w-11 place-items-center${muted ? ' bsx-muted-on' : ''}`}
          onClick={toggleMute}
          data-testid="mute-toggle"
          aria-pressed={muted}
          title={muted ? 'Sounds are OFF — tap to turn on' : 'Sounds are ON — tap to mute'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        {projectId && !demo && <BlocksSharePanel projectId={projectId} theme={theme} />}
        <button
          ref={moreBtnRef}
          type="button"
          className="bsx-press grid h-11 w-11 place-items-center"
          data-testid="more-menu-btn"
          aria-haspopup="menu"
          aria-expanded={moreAnchor !== null}
          title="More"
          onClick={() => {
            sfx.tap();
            const r = moreBtnRef.current?.getBoundingClientRect();
            setMoreAnchor((a) =>
              a ? null : r ? { right: window.innerWidth - r.right, top: r.bottom + 6 } : null,
            );
          }}
        >
          <MoreHorizontal size={20} />
        </button>
        <button
          type="button"
          data-testid="go-button"
          onClick={go}
          disabled={running}
          className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-brand-mint px-6 text-[16px] font-extrabold text-white shadow-brand-mint transition hover:-translate-y-0.5 disabled:opacity-60"
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
                    sfx.trash();
                    useBlocksStore.getState().removeCharacter(c.id);
                  }}
                >
                  ✕
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            data-testid="add-character"
            onClick={openFriendPicker}
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
            data-scene={sceneId(page.background)}
            className="bsx-stage min-h-[180px] flex-1"
          >
            <div className="bsx-grid" />
            {/* animated scene decorations (CSS draws the rest per [data-scene]) */}
            <div className="bsx-deco bsx-deco-a" />
            <div className="bsx-deco bsx-deco-b" />
            <div className="bsx-deco bsx-deco-c" />
            <div className="bsx-hill" />
            {/* change the scene — a big picture library */}
            <button
              type="button"
              data-testid="scene-btn"
              className="bsx-scene-btn"
              title="Change the background"
              onClick={() => {
                sfx.tap();
                setScenePick((v) => !v);
              }}
            >
              <ImageIcon size={20} />
            </button>
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
                    onContextMenu={(e) => e.preventDefault()}
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
        </div>

        <aside className="bsx-railbox" style={{ gridArea: 'pages' }} aria-label="Pages">
          {project.pages.map((p, i) => (
            <div key={p.id} className="relative w-full max-w-[96px]">
              <button
                type="button"
                data-testid={`page-thumb-${i}`}
                onClick={() => { sfx.page(); useBlocksStore.getState().selectPage(p.id); }}
                className={`bsx-press bsx-stage bsx-pagethumb${p.id === page.id ? ' sel' : ''}`}
                data-scene={sceneId(p.background)}
                style={{ aspectRatio: '4/3' }}
                title={`Page ${i + 1}`}
              >
                <span className="bsx-hill" />
                <span className="bsx-pagethumb-n">{i + 1}</span>
                <span className="bsx-pagethumb-emoji">{p.characters[0]?.emoji ?? '🧩'}</span>
              </button>
              {project.pages.length > 1 && (
                <button
                  type="button"
                  data-testid={`remove-page-${i}`}
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-coral text-[11px] font-bold text-white shadow"
                  title={`Remove page ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.trash();
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
              onClick={() => { sfx.add(); useBlocksStore.getState().addPage(); }}
              className="grid w-full max-w-[96px] place-items-center rounded-xl border-2 border-dashed border-brand-coral/50 text-[22px] text-brand-coral"
              style={{ aspectRatio: '4/3' }}
              title="Add a page"
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
              onClick={() => { sfx.tap(); setCategory(c.id); }}
              title={`${c.label} blocks`}
            >
              <span>{c.icon}</span>
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          <div className="bsx-soft bsx-palette flex items-center gap-4 overflow-x-auto rounded-3xl px-4 pb-4 pt-3" data-testid="palette" data-cat={category}>
            <span className="bsx-palette-tag shrink-0">
              <span aria-hidden>{activeCat.icon}</span>
              {activeCat.label}
            </span>
            {paletteBlocks.map((def) => (
              <BlockChip
                key={def.op}
                block={{ op: def.op, ...(def.hasN ? { n: def.defaultN } : {}) }}
                style={palBlk?.op === def.op ? { opacity: 0.4 } : undefined}
                onPointerDown={(e) => onPalDown(e, def.op)}
                onPointerMove={onPalMove}
                onPointerUp={() => onPalUp(def.op)}
                onPointerCancel={() => onPalCancel(def.op)}
                title={`Tap to add "${def.label}" — or hold and drag it into ${selectedChar?.name}'s program`}
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
              const isDragSource = !!dragBlk && dragBlk.scriptId === script.id;
              // the insertion bar shows in whichever track the block is heading
              // for — which may be a DIFFERENT track (cross-track move).
              const showReorderBar =
                !!dragBlk && !dragBlk.onBin && dragBlk.targetScriptId === script.id && dragBlk.dropX !== null;
              return (
                <div
                  key={script.id}
                  className="bsx-chainwrap relative mb-3 flex w-max items-center rounded-2xl p-2.5 pr-4"
                  data-testid={`script-${script.id}`}
                >
                  {script.blocks.map((b, i) => {
                    const isDragged = isDragSource && dragBlk!.index === i;
                    const def = blockDef(b.op);
                    return (
                      <BlockChip
                        key={`${script.id}-${i}`}
                        block={b}
                        inChain
                        isLast={i === script.blocks.length - 1}
                        lit={activeKeys.has(`${script.id}:${i}`)}
                        dragging={isDragged}
                        // the original stays put (dimmed) while a fixed clone
                        // follows the pointer — so it can't be clipped by the
                        // script-area's overflow or pushed behind the bin, and
                        // dragging never adds a horizontal scrollbar.
                        style={isDragged ? { opacity: 0.28 } : undefined}
                        onPointerDown={(e) => onBlockDown(e, script.id, i)}
                        onPointerMove={onBlockMove}
                        onPointerUp={onBlockUp}
                        onPointerCancel={onBlockCancel}
                        onTap={(e) => onBlockTap(e, script.id, i, b.op)}
                        title={
                          def.hasN
                            ? 'Tap to change the number · hold to drag · drag to the bin to remove'
                            : b.op === 'say'
                              ? 'Tap to change the words · hold to drag · drag to the bin to remove'
                              : 'Hold to drag · drag to another track or the bin'
                        }
                      />
                    );
                  })}
                  {/* reorder / cross-track insertion bar */}
                  {showReorderBar && <span className="bsx-dropbar" style={{ left: dragBlk!.dropX! }} />}
                  {/* palette-drop insertion bar */}
                  {palBlk && palBlk.scriptId === script.id && palBlk.dropX !== null && (
                    <span className="bsx-dropbar" style={{ left: palBlk.dropX }} />
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
        createPortal(
          <div className="bsx bsx-sheet-bg" data-theme={theme} onPointerDown={() => setFriendPos(null)}>
            <div
              data-testid="friend-picker"
              className="bsx-sheet"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="bsx-sheet-head">
                <span>Pick a friend ✨</span>
                <button type="button" className="bsx-press bsx-sheet-x" onClick={() => setFriendPos(null)}>
                  ✕
                </button>
              </div>
              <div className="bsx-sheet-tabs">
                {CHARACTER_GROUPS.map((g, i) => (
                  <button
                    key={g.label}
                    type="button"
                    className="bsx-tab"
                    aria-pressed={charTab === i}
                    onClick={() => {
                      sfx.tap();
                      setCharTab(i);
                    }}
                  >
                    <span>{g.emoji}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
              <div className="bsx-sheet-grid">
                {CHARACTER_GROUPS[charTab].items.map((f) => (
                  <button
                    key={f.emoji}
                    type="button"
                    className="bsx-pick"
                    title={f.name}
                    onClick={() => {
                      sfx.add();
                      useBlocksStore.getState().addCharacter(f.emoji, f.name);
                      setFriendPos(null);
                    }}
                  >
                    {f.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* scene / background picker — a big picture library */}
      {scenePick &&
        createPortal(
          <div className="bsx bsx-sheet-bg" data-theme={theme} onPointerDown={() => setScenePick(false)}>
            <div data-testid="scene-picker" className="bsx-sheet" onPointerDown={(e) => e.stopPropagation()}>
              <div className="bsx-sheet-head">
                <span>Pick a scene 🏞</span>
                <button type="button" className="bsx-press bsx-sheet-x" onClick={() => setScenePick(false)}>
                  ✕
                </button>
              </div>
              <div className="bsx-scene-grid">
                {SCENES.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    data-testid={`scene-${sc.id}`}
                    className={`bsx-scene-tile bsx-stage${sceneId(page.background) === sc.id ? ' sel' : ''}`}
                    data-scene={sc.id}
                    title={sc.label}
                    onClick={() => {
                      sfx.add();
                      useBlocksStore.getState().setBackground(sc.id);
                      setScenePick(false);
                    }}
                  >
                    <span className="bsx-scene-name">{sc.emoji} {sc.label}</span>
                  </button>
                ))}
              </div>
            </div>
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
                : editing.block.op === 'goto_page'
                  ? `Which page? (1–${project.pages.length})`
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
                  disabled={(editing.block.n ?? 1) <= 1}
                  onClick={() => {
                    sfx.numDown();
                    useBlocksStore
                      .getState()
                      .setParam(editing.scriptId, editing.index, (editing.block.n ?? 1) - 1, editMax);
                  }}
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
                  onClick={() => {
                    sfx.numUp();
                    useBlocksStore
                      .getState()
                      .setParam(editing.scriptId, editing.index, (editing.block.n ?? 1) + 1, editMax);
                  }}
                  disabled={(editing.block.n ?? 1) >= editMax}
                >
                  +
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* ── "⋯ More" menu — secondary actions (keeps the bar uncluttered) ── */}
      {moreAnchor &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            data-testid="more-menu"
            style={{ position: 'fixed', right: moreAnchor.right, top: moreAnchor.top, zIndex: 80 }}
          >
            <div className="bsx-menu" role="menu">
              <button
                type="button"
                className="bsx-menu-row"
                data-testid="theme-toggle"
                onClick={() => { toggleTheme(); setMoreAnchor(null); }}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Day mode' : 'Night mode'}</span>
              </button>
              <button
                type="button"
                className="bsx-menu-row"
                data-testid="reset-button"
                onClick={() => { sfx.tap(); setMoreAnchor(null); setConfirmReset(true); }}
              >
                <RotateCcw size={18} />
                <span>Reset</span>
              </button>
              <button
                type="button"
                className="bsx-menu-row"
                data-testid="present-toggle"
                onClick={() => { setMoreAnchor(null); setPresent((p) => !p); }}
              >
                <Expand size={18} />
                <span>{present ? 'Exit big screen' : 'Big screen'}</span>
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* ── reset confirmation — friendly, reversible-sounding, kid-readable ── */}
      {confirmReset &&
        createPortal(
          <div className="bsx bsx-sheet-bg" data-theme={theme} onPointerDown={() => setConfirmReset(false)}>
            <div className="bsx-confirm" data-testid="reset-confirm" onPointerDown={(e) => e.stopPropagation()}>
              <div className="bsx-confirm-icon">
                <RotateCcw size={34} />
              </div>
              <div className="bsx-confirm-title">Start over?</div>
              <div className="bsx-confirm-text">
                Everyone hops back to their start spots. Your blocks stay just the way you made them. ✨
              </div>
              <div className="bsx-confirm-btns">
                <button
                  type="button"
                  className="bsx-confirm-cancel"
                  onClick={() => { sfx.tap(); setConfirmReset(false); }}
                >
                  Keep playing
                </button>
                <button
                  type="button"
                  className="bsx-confirm-ok"
                  data-testid="reset-confirm-ok"
                  onClick={() => { sfx.page(); reset(); setConfirmReset(false); }}
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* drag clone — a fixed copy that follows the pointer, ABOVE everything
          (incl. the bin) and never clipped by the script area's overflow */}
      {dragBlk &&
        draggingBlock &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            style={{
              position: 'fixed',
              left: dragBlk.cx,
              top: dragBlk.cy,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1.08) rotate(-2deg)',
            }}
          >
            <BlockChip block={draggingBlock.block} inChain removing={dragBlk.onBin} />
          </div>,
          document.body,
        )}

      {/* palette drag clone — same fixed-above-everything trick */}
      {palBlk &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            style={{
              position: 'fixed',
              left: palBlk.cx,
              top: palBlk.cy,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1.08) rotate(-2deg)',
            }}
          >
            <BlockChip
              block={{ op: palBlk.op, ...(blockDef(palBlk.op).hasN ? { n: blockDef(palBlk.op).defaultN } : {}) }}
              inChain
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
