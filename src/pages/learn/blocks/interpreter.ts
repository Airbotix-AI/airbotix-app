// Blocks Studio runtime (learn-blocks-studio-prd.md §6, v1).
//
// A cooperative, sequential interpreter over the validated block AST. Each
// fired trigger runs its script as an async "thread"; motion/looks steps
// animate via the host callback (CSS transitions in the studio). The AST is
// pure data from our own catalogue — there is no code execution surface — so
// v1 interprets in-page; the sandboxed-iframe runtime arrives with the full
// M3 build (see PRD D-BLK-2 v1 note).
//
// Deterministically testable: `sleep` is injectable, and every visual effect
// flows through the SpriteHost callbacks.

import {
  type Block,
  type BlocksProject,
  type Character,
  type Page,
  GRID_H,
  GRID_W,
} from './blocksModel';

export interface SpriteState {
  gx: number;
  gy: number;
  size: number;
  rot: number;
  visible: boolean;
}

export interface SpriteHost {
  /** Apply a sprite's new state (the studio animates via CSS transition). */
  onSprite: (charId: string, state: SpriteState, durationMs: number) => void;
  onSay: (charId: string, text: string | null) => void;
  onPop: () => void;
  onGotoPage: (pageIndex: number) => void;
  /** The block now executing for a character (for the live "lit" highlight).
   *  `blockIndex` is the absolute index in the script; -1 means "none / done". */
  onStep?: (charId: string, scriptId: string, blockIndex: number) => void;
}

