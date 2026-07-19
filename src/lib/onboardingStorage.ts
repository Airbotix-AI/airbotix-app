/**
 * Per-parent onboarding flags (parent-portal-onboarding-prd.md §6.1).
 *
 * Frontend-only completion state for the first-login onboarding (welcome wizard
 * + getting-started checklist). Keyed by the parent's user `sub` so multiple
 * parents on one browser don't collide. Values are the string '1' (set) /
 * absent (unset), matching the existing `airbotix.learn.welcomed` convention.
 *
 * localStorage writes don't trigger React re-renders, and the native `storage`
 * event only fires in *other* tabs — so we publish an in-tab change event that
 * `useSyncExternalStore` subscribes to, letting the checklist flip live when a
 * flag is set (e.g. opening the kid-login helper marks that step done).
 */

export type OnboardingFlag =
  | 'welcomeSeen'
  | 'checklistDismissed'
  | 'kidLoginShown'
  | 'limitsReviewed'
  | 'guidesBrowsed';

// Stable order — used to build the snapshot string for useSyncExternalStore.
const FLAG_ORDER: OnboardingFlag[] = [
  'welcomeSeen',
  'checklistDismissed',
  'kidLoginShown',
  'limitsReviewed',
  'guidesBrowsed',
];

/** All-unset snapshot — one slot per FLAG_ORDER entry. */
export const EMPTY_FLAGS_SNAPSHOT = FLAG_ORDER.map(() => '0').join('|');

const keyFor = (sub: string, flag: OnboardingFlag) => `airbotix.onboarding.${flag}.${sub}`;

// In-tab pub/sub so the writing tab re-renders (native `storage` event doesn't fire locally).
const changeTarget = new EventTarget();
const CHANGE_EVENT = 'change';

export function getOnboardingFlag(sub: string, flag: OnboardingFlag): boolean {
  if (!sub) return false;
  try {
    return localStorage.getItem(keyFor(sub, flag)) === '1';
  } catch {
    return false; // SSR / sandbox / quota
  }
}

export function setOnboardingFlag(sub: string, flag: OnboardingFlag): void {
  if (!sub) return;
  try {
    localStorage.setItem(keyFor(sub, flag), '1');
  } catch {
    // ignore — still notify so any in-memory listeners can re-read
  }
  changeTarget.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearOnboardingFlag(sub: string, flag: OnboardingFlag): void {
  if (!sub) return;
  try {
    localStorage.removeItem(keyFor(sub, flag));
  } catch {
    // ignore
  }
  changeTarget.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Subscribe to flag changes (same-tab via our EventTarget, cross-tab via the
 * native `storage` event). Returns an unsubscribe fn. Shape matches the
 * useSyncExternalStore `subscribe` contract.
 */
export function subscribeOnboardingFlags(listener: () => void): () => void {
  changeTarget.addEventListener(CHANGE_EVENT, listener);
  let onStorage: ((e: StorageEvent) => void) | null = null;
  try {
    onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('airbotix.onboarding.')) listener();
    };
    window.addEventListener('storage', onStorage);
  } catch {
    onStorage = null;
  }
  return () => {
    changeTarget.removeEventListener(CHANGE_EVENT, listener);
    if (onStorage) {
      try {
        window.removeEventListener('storage', onStorage);
      } catch {
        // ignore
      }
    }
  };
}

/**
 * A referentially-derived snapshot of all flags for `sub`, e.g. "1|0|1|0".
 * Returning a primitive string (not a fresh object) keeps useSyncExternalStore's
 * getSnapshot stable across renders when nothing changed.
 */
export function readFlagsSnapshot(sub: string): string {
  if (!sub) return EMPTY_FLAGS_SNAPSHOT;
  return FLAG_ORDER.map((flag) => (getOnboardingFlag(sub, flag) ? '1' : '0')).join('|');
}

/** Parse a snapshot string back into per-flag booleans. */
export function parseFlagsSnapshot(snapshot: string): Record<OnboardingFlag, boolean> {
  const parts = snapshot.split('|');
  return FLAG_ORDER.reduce(
    (acc, flag, i) => {
      acc[flag] = parts[i] === '1';
      return acc;
    },
    {} as Record<OnboardingFlag, boolean>,
  );
}
