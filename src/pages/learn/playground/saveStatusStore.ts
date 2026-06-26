// Save-status store (PRD J3 — "visible save reassurance"). A tiny piece of UI
// state the Taskbar renders so the kid always sees their work is safe:
//   - 'idle'        nothing to show yet (just opened, no edits);
//   - 'saving'      a debounced save is in flight ("Saving…");
//   - 'saved'       the backend confirmed the write ("All saved ✓");
//   - 'queued'      offline — the edit is cached + will sync ("Saved on this device");
//   - 'kept-newest' a newer copy existed elsewhere; we kept it ("we kept your
//                   newest copy") and the superseded build is recoverable in
//                   History. The kid NEVER sees the word "conflict" (PRD J3).
//   - 'error'       the backend PERMANENTLY rejected the save (4xx — e.g. an
//                   asset over the size cap): the change won't survive a reload,
//                   so say so honestly instead of the false "Saved on this device".
//
// Owned outside React so the persistence effect in PlaygroundApp can drive it
// without prop-drilling through the workspace tree.

import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'kept-newest' | 'error';

interface SaveStatusState {
  status: SaveStatus;
  set: (status: SaveStatus) => void;
}

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  status: 'idle',
  set: (status) => set({ status }),
}));