const STEP_MS = 180; // per grid-square at normal speed
const SAY_MS = 1400;
const FOREVER_CAP = 12; // editor-preview safety cap for ♾️ (no true infinite loop)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class BlocksRunner {
  private stopped = false;
  private stoppedChars = new Set<string>();
  private states = new Map<string, SpriteState>();

  constructor(
    private readonly page: Page,
    private readonly host: SpriteHost,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {
    for (const c of page.characters) this.states.set(c.id, startState(c));
  }

  state(charId: string): SpriteState | undefined {
    return this.states.get(charId);
  }

  stopAll(): void {
    this.stopped = true;
  }

  /** Reset every sprite to its start pose (the ⤺ Reset button / page entry). */
  resetAll(): void {
    for (const c of this.page.characters) {
      const s = startState(c);
      this.states.set(c.id, s);
      this.host.onSprite(c.id, s, 0);
      this.host.onSay(c.id, null);
    }
  }

  /** Run every 🚩 script on the page (the Go button / page entry). */
  async runFlag(): Promise<void> {
    await this.runTrigger('when_flag');
  }

  /** Run a tapped character's 👆 scripts. */
  async runTap(charId: string): Promise<void> {
    const char = this.page.characters.find((c) => c.id === charId);
    if (!char) return;
    await Promise.all(
      char.scripts
        .filter((s) => s.blocks[0]?.op === 'when_tap')
        .map((s) => this.runScript(char, s.id, s.blocks.slice(1))),
    );
  }

  private async runTrigger(op: 'when_flag'): Promise<void> {
    this.stopped = false;
    this.stoppedChars.clear();
    await Promise.all(
      this.page.characters.flatMap((char) =>
        char.scripts
          .filter((s) => s.blocks[0]?.op === op)
          .map((s) => this.runScript(char, s.id, s.blocks.slice(1))),
      ),
    );
  }

  private async runScript(char: Character, scriptId: string, body: Block[]): Promise<void> {
    let runs = 0;
    do {
      runs += 1;
      for (let i = 0; i < body.length; i += 1) {
        if (this.stopped || this.stoppedChars.has(char.id)) {
          this.host.onStep?.(char.id, scriptId, -1);
          return;
        }
        // body[i] is blocks[i+1] (the trigger was sliced off) — report absolute idx
        this.host.onStep?.(char.id, scriptId, i + 1);
        const again = await this.step(char, body[i]);
        if (again === 'goto') {
          this.host.onStep?.(char.id, scriptId, -1);
          return; // page jump ends this run
        }
      }
      // ♾️ "Again" loops the WHOLE script (capped so preview can't hang)
    } while (body.some((b) => b.op === 'forever') && runs < FOREVER_CAP && !this.stopped);
    this.host.onStep?.(char.id, scriptId, -1);
  }

  private async step(char: Character, block: Block): Promise<'ok' | 'goto'> {
    const s = this.states.get(char.id)!;
    const n = block.n ?? 1;
    const move = async (dx: number, dy: number) => {
      const next = { ...s, gx: clamp(s.gx + dx, 0, GRID_W - 1), gy: clamp(s.gy + dy, 0, GRID_H - 1) };
      this.states.set(char.id, next);
      const dur = STEP_MS * Math.max(1, Math.abs(dx) + Math.abs(dy));
      this.host.onSprite(char.id, next, dur);
      await this.sleep(dur);
    };
    switch (block.op) {
      case 'move_right':
        await move(n, 0);
        break;
      case 'move_left':
        await move(-n, 0);
        break;
      case 'move_up':
        await move(0, -n);
        break;
      case 'move_down':
        await move(0, n);
        break;
      case 'turn_right':
      case 'turn_left': {
        const next = { ...s, rot: s.rot + (block.op === 'turn_right' ? 1 : -1) * n * 30 };
        this.states.set(char.id, next);
        this.host.onSprite(char.id, next, STEP_MS * n);
        await this.sleep(STEP_MS * n);
        break;
      }
      case 'hop': {
        const up = { ...s, gy: clamp(s.gy - n, 0, GRID_H - 1) };
        this.host.onSprite(char.id, up, STEP_MS * n);
        await this.sleep(STEP_MS * n);
        this.host.onSprite(char.id, s, STEP_MS * n);
        await this.sleep(STEP_MS * n);
        break;
      }
      case 'go_home': {
        const home = startState(char);
        this.states.set(char.id, home);
        this.host.onSprite(char.id, home, STEP_MS * 2);
        await this.sleep(STEP_MS * 2);
        break;
      }
      case 'say':
        this.host.onSay(char.id, block.text ?? 'Hi!');
        await this.sleep(SAY_MS);
        this.host.onSay(char.id, null);
        break;
      case 'grow':
      case 'shrink': {
        const factor = block.op === 'grow' ? 1 : -1;
        const next = { ...s, size: clamp(s.size + factor * 0.1 * n, 0.3, 3) };
        this.states.set(char.id, next);
        this.host.onSprite(char.id, next, STEP_MS * n);
        await this.sleep(STEP_MS * n);
        break;
      }
      case 'reset_size': {
        const next = { ...s, size: char.start.size };
        this.states.set(char.id, next);
        this.host.onSprite(char.id, next, STEP_MS);
        await this.sleep(STEP_MS);
        break;
      }
      case 'hide':
      case 'show': {
        const next = { ...s, visible: block.op === 'show' };
        this.states.set(char.id, next);
        this.host.onSprite(char.id, next, STEP_MS * 2);
        await this.sleep(STEP_MS * 2);
        break;
      }
      case 'pop':
        this.host.onPop();
        await this.sleep(STEP_MS);
        break;
      case 'wait':
        await this.sleep(n * 100);
        break;
      case 'stop':
        this.stoppedChars.add(char.id);
        break;
      case 'goto_page': {
        // pages are unbounded now; the host no-ops if the page doesn't exist
        const idx = clamp(n - 1, 0, 98);
        this.host.onGotoPage(idx);
        return 'goto';
      }
      case 'end':
      case 'forever': // loop handled at script level
      case 'when_flag':
      case 'when_tap':
        break;
    }
    return 'ok';
  }
}

export function startState(char: Character): SpriteState {
  return { gx: char.start.gx, gy: char.start.gy, size: char.start.size, rot: char.start.rot, visible: true };
}

/** The page a runner should run, by current page id (fallback: first page). */
export function pageById(project: BlocksProject, pageId: string): Page {
  return project.pages.find((p) => p.id === pageId) ?? project.pages[0];
}
