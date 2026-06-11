// Blocks Studio editor state (learn-blocks-studio-prd.md §7/§8). The single
// funnel for every program mutation. Every change goes through `_commit`, which
// records an undo snapshot (with coalescing so a drag / stepper session is ONE
// undo step) — so undo/redo cover all editing steps. The studio watches `dirty`
// to drive the debounced autosave; `past`/`future` are persisted alongside the
// project (sidecar `project.blocks.history.json`) so undo survives a reload.

import { create } from 'zustand';

import {
  type Block,
  type BlockOp,
  type BlocksProject,
  type Character,
  type Page,
  GRID_H,
  GRID_W,
  MAX_PAGES,
  MAX_PARAM,
  blankProject,
  blockDef,
  isTrigger,
  newId,
} from './blocksModel';

/** One undo/redo snapshot: the whole project + which page/character was open. */
export interface HistoryEntry {
  project: BlocksProject;
  pageId: string;
  charId: string;
}

/** Keep undo bounded so the persisted sidecar can't grow without limit. */
export const HISTORY_CAP = 40;

interface BlocksStore {
  project: BlocksProject;
  pageId: string;
  charId: string;
  /** Monotonic change counter — the autosave effect subscribes to this. */
  dirty: number;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Internal: coalescing tag so consecutive same-session edits = one undo step. */
  _lastTag: string | null;

  load: (project: BlocksProject) => void;
  /** Restore a persisted undo/redo stack (on project open). */
  setHistory: (past: HistoryEntry[], future: HistoryEntry[]) => void;
  undo: () => void;
  redo: () => void;
  /** End a coalescing session (drag/stepper) so the next edit is a fresh step. */
  endCoalesce: () => void;

  selectPage: (pageId: string) => void;
  selectChar: (charId: string) => void;
  addPage: () => void;
  removePage: (pageId: string) => void;
  /** Set the current page's scene background (the scene library, library.ts). */
  setBackground: (bg: string) => void;
  addCharacter: (emoji: string, name: string) => void;
  removeCharacter: (charId: string) => void;
  /** Append a block: a trigger starts a NEW script; anything else extends the
   *  last script (auto-opening a 🚩 script so a lone "move" still runs). */
  addBlock: (op: BlockOp) => void;
  /** Insert a body block at an exact position (drag-from-palette to a slot).
   *  Triggers can't be inserted mid-script; index is clamped to 1..len. */
  insertBlock: (op: BlockOp, scriptId: string, index: number) => void;
  /** Remove a block (the trigger removes its whole script). */
  removeBlock: (scriptId: string, index: number) => void;
  cycleParam: (scriptId: string, index: number) => void;
  /** Set an exact param value (the +/− stepper editor). Clamped 1..MAX_PARAM. */
  setParam: (scriptId: string, index: number, n: number) => void;
  setSayText: (scriptId: string, index: number, text: string) => void;
  /** Reorder a block within its script — drag to change execution order. The
   *  trigger (index 0) stays first; body blocks reorder among 1..n. */
  moveBlock: (scriptId: string, from: number, to: number) => void;
  moveCharacter: (charId: string, gx: number, gy: number) => void;

  /** Internal: apply a mutation + record history. Producer returns the next
   *  {project,pageId?,charId?} or null for a no-op (no history entry). */
  _commit: (
    producer: (s: BlocksStore) => Partial<Pick<BlocksStore, 'project' | 'pageId' | 'charId'>> | null,
    coalesce?: string,
  ) => void;
}

function currentPage(p: BlocksProject, pageId: string): Page {
  return p.pages.find((pg) => pg.id === pageId) ?? p.pages[0];
}
function currentChar(page: Page, charId: string): Character {
  return page.characters.find((c) => c.id === charId) ?? page.characters[0];
}
function snap(s: BlocksStore): HistoryEntry {
  return { project: s.project, pageId: s.pageId, charId: s.charId };
}

/** Immutable update of one character on one page. */
function patchChar(
  project: BlocksProject,
  pageId: string,
  charId: string,
  fn: (c: Character) => Character,
): BlocksProject {
  return {
    ...project,
    pages: project.pages.map((pg) =>
      pg.id !== pageId
        ? pg
        : { ...pg, characters: pg.characters.map((c) => (c.id !== charId ? c : fn(c))) },
    ),
  };
}

