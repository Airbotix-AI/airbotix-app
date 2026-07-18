import { describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { mergeTurnFiles } from './vfsOps';

const f = (path: string, content: string): VfsFile => ({ path, content, kind: 'text', size: content.length });

// The apply-merge that keeps a kid's concurrent hand-edit alive: an AI turn's
// server snapshot wins ONLY on the paths the turn changed; the local copy wins
// everywhere else (a wholesale replace silently reverted mid-turn edits).
describe('mergeTurnFiles', () => {
  it('takes the server copy for changed paths, keeps the LOCAL copy for untouched ones', () => {
    const local = [f('main.js', 'kid edit while turn ran'), f('scene.js', 'local scene')];
    const server = [f('main.js', 'pre-turn main'), f('scene.js', 'turn rewrote scene')];
    const merged = mergeTurnFiles(local, server, ['scene.js']);
    expect(merged).toEqual([
      f('main.js', 'kid edit while turn ran'), // NOT reverted to the server snapshot
      f('scene.js', 'turn rewrote scene'),
    ]);
  });

  it('adds files the turn created (changed + on server + absent locally)', () => {
    const local = [f('main.js', 'local')];
    const server = [f('main.js', 'local'), f('power-up.js', 'new file')];
    const merged = mergeTurnFiles(local, server, ['power-up.js']);
    expect(merged).toEqual([f('main.js', 'local'), f('power-up.js', 'new file')]);
  });

  it('drops files the turn deleted (changed + gone from the server snapshot)', () => {
    const local = [f('main.js', 'local'), f('old.js', 'to remove')];
    const server = [f('main.js', 'local')];
    const merged = mergeTurnFiles(local, server, ['old.js']);
    expect(merged).toEqual([f('main.js', 'local')]);
  });

  it('a no-change turn (question) leaves the local VFS untouched', () => {
    const local = [f('main.js', 'kid edit')];
    const server = [f('main.js', 'stale server view')];
    expect(mergeTurnFiles(local, server, [])).toEqual(local);
  });

  it('keeps a locally-created file the server has never seen', () => {
    const local = [f('main.js', 'x'), f('notes.md', 'my notes, still in the save debounce')];
    const server = [f('main.js', 'y')];
    const merged = mergeTurnFiles(local, server, ['main.js']);
    expect(merged).toEqual([f('main.js', 'y'), f('notes.md', 'my notes, still in the save debounce')]);
  });
});
