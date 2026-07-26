// The Art Studio's unsaved canvas — the ONE place that knows how an in-progress
// drawing survives leaving the page (owner: "我刷新的话,反正画都没了").
//
// It lives in localStorage rather than the backend because a draft is not a
// picture yet: it is strokes the kid has not decided to keep, and a per-keystroke
// round trip would bill the API for every dab of paint. Saving is still what
// creates an Artifact — this only makes leaving non-destructive.
//
// Both the canvas (writes it) and the hub (offers to resume it, and drops it when
// the kid explicitly asks for a NEW picture) read the key from here, so the two
// pages can never disagree about what "the current draft" means.

import type { CanvasOp } from './strokeEngine';

/** What the canvas is working on, minus everything re-derivable on mount. */
export interface ArtDraft {
  ops: CanvasOp[];
  /** The picture the strokes sit on top of (a bucket take, or a reopened one). */
  baseArtifactId: string | null;
  /** A reopened saved picture — needs its project too, since it may live elsewhere. */
  baseRef: { id: string; projectId: string } | null;
}

/** Keyed by the kid's image bucket, so one child's draft never reaches another. */
export const artDraftKey = (projectId: string) => `art-draft:v1:${projectId}`;

/** The stored draft, or null when there is none / it is unreadable or empty. */
export function readArtDraft(projectId: string | undefined): ArtDraft | null {
  if (!projectId) return null;
  try {
    const raw = localStorage.getItem(artDraftKey(projectId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<ArtDraft>;
    const ops = Array.isArray(d.ops) ? d.ops : [];
    const baseArtifactId = d.baseArtifactId ?? null;
    const baseRef = d.baseRef ?? null;
    // A draft with neither strokes nor a base is nothing to come back to.
    if (ops.length === 0 && !baseArtifactId && !baseRef) return null;
    return { ops, baseArtifactId, baseRef };
  } catch {
    return null; // corrupt / storage unavailable — start clean
  }
}

export function writeArtDraft(projectId: string, draft: ArtDraft): void {
  try {
    localStorage.setItem(artDraftKey(projectId), JSON.stringify(draft));
  } catch {
    /* quota / unavailable — the work still lives in React state */
  }
}

export function clearArtDraft(projectId: string | undefined): void {
  if (!projectId) return;
  try {
    localStorage.removeItem(artDraftKey(projectId));
  } catch {
    /* nothing to do — a draft we cannot remove is one we also cannot read */
  }
}
