import { describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import {
  allFolders,
  basename,
  createFile,
  createFolder,
  dirname,
  fileExists,
  isFolder,
  joinPath,
  movePath,
  normalizePath,
  pathOccupied,
  removePath,
  renamePath,
} from './vfsOps';

function f(path: string, content = ''): VfsFile {
  return { path, content, kind: 'text', size: content.length };
}

describe('path helpers', () => {
  it('normalizePath trims, strips edge slashes, collapses repeats', () => {
    expect(normalizePath(' /a//b/ ')).toBe('a/b');
    expect(normalizePath('a')).toBe('a');
    expect(normalizePath('///')).toBe('');
    expect(normalizePath('')).toBe('');
  });

  it('basename / dirname split the last segment', () => {
    expect(basename('a/b/c.js')).toBe('c.js');
    expect(basename('x')).toBe('x');
    expect(dirname('a/b/c.js')).toBe('a/b');
    expect(dirname('x')).toBe(''); // root-level → no parent
  });

  it('joinPath joins + normalizes (empty dir → bare name)', () => {
    expect(joinPath('a', 'b')).toBe('a/b');
    expect(joinPath('', 'b')).toBe('b');
    expect(joinPath('a/', '/b')).toBe('a/b');
  });
});

describe('queries', () => {
  const files = [f('index.html'), f('src/game.js'), f('src/util/math.js')];
  const folders = ['empty'];

  it('fileExists matches an exact file path only', () => {
    expect(fileExists(files, 'src/game.js')).toBe(true);
    expect(fileExists(files, 'src')).toBe(false); // a folder, not a file
    expect(fileExists(files, 'nope.js')).toBe(false);
  });

  it('pathOccupied is true for a file, a folder prefix, or an explicit empty folder', () => {
    expect(pathOccupied(files, folders, 'src/game.js')).toBe(true); // file
    expect(pathOccupied(files, folders, 'src')).toBe(true); // folder with files under it
    expect(pathOccupied(files, folders, 'empty')).toBe(true); // explicit empty folder
    expect(pathOccupied(files, folders, 'free')).toBe(false);
  });

  it('isFolder distinguishes folders (implied or explicit) from files', () => {
    expect(isFolder(files, folders, 'src')).toBe(true); // implied by files
    expect(isFolder(files, folders, 'src/util')).toBe(true);
    expect(isFolder(files, folders, 'empty')).toBe(true); // explicit
    expect(isFolder(files, folders, 'src/game.js')).toBe(false); // a file
  });

  it('allFolders enumerates every intermediate segment + explicit empties', () => {
    expect(allFolders(files, folders)).toEqual(new Set(['empty', 'src', 'src/util']));
  });
});

describe('createFile', () => {
  it('adds a file, sizes it from content, and reports it as added', () => {
    const m = createFile([], [], 'game.js', 'text', 'hello');
    expect(m.files).toEqual([{ path: 'game.js', content: 'hello', kind: 'text', size: 5 }]);
    expect(m.added).toEqual(['game.js']);
  });

  it('drops the now-implied explicit empty folder', () => {
    const m = createFile([], ['src'], 'src/game.js');
    expect(m.folders).not.toContain('src');
    expect(m.files.map((x) => x.path)).toEqual(['src/game.js']);
  });

  it('throws on a duplicate path or an empty name', () => {
    expect(() => createFile([f('a.js')], [], 'a.js')).toThrow(/already exists/);
    expect(() => createFile([], [], '   ')).toThrow(/needs a name/);
  });
});

describe('createFolder', () => {
  it('tracks an explicit empty folder', () => {
    const m = createFolder([], [], 'assets');
    expect(m.folders).toContain('assets');
  });

  it('throws when something already occupies the path', () => {
    expect(() => createFolder([f('assets/logo.png')], [], 'assets')).toThrow(/already exists/);
  });
});

describe('renamePath', () => {
  it('renames a single file with a precise remap', () => {
    const m = renamePath([f('a.js', 'x')], [], 'a.js', 'b.js');
    expect(m.files).toEqual([{ path: 'b.js', content: 'x', kind: 'text', size: 1 }]);
    expect(m.remaps).toEqual([{ from: 'a.js', to: 'b.js' }]);
  });

  it('renames a folder, remapping every file + explicit empty under it', () => {
    const m = renamePath([f('src/a.js'), f('src/sub/b.js')], ['src/empty'], 'src', 'lib');
    expect(m.files.map((x) => x.path).sort()).toEqual(['lib/a.js', 'lib/sub/b.js']);
    expect(m.folders).toEqual(['lib/empty']);
    expect(m.remaps).toContainEqual({ from: 'src/a.js', to: 'lib/a.js' });
  });

  it('is a no-op when from === to', () => {
    const m = renamePath([f('a.js')], [], 'a.js', 'a.js');
    expect(m.remaps).toEqual([]);
  });

  it('refuses to move a folder into itself, or onto an occupied path', () => {
    expect(() => renamePath([f('src/a.js')], [], 'src', 'src/sub')).toThrow(/into itself/);
    expect(() => renamePath([f('a.js'), f('b.js')], [], 'a.js', 'b.js')).toThrow(/already exists/);
  });
});

describe('movePath', () => {
  it('moves a file into a directory, keeping its basename', () => {
    const m = movePath([f('a.js')], [], 'a.js', 'src');
    expect(m.files.map((x) => x.path)).toEqual(['src/a.js']);
    expect(m.remaps).toEqual([{ from: 'a.js', to: 'src/a.js' }]);
  });
});

describe('removePath', () => {
  it('removes a single file', () => {
    const m = removePath([f('a.js'), f('b.js')], [], 'a.js');
    expect(m.files.map((x) => x.path)).toEqual(['b.js']);
    expect(m.removed).toEqual(['a.js']);
  });

  it('removes a whole folder (every file + explicit empty under it)', () => {
    const m = removePath([f('src/a.js'), f('src/b.js'), f('keep.js')], ['src/empty'], 'src');
    expect(m.files.map((x) => x.path)).toEqual(['keep.js']);
    expect(m.removed.sort()).toEqual(['src/a.js', 'src/b.js']);
    expect(m.folders).toEqual([]);
  });
});
