import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import {
  getChallengeFamilyEntries,
  type ChallengeFamilyEntriesView,
  type ChallengeFamilyEntry,
} from './challengeApi';

/**
 * The family's standing in one challenge edition, shared by every surface that
 * asks "how loudly should we be speaking to this family?"
 * (entrant-onboarding-prd.md §13).
 *
 * One hook, and therefore ONE react-query key, so the dashboard card and the
 * challenge hub cannot disagree about whether a child has started — two
 * hand-written keys would drift the moment one of them added a parameter, and
 * the disagreement would show up as a video that is prominent on one page and
 * collapsed on the other in the same session.
 */
export const challengeFamilyEntriesKey = (slug: string) =>
  ['challenge', slug, 'family-entries'] as const;

/** A paid entry whose child has not opened the studio yet. */
export function hasNotStarted(entry: ChallengeFamilyEntry): boolean {
  // A stored null is already normalised to `entered` server-side, so this is
  // the complete "paid but not started" test.
  return entry.status === 'registration_confirmed' && entry.progress_state === 'entered';
}

export function useChallengeFamilyEntries(slug: string) {
  const me = useMe();
  const user = me.data?.kind === 'user' ? me.data : null;
  const familyId = user?.family_id ?? null;

  return useQuery<ChallengeFamilyEntriesView>({
    queryKey: challengeFamilyEntriesKey(slug),
    queryFn: () => getChallengeFamilyEntries(slug),
    // Nothing to ask about without a family record. `retry: false` because the
    // overwhelmingly common answer is "this family never entered", and a
    // dashboard must not hammer the API to re-learn that on every render.
    enabled: familyId !== null,
    retry: false,
    staleTime: 60_000,
  });
}
