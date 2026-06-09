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

    it('on a stale-version save keeps the SERVER newest copy and returns the superseded build', async () => {
      const serverFiles = [file('main.js', 'newer-from-other-tab')];
      saveVfs.mockRejectedValue(new SaveConflictError({ files: serverFiles, version: 12 }));
      const local = [file('main.js', 'my-older-edit')];
      const res = await saveProject('game-1', snapshot(local, 9), 'game-1');
      expect(res).toEqual({
        status: 'kept-newest',
        server: { files: serverFiles, version: 12 },
        superseded: local,
      });
    });

    it('queues the save (cache = outbox) when the backend is unreachable', async () => {
      saveVfs.mockRejectedValue(new Error('network down'));
      const res = await saveProject('game-1', snapshot([file('main.js', 'x')], 3), 'game-1');
      expect(res).toEqual({ status: 'queued' });
    });

    it('is cache-only with no projectId (reports saved without a backend call)', async () => {
      const res = await saveProject('dev-sandbox', snapshot([file('main.js', 'x')], 0));
      expect(saveVfs).not.toHaveBeenCalled();
      expect(res).toEqual({ status: 'saved', version: 0 });
    });
  });
});
