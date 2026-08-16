// "Is the project open in this studio a Creative Code Challenge entry, and is it
// THE entry?" — the one question the challenge strip exists to answer
// (creative-code-challenge-entrant-onboarding-prd.md §8.3, execution plan PR 5).
//
// It lives here, not inside `PlaygroundApp`, because that component is already
// ~800 lines against the repo's ≤1000-line rule and carries six modes; the strip
// must be correct in all of them, which is a job for one testable predicate plus
// one hook rather than more branches in the studio.
//
// ⚠️ THE PARAM DOES NOT SURVIVE. `PlaygroundApp` calls `window.history.replaceState`
// to `/learn/playground/<newId>` the moment a project is created, discarding every
// query param — `?class=` only appears to survive because the CLASS is written to
// the database. Challenge context works the same way: the create call carries the
// slug, the backend stores `Project.challenge_edition_id`, and a resumed session
// reads it back off the project. `slug` below is therefore only the FIRST-ARRIVAL
// signal, and `editionId` is what a reload has.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  MY_CHALLENGES_QUERY_KEY,
  listMyChallenges,
  setDesignatedProject,
  type MyChallengeEntry,
} from '../challenge/challengesMineApi';

/** Everything that decides whether a studio session is a challenge session. */
export interface ChallengeStripConditions {
  /** Teacher live-view (D-LV-6): a read-only viewer is not an entrant. */
  readOnly: boolean;
  /** Teacher-prep host: a prep project is the teacher's, not a child's entry. */
  prepHost: boolean;
  /** `/try/playground` mounts this SAME component with no authenticated kid. */
  demoMode: boolean;
  /** "Create for this class" — class work is not a personal challenge entry. */
  classCreate: boolean;
  /** A signed-in child. Anything else cannot own an entry. */
  isKid: boolean;
  /** `?challenge=<slug>` on a `new` studio session (first arrival only). */
  slug: string | null;
  /** `Project.challenge_edition_id`, read back off a resumed project. */
  editionId: string | null;
}

/**
 * The complete exclusion set in one place (§8.3): the strip is shown ONLY for a
 * signed-in child's own challenge project. Class work, teacher prep, the
 * read-only live view, the public try-demo and every ordinary personal project
 * are excluded — and a project with no challenge context at all is excluded by
 * the last line, which is what makes "ordinary personal project" fall out for
 * free rather than needing its own rule.
 */
export function challengeStripApplies(c: ChallengeStripConditions): boolean {
  if (c.readOnly || c.prepHost || c.demoMode || c.classCreate) return false;
  if (!c.isKid) return false;
  return c.slug !== null || c.editionId !== null;
}

export interface ChallengeContextValue {
  entry: MyChallengeEntry;
  /** This project IS the entry the judges will see. */
  isDesignated: boolean;
  /** A project must exist before it can be designated (the landing phase has none). */
  canDesignate: boolean;
  designate: () => void;
  designating: boolean;
  designateFailed: boolean;
}

export interface ChallengeContextArgs {
  /** The real owned project, once one exists. */
  projectId?: string;
  slug: string | null;
  editionId: string | null;
}

/**
 * Resolve the child's entry for the challenge this studio session belongs to, or
 * `null` when there is none (no entry, a failed read, or a slug/edition that is
 * not one of theirs). `null` means the strip renders nothing — a child building
 * a game must never be shown a spinner or an error card over their studio.
 */
export function useChallengeContext(args: ChallengeContextArgs): ChallengeContextValue | null {
  const { projectId, slug, editionId } = args;
  const queryClient = useQueryClient();

  const entries = useQuery<MyChallengeEntry[]>({
    queryKey: MY_CHALLENGES_QUERY_KEY,
    queryFn: listMyChallenges,
    enabled: slug !== null || editionId !== null,
    // One failed read must not retry-storm behind a studio the child is using.
    retry: false,
  });

  // The persisted edition wins over the URL: after `replaceState` the param is
  // gone anyway, and the stored fact is the one the backend agrees with.
  const entry =
    (entries.data ?? []).find(
      (row) =>
        (editionId !== null && row.edition_id === editionId) ||
        (slug !== null && row.slug === slug),
    ) ?? null;

  const designate = useMutation({
    mutationFn: () => {
      if (!entry || !projectId) throw new Error('No entry to designate');
      return setDesignatedProject({ slug: entry.slug, entryId: entry.entry_id, projectId });
    },
    onSuccess: (result) => {
      // Patch the shared cache rather than refetching: the kid home tile reads
      // the same key, and a refetch behind an open studio is a needless call.
      queryClient.setQueryData<MyChallengeEntry[]>(MY_CHALLENGES_QUERY_KEY, (prev) =>
        (prev ?? []).map((row) =>
          row.entry_id === result.entry_id
            ? {
                ...row,
                designated_project_id: result.designated_project_id,
                progress_state: result.progress_state,
              }
            : row,
        ),
      );
    },
  });

  if (!entry) return null;

  return {
    entry,
    isDesignated: projectId != null && entry.designated_project_id === projectId,
    canDesignate: projectId != null,
    designate: () => designate.mutate(),
    designating: designate.isPending,
    designateFailed: designate.isError,
  };
}
