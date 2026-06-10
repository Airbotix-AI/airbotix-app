// Blocks Studio editor state (learn-blocks-studio-prd.md §7/§8). The single
// funnel for every program mutation — page/character selection, block add/
// remove, param edits, stage drags. The studio page watches `dirty` to drive
// the debounced autosave (the document itself persists via blocksApi →
// PUT /projects/:id/code/files, full-VFS replace).

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

interface BlocksStore {
  project: BlocksProject;
  pageId: string;
  charId: string;
  /** Monotonic change counter — the autosave effect subscribes to this. */
  dirty: number;

  load: (project: BlocksProject) => void;
  selectPage: (pageId: string) => void;
  selectChar: (charId: string) => void;
  addPage: () => void;
  addCharacter: (emoji: string, name: string) => void;
  removeCharacter: (charId: string) => void;
  /** Append a block: a trigger starts a NEW script; anything else extends the
   *  last script (auto-opening a 🚩 script so a lone "move" still runs). */
  addBlock: (op: BlockOp) => void;
  /** Tap a chained block: pluck it off (the trigger removes its whole script). */
  removeBlock: (scriptId: string, index: number) => void;
  /** Tap a number tile: cycle 1 → … → MAX_PARAM → 1. */
  cycleParam: (scriptId: string, index: number) => void;
  setSayText: (scriptId: string, index: number, text: string) => void;
  moveCharacter: (charId: string, gx: number, gy: number) => void;
}

function currentPage(p: BlocksProject, pageId: string): Page {
  return p.pages.find((pg) => pg.id === pageId) ?? p.pages[0];
}
function currentChar(page: Page, charId: string): Character {
  return page.characters.find((c) => c.id === charId) ?? page.characters[0];
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

  load(project) {
    const page = project.pages[0];
    set({ project, pageId: page.id, charId: page.characters[0]?.id ?? '', dirty: 0 });
  },

  selectPage(pageId) {
    const page = currentPage(get().project, pageId);
    set({ pageId: page.id, charId: page.characters[0]?.id ?? '' });
  },

  selectChar(charId) {
    set({ charId });
  },

  addPage() {
    const { project } = get();
    if (project.pages.length >= MAX_PAGES) return;
    const char: Character = {
      id: newId('char'),
      name: 'Cat',
      emoji: '🐱',
      start: { gx: 5, gy: 10, size: 1, rot: 0 },
      scripts: [],
    };
    const page: Page = { id: newId('page'), background: 'meadow', characters: [char] };
    set((s) => ({
      project: { ...s.project, pages: [...s.project.pages, page] },
      pageId: page.id,
      charId: char.id,
      dirty: s.dirty + 1,
    }));
  },

  addCharacter(emoji, name) {
    const { project, pageId } = get();
    const char: Character = {
      id: newId('char'),
      name,
      emoji,
      // a fresh friend lands mid-stage, offset a little so it never stacks
      start: { gx: Math.min(GRID_W - 1, 8 + currentPage(project, pageId).characters.length * 2), gy: 10, size: 1, rot: 0 },
      scripts: [],
    };
    set((s) => ({
      project: {
        ...s.project,
        pages: s.project.pages.map((pg) =>
          pg.id !== pageId ? pg : { ...pg, characters: [...pg.characters, char] },
        ),
      },
      charId: char.id,
      dirty: s.dirty + 1,
    }));
  },

  removeCharacter(charId) {
    const { project, pageId } = get();
    const page = currentPage(project, pageId);
    if (page.characters.length <= 1) return; // a page always keeps one friend
    set((s) => {
      const next = {
        ...s.project,
        pages: s.project.pages.map((pg) =>
          pg.id !== pageId ? pg : { ...pg, characters: pg.characters.filter((c) => c.id !== charId) },
        ),
      };
      const remaining = currentPage(next, pageId).characters;
      return {
        project: next,
        charId: s.charId === charId ? (remaining[0]?.id ?? '') : s.charId,
        dirty: s.dirty + 1,
      };
    });
  },

  addBlock(op) {
    const { project, pageId, charId } = get();
    const def = blockDef(op);
    const block: Block = { op };
    if (def.hasN) block.n = def.defaultN ?? 1;
    if (op === 'say') block.text = 'Hi!';
    set((s) => ({
      project: patchChar(s.project, pageId, currentChar(currentPage(project, pageId), charId).id, (c) => {
        if (isTrigger(op)) {
          return { ...c, scripts: [...c.scripts, { id: newId('script'), blocks: [block] }] };
        }
        const last = c.scripts[c.scripts.length - 1];
        if (!last) {
          // no open script — auto-open a 🚩 one so the kid's block still runs
          return { ...c, scripts: [{ id: newId('script'), blocks: [{ op: 'when_flag' }, block] }] };
        }
        return {
          ...c,
          scripts: c.scripts.map((sc, i) =>
            i === c.scripts.length - 1 ? { ...sc, blocks: [...sc.blocks, block] } : sc,
          ),
        };
      }),
      dirty: s.dirty + 1,
    }));
  },

  removeBlock(scriptId, index) {
    const { pageId, charId } = get();
    set((s) => ({
      project: patchChar(s.project, pageId, charId, (c) => ({
        ...c,
        scripts: c.scripts
          .map((sc) =>
            sc.id !== scriptId ? sc : { ...sc, blocks: sc.blocks.filter((_, i) => i !== index) },
          )
          // a script that lost its trigger (or all blocks) is gone
          .filter((sc) => sc.blocks.length > 0 && isTrigger(sc.blocks[0].op)),
      })),
      dirty: s.dirty + 1,
    }));
  },

  cycleParam(scriptId, index) {
    const { pageId, charId } = get();
    set((s) => ({
      project: patchChar(s.project, pageId, charId, (c) => ({
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
      dirty: s.dirty + 1,
    }));
  },

  setSayText(scriptId, index, text) {
    const { pageId, charId } = get();
    set((s) => ({
      project: patchChar(s.project, pageId, charId, (c) => ({
        ...c,
        scripts: c.scripts.map((sc) =>
          sc.id !== scriptId
            ? sc
            : { ...sc, blocks: sc.blocks.map((b, i) => (i !== index ? b : { ...b, text: text.slice(0, 60) })) },
        ),
      })),
      dirty: s.dirty + 1,
    }));
  },

  moveCharacter(charId, gx, gy) {
    const { pageId } = get();
    const cgx = Math.min(GRID_W - 1, Math.max(0, Math.round(gx)));
    const cgy = Math.min(GRID_H - 1, Math.max(0, Math.round(gy)));
    set((s) => ({
      project: patchChar(s.project, pageId, charId, (c) => ({
        ...c,
        start: { ...c.start, gx: cgx, gy: cgy },
      })),
      dirty: s.dirty + 1,
    }));
  },
}));
