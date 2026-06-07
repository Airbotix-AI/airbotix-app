import { describe, expect, it } from 'vitest';

import type { KidTile } from './classApi';
import { applyFeedEvent, raisedHands, sortTiles } from './classFeed';

function tile(over: Partial<KidTile> = {}): KidTile {
  return {
    kidId: 'k1',
    nickname: 'Robo',
    status: 'running',
    needsHelp: false,
    handRaisedAt: null,
    thumbnailDataUrl: null,
    takenOver: false,
    ...over,
  };
}

describe('applyFeedEvent', () => {
  it("a kid's edit updates that kid tile to running (and only that tile)", () => {
    const tiles = [tile({ kidId: 'k1', status: 'idle' }), tile({ kidId: 'k2', status: 'idle' })];
    const next = applyFeedEvent(tiles, { type: 'game.vfs.changed', kidId: 'k1', at: 100 });
    expect(next[0].status).toBe('running');
    expect(next[1].status).toBe('idle'); // untouched
    expect(next).not.toBe(tiles); // immutable — new array
  });

  it('a run error flips the tile to error and a started run carries a thumbnail', () => {
    const errored = applyFeedEvent([tile()], { type: 'game.run', kidId: 'k1', state: 'error' });
    expect(errored[0].status).toBe('error');
    const ran = applyFeedEvent([tile()], {
      type: 'game.run',
      kidId: 'k1',
      state: 'started',
      thumbnailDataUrl: 'data:image/png;base64,AAA',
    });
    expect(ran[0].status).toBe('running');
    expect(ran[0].thumbnailDataUrl).toBe('data:image/png;base64,AAA');
  });

  it('raising and clearing a hand toggles the needs-help flag + wait timestamp', () => {
    const raised = applyFeedEvent([tile()], { type: 'hand.raised', kidId: 'k1', at: 500 });
    expect(raised[0]).toMatchObject({ needsHelp: true, handRaisedAt: 500 });
    const cleared = applyFeedEvent(raised, { type: 'hand.cleared', kidId: 'k1' });
    expect(cleared[0]).toMatchObject({ needsHelp: false, handRaisedAt: null });
  });

  it('ignores events for an unknown kid', () => {
    const tiles = [tile({ kidId: 'k1' })];
    const next = applyFeedEvent(tiles, { type: 'game.run', kidId: 'ghost', state: 'error' });
    expect(next[0].status).toBe('running');
  });
});

describe('sortTiles', () => {
  it('sorts a needs-help kid to the very top', () => {
    const tiles = [
      tile({ kidId: 'k1', nickname: 'Ana', status: 'running' }),
      tile({ kidId: 'k2', nickname: 'Bo', status: 'running', needsHelp: true, handRaisedAt: 10 }),
    ];
    expect(sortTiles(tiles)[0].kidId).toBe('k2');
  });

  it('orders multiple raised hands by wait-time (longest-waited first)', () => {
    const tiles = [
      tile({ kidId: 'late', needsHelp: true, handRaisedAt: 900 }),
      tile({ kidId: 'early', needsHelp: true, handRaisedAt: 100 }),
    ];
    expect(sortTiles(tiles).map((t) => t.kidId)).toEqual(['early', 'late']);
  });

  it('among non-help kids, surfaces errors above idle above running', () => {
    const tiles = [
      tile({ kidId: 'run', nickname: 'A', status: 'running' }),
      tile({ kidId: 'idle', nickname: 'B', status: 'idle' }),
      tile({ kidId: 'err', nickname: 'C', status: 'error' }),
    ];
    expect(sortTiles(tiles).map((t) => t.kidId)).toEqual(['err', 'idle', 'run']);
  });
});

describe('raisedHands', () => {
  it('returns only waiting kids, longest-waited first', () => {
    const tiles = [
      tile({ kidId: 'a', needsHelp: true, handRaisedAt: 300 }),
      tile({ kidId: 'b', needsHelp: false }),
      tile({ kidId: 'c', needsHelp: true, handRaisedAt: 100 }),
    ];
    expect(raisedHands(tiles).map((t) => t.kidId)).toEqual(['c', 'a']);
  });
});
