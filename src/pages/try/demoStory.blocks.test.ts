// Bundled blocks story (try-demo-mode-prd §4 / acceptance 4). The story must be
// indistinguishable from a real saved document: it round-trips through the REAL
// `parseProject` unchanged and plays via the REAL interpreter. These tests are
// the drift alarm for the blocks demo — a model/catalogue change that breaks the
// story fails here.

import { describe, expect, it } from 'vitest';

import {
  BLOCK_DEFS,
  isTrigger,
  parseProject,
  serializeProject,
} from '../learn/blocks/blocksModel';
import { BlocksRunner, type SpriteHost, type SpriteState } from '../learn/blocks/interpreter';
import { CATS_DAY_OUT } from './demoStory.blocks';

const KNOWN_OPS = new Set(BLOCK_DEFS.map((d) => d.op));
const instant = () => Promise.resolve();

function makeHost() {
  const sprites = new Map<string, SpriteState>();
  const says: Array<{ id: string; text: string | null }> = [];
  const gotos: number[] = [];
  const host: SpriteHost = {
    onSprite: (id, state) => sprites.set(id, state),
    onSay: (id, text) => says.push({ id, text }),
    onPop: () => {},
    onGotoPage: (index) => gotos.push(index),
  };
  return { host, sprites, says, gotos };
}

describe('CATS_DAY_OUT story', () => {
  it('round-trips unchanged through the real parseProject (valid saved doc)', () => {
    expect(parseProject(serializeProject(CATS_DAY_OUT))).toEqual(CATS_DAY_OUT);
  });

  it('is a 3-page story built only from real catalogue ops', () => {
    expect(CATS_DAY_OUT.pages).toHaveLength(3);
    for (const page of CATS_DAY_OUT.pages) {
      expect(page.characters.length).toBeGreaterThan(0);
      for (const char of page.characters) {
        for (const script of char.scripts) {
          expect(script.blocks.length).toBeGreaterThan(0);
          expect(isTrigger(script.blocks[0].op)).toBe(true);
          for (const block of script.blocks) {
            expect(KNOWN_OPS.has(block.op)).toBe(true);
            if (block.op === 'say') expect((block.text ?? '').length).toBeLessThanOrEqual(60);
          }
        }
      }
    }
  });

  it('exercises the PRD block set (flag, tap, message, goto_page, motion, say)', () => {
    const ops = new Set(
      CATS_DAY_OUT.pages.flatMap((p) =>
        p.characters.flatMap((c) => c.scripts.flatMap((s) => s.blocks.map((b) => b.op))),
      ),
    );
    for (const op of ['when_flag', 'when_tap', 'when_message', 'send_message', 'say', 'goto_page', 'end']) {
      expect(ops.has(op as never), `story must use ${op}`).toBe(true);
    }
  });

  it('page 1 plays via the real interpreter: the cat walks and wakes the butterfly', async () => {
    const { host, sprites, says } = makeHost();
    const runner = new BlocksRunner(CATS_DAY_OUT.pages[0], host, instant);
    runner.resetAll();
    await runner.runFlag();
    // Cat: start gx 3 + move_right 4 → 7 (hop returns to its start row).
    expect(sprites.get('try-cat-1')).toMatchObject({ gx: 7, gy: 10 });
    // Butterfly woke via send_message → when_message: gx 14 − 3 → 11.
    expect(sprites.get('try-butterfly-1')).toMatchObject({ gx: 11 });
    const spoken = says.filter((s) => s.text !== null).map((s) => s.text);
    expect(spoken).toContain("A sunny day! Let's go!");
    expect(spoken).toContain('Follow me!');
  });

  it('tapping the sun (page 1) and the boat (page 2) turns the pages', async () => {
    const page1 = makeHost();
    const runner1 = new BlocksRunner(CATS_DAY_OUT.pages[0], page1.host, instant);
    await runner1.runTap('try-sun-1');
    expect(page1.gotos).toEqual([1]); // goto_page n=2 → page index 1

    const page2 = makeHost();
    const runner2 = new BlocksRunner(CATS_DAY_OUT.pages[1], page2.host, instant);
    await runner2.runTap('try-boat-2');
    expect(page2.gotos).toEqual([2]); // goto_page n=3 → page index 2
  });
});
