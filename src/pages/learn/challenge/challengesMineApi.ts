// The child's OWN view of the challenges they are entered in
// (creative-code-challenge-entrant-onboarding-prd.md §9 / execution plan lanes B+C).
//
// WHY THIS FILE EXISTS: every other kid-reachable challenge route needs a slug or
// an edition id handed to it by the caller, so a child could only get back into
// their challenge through a link a parent opened for them. `GET /challenges/mine`
// resolves the entries from the TOKEN — no slug from the client, no other child's
// data reachable — which is what makes a persistent kid surface possible without
// hardcoding an edition slug that would not survive edition rollover.
//
// It is stated ONCE here because three surfaces read the same rows: the kid home
// tile (`HomePage`), the studio's challenge strip (`useChallengeContext`), and
// the designation write both of those share.
//
// Nothing here is logged: an entry names a minor's challenge and their work.

import { api } from '@/lib/api';

/** Where an entrant is, from paid to submitted (PRD §6). */
export type ChallengeProgressState = 'entered' | 'oriented' | 'building' | 'submitted';

/** One row of `GET /challenges/mine` — the kid-scoped entry list. */
export interface MyChallengeEntry {
  edition_id: string;
  slug: string;
  name: string;
  entry_id: string;
  entry_status: string;
  progress_state: ChallengeProgressState;
  /**
   * The project the child intends to enter. **Not** a submission — designating
   * is a deliberate act that happens long before the window opens, and it is
   * what the studio strip, the parent's progress view and the operator funnel
   * all read. `null` until the child picks one.
   */
  designated_project_id: string | null;
  submission_open: string;
  submission_close: string;
}

/**
 * Shared TanStack Query key. One key across surfaces on purpose: designating a
 * project in the studio must move the home tile and the strip together, without
 * either of them re-deriving the state.
 */
export const MY_CHALLENGES_QUERY_KEY = ['challenges', 'mine'] as const;

export function listMyChallenges(): Promise<MyChallengeEntry[]> {
  return api<MyChallengeEntry[]>('/challenges/mine');
}

/** `PUT …/designated-project` result — the three fields the write can move. */
export interface DesignatedProjectResult {
  entry_id: string;
  designated_project_id: string | null;
  progress_state: ChallengeProgressState;
}

/**
 * Designate (or clear, with `projectId: null`) the project this entry is for.
 *
 * The backend re-checks BOTH that the project belongs to the child in the token
 * and that its kind is eligible under §8.1 — a child must never be able to
 * designate something the submission endpoint will later refuse. This client
 * call is the UI half of that rule, never a substitute for it.
 */
export function setDesignatedProject(args: {
  slug: string;
  entryId: string;
  projectId: string | null;
}): Promise<DesignatedProjectResult> {
  return api<DesignatedProjectResult>(
    `/challenges/by-slug/${encodeURIComponent(args.slug)}/entries/${encodeURIComponent(
      args.entryId,
    )}/designated-project`,
    { method: 'PUT', body: { project_id: args.projectId } },
  );
}
