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
// Kids can add as many pages as they like; this is only a generous safety
// bound (a saved doc / a runaway loop can't blow up memory), never a UX cap a
// child will hit.
export const MAX_PAGES = 50;
export const MAX_PARAM = 9;

// ── Block catalogue (v1 set — control `repeat` C-block lands with M3) ───────
export type BlockCategory = 'trigger' | 'motion' | 'looks' | 'sound' | 'control' | 'end';

export type BlockOp =
  | 'when_flag'
  | 'when_tap'
  | 'when_bump'
  | 'when_message'
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
  | 'play_note'
  | 'play_sound'
  | 'send_message'
  | 'wait'
  | 'set_speed'
  | 'stop'
  | 'end'
  | 'forever'
  | 'goto_page';

/** The editable parameter on a block: a number tile, a 3-state speed, a 6-colour
 *  message tag, or none. (`hasN` stays for the number-tile blocks.) */
export type BlockParam = 'speed' | 'color' | 'note' | 'sound';

export interface BlockDef {
  op: BlockOp;
  category: BlockCategory;
  icon: string;
  label: string;
  /** Has a tap-to-edit number tile (grid squares / tenths of a second / page). */
  hasN?: boolean;
  defaultN?: number;
  /** A non-number tap-to-cycle parameter (speed level 1–3, or message colour 1–6). */
  param?: BlockParam;
  /** Accepted for old projects but omitted from the new-project palette. */
  legacy?: boolean;
}

export const MAX_SPEED = 3; // 1 slow · 2 normal · 3 fast
export const MAX_COLOR = 6; // ScratchJr-style six message colours
export const MAX_NOTE = 7; // C-major Do · Re · Mi · Fa · Sol · La · Ti
export const MAX_SOUND = 6;
/** Six message colours (index = block.n − 1). Used by Send / Get message blocks. */
export const MESSAGE_COLORS = ['#ff5677', '#ff8a2b', '#ffb400', '#1fc983', '#3d9bf5', '#a964f7'] as const;
/** Speed level → glyph + duration multiplier (slow runs 2×, fast runs 0.5×). */
export const SPEED_ICONS = ['🐢', '🚶', '🐇'] as const;
export const SPEED_FACTORS = [2, 1, 0.5] as const;
export const BUILT_IN_NOTES = [
  { id: 1, icon: '1', label: 'Do' },
  { id: 2, icon: '2', label: 'Re' },
  { id: 3, icon: '3', label: 'Mi' },
  { id: 4, icon: '4', label: 'Fa' },
  { id: 5, icon: '5', label: 'Sol' },
  { id: 6, icon: '6', label: 'La' },
  { id: 7, icon: '7', label: 'Ti' },
] as const;
export const BUILT_IN_SOUNDS = [
  { id: 1, icon: '🫧', label: 'Bubble Pop' },
  { id: 2, icon: '🔔', label: 'Chime' },
  { id: 3, icon: '🥁', label: 'Drum' },
  { id: 4, icon: '💨', label: 'Whoosh' },
  { id: 5, icon: '🦘', label: 'Boing' },
  { id: 6, icon: '✨', label: 'Sparkle' },
] as const;

export const BLOCK_DEFS: readonly BlockDef[] = [
  { op: 'when_flag', category: 'trigger', icon: '🚩', label: 'Start' },
  { op: 'when_tap', category: 'trigger', icon: '👆', label: 'On tap' },
  { op: 'when_bump', category: 'trigger', icon: '💥', label: 'On bump' },
  { op: 'when_message', category: 'trigger', icon: '📥', label: 'Get', param: 'color' },
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
  { op: 'pop', category: 'sound', icon: '🫧', label: 'Pop', legacy: true },
  { op: 'play_note', category: 'sound', icon: '🎵', label: 'Do', param: 'note' },
  { op: 'play_sound', category: 'sound', icon: '🫧', label: 'Pop', param: 'sound' },
  { op: 'send_message', category: 'control', icon: '📤', label: 'Send', param: 'color' },
  { op: 'wait', category: 'control', icon: '⏱', label: 'Wait', hasN: true, defaultN: 5 },
  { op: 'set_speed', category: 'control', icon: '🐇', label: 'Speed', param: 'speed' },
  { op: 'stop', category: 'control', icon: '🛑', label: 'Stop' },
  { op: 'end', category: 'end', icon: '🏁', label: 'End' },
  { op: 'forever', category: 'end', icon: '♾️', label: 'Again' },
  { op: 'goto_page', category: 'end', icon: '📄', label: 'Page', hasN: true, defaultN: 1 },
] as const;

