import { beforeEach, describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { useProjectStore } from './projectStore';

function f(path: string, content = ''): VfsFile {
  return { path, content, kind: 'text', size: content.length };
}
const get = () => useProjectStore.getState();

describe('useProjectStore', () => {
  beforeEach(() => useProjectStore.setState({ files: [], folders: [], change: null }));

  it('setFiles loads a fresh project (clears folders, change=init)', () => {
    useProjectStore.setState({ folders: ['leftover'] });
    get().setFiles([f('game.js')]);
    expect(get().files.map((x) => x.path)).toEqual(['game.js']);
    expect(get().folders).toEqual([]);
    expect(get().change?.kind).toBe('init');
  });

  it('createFile funnels through vfsOps + reports it in the change descriptor', () => {
    get().setFiles([]);
    get().createFile('game.js', 'text', 'x');
    expect(get().files.map((x) => x.path)).toEqual(['game.js']);
    expect(get().change?.kind).toBe('create-file');
    expect(get().change?.added).toEqual(['game.js']);
  });

  it('rename remaps the path + records the remap', () => {
    get().setFiles([f('a.js', 'hi')]);
    get().rename('a.js', 'b.js');
    expect(get().files.map((x) => x.path)).toEqual(['b.js']);
    expect(get().change?.kind).toBe('rename');
    expect(get().change?.remaps).toEqual([{ from: 'a.js', to: 'b.js' }]);
  });

  it('remove deletes the file + records removed', () => {
    get().setFiles([f('a.js'), f('b.js')]);
    get().remove('a.js');
    expect(get().files.map((x) => x.path)).toEqual(['b.js']);
    expect(get().change?.removed).toEqual(['a.js']);
  });

  it('apply replaces the VFS and diffs added/removed', () => {
    get().setFiles([f('a.js')]);
    get().apply([f('a.js'), f('c.js')]);
    expect(get().change?.kind).toBe('apply');
    expect(get().change?.added).toEqual(['c.js']);
    expect(get().change?.removed).toEqual([]);
  });

  it('bumps a monotonic seq on every mutation', () => {
    get().setFiles([f('a.js')]);
    const s1 = get().change!.seq;
    get().createFile('b.js');
    const s2 = get().change!.seq;
    expect(s2).toBeGreaterThan(s1);
  });
});
