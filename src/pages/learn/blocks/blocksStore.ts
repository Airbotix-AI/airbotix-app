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
  type BlockPath,
  type BlocksProject,
  type Character,
  type Page,
  GRID_H,
  GRID_W,
  MAX_COLOR,
  MAX_NOTE,
  MAX_PAGES,
  MAX_PARAM,
  MAX_SOUND,
  MAX_SPEED,
  blankProject,
  blockDef,
  defaultParam,
  isContainer,
  isTrigger,
  newId,
  pathIsWithin,
} from './blocksModel';

/** One undo/redo snapshot: the whole project + which page/character was open. */
export interface HistoryEntry {
  project: BlocksProject;
  pageId: string;
  charId: string;
}

/** Keep undo bounded so the persisted sidecar can't grow without limit. */
export const HISTORY_CAP = 40;

function newBlock(op: BlockOp, chosenN?: number): Block {
  const block: Block = { op };
  const def = blockDef(op);
  const fallback = defaultParam(op);
  if (chosenN !== undefined || fallback !== undefined) {
    const max = def.param === 'note'
      ? MAX_NOTE
      : def.param === 'sound'
        ? MAX_SOUND
      : def.param === 'color'
        ? MAX_COLOR
        : def.param === 'speed'
          ? MAX_SPEED
          : MAX_PARAM;
    block.n = Math.min(max, Math.max(1, Math.round(chosenN ?? fallback ?? 1)));
  }
  if (op === 'say') block.text = 'Hi!';
  return block;
}

function structuralBlocks(block: Block): Block[] {
  return isContainer(block.op) ? [{ ...block, body: [] }] : [block];
}

/** A freshly-created block ready to be placed (C-blocks get an empty body). */
function newStructuralBlock(op: BlockOp, chosenN?: number): Block {
  return structuralBlocks(newBlock(op, chosenN))[0];
}

/**
 * Immutably drop the block at `path` out of a script's tree. Returns the new
 * list plus the block that left, so a move is remove-then-insert with the
 * removed block carried across (see `moveBlockToPath`).
 */
function removeAtPath(blocks: Block[], path: BlockPath): { blocks: Block[]; removed: Block | null } {
  if (path.length === 0) return { blocks, removed: null };
  const [head, ...rest] = path;
  const target = blocks[head];
  if (!target) return { blocks, removed: null };
  if (rest.length === 0) {
    return { blocks: blocks.filter((_, i) => i !== head), removed: target };
  }
  const nested = removeAtPath(target.body ?? [], rest);
  if (!nested.removed) return { blocks, removed: null };
  return {
    blocks: blocks.map((b, i) => (i === head ? { ...b, body: nested.blocks } : b)),
    removed: nested.removed,
  };
}

/**
 * Immutably insert `block` at `path`; the last entry is the slot inside its
 * parent list. A top-level slot clamps to ≥1 so nothing can land in front of
 * the trigger; body slots start at 0.
 */
function insertAtPath(
  blocks: Block[],
  path: BlockPath,
  block: Block,
  topLevel = true,
): Block[] {
  if (path.length === 0) return blocks;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    const slot = Math.min(blocks.length, Math.max(topLevel ? 1 : 0, head));
    const next = [...blocks];
    next.splice(slot, 0, block);
    return next;
  }
  const parent = blocks[head];
  if (!parent || !isContainer(parent.op)) return blocks;
  return blocks.map((b, i) =>
    i === head ? { ...b, body: insertAtPath(b.body ?? [], rest, block, false) } : b,
  );
}

/** Immutably rewrite the single block at `path`, leaving the tree shape alone. */
function updateAtPath(blocks: Block[], path: BlockPath, fn: (b: Block) => Block): Block[] {
  if (path.length === 0) return blocks;
  const [head, ...rest] = path;
  if (!blocks[head]) return blocks;
  return blocks.map((b, i) => {
    if (i !== head) return b;
    return rest.length === 0 ? fn(b) : { ...b, body: updateAtPath(b.body ?? [], rest, fn) };
  });
}

