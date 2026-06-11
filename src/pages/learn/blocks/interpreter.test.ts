import { describe, expect, it } from 'vitest';

import { type Page } from './blocksModel';
import { BlocksRunner, type SpriteHost, type SpriteState } from './interpreter';

const instantSleep = () => Promise.resolve();

function makePage(scriptsByChar: Record<string, Array<Array<Record<string, unknown>>>>): Page {
  return {
    id: 'p1',
    background: 'meadow',
    characters: Object.entries(scriptsByChar).map(([id, scripts], i) => ({
      id,
      name: id,
      emoji: '🐱',
      start: { gx: 5, gy: 10, size: 1, rot: 0 },
      scripts: scripts.map((blocks, si) => ({
        id: `${id}-s${si}`,
        blocks: blocks as unknown as Page['characters'][number]['scripts'][number]['blocks'],
      })),
      ...(i === 0 ? {} : {}),
    })),
  };
}

function recordingHost() {
  const sprite: Array<{ charId: string; state: SpriteState }> = [];
  const says: Array<{ charId: string; text: string | null }> = [];
  let pops = 0;
  let gotoPage: number | null = null;
  const host: SpriteHost = {
    onSprite: (charId, state) => sprite.push({ charId, state }),
    onSay: (charId, text) => says.push({ charId, text }),
    onPop: () => (pops += 1),
    onGotoPage: (i) => (gotoPage = i),
  };
  return { host, sprite, says, pops: () => pops, gotoPage: () => gotoPage };
}

describe('BlocksRunner', () => {
  it('runs a 🚩 script sequentially: moves, says, clamps to the grid', async () => {
    const page = makePage({
      cat: [[{ op: 'when_flag' }, { op: 'move_right', n: 4 }, { op: 'say', text: 'Hi!' }, { op: 'move_left', n: 99 }]],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();

    expect(runner.state('cat')).toMatchObject({ gx: 0 }); // 5+4=9 then -99 clamps to 0
    expect(r.sprite[0].state.gx).toBe(9);
    expect(r.says).toEqual([
      { charId: 'cat', text: 'Hi!' },
      { charId: 'cat', text: null },
    ]);
  });

  it('only 👆 scripts run on tap, and only for the tapped character', async () => {
    const page = makePage({
      cat: [[{ op: 'when_flag' }, { op: 'pop' }]],
      ball: [[{ op: 'when_tap' }, { op: 'hop', n: 2 }, { op: 'pop' }]],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runTap('ball');
    expect(r.pops()).toBe(1); // the ball's pop only — cat's flag script untouched
    expect(r.sprite.every((s) => s.charId === 'ball')).toBe(true);
  });

  it('stop halts the character; goto_page fires the page jump and ends the run', async () => {
    const page = makePage({
      cat: [[{ op: 'when_flag' }, { op: 'stop' }, { op: 'pop' }]],
      dog: [[{ op: 'when_flag' }, { op: 'goto_page', n: 2 }, { op: 'pop' }]],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();
    expect(r.pops()).toBe(0); // both pops unreachable
    expect(r.gotoPage()).toBe(1); // page 2 → index 1
  });

  it('♾️ Again loops the whole script but is capped (never hangs)', async () => {
    const page = makePage({
      cat: [[{ op: 'when_flag' }, { op: 'pop' }, { op: 'forever' }]],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();
    expect(r.pops()).toBeGreaterThan(1);
    expect(r.pops()).toBeLessThanOrEqual(12);
  });

  it('two 🚩 scripts on ONE character run in parallel without clobbering each other', async () => {
    // one track walks the cat right twice; a second track hops it once. The hop
    // must only touch y — it must not snap x back to where the hop began.
    const page = makePage({
      cat: [
        [{ op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'move_right', n: 1 }],
        [{ op: 'when_flag' }, { op: 'hop', n: 1 }],
      ],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();

    // logical state: the cat advanced two squares and is back on the ground
    expect(runner.state('cat')).toMatchObject({ gx: 7, gy: 10 });
    // AND the last frame the host rendered agrees (no stale-snapshot snap-back)
    const lastCat = [...r.sprite].reverse().find((s) => s.charId === 'cat')!;
    expect(lastCat.state.gx).toBe(7);
  });

  it('parallel motion + looks both take effect (move and grow on one character)', async () => {
    const page = makePage({
      cat: [
        [{ op: 'when_flag' }, { op: 'move_right', n: 3 }],
        [{ op: 'when_flag' }, { op: 'grow', n: 4 }],
      ],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();
    expect(runner.state('cat')!.gx).toBe(8); // 5 + 3 — the move survived
    expect(runner.state('cat')!.size).toBeCloseTo(1.4); // 1 + 0.1*4 — the grow survived
  });

  it('hide/show + grow/shrink mutate state; go_home and resetAll restore the start pose', async () => {
    const page = makePage({
      cat: [[{ op: 'when_flag' }, { op: 'grow', n: 5 }, { op: 'hide' }, { op: 'move_right', n: 3 }, { op: 'go_home' }]],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();
    expect(runner.state('cat')).toMatchObject({ gx: 5, gy: 10, size: 1, visible: true });

    runner.resetAll();
    expect(runner.state('cat')).toMatchObject({ gx: 5, gy: 10, size: 1, rot: 0, visible: true });
  });
});
