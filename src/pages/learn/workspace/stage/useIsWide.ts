// Wide-vs-narrow seam for the Stage's split layout (music-stage-prd D-MS9).
// ≥740px (PRD §2.1's breakpoint) the Stage renders the side-by-side studio
// split; below it the stacked mobile column. `matchMedia` is guarded the same
// way the playground's ThinkingBubble guards it — jsdom test runs stub it.

import { useSyncExternalStore } from 'react';

const WIDE_QUERY = '(min-width: 740px)';

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function subscribe(onChange: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const mql = window.matchMedia(WIDE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  // No matchMedia (bare jsdom) → wide: the split layout is the design default.
  return hasMatchMedia() ? window.matchMedia(WIDE_QUERY).matches : true;
}

export function useIsWide(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