export const useBlocksStore = create<BlocksStore>((set, get) => ({
  project: blankProject(),
  pageId: '',
  charId: '',
  dirty: 0,
  past: [],
  future: [],
  _lastTag: null,

  load(project) {
    const page = project.pages[0];
    set({
      project,
      pageId: page.id,
      charId: page.characters[0]?.id ?? '',
      dirty: 0,
      past: [],
      future: [],
      _lastTag: null,
    });
  },

  setHistory(past, future) {
    set({ past, future, _lastTag: null });
  },

  _commit(producer, coalesce) {
    set((s) => {
      const patch = producer(s);
      if (!patch) return s; // no-op → no history entry
      const merge = coalesce != null && coalesce === s._lastTag;
      return {
        ...patch,
        past: merge ? s.past : [...s.past, snap(s)].slice(-HISTORY_CAP),
        future: [],
        dirty: s.dirty + 1,
        _lastTag: coalesce ?? null,
      };
    });
  },

  undo() {
    set((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        project: prev.project,
        pageId: prev.pageId,
        charId: prev.charId,
        past: s.past.slice(0, -1),
        future: [snap(s), ...s.future].slice(0, HISTORY_CAP),
        dirty: s.dirty + 1,
        _lastTag: null,
      };
    });
  },

  redo() {
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        project: next.project,
        pageId: next.pageId,
        charId: next.charId,
        past: [...s.past, snap(s)].slice(-HISTORY_CAP),
        future: s.future.slice(1),
        dirty: s.dirty + 1,
        _lastTag: null,
      };
    });
  },

  endCoalesce() {
    set({ _lastTag: null });
  },

  // ── selection (NOT undoable on its own; captured inside mutation snapshots) ─
  selectPage(pageId) {
    const page = currentPage(get().project, pageId);
    set({ pageId: page.id, charId: page.characters[0]?.id ?? '' });
  },
  selectChar(charId) {
    set({ charId });
  },

  addPage() {
    get()._commit((s) => {
      if (s.project.pages.length >= MAX_PAGES) return null;
      const char: Character = {
        id: newId('char'),
        name: 'Cat',
        emoji: '🐱',
        start: { gx: 5, gy: 10, size: 1, rot: 0 },
        scripts: [],
      };
      const page: Page = { id: newId('page'), background: 'meadow', characters: [char] };
      return {
        project: { ...s.project, pages: [...s.project.pages, page] },
        pageId: page.id,
        charId: char.id,
      };
    });
  },

  removePage(pageId) {
    get()._commit((s) => {
      if (s.project.pages.length <= 1) return null; // a project always keeps one page
      const idx = s.project.pages.findIndex((p) => p.id === pageId);
      if (idx < 0) return null;
      const pages = s.project.pages.filter((p) => p.id !== pageId);
      const fallback = pages[Math.min(idx, pages.length - 1)];
      const removingCurrent = s.pageId === pageId;
      return {
        project: { ...s.project, pages },
        pageId: removingCurrent ? fallback.id : s.pageId,
        charId: removingCurrent ? (fallback.characters[0]?.id ?? '') : s.charId,
      };
    });
  },

  setBackground(bg) {
    get()._commit((s) => ({
      project: {
        ...s.project,
        pages: s.project.pages.map((pg) => (pg.id !== s.pageId ? pg : { ...pg, background: bg })),
      },
    }));
  },

  addCharacter(emoji, name) {
    get()._commit((s) => {
      const page = currentPage(s.project, s.pageId);
      const char: Character = {
        id: newId('char'),
        name,
        emoji,
        start: { gx: Math.min(GRID_W - 1, 8 + page.characters.length * 2), gy: 10, size: 1, rot: 0 },
        scripts: [],
      };
      return {
        project: {
          ...s.project,
          pages: s.project.pages.map((pg) =>
            pg.id !== s.pageId ? pg : { ...pg, characters: [...pg.characters, char] },
          ),
        },
        charId: char.id,
      };
    });
  },

  removeCharacter(charId) {
    get()._commit((s) => {
      const page = currentPage(s.project, s.pageId);
      if (page.characters.length <= 1) return null; // a page always keeps one friend
      const next = {
        ...s.project,
        pages: s.project.pages.map((pg) =>
          pg.id !== s.pageId ? pg : { ...pg, characters: pg.characters.filter((c) => c.id !== charId) },
        ),
      };
      const remaining = currentPage(next, s.pageId).characters;
      return { project: next, charId: s.charId === charId ? (remaining[0]?.id ?? '') : s.charId };
    });
  },

  addBlock(op) {
    get()._commit((s) => {
      const def = blockDef(op);
      const block: Block = { op };
      if (def.hasN) block.n = def.defaultN ?? 1;
      if (op === 'say') block.text = 'Hi!';
      const cid = currentChar(currentPage(s.project, s.pageId), s.charId).id;
      return {
        project: patchChar(s.project, s.pageId, cid, (c) => {
          if (isTrigger(op)) {
            return { ...c, scripts: [...c.scripts, { id: newId('script'), blocks: [block] }] };
          }
          const last = c.scripts[c.scripts.length - 1];
          if (!last) {
            return { ...c, scripts: [{ id: newId('script'), blocks: [{ op: 'when_flag' }, block] }] };
          }
          return {
            ...c,
            scripts: c.scripts.map((sc, i) =>
              i === c.scripts.length - 1 ? { ...sc, blocks: [...sc.blocks, block] } : sc,
            ),
          };
        }),
      };
    });
  },

  insertBlock(op, scriptId, index) {
    if (isTrigger(op)) {
      get().addBlock(op);
      return;
    }
    get()._commit((s) => {
      const def = blockDef(op);
      const block: Block = { op };
      if (def.hasN) block.n = def.defaultN ?? 1;
      if (op === 'say') block.text = 'Hi!';
      return {
        project: patchChar(s.project, s.pageId, s.charId, (c) => ({
          ...c,
          scripts: c.scripts.map((sc) => {
            if (sc.id !== scriptId) return sc;
            const arr = [...sc.blocks];
            const at = Math.min(Math.max(1, index), arr.length);
            arr.splice(at, 0, block);
            return { ...sc, blocks: arr };
          }),
        })),
      };
    });
  },

  removeBlock(scriptId, index) {
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => ({
        ...c,
        scripts: c.scripts
          .map((sc) =>
            sc.id !== scriptId ? sc : { ...sc, blocks: sc.blocks.filter((_, i) => i !== index) },
          )
          .filter((sc) => sc.blocks.length > 0 && isTrigger(sc.blocks[0].op)),
      })),
    }));
  },

  cycleParam(scriptId, index) {
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => ({
        ...c,
        scripts: c.scripts.map((sc) =>
          sc.id !== scriptId
            ? sc
            : {
                ...sc,
                blocks: sc.blocks.map((b, i) =>
                  i !== index ? b : { ...b, n: ((b.n ?? 1) % MAX_PARAM) + 1 },
                ),
              },
        ),
      })),
    }));
  },

  setParam(scriptId, index, n) {
    const v = Math.min(MAX_PARAM, Math.max(1, Math.round(n)));
    get()._commit(
      (s) => ({
        project: patchChar(s.project, s.pageId, s.charId, (c) => ({
          ...c,
          scripts: c.scripts.map((sc) =>
            sc.id !== scriptId
              ? sc
              : { ...sc, blocks: sc.blocks.map((b, i) => (i !== index ? b : { ...b, n: v })) },
          ),
        })),
      }),
      `param:${scriptId}:${index}`,
    );
  },

  setSayText(scriptId, index, text) {
    get()._commit(
      (s) => ({
        project: patchChar(s.project, s.pageId, s.charId, (c) => ({
          ...c,
          scripts: c.scripts.map((sc) =>
            sc.id !== scriptId
              ? sc
              : { ...sc, blocks: sc.blocks.map((b, i) => (i !== index ? b : { ...b, text: text.slice(0, 60) })) },
          ),
        })),
      }),
      `say:${scriptId}:${index}`,
    );
  },

  moveBlock(scriptId, from, to) {
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => ({
        ...c,
        scripts: c.scripts.map((sc) => {
          if (sc.id !== scriptId) return sc;
          if (from <= 0 || from >= sc.blocks.length) return sc; // trigger stays first
          const arr = [...sc.blocks];
          const [moved] = arr.splice(from, 1);
          const dest = Math.min(Math.max(1, to), arr.length);
          arr.splice(dest, 0, moved);
          return { ...sc, blocks: arr };
        }),
      })),
    }));
  },

  moveCharacter(charId, gx, gy) {
    const cgx = Math.min(GRID_W - 1, Math.max(0, Math.round(gx)));
    const cgy = Math.min(GRID_H - 1, Math.max(0, Math.round(gy)));
    get()._commit(
      (s) => ({
        project: patchChar(s.project, s.pageId, charId, (c) => ({
          ...c,
          start: { ...c.start, gx: cgx, gy: cgy },
        })),
      }),
      `move:${charId}`,
    );
  },
}));