/**
 * Where `to` ends up once the block at `from` has been lifted out. Only the
 * entry at the removed block's own depth can shift, and only when it sat after
 * it in the same parent list — everything shallower or in another branch is
 * untouched.
 */
function shiftPathAfterRemoval(to: BlockPath, from: BlockPath): number[] {
  const depth = from.length - 1;
  if (to.length <= depth) return [...to];
  const sameParent = from.slice(0, depth).every((value, i) => value === to[i]);
  if (!sameParent || to[depth] <= from[depth]) return [...to];
  const next = [...to];
  next[depth] -= 1;
  return next;
}

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
  /**
   * Read-only viewing mode (teacher-live-project-view-prd D-LV-6). When true,
   * EVERY mutation (`_commit`, `undo`, `redo`) is a hard no-op — so a teacher
   * watching a kid's blocks project live can never change the program and, since
   * `dirty` never advances, the studio's debounced autosave never fires. This is
   * the single defence-in-depth funnel under the disabled UI affordances; the
   * hard backstop remains the backend write-guard (a teacher can't PUT the VFS).
   */
  readOnly: boolean;
  setReadOnly: (readOnly: boolean) => void;

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
  addBlock: (op: BlockOp, n?: number) => void;
  /** Insert a body block at an exact position (drag-from-palette to a slot).
   *  Triggers can't be inserted mid-script; index is clamped to 1..len. */
  insertBlock: (op: BlockOp, scriptId: string, index: number, n?: number) => void;
  /** Remove a block (the trigger removes its whole script). */
  removeBlock: (scriptId: string, index: number) => void;
  /** Swap a block's operation while preserving its existing parameters. */
  replaceBlockOp: (scriptId: string, index: number, op: BlockOp) => void;
  /** Path-aware editors — the same four edits, reachable at any nesting depth
   *  so a block inside a C-block body is a first-class, editable block. */
  replaceBlockOpAtPath: (scriptId: string, path: BlockPath, op: BlockOp) => void;
  cycleParamAtPath: (scriptId: string, path: BlockPath, max?: number) => void;
  setParamAtPath: (scriptId: string, path: BlockPath, n: number, max?: number) => void;
  setSayTextAtPath: (scriptId: string, path: BlockPath, text: string) => void;
  /** Tap-to-cycle a block's value 1→max→1 (number tile, speed, or msg colour). */
  cycleParam: (scriptId: string, index: number, max?: number) => void;
  /** Set an exact param value (the +/− stepper editor). Clamped 1..MAX_PARAM. */
  setParam: (scriptId: string, index: number, n: number, max?: number) => void;
  setSayText: (scriptId: string, index: number, text: string) => void;
  addIfBodyBlock: (scriptId: string, index: number, op: BlockOp, n?: number) => void;
  removeIfBodyBlock: (scriptId: string, index: number, bodyIndex: number) => void;
  /** Insert a palette block at an exact tree slot — the drag-to-drop entry
   *  point that works at any nesting depth (top-level slot or a C-block body).
   *  Triggers are rejected; they always start their own track. */
  insertBlockAtPath: (op: BlockOp, scriptId: string, path: BlockPath, n?: number) => void;
  /** Remove the block at a tree path. Removing a trigger removes its track. */
  removeBlockAtPath: (scriptId: string, path: BlockPath) => void;
  /** Move a block to another tree slot, in this or another track of the current
   *  character. Triggers never move, and a C-block can't be dropped inside its
   *  own body. */
  moveBlockToPath: (
    fromScriptId: string,
    fromPath: BlockPath,
    toScriptId: string,
    toPath: BlockPath,
  ) => void;
  /** Reorder a block within its script — drag to change execution order. The
   *  trigger (index 0) stays first; body blocks reorder among 1..n. */
  moveBlock: (scriptId: string, from: number, to: number) => void;
  /** Move a body block within OR across tracks (scripts) of the current
   *  character. Triggers never move; the destination index clamps to ≥1. */
  moveBlockAcross: (
    fromScriptId: string,
    fromIndex: number,
    toScriptId: string,
    toIndex: number,
  ) => void;
  moveCharacter: (charId: string, gx: number, gy: number) => void;
  setCharacterIdentity: (charId: string, name: string, emoji: string, asset: string) => void;

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
  readOnly: false,

  setReadOnly(readOnly) {
    set({ readOnly });
  },

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
      if (s.readOnly) return s; // teacher viewer — no mutations (D-LV-6)
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
      if (s.readOnly) return s; // teacher viewer — no mutations (D-LV-6)
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
      if (s.readOnly) return s; // teacher viewer — no mutations (D-LV-6)
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

  addBlock(op, chosenN) {
    get()._commit((s) => {
      const block = newBlock(op, chosenN);
      const cid = currentChar(currentPage(s.project, s.pageId), s.charId).id;
      return {
        project: patchChar(s.project, s.pageId, cid, (c) => {
          if (isTrigger(op)) {
            return { ...c, scripts: [...c.scripts, { id: newId('script'), blocks: [block] }] };
          }
          const last = c.scripts[c.scripts.length - 1];
          if (!last) {
            return {
              ...c,
              scripts: [
                { id: newId('script'), blocks: [{ op: 'when_flag' }, ...structuralBlocks(block)] },
              ],
            };
          }
          return {
            ...c,
            scripts: c.scripts.map((sc, i) =>
              i === c.scripts.length - 1
                ? {
                    ...sc,
                    blocks:
                      sc.blocks.at(-1)?.op === 'end' && op !== 'end'
                        ? [...sc.blocks.slice(0, -1), ...structuralBlocks(block), sc.blocks.at(-1)!]
                        : [...sc.blocks, ...structuralBlocks(block)],
                  }
                : sc,
            ),
          };
        }),
      };
    });
  },

  insertBlock(op, scriptId, index, chosenN) {
    if (isTrigger(op)) {
      get().addBlock(op, chosenN);
      return;
    }
    get()._commit((s) => {
      const block = newBlock(op, chosenN);
      return {
        project: patchChar(s.project, s.pageId, s.charId, (c) => ({
          ...c,
          scripts: c.scripts.map((sc) => {
            if (sc.id !== scriptId) return sc;
            const arr = [...sc.blocks];
            const at = Math.min(Math.max(1, index), arr.length);
            arr.splice(at, 0, ...structuralBlocks(block));
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
            sc.id !== scriptId
              ? sc
              : {
                  ...sc,
                  blocks: sc.blocks.filter((_, i) => i !== index),
                },
          )
          .filter((sc) => sc.blocks.length > 0 && isTrigger(sc.blocks[0].op)),
      })),
    }));
  },

  replaceBlockOp(scriptId, index, op) {
    get().replaceBlockOpAtPath(scriptId, [index], op);
  },

  replaceBlockOpAtPath(scriptId, path, op) {
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => ({
        ...c,
        scripts: c.scripts.map((sc) =>
          sc.id !== scriptId
            ? sc
            : { ...sc, blocks: updateAtPath(sc.blocks, path, (block) => ({ ...block, op })) },
        ),
      })),
    }));
  },

  cycleParam(scriptId, index, max = MAX_PARAM) {
    get().cycleParamAtPath(scriptId, [index], max);
  },

  cycleParamAtPath(scriptId, path, max = MAX_PARAM) {
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => ({
        ...c,
        scripts: c.scripts.map((sc) =>
          sc.id !== scriptId
            ? sc
            : {
                ...sc,
                blocks: updateAtPath(sc.blocks, path, (b) => ({
                  ...b,
                  n: ((b.n ?? 1) % max) + 1,
                })),
              },
        ),
      })),
    }));
  },

  setParam(scriptId, index, n, max = MAX_PARAM) {
    get().setParamAtPath(scriptId, [index], n, max);
  },

  setParamAtPath(scriptId, path, n, max = MAX_PARAM) {
    const v = Math.min(max, Math.max(1, Math.round(n)));
    get()._commit(
      (s) => ({
        project: patchChar(s.project, s.pageId, s.charId, (c) => ({
          ...c,
          scripts: c.scripts.map((sc) =>
            sc.id !== scriptId
              ? sc
              : { ...sc, blocks: updateAtPath(sc.blocks, path, (b) => ({ ...b, n: v })) },
          ),
        })),
      }),
      `param:${scriptId}:${path.join('.')}`,
    );
  },

  setSayText(scriptId, index, text) {
    get().setSayTextAtPath(scriptId, [index], text);
  },

  setSayTextAtPath(scriptId, path, text) {
    get()._commit(
      (s) => ({
        project: patchChar(s.project, s.pageId, s.charId, (c) => ({
          ...c,
          scripts: c.scripts.map((sc) =>
            sc.id !== scriptId
              ? sc
              : {
                  ...sc,
                  blocks: updateAtPath(sc.blocks, path, (b) => ({
                    ...b,
                    text: text.slice(0, 60),
                  })),
                },
          ),
        })),
      }),
      `say:${scriptId}:${path.join('.')}`,
    );
  },

  addIfBodyBlock(scriptId, index, op, chosenN) {
    if (isTrigger(op)) return;
    const script = currentChar(
      currentPage(get().project, get().pageId),
      get().charId,
    ).scripts.find((sc) => sc.id === scriptId);
    const target = script?.blocks[index];
    if (!target || !isContainer(target.op)) return;
    get().insertBlockAtPath(op, scriptId, [index, target.body?.length ?? 0], chosenN);
  },

  removeIfBodyBlock(scriptId, index, bodyIndex) {
    get().removeBlockAtPath(scriptId, [index, bodyIndex]);
  },

  insertBlockAtPath(op, scriptId, path, chosenN) {
    if (isTrigger(op) || path.length === 0) return;
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => ({
        ...c,
        scripts: c.scripts.map((sc) =>
          sc.id !== scriptId
            ? sc
            : { ...sc, blocks: insertAtPath(sc.blocks, path, newStructuralBlock(op, chosenN)) },
        ),
      })),
    }));
  },

  removeBlockAtPath(scriptId, path) {
    if (path.length === 0) return;
    // A top-level removal can strip a track's trigger, which retires the track.
    if (path.length === 1) {
      get().removeBlock(scriptId, path[0]);
      return;
    }
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => ({
        ...c,
        scripts: c.scripts.map((sc) =>
          sc.id !== scriptId ? sc : { ...sc, blocks: removeAtPath(sc.blocks, path).blocks },
        ),
      })),
    }));
  },

  moveBlockToPath(fromScriptId, fromPath, toScriptId, toPath) {
    if (fromPath.length === 0 || toPath.length === 0) return;
    if (fromPath.length === 1 && fromPath[0] === 0) return; // the trigger anchors its track
    // Dropping a C-block inside its own body would orphan the whole subtree.
    if (fromScriptId === toScriptId && pathIsWithin(fromPath, toPath)) return;
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, s.charId, (c) => {
        const from = c.scripts.find((sc) => sc.id === fromScriptId);
        if (!from) return c;
        const lifted = removeAtPath(from.blocks, fromPath);
        const moved = lifted.removed;
        if (!moved || isTrigger(moved.op)) return c;
        const sameScript = fromScriptId === toScriptId;
        const dest = sameScript ? shiftPathAfterRemoval(toPath, fromPath) : [...toPath];
        return {
          ...c,
          scripts: c.scripts.map((sc) => {
            if (sameScript && sc.id === fromScriptId) {
              return { ...sc, blocks: insertAtPath(lifted.blocks, dest, moved) };
            }
            if (sc.id === fromScriptId) return { ...sc, blocks: lifted.blocks };
            if (sc.id === toScriptId) return { ...sc, blocks: insertAtPath(sc.blocks, dest, moved) };
            return sc;
          }),
        };
      }),
    }));
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

  moveBlockAcross(fromScriptId, fromIndex, toScriptId, toIndex) {
    get().moveBlockToPath(fromScriptId, [fromIndex], toScriptId, [toIndex]);
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

  setCharacterIdentity(charId, name, emoji, asset) {
    get()._commit((s) => ({
      project: patchChar(s.project, s.pageId, charId, (c) => ({ ...c, name, emoji, asset })),
    }));
  },
}));
