// Pure operations over the flat VFS (`VfsFile[]`). The VFS has no folder
// entries — folders are IMPLICIT, derived from the `/`-delimited path segments —
// so a "folder op" (rename/remove/move) acts on every file under a `prefix/`.
//
// To make EMPTY folders representable (a kid makes a folder, then adds files),
// folders can also be carried as an explicit list alongside the files. These ops
// take + return both, keeping the two consistent (e.g. renaming a folder remaps
// any matching explicit empty-folder entries too).
//
// Every mutation returns a `VfsMutation`: the new files/folders PLUS a precise
// description of what changed (remaps / removed / added) so callers can reconcile
// open editor tabs and record history without re-diffing.

import type { VfsFile } from '../code/codeApi';

export interface VfsMutation {
  files: VfsFile[];
  /** Explicit empty-folder paths (folders with no files under them yet). */
  folders: string[];
  /** Path remaps (rename/move) — one entry per affected FILE. */
  remaps: { from: string; to: string }[];
  /** File paths removed. */
  removed: string[];
  /** File paths added. */
  added: string[];
}

/** Strip leading/trailing slashes and collapse repeats: ` /a//b/ ` → `a/b`. */
export function normalizePath(p: string): string {
  return p.trim().replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

/** The last path segment (file or folder name). */
export function basename(path: string): string {
  return normalizePath(path).split('/').pop() ?? '';
}

/** The parent directory of a path ('' for a root-level path). */
export function dirname(path: string): string {
  const segs = normalizePath(path).split('/');
  segs.pop();
  return segs.join('/');
}

/** Join a directory and a name into a normalized path. */
export function joinPath(dir: string, name: string): string {
  return normalizePath(dir ? `${dir}/${name}` : name);
}

/** True if a FILE exists at exactly this path. */
export function fileExists(files: VfsFile[], path: string): boolean {
  const p = normalizePath(path);
  return files.some((f) => f.path === p);
}

/** True if anything (a file or a non-empty folder) occupies this path. */
export function pathOccupied(files: VfsFile[], folders: string[], path: string): boolean {
  const p = normalizePath(path);
  return (
    files.some((f) => f.path === p || f.path.startsWith(`${p}/`)) ||
    folders.some((d) => d === p || d.startsWith(`${p}/`))
  );
}

/** True if a folder exists at this path (has files under it, or is an explicit empty folder). */
export function isFolder(files: VfsFile[], folders: string[], path: string): boolean {
  const p = normalizePath(path);
  return files.some((f) => f.path.startsWith(`${p}/`)) || folders.includes(p);
}

/** All folder paths implied by the files (every intermediate segment) + explicit empties. */
export function allFolders(files: VfsFile[], folders: string[]): Set<string> {
  const out = new Set<string>(folders);
  for (const f of files) {
    const segs = f.path.split('/');
    segs.pop(); // drop the filename
    let acc = '';
    for (const s of segs) {
      acc = acc ? `${acc}/${s}` : s;
      out.add(acc);
    }
  }
  return out;
}

const withSize = (f: VfsFile): VfsFile => ({ ...f, size: f.content.length });

/** Create a new (empty) file. Throws if a file already exists at the path. */
export function createFile(
  files: VfsFile[],
  folders: string[],
  path: string,
  kind: VfsFile['kind'] = 'text',
  content = '',
): VfsMutation {
  const p = normalizePath(path);
  if (!p) throw new Error('A file needs a name.');
  if (fileExists(files, p)) throw new Error(`"${p}" already exists.`);
  const file = withSize({ path: p, content, kind, size: 0 });
  // The new file's folder is now implied by it — drop any explicit empty entry.
  const dir = dirname(p);
  return {
    files: [...files, file],
    folders: folders.filter((d) => d !== dir),
    remaps: [],
    removed: [],
    added: [p],
  };
}

/** Create an empty folder (tracked explicitly until a file lands in it). */
export function createFolder(files: VfsFile[], folders: string[], path: string): VfsMutation {
  const p = normalizePath(path);
  if (!p) throw new Error('A folder needs a name.');
  if (pathOccupied(files, folders, p)) throw new Error(`"${p}" already exists.`);
  return { files, folders: [...folders, p], remaps: [], removed: [], added: [] };
}

/**
 * Rename/move a path to a new full path. Works for a file OR a folder (remapping
 * every file + explicit-empty-folder under the old prefix). Throws on collision.
 */
export function renamePath(files: VfsFile[], folders: string[], from: string, to: string): VfsMutation {
  const a = normalizePath(from);
  const b = normalizePath(to);
  if (!a || !b) throw new Error('Invalid name.');
  if (a === b) return { files, folders, remaps: [], removed: [], added: [] };
  // Disallow moving a folder into itself / its own descendant.
  if (b === a || b.startsWith(`${a}/`)) throw new Error("Can't move a folder into itself.");
  if (pathOccupied(files, folders, b)) throw new Error(`"${b}" already exists.`);

  const remaps: { from: string; to: string }[] = [];
  const nextFiles = files.map((f) => {
    if (f.path === a) {
      remaps.push({ from: f.path, to: b });
      return { ...f, path: b };
    }
    if (f.path.startsWith(`${a}/`)) {
      const np = b + f.path.slice(a.length);
      remaps.push({ from: f.path, to: np });
      return { ...f, path: np };
    }
    return f;
  });
  const nextFolders = folders.map((d) =>
    d === a ? b : d.startsWith(`${a}/`) ? b + d.slice(a.length) : d,
  );
  return { files: nextFiles, folders: nextFolders, remaps, removed: [], added: [] };
}

/** Move a file/folder INTO a target directory (keeps its basename). */
export function movePath(files: VfsFile[], folders: string[], from: string, toDir: string): VfsMutation {
  const a = normalizePath(from);
  const dest = joinPath(normalizePath(toDir), basename(a));
  return renamePath(files, folders, a, dest);
}

/** Remove a file, or a whole folder (every file + explicit-empty under `path/`). */
export function removePath(files: VfsFile[], folders: string[], path: string): VfsMutation {
  const p = normalizePath(path);
  const removed: string[] = [];
  const nextFiles = files.filter((f) => {
    const hit = f.path === p || f.path.startsWith(`${p}/`);
    if (hit) removed.push(f.path);
    return !hit;
  });
  const nextFolders = folders.filter((d) => d !== p && !d.startsWith(`${p}/`));
  return { files: nextFiles, folders: nextFolders, remaps: [], removed, added: [] };
}

/**
 * Merge an AI turn's server snapshot onto the kid's CURRENT local VFS. The turn
 * wins on the paths it actually changed (`changedPaths`: edited/added take the
 * server copy, paths the turn deleted are dropped); the kid's LOCAL copy wins on
 * every other path. A wholesale replace with the server snapshot would silently
 * revert any hand-edit the kid committed while the turn (or a server-side fix
 * turn) was in flight — the "my code reverted after a few seconds" bug.
 */
export function mergeTurnFiles(
  local: VfsFile[],
  server: VfsFile[],
  changedPaths: string[],
): VfsFile[] {
  const changed = new Set(changedPaths);
  const serverByPath = new Map(server.map((f) => [f.path, f]));
  const merged: VfsFile[] = [];
  for (const f of local) {
    if (!changed.has(f.path)) {
      merged.push(f);
      continue;
    }
    const s = serverByPath.get(f.path);
    if (s) merged.push(s); // turn edited it → server copy wins
    // else: the turn deleted it → drop
  }
  // Paths the turn ADDED (changed + on the server + not present locally).
  const localPaths = new Set(local.map((f) => f.path));
  for (const p of changed) {
    const s = serverByPath.get(p);
    if (s && !localPaths.has(p)) merged.push(s);
  }
  return merged;
}
