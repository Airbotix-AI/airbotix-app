// Live focus presence for the kid's live-class studios (D-LIVE-3).
//
// Reports the project the kid CURRENTLY HAS OPEN to the teacher (over WS), so the
// teacher's Live Mode card + Peek reflect the actually-open project rather than
// just the most-recently-updated one. The kid's studio mounts `useReportFocus`,
// which:
//   - emits `class.kid_focus { project_id, kind, title }` on mount,
//   - clears it (`project_id: null`) on unmount (the kid left the studio),
//   - keeps a tiny shared "current focus" ref so the existing 10s heartbeat in
//     LearnLayout can RE-emit it (a teacher who opens Live Mode mid-session then
//     syncs within ~10s).
//
// WS-only, ephemeral — no REST, no DB. The server gates on the kid's JWT
// principal (kid + class_id) and re-broadcasts ONLY to the teacher-only
// `class:{id}:staff` room. Compliance (C5): the payload carries ids + kind +
// title (a display pointer the teacher already sees in `live-state`) — never file
// contents. We do NOT emit in the teacher read-only viewer (`readOnly`) or when
// the kid is not in a live class (`useKidClassId()` falsy).

import { useEffect } from 'react';

import { useKidClassId } from '@/auth/authStore';
import { sendWsEvent } from '@/lib/ws';

export interface KidFocus {
  project_id: string;
  kind: string;
  title?: string;
}

// The kid's currently-open project, shared so the heartbeat can re-emit it. A
// single browser is one kid in one studio at a time, so a module-level ref is
// the right scope (mirrors the optimistic single-kid model in `raiseHand.ts`).
let currentFocus: KidFocus | null = null;

export function getCurrentFocus(): KidFocus | null {
  return currentFocus;
}

// Re-emit the current focus on the heartbeat. No-op when the kid isn't focused on
// any project. Called from LearnLayout's existing 10s tick.
export function reEmitFocus(): void {
  if (!currentFocus) return;
  sendWsEvent('class.kid_focus', currentFocus, 'kid');
}

/**
 * Report (and keep reporting) the project the kid currently has open. No-op in
 * the teacher read-only viewer or when the kid isn't in a live class. Emits on
 * mount + whenever the project identity changes, and clears on unmount.
 */
export function useReportFocus(
  projectId: string | null | undefined,
  kind: string,
  title?: string,
  readOnly = false,
): void {
  const classId = useKidClassId();

  useEffect(() => {
    if (readOnly || !classId || !projectId) return undefined;
    const focus: KidFocus = { project_id: projectId, kind, title };
    currentFocus = focus;
    sendWsEvent('class.kid_focus', focus, 'kid');
    return () => {
      // Only clear if WE are still the active focus (guards against a fast
      // studio→studio swap where the next mount already set the new focus).
      if (currentFocus === focus) currentFocus = null;
      sendWsEvent('class.kid_focus', { project_id: null }, 'kid');
    };
  }, [classId, projectId, kind, title, readOnly]);
}
