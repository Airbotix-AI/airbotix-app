/**
 * True when the device asks for reduced motion.
 *
 * Callers that celebrate with a CARD + confetti use this to drop the confetti
 * while still showing the card (learn-missions-prd QM-4). `confetti.css` also
 * degrades the animation for anything that renders unconditionally; this is the
 * stronger opt-out. Guarded for bare jsdom / SSR, where `matchMedia` is absent.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
