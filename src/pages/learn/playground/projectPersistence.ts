// Local project persistence — survive a refresh without losing edits. Stores the
// VFS (files + empty folders) and the edit history in IndexedDB, keyed by
// project. Best-effort: any failure (no IndexedDB / quota / private mode) falls
// back to "nothing persisted", so the studio still opens from the scaffold.
//
// THE SEAM: a future backend write endpoint replaces `loadProject`/`saveProject`
// with calls through `src/lib/api.ts` (PUT the VFS server-side, GET it back) —
// the rest of the playground is unchanged. There is no backend write path yet
// (only `GET /projects/:id/code/files`), so today this is local IndexedDB.

import type { VfsFile } from '../code/codeApi';
import type { Checkpoint } from './historyStore';

export interface PersistedProject {
  files: VfsFile[];
  folders: string[];
  checkpoints: Checkpoint[];
  savedAt: number;
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

/** Load a persisted project, or `null` if none / on any failure. */
export async function loadProject(key: string): Promise<PersistedProject | null> {
  try {
    const data = await withStore<PersistedProject | undefined>('readonly', (s) => s.get(key));
    return data ?? null;
  } catch {
    return null;
  }
}

/** Persist a project snapshot. Best-effort — swallows failures. */
export async function saveProject(key: string, data: PersistedProject): Promise<void> {
  try {
    await withStore('readwrite', (s) => s.put(data, key));
  } catch {
    // Persistence is best-effort; losing a debounced save is non-fatal.
  }
}
