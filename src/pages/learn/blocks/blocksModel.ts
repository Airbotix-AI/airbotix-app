// Blocks Studio data model (learn-blocks-studio-prd.md §5/§7).
//
// The whole program is ONE structured JSON document — `project.blocks.json` in
// the project VFS (D-BLK-3): pages (≤4) → characters → horizontal scripts of
// icon blocks. This module owns the document shape, the v1 block catalogue
// (op → category/icon/label/param), and safe parse/serialize. The backend
// seeds the same shape (platform-backend `blocks-templates.ts`) — keep
// `version` in sync.

export const BLOCKS_PROJECT_FILE = 'project.blocks.json';
export const GRID_W = 20;
export const GRID_H = 15;
export const MAX_PAGES = 4;
export const MAX_PARAM = 9;

// ── Block catalogue (v1 set — control `repeat` C-block lands with M3) ───────
export type BlockCategory = 'trigger' | 'motion' | 'looks' | 'sound' | 'control' | 'end';

export type BlockOp =
  | 'when_flag'
  | 'when_tap'
  | 'move_right'
  | 'move_left'
  | 'move_up'
  | 'move_down'
  | 'turn_right'
  | 'turn_left'
  | 'hop'
  | 'go_home'
  | 'say'
  | 'grow'
  | 'shrink'
  | 'reset_size'
  | 'hide'
  | 'show'
  | 'pop'
  | 'wait'
  | 'stop'
  | 'end'
  | 'forever'
  | 'goto_page';

export interface BlockDef {
  op: BlockOp;
  category: BlockCategory;
  icon: string;
  label: string;
  /** Has a tap-to-edit number tile (grid squares / tenths of a second / page). */
  hasN?: boolean;
  defaultN?: number;
}

export const BLOCK_DEFS: readonly BlockDef[] = [
  { op: 'when_flag', category: 'trigger', icon: '🚩', label: 'Start' },
  { op: 'when_tap', category: 'trigger', icon: '👆', label: 'On tap' },
  { op: 'move_right', category: 'motion', icon: '➡️', label: 'Right', hasN: true, defaultN: 2 },
  { op: 'move_left', category: 'motion', icon: '⬅️', label: 'Left', hasN: true, defaultN: 2 },
  { op: 'move_up', category: 'motion', icon: '⬆️', label: 'Up', hasN: true, defaultN: 2 },
  { op: 'move_down', category: 'motion', icon: '⬇️', label: 'Down', hasN: true, defaultN: 2 },
  { op: 'turn_right', category: 'motion', icon: '↪️', label: 'Turn', hasN: true, defaultN: 3 },
  { op: 'turn_left', category: 'motion', icon: '↩️', label: 'Turn', hasN: true, defaultN: 3 },
  { op: 'hop', category: 'motion', icon: '🦘', label: 'Hop', hasN: true, defaultN: 2 },
  { op: 'go_home', category: 'motion', icon: '🏠', label: 'Home' },
  { op: 'say', category: 'looks', icon: '💬', label: 'Say' },
  { op: 'grow', category: 'looks', icon: '🔼', label: 'Grow', hasN: true, defaultN: 2 },
  { op: 'shrink', category: 'looks', icon: '🔽', label: 'Shrink', hasN: true, defaultN: 2 },
  { op: 'reset_size', category: 'looks', icon: '🔄', label: 'Reset' },
  { op: 'hide', category: 'looks', icon: '🫥', label: 'Hide' },
  { op: 'show', category: 'looks', icon: '👁', label: 'Show' },
  { op: 'pop', category: 'sound', icon: '🔊', label: 'Pop' },
  { op: 'wait', category: 'control', icon: '⏱', label: 'Wait', hasN: true, defaultN: 5 },
  { op: 'stop', category: 'control', icon: '🛑', label: 'Stop' },
  { op: 'end', category: 'end', icon: '🏁', label: 'End' },
  { op: 'forever', category: 'end', icon: '♾️', label: 'Again' },
  { op: 'goto_page', category: 'end', icon: '📄', label: 'Page', hasN: true, defaultN: 1 },
] as const;

