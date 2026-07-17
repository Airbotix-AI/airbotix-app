import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the backend save/load the persistence layer delegates to. IndexedDB is
// unavailable in jsdom, so the cache calls no-op (swallowed) and these mocks are
// the only behaviour under test — exactly the backend-source-of-truth contract.
const readVfsSnapshot = vi.fn();
const saveVfs = vi.fn();

// Defined inside the (hoisted) factory so it isn't referenced before init.
vi.mock('../code/codeApi', () => {
  class SaveConflictError extends Error {
    constructor(public readonly current: { files: unknown[]; version: number }) {
      super('save_conflict');
      this.name = 'SaveConflictError';
    }
  }
  return {
    readVfsSnapshot: (...a: unknown[]) => readVfsSnapshot(...a),
    saveVfs: (...a: unknown[]) => saveVfs(...a),
    SaveConflictError,
  };
});

import { ApiError } from '@/lib/api';
import { SaveConflictError } from '../code/codeApi';
import { loadProject, saveProject, type PersistedProject } from './projectPersistence';

const file = (path: string, content: string) => ({ path, content, kind: 'text' as const, size: content.length });

const snapshot = (files: ReturnType<typeof file>[], version: number): PersistedProject => ({
  files,
  folders: [],
  checkpoints: [],
  savedAt: 0,
  version,
});

describe('projectPersistence — backend save/load + outbox (PRD J3)', () => {
  beforeEach(() => {
    readVfsSnapshot.mockReset();
    saveVfs.mockReset();
  });

  describe('loadProject', () => {
    it('reads the SERVER snapshot (versioned) for a real project, not the scaffold', async () => {
      readVfsSnapshot.mockResolvedValue({ files: [file('main.js', 'server')], version: 7 });
      const loaded = await loadProject('game-1', 'game-1');
      expect(readVfsSnapshot).toHaveBeenCalledWith('game-1');
      expect(loaded?.files[0].content).toBe('server');
      expect(loaded?.version).toBe(7);
    });

    it('falls back to null (offline cache empty) when the backend is unreachable', async () => {
      readVfsSnapshot.mockRejectedValue(new Error('offline'));
      // jsdom has no IndexedDB → readCache returns null → loadProject returns null.
      expect(await loadProject('game-1', 'game-1')).toBeNull();
    });

    it('is cache-only with no projectId (DEV sandbox — never hits the backend)', async () => {
      await loadProject('dev-sandbox');
      expect(readVfsSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('saveProject', () => {
    it('PUTs the VFS with the current version and reports the bumped version', async () => {
      saveVfs.mockResolvedValue({ files: [file('main.js', 'a')], version: 8 });
      const res = await saveProject('game-1', snapshot([file('main.js', 'a')], 7), 'game-1');
      expect(saveVfs).toHaveBeenCalledWith({ projectId: 'game-1', files: [file('main.js', 'a')], version: 7 });
      expect(res).toEqual({ status: 'saved', version: 8 });
    });

    it('on a stale-version save the LOCAL live copy wins: re-saves it on the adopted server version', async () => {
      // The live editor is the kid's newest work — a 409 must never revert what's
      // on screen (the "my code reverted after a few seconds" bug). The server's
      // conflicting copy is handed back for History instead.
      const serverFiles = [file('main.js', 'other-copy')];
      const local = [file('main.js', 'my-live-edit')];
      saveVfs
        .mockRejectedValueOnce(new SaveConflictError({ files: serverFiles, version: 12 }))
        .mockResolvedValueOnce({ files: local, version: 13 });
      const res = await saveProject('game-1', snapshot(local, 9), 'game-1');
      // The retry PUT carries the kid's files at the server's version counter.
      expect(saveVfs).toHaveBeenLastCalledWith(
        expect.objectContaining({ projectId: 'game-1', files: local, version: 12 }),
      );
      expect(res).toEqual({ status: 'kept-newest', version: 13, overwritten: serverFiles });
    });

    it('a DOUBLE conflict (live external writer) adopts the server version and stays queued', async () => {
      const local = [file('main.js', 'mine')];
      saveVfs
        .mockRejectedValueOnce(new SaveConflictError({ files: [file('main.js', 'a')], version: 12 }))
        .mockRejectedValueOnce(new SaveConflictError({ files: [file('main.js', 'b')], version: 13 }));
      const res = await saveProject('game-1', snapshot(local, 9), 'game-1');
      // Never loops: the caller bases its NEXT save on the adopted counter.
      expect(saveVfs).toHaveBeenCalledTimes(2);
      expect(res).toEqual({ status: 'queued', version: 13 });
    });

    it('a conflict retry that hits a permanent 4xx surfaces as rejected', async () => {
      saveVfs
        .mockRejectedValueOnce(new SaveConflictError({ files: [], version: 12 }))
        .mockRejectedValueOnce(new ApiError(400, 'VFS_FILE_TOO_LARGE', 'too big'));
      const res = await saveProject('game-1', snapshot([file('a.js', 'x')], 9), 'game-1');
      expect(res).toEqual({ status: 'rejected', reason: 'too big' });
    });

    it('queues the save (cache = outbox) when the backend is unreachable', async () => {
      saveVfs.mockRejectedValue(new Error('network down'));
      const res = await saveProject('game-1', snapshot([file('main.js', 'x')], 3), 'game-1');
      expect(res).toEqual({ status: 'queued' });
    });

    it('REJECTS (not queued) on a permanent 4xx — e.g. an asset over the size cap', async () => {
      // The original asset-vanish bug: the backend rejected the oversized save (400)
      // but it was mislabelled "queued" (saved on device), so the next load read the
      // image-less server VFS. A 4xx must surface as a real failure, never as queued.
      saveVfs.mockRejectedValue(
        new ApiError(400, 'VFS_FILE_TOO_LARGE', 'assets/huge.png exceeds the 16 MB per-file limit.'),
      );
      const res = await saveProject('game-1', snapshot([file('assets/huge.png', 'x')], 3), 'game-1');
      expect(res).toEqual({ status: 'rejected', reason: 'assets/huge.png exceeds the 16 MB per-file limit.' });
    });

    it('is cache-only with no projectId (reports saved without a backend call)', async () => {
      const res = await saveProject('dev-sandbox', snapshot([file('main.js', 'x')], 0));
      expect(saveVfs).not.toHaveBeenCalled();
      expect(res).toEqual({ status: 'saved', version: 0 });
    });
  });
});
