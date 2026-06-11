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
  type Script,
  GRID_H,
  GRID_W,
  SPEED_FACTORS,
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
const MAX_EVENT_LAUNCHES = 80; // safety cap on message/bump-triggered scripts per run

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class BlocksRunner {
  private stopped = false;
  private stoppedChars = new Set<string>();
  private states = new Map<string, SpriteState>();
  /** Per-character duration multiplier (Set Speed): 2 = slow, 1 = normal, 0.5 = fast. */
  private speeds = new Map<string, number>();
  /** Pairs currently overlapping — so On Bump fires once on contact, not every frame. */
  private touching = new Set<string>();
  /** Scripts launched by Send Message / On Bump mid-run, awaited after the flag run. */
  private pending: Promise<void>[] = [];
  private launched = 0;

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

  /** Run every 🚩 script on the page (the Go button / page entry). Afterwards,
   *  drain any scripts that Send Message / On Bump kicked off (and their
   *  cascades) so the run doesn't end while event scripts are still going. */
  async runFlag(): Promise<void> {
    await this.runTrigger('when_flag');
    while (this.pending.length && !this.stopped) {
      const batch = this.pending;
      this.pending = [];
      await Promise.all(batch);
    }
  }

  /** Launch an event-triggered script (On Bump / On Message), capped + tracked. */
  private launch(char: Character, s: Script): void {
    if (this.stopped || this.launched >= MAX_EVENT_LAUNCHES) return;
    this.launched += 1;
    this.pending.push(this.runScript(char, s.id, s.blocks.slice(1)));
  }

  /** Fire every matching On Message (📥) script on the page for a colour. */
  private sendMessage(color: number): void {
    for (const c of this.page.characters) {
      for (const s of c.scripts) {
        if (s.blocks[0]?.op === 'when_message' && (s.blocks[0].n ?? 1) === color) this.launch(c, s);
      }
    }
  }

  /** After a character moves, fire On Bump (💥) for any pair newly in contact. */
  private checkBumps(mover: Character): void {
    const a = this.states.get(mover.id);
    if (!a) return;
    for (const other of this.page.characters) {
      if (other.id === mover.id) continue;
      const b = this.states.get(other.id);
      if (!b) continue;
      const key = [mover.id, other.id].sort().join('|');
      const overlap = a.visible && b.visible && Math.abs(a.gx - b.gx) < 1 && Math.abs(a.gy - b.gy) < 1;
      if (overlap) {
        if (!this.touching.has(key)) {
          this.touching.add(key);
          for (const c of [mover, other]) {
            for (const s of c.scripts) if (s.blocks[0]?.op === 'when_bump') this.launch(c, s);
          }
        }
      } else {
        this.touching.delete(key);
      }
    }
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
    this.touching.clear();
    this.launched = 0;
    this.pending = [];
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
    const n = block.n ?? 1;
    const sf = this.speeds.get(char.id) ?? 1; // Set Speed multiplier (slow 2× … fast 0.5×)
    // Merge a delta onto the LATEST committed state (re-read every mutation),
    // never a snapshot captured at step entry. Two scripts running in parallel
    // on the SAME character share one sprite; if a step wrote a whole snapshot it
    // captured earlier, it would clobber the other track's changes (the bug:
    // e.g. a hop snapping x back over a parallel move). patch() reads-merges-emits
    // atomically (no await between read and write), so tracks accumulate.
    const cur = () => this.states.get(char.id)!;
    const patch = (delta: Partial<SpriteState>, dur: number) => {
      const next = { ...cur(), ...delta };
      this.states.set(char.id, next);
      this.host.onSprite(char.id, next, dur);
      return next;
    };
    const move = async (dx: number, dy: number) => {
      const s = cur();
      const dur = STEP_MS * Math.max(1, Math.abs(dx) + Math.abs(dy)) * sf;
      patch({ gx: clamp(s.gx + dx, 0, GRID_W - 1), gy: clamp(s.gy + dy, 0, GRID_H - 1) }, dur);
      this.checkBumps(char);
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
        patch({ rot: cur().rot + (block.op === 'turn_right' ? 1 : -1) * n * 30 }, STEP_MS * n * sf);
        await this.sleep(STEP_MS * n * sf);
        break;
      }
      case 'hop': {
        // up then back to the y we started the hop at — but only ever touch gy,
        // so a parallel track moving x keeps its progress through the hop.
        const baseGy = cur().gy;
        patch({ gy: clamp(baseGy - n, 0, GRID_H - 1) }, STEP_MS * n * sf);
        await this.sleep(STEP_MS * n * sf);
        patch({ gy: clamp(baseGy, 0, GRID_H - 1) }, STEP_MS * n * sf);
        this.checkBumps(char);
        await this.sleep(STEP_MS * n * sf);
        break;
      }
      case 'go_home': {
        // an explicit "reset me" — overwrites the whole pose to the start.
        const home = startState(char);
        this.states.set(char.id, home);
        this.host.onSprite(char.id, home, STEP_MS * 2 * sf);
        this.checkBumps(char);
        await this.sleep(STEP_MS * 2 * sf);
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
        patch({ size: clamp(cur().size + factor * 0.1 * n, 0.3, 3) }, STEP_MS * n * sf);
        await this.sleep(STEP_MS * n * sf);
        break;
      }
      case 'reset_size': {
        patch({ size: char.start.size }, STEP_MS * sf);
        await this.sleep(STEP_MS * sf);
        break;
      }
      case 'hide':
      case 'show': {
        patch({ visible: block.op === 'show' }, STEP_MS * 2 * sf);
        await this.sleep(STEP_MS * 2 * sf);
        break;
      }
      case 'pop':
        this.host.onPop();
        await this.sleep(STEP_MS);
        break;
      case 'send_message':
        this.sendMessage(n);
        await this.sleep(STEP_MS * sf);
        break;
      case 'set_speed':
        this.speeds.set(char.id, SPEED_FACTORS[clamp(n - 1, 0, SPEED_FACTORS.length - 1)]);
        await this.sleep(60);
        break;
      case 'wait':
        await this.sleep(n * 100 * sf);
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
      case 'when_bump':
      case 'when_message':
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
