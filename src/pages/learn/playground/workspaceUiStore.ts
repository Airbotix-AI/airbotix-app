// Single source of truth for ALL persisted workspace UI state ("resume where I
// left off", PRD J9) — designed to be FUTURE-PROOF.
//
// Any pane/window registers its OWN namespaced slice via
//   const [ui, setUi] = usePersistedWorkspaceState('my-feature', MY_DEFAULTS)
// and the whole bag is serialised as one JSON blob per project
// (projectPersistence.saveWorkspaceUi). Adding a new persisted window = one hook
// call with a new namespace — NO central type edits here.
//
// Compatibility:
//  • Backward (new code ← old data): a slice or field absent from an older blob
//    falls back to the component's `defaults` (we merge defaults UNDER the persisted
//    partial), so adding fields never breaks an old saved workspace.
//  • Forward (old code ← new data): unknown slices written by a newer build are
//    PRESERVED on save (we snapshot the whole bag, not a fixed shape), so a downgrade
//    never silently drops them. `version` enables explicit migrations if ever needed.

import { useCallback } from 'react';
import { create } from 'zustand';

export const WORKSPACE_UI_VERSION = 1;

/** The serialised, persisted shape — an open-ended bag of namespaced slices. */
export interface WorkspaceUiBlob {
  version: number;
  slices: Record<string, unknown>;
}

interface WorkspaceUiState {
  slices: Record<string, unknown>;
  setSlice: (namespace: string, value: unknown) => void;
  /** Load a persisted blob (or reset to empty for a fresh project). */
  restore: (blob: WorkspaceUiBlob | null) => void;
  /** Read the whole current bag for persistence (preserves unknown slices). */
  snapshot: () => WorkspaceUiBlob;
}

export const useWorkspaceUiStore = create<WorkspaceUiState>((set, get) => ({
  slices: {},
  setSlice: (namespace, value) =>
    set((s) => ({ slices: { ...s.slices, [namespace]: value } })),
  restore: (blob) => set({ slices: blob?.slices ? { ...blob.slices } : {} }),
  snapshot: () => ({ version: WORKSPACE_UI_VERSION, slices: { ...get().slices } }),
}));

/**
 * Persisted, namespaced workspace UI state for one pane/feature — a drop-in for
 * `useState` that survives a resume. Returns the merged value (the component's
 * `defaults` under whatever was persisted) plus a patch setter.
 *
 * IMPORTANT: pass a STABLE `defaults` reference (a module-level constant), not an
 * inline object literal, or the merge will allocate every render.
 */
export function usePersistedWorkspaceState<T extends object>(
  namespace: string,
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const slice = useWorkspaceUiStore((s) => s.slices[namespace]) as Partial<T> | undefined;
  const value = { ...defaults, ...(slice ?? {}) } as T;
  const setPatch = useCallback(
    (patch: Partial<T>) => {
      const store = useWorkspaceUiStore.getState();
      const cur = { ...defaults, ...((store.slices[namespace] as Partial<T> | undefined) ?? {}) };
      store.setSlice(namespace, { ...cur, ...patch });
    },
    [namespace, defaults],
  );
  return [value, setPatch];
}

// ── Seed/write-back helpers for migrating an EXISTING component that already uses
//    `useState` (lower-risk than swapping to the hook). Seed the initialiser from
//    `readWorkspaceSlice`, and write the whole slice back in one effect. ──

/** One-shot read of a slice merged with `defaults` (use in a `useState` seed). */
export function readWorkspaceSlice<T extends object>(namespace: string, defaults: T): T {
  const slice = useWorkspaceUiStore.getState().slices[namespace] as Partial<T> | undefined;
  return { ...defaults, ...(slice ?? {}) };
}

/** Write a whole slice (use in a write-back effect). */
export function writeWorkspaceSlice(namespace: string, value: unknown): void {
  useWorkspaceUiStore.getState().setSlice(namespace, value);
}