const DEFS_BY_OP = new Map(BLOCK_DEFS.map((d) => [d.op, d]));
export function blockDef(op: BlockOp): BlockDef {
  return DEFS_BY_OP.get(op)!;
}
export function isTrigger(op: BlockOp): boolean {
  return blockDef(op).category === 'trigger';
}
export const CATEGORIES: readonly { id: BlockCategory; icon: string; label: string }[] = [
  { id: 'trigger', icon: '🚩', label: 'Start' },
  { id: 'motion', icon: '➡️', label: 'Move' },
  { id: 'looks', icon: '💬', label: 'Looks' },
  { id: 'sound', icon: '🔊', label: 'Sound' },
  { id: 'control', icon: '⏱', label: 'Control' },
  { id: 'end', icon: '🏁', label: 'End' },
];

// ── Document shape ───────────────────────────────────────────────────────────
export interface Block {
  op: BlockOp;
  n?: number;
  text?: string;
}
export interface Script {
  id: string;
  blocks: Block[];
}
export interface CharacterStart {
  gx: number;
  gy: number;
  size: number;
  rot: number;
}
export interface Character {
  id: string;
  name: string;
  emoji: string;
  start: CharacterStart;
  scripts: Script[];
}
export interface Page {
  id: string;
  background: string;
  characters: Character[];
}
export interface BlocksProject {
  version: 1;
  name: string;
  pages: Page[];
}

let seq = 0;
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`;
}

export function blankProject(name = 'My blocks project'): BlocksProject {
  return {
    version: 1,
    name,
    pages: [
      {
        id: newId('page'),
        background: 'meadow',
        characters: [
          {
            id: newId('char'),
            name: 'Cat',
            emoji: '🐱',
            start: { gx: 5, gy: 10, size: 1, rot: 0 },
            scripts: [],
          },
        ],
      },
    ],
  };
}

// ── Safe parse / serialize ───────────────────────────────────────────────────
const clampN = (v: unknown, lo: number, hi: number, dflt: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt;

/**
 * Parse a project document defensively: unknown ops are dropped, params are
 * clamped, page/character invariants enforced. Anything unrecoverable falls
 * back to a blank project rather than trapping the kid on a broken file.
 */
export function parseProject(raw: string): BlocksProject {
  try {
    const doc = JSON.parse(raw) as Partial<BlocksProject>;
    if (!doc || doc.version !== 1 || !Array.isArray(doc.pages) || doc.pages.length === 0) {
      return blankProject();
    }
    const pages: Page[] = doc.pages.slice(0, MAX_PAGES).map((p, pi) => ({
      id: typeof p?.id === 'string' && p.id ? p.id : newId('page'),
      background: typeof p?.background === 'string' ? p.background : 'meadow',
      characters: (Array.isArray(p?.characters) ? p.characters : []).map((c, ci) => ({
        id: typeof c?.id === 'string' && c.id ? c.id : newId('char'),
        name: typeof c?.name === 'string' && c.name ? c.name.slice(0, 24) : `Friend ${ci + 1}`,
        emoji: typeof c?.emoji === 'string' && c.emoji ? c.emoji : '🐱',
        start: {
          gx: clampN(c?.start?.gx, 0, GRID_W - 1, 5),
          gy: clampN(c?.start?.gy, 0, GRID_H - 1, 10),
          size: typeof c?.start?.size === 'number' ? Math.min(3, Math.max(0.3, c.start.size)) : 1,
          rot: clampN(c?.start?.rot, -360, 360, 0),
        },
        scripts: (Array.isArray(c?.scripts) ? c.scripts : [])
          .map((s) => ({
            id: typeof s?.id === 'string' && s.id ? s.id : newId('script'),
            blocks: (Array.isArray(s?.blocks) ? s.blocks : [])
              .filter((b): b is Block => !!b && DEFS_BY_OP.has(b.op as BlockOp))
              .map((b) => {
                const def = blockDef(b.op);
                const out: Block = { op: b.op };
                if (def.hasN) out.n = clampN(b.n, 1, MAX_PARAM, def.defaultN ?? 1);
                if (b.op === 'say') out.text = (typeof b.text === 'string' ? b.text : 'Hi!').slice(0, 60);
                return out;
              }),
          }))
          .filter((s) => s.blocks.length > 0 && isTrigger(s.blocks[0].op)),
      })),
      // every page must have at least one character to code
      ...(pi === 0 ? {} : {}),
    }));
    for (const page of pages) {
      if (page.characters.length === 0) {
        page.characters.push(blankProject().pages[0].characters[0]);
      }
    }
    return { version: 1, name: typeof doc.name === 'string' ? doc.name.slice(0, 120) : 'My blocks project', pages };
  } catch {
    return blankProject();
  }
}

export function serializeProject(project: BlocksProject): string {
  return JSON.stringify(project, null, 2);
}