/** The starting `n` for a freshly-added block (number tile / speed / colour). */
export function defaultParam(op: BlockOp): number | undefined {
  const def = blockDef(op);
  if (def.hasN) return def.defaultN ?? 1;
  if (def.param === 'speed') return 2; // normal
  if (def.param === 'color') return 1; // first colour
  if (def.param === 'note') return 1; // Do
  if (def.param === 'sound') return 1; // Pop
  return undefined;
}

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
  /** Optional first-party visual. Emoji remains the portable fallback. */
  asset?: string;
  start: CharacterStart;
  scripts: Script[];
}

const STORY_BLOCKS_ASSET_PREFIX = '/story-blocks/';

function safeCharacterAsset(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith(STORY_BLOCKS_ASSET_PREFIX)
    ? value.slice(0, 240)
    : undefined;
}

const TINY_STAR_A1_H_ASSET =
  '/story-blocks/tiny-star-village/characters/little-light/resting.svg';

function legacyLessonId(pages: Page[]): string | undefined {
  const page = pages[0];
  const littleLight = page?.characters.find(
    (character) => character.asset === TINY_STAR_A1_H_ASSET,
  );
  const ops = littleLight?.scripts[0]?.blocks.map((block) => block.op).join(',');
  return page?.background === 'tsv-window-room-dim' && ops === 'when_flag,say,hop,end'
    ? 'tsv-s1-a1-h'
    : undefined;
}
export interface Page {
  id: string;
  background: string;
  characters: Character[];
}
export interface BlocksProject {
  version: 1;
  name: string;
  /** Optional curriculum identity used to load a first-party story mission. */
  lessonId?: string;
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
      characters: (Array.isArray(p?.characters) ? p.characters : []).map((c, ci) => {
        const asset = safeCharacterAsset(c?.asset);
        return {
          id: typeof c?.id === 'string' && c.id ? c.id : newId('char'),
          name: typeof c?.name === 'string' && c.name ? c.name.slice(0, 24) : `Friend ${ci + 1}`,
          emoji: typeof c?.emoji === 'string' && c.emoji ? c.emoji : '🐱',
          ...(asset ? { asset } : {}),
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
                if (b.n !== undefined && def.param === 'speed') out.n = clampN(b.n, 1, MAX_SPEED, 2);
                if (b.n !== undefined && def.param === 'color') out.n = clampN(b.n, 1, MAX_COLOR, 1);
                if (b.n !== undefined && def.param === 'note') out.n = clampN(b.n, 1, MAX_NOTE, 1);
                if (b.n !== undefined && def.param === 'sound') out.n = clampN(b.n, 1, MAX_SOUND, 1);
                if (b.op === 'say') out.text = (typeof b.text === 'string' ? b.text : 'Hi!').slice(0, 60);
                return out;
              }),
          }))
            .filter((s) => s.blocks.length > 0 && isTrigger(s.blocks[0].op)),
        };
      }),
      // every page must have at least one character to code
      ...(pi === 0 ? {} : {}),
    }));
    for (const page of pages) {
      if (page.characters.length === 0) {
        page.characters.push(blankProject().pages[0].characters[0]);
      }
    }
    const lessonId =
      typeof doc.lessonId === 'string' && /^[a-z0-9-]{1,64}$/.test(doc.lessonId)
        ? doc.lessonId
        : legacyLessonId(pages);
    return {
      version: 1,
      name: typeof doc.name === 'string' ? doc.name.slice(0, 120) : 'My blocks project',
      ...(lessonId ? { lessonId } : {}),
      pages,
    };
  } catch {
    return blankProject();
  }
}

export function serializeProject(project: BlocksProject): string {
  return JSON.stringify(project, null, 2);
}
