// The project (VFS) store — single source of truth for the kid's files, and the
// funnel every mutation goes through (editor saves, AI turns, file CRUD, drag
// moves). Centralizing here is what lets the later features hang off ONE place:
//   - open editor tabs reconcile to `change` (rename/move/remove),
//   - history checkpoints + IndexedDB persistence subscribe to `files`/`change`.
//
// Folders are implicit in the VFS, but we also track EXPLICIT empty folders so a
// kid can make a folder before putting a file in it (see vfsOps).

import { create } from 'zustand';

import type { VfsFile } from '../code/codeApi';
import {
  createFile as opCreateFile,
  createFolder as opCreateFolder,
  movePath,
  removePath,
  renamePath,
} from './vfsOps';

export type ChangeKind =
  | 'init'
  | 'apply'
  | 'create-file'
  | 'create-folder'
  | 'rename'
  | 'move'
  | 'remove';

/** A precise description of the last mutation, so consumers don't re-diff. */
export interface ProjectChange {
  /** Monotonic — lets effects re-fire even when paths repeat. */
  seq: number;
  kind: ChangeKind;
  remaps: { from: string; to: string }[];
  removed: string[];
  added: string[];
}

interface ProjectState {
  files: VfsFile[];
  /** Explicit empty folders (folders with no files under them yet). */
  folders: string[];
  /** The last mutation (null before the first load). */
  change: ProjectChange | null;

  /** Reset to a freshly-loaded project (clears folders + history of change). */
  setFiles: (files: VfsFile[]) => void;
  /** Restore a persisted project (files + explicit empty folders) on load. */
  hydrate: (files: VfsFile[], folders: string[]) => void;
  /** Replace the VFS wholesale — editor ▶ Play commit and AI turns. */
  apply: (files: VfsFile[]) => void;

  createFile: (path: string, kind?: VfsFile['kind'], content?: string) => void;
  createFolder: (path: string) => void;
  rename: (from: string, to: string) => void;
  move: (from: string, toDir: string) => void;
  remove: (path: string) => void;
}

let seq = 0;
const nextSeq = () => (seq += 1);

/** Folders that now contain a file are no longer "empty" — drop them. */
function pruneFolders(folders: string[], files: VfsFile[]): string[] {
  return folders.filter((d) => !files.some((f) => f.path.startsWith(`${d}/`)));
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  files: [],
  folders: [],
  change: null,

  setFiles: (files) =>
    set({ files, folders: [], change: { seq: nextSeq(), kind: 'init', remaps: [], removed: [], added: [] } }),

  hydrate: (files, folders) =>
    set({ files, folders, change: { seq: nextSeq(), kind: 'init', remaps: [], removed: [], added: [] } }),

  apply: (files) =>
    set((s) => {
      const prev = new Set(s.files.map((f) => f.path));
      const now = new Set(files.map((f) => f.path));
      const added = [...now].filter((p) => !prev.has(p));
      const removed = [...prev].filter((p) => !now.has(p));
      return {
        files,
        folders: pruneFolders(s.folders, files),
        change: { seq: nextSeq(), kind: 'apply', remaps: [], removed, added },
      };
    }),

  createFile: (path, kind = 'text', content = '') => {
    const { files, folders } = get();
    const m = opCreateFile(files, folders, path, kind, content);
    set({
      files: m.files,
      folders: m.folders,
      change: { seq: nextSeq(), kind: 'create-file', remaps: m.remaps, removed: m.removed, added: m.added },
    });
  },

  createFolder: (path) => {
    const { files, folders } = get();
    const m = opCreateFolder(files, folders, path);
    set({
      files: m.files,
      folders: m.folders,
      change: { seq: nextSeq(), kind: 'create-folder', remaps: m.remaps, removed: m.removed, added: m.added },
    });
  },

  rename: (from, to) => {
    const { files, folders } = get();
    const m = renamePath(files, folders, from, to);
    set({
      files: m.files,
      folders: m.folders,
      change: { seq: nextSeq(), kind: 'rename', remaps: m.remaps, removed: m.removed, added: m.added },
    });
  },

  move: (from, toDir) => {
    const { files, folders } = get();
    const m = movePath(files, folders, from, toDir);
    set({
      files: m.files,
      folders: m.folders,
      change: { seq: nextSeq(), kind: 'move', remaps: m.remaps, removed: m.removed, added: m.added },
    });
  },

  remove: (path) => {
    const { files, folders } = get();
    const m = removePath(files, folders, path);
    set({
      files: m.files,
      folders: m.folders,
      change: { seq: nextSeq(), kind: 'remove', remaps: m.remaps, removed: m.removed, added: m.added },
    });
  },
}));
