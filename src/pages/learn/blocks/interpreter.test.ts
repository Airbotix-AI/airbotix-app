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
  const notes: number[] = [];
  const sounds: number[] = [];
  let gotoPage: number | null = null;
  const host: SpriteHost = {
    onSprite: (charId, state) => sprite.push({ charId, state }),
    onSay: (charId, text) => says.push({ charId, text }),
    onNote: (noteId) => notes.push(noteId),
    onSound: (soundId) => sounds.push(soundId),
    onGotoPage: (i) => (gotoPage = i),
  };
  return { host, sprite, says, notes, sounds, pops: () => sounds.length, gotoPage: () => gotoPage };
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

  it('runs a multi-block If body only when the selected character is touching', async () => {
    const touchingPage = makePage({
      cat: [[
        { op: 'when_flag' },
        { op: 'if_touching', text: 'ball' },
        { op: 'pop' },
        { op: 'say', text: 'Found' },
        { op: 'end_if' },
        { op: 'say', text: 'Done' },
      ]],
      ball: [],
    });
    const touching = recordingHost();
    await new BlocksRunner(touchingPage, touching.host, instantSleep).runFlag();
    expect(touching.pops()).toBe(1);
    expect(touching.says).toContainEqual({ charId: 'cat', text: 'Found' });
    expect(touching.says).toContainEqual({ charId: 'cat', text: 'Done' });

    const apartPage = makePage({
      cat: [[
        { op: 'when_flag' },
        { op: 'if_touching', text: 'ball' },
        { op: 'pop' },
        { op: 'say', text: 'Found' },
        { op: 'end_if' },
        { op: 'say', text: 'Done' },
      ]],
      ball: [],
    });
    apartPage.characters[1].start.gx = 12;
    const apart = recordingHost();
    await new BlocksRunner(apartPage, apart.host, instantSleep).runFlag();
    expect(apart.pops()).toBe(0);
    expect(apart.says).not.toContainEqual({ charId: 'cat', text: 'Found' });
    expect(apart.says).toContainEqual({ charId: 'cat', text: 'Done' });
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

  it('plays selected notes and sounds, and keeps legacy Pop compatible', async () => {
    const page = makePage({
      cat: [[
        { op: 'when_flag' },
        { op: 'pop' },
        { op: 'play_note', n: 1 },
        { op: 'play_note', n: 7 },
        { op: 'play_sound', n: 2 },
        { op: 'play_sound', n: 6 },
      ]],
    });
    const r = recordingHost();
    await new BlocksRunner(page, r.host, instantSleep).runFlag();
    expect(r.notes).toEqual([1, 7]);
    expect(r.sounds).toEqual([1, 2, 6]);
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

  it('Set Speed scales motion duration (slow 2×, normal 1×, fast 0.5×)', async () => {
    const durs: number[] = [];
    const sleep = (ms: number) => {
      durs.push(ms);
      return Promise.resolve();
    };
    const page = makePage({
      cat: [
        [
          { op: 'when_flag' },
          { op: 'move_right', n: 1 }, // normal → 180
          { op: 'set_speed', n: 1 }, // slow
          { op: 'move_right', n: 1 }, // 180 × 2 = 360
          { op: 'set_speed', n: 3 }, // fast
          { op: 'move_right', n: 1 }, // 180 × 0.5 = 90
        ],
      ],
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, sleep);
    await runner.runFlag();
    expect(durs).toEqual([180, 60, 360, 60, 90]);
  });

  it('Send Message triggers matching On Message scripts (by colour)', async () => {
    const page = makePage({
      sender: [[{ op: 'when_flag' }, { op: 'send_message', n: 2 }]],
      blue: [[{ op: 'when_message', n: 2 }, { op: 'pop' }]], // matches → fires
      red: [[{ op: 'when_message', n: 1 }, { op: 'pop' }]], // different colour → silent
    });
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();
    expect(r.pops()).toBe(1); // only the colour-2 listener popped
  });

  it('On Bump fires when one character moves onto another', async () => {
    const page: Page = {
      id: 'p',
      background: 'meadow',
      characters: [
        {
          id: 'cat',
          name: 'cat',
          emoji: '🐱',
          start: { gx: 0, gy: 5, size: 1, rot: 0 },
          scripts: [{ id: 'c1', blocks: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }] as Page['characters'][number]['scripts'][number]['blocks'] }],
        },
        {
          id: 'ball',
          name: 'ball',
          emoji: '⚽',
          start: { gx: 3, gy: 5, size: 1, rot: 0 },
          scripts: [{ id: 'b1', blocks: [{ op: 'when_bump' }, { op: 'pop' }] as Page['characters'][number]['scripts'][number]['blocks'] }],
        },
      ],
    };
    const r = recordingHost();
    const runner = new BlocksRunner(page, r.host, instantSleep);
    await runner.runFlag();
    expect(r.pops()).toBeGreaterThanOrEqual(1); // cat lands on the ball → bump → pop
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
