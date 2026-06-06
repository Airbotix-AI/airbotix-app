import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../../code/codeApi';
import { runTurnStub } from './gameAgentStub';

function f(path: string, content = ''): VfsFile {
  return { path, content, kind: 'text', size: content.length };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function runTurn(files: VfsFile[]) {
  const p = runTurnStub('make it blue', files);
  await vi.advanceTimersByTimeAsync(400); // skip the simulated round-trip
  return p;
}

describe('runTurnStub', () => {
  it('deterministically recolours the first hex literal in game.js', async () => {
    const res = await runTurn([f('game.js', 'scene = { backgroundColor: 0x1a1a2e };')]);

    const game = res.files.find((x) => x.path === 'game.js');
    expect(game?.content).toContain('0x38bdf8'); // fixed K-12 "sky" replacement
    expect(game?.content).not.toContain('0x1a1a2e');
    expect(res.summary).toMatch(/sample tweak/);
    expect(res.toolsFired).toEqual(['edit_file:game.js']);
    expect(res.changes?.[0]).toMatchObject({ path: 'game.js', after: expect.stringContaining('0x38bdf8') });
  });

  it('leaves files untouched when there is no game.js to tweak', async () => {
    const files = [f('main.js', '0xabcdef')];
    const res = await runTurn(files);
    expect(res.files).toBe(files); // same reference — nothing changed
    expect(res.summary).toMatch(/nothing changed/);
  });

  it('does nothing when game.js has no hex colour', async () => {
    const res = await runTurn([f('game.js', 'const speed = 5;')]);
    expect(res.summary).toMatch(/nothing changed/);
  });
});
