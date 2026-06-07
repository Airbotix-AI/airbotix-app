// Project persistence (PRD §6 D-GAME3 / J3 + J9). The backend is the source of
// truth: a project's VFS is saved with `PUT /projects/:id/code/files` (version-
// stamped, last-write-wins) and loaded with `GET …/code/files`. IndexedDB is no
// longer the store — it's an OFFLINE CACHE + WRITE OUTBOX: the last save is
// cached so a reload restores instantly (and works offline), and a save that
// can't reach the backend is queued and flushed on the next successful save.
//
// Conflict policy (PRD J3): on a stale-version save the backend returns the
// server's newer snapshot (409 → SaveConflictError). We keep the kid's NEWEST
// copy (server wins) and hand the SUPERSEDED build back so the caller can drop
// it into History — recoverable, never silently lost. The word "conflict" never
// reaches the kid (caller copy says "we kept your newest copy").
//
// The DEV `/playground-sandbox` has no project id, so it stays cache-only — the
// same IndexedDB store, no backend round-trip.

import { readVfsSnapshot, saveVfs, SaveConflictError, type VfsFile, type VfsSnapshot } from '../code/codeApi';
import type { Checkpoint } from './historyStore';

export interface PersistedProject {
  files: VfsFile[];
  folders: string[];
  checkpoints: Checkpoint[];
  savedAt: number;
  /** Server save version this snapshot was last reconciled against (0 if never). */
  version: number;
}

const DB_NAME = 'airbotix-playground';
const STORE = 'projects';

/** Open the DB and run one request against the object store; closes after. */
function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    };
  });
}

/** Read the IndexedDB cache for a key, or `null` if none / on any failure. */
async function readCache(key: string): Promise<PersistedProject | null> {
  try {
    const data = await withStore<PersistedProject | undefined>('readonly', (s) => s.get(key));
    return data ?? null;
  } catch {
    return null;
  }
}

/** Write the IndexedDB cache for a key. Best-effort — swallows failures. */
async function writeCache(key: string, data: PersistedProject): Promise<void> {
  try {
    await withStore('readwrite', (s) => s.put(data, key));
  } catch {
    // Caching is best-effort; losing a cache write only costs an offline reload.
  }
}

/**
 * Load a project to open in the studio (PRD J9). With a `projectId` the SERVER
 * is the source of truth: we read its versioned VFS, refresh the cache, and
 * return it (so a reload restores the saved state, never the scaffold). If the
 * backend is unreachable we fall back to the IndexedDB cache (offline). Without
 * a `projectId` (DEV sandbox) it's cache-only.
 */
export async function loadProject(
  key: string,
  projectId?: string,
): Promise<PersistedProject | null> {
  if (projectId) {
    try {
      const snap = await readVfsSnapshot(projectId);
      const cache = await readCache(key);
      const loaded: PersistedProject = {
        files: snap.files,
        // History is client-side today (historyStore); preserve any cached
        // checkpoints/folders so the timeline survives a reload.
        folders: cache?.folders ?? [],
        checkpoints: cache?.checkpoints ?? [],
        savedAt: Date.now(),
        version: snap.version,
      };
      await writeCache(key, loaded);
      return loaded;
    } catch {
      // Offline / backend not ready → restore from the cache if we have one.
      return readCache(key);
    }
  }
  return readCache(key);
}

/** The outcome of a save attempt the caller acts on (PRD J3). */
export type SaveResult =
  | { status: 'saved'; version: number }
  | { status: 'queued' } // offline — cached + outboxed, will flush on reconnect
  | {
      // A newer copy existed server-side; we kept it (server wins). The caller
      // surfaces "we kept your newest copy" and drops the superseded build into
      // History so it's recoverable.
      status: 'kept-newest';
      server: VfsSnapshot;
      superseded: VfsFile[];
    };

/**
 * Persist a project snapshot (PRD J3, last-write-wins). Always refreshes the
 * IndexedDB cache first (so a reload is instant + offline-safe), then writes to
 * the backend when a `projectId` is present:
 *   - success → cache the bumped version, report `saved`;
 *   - 409 (stale) → server wins; report `kept-newest` + the superseded build;
 *   - network failure → leave it cached (the cache IS the outbox) + report
 *     `queued`; the next successful save flushes the newest local state.
 * Without a `projectId` it's cache-only (`saved` once cached).
 */
export async function saveProject(
  key: string,
  data: PersistedProject,
  projectId?: string,
): Promise<SaveResult> {
  await writeCache(key, data);
  if (!projectId) return { status: 'saved', version: data.version };

  try {
    const snap = await saveVfs({ projectId, files: data.files, version: data.version });
    await writeCache(key, { ...data, version: snap.version, savedAt: Date.now() });
    return { status: 'saved', version: snap.version };
  } catch (e) {
    if (e instanceof SaveConflictError) {
      // Server wins: adopt its snapshot as the new base, keep our local build
      // recoverable in History. Cache the server version so the next save is
      // non-stale (last-write-wins resolves deterministically).
      await writeCache(key, {
        ...data,
        files: e.current.files,
        version: e.current.version,
        savedAt: Date.now(),
      });
      return { status: 'kept-newest', server: e.current, superseded: data.files };
    }
    // Network / backend down — the cache holds the newest state (the outbox);
    // a later successful save with the same version flushes it.
    return { status: 'queued' };
  }
}
