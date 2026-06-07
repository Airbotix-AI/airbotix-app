/**
 * Tiny event bus to (re)open the parent welcome tour on demand — e.g. a
 * "How it works" button — decoupled from the WelcomeWizard component so the
 * component file only exports a component (react-refresh friendly).
 */
const OPEN_TOUR_EVENT = 'airbotix:open-tour';

export function openWelcomeTour(): void {
  try {
    window.dispatchEvent(new Event(OPEN_TOUR_EVENT));
  } catch {
    // no-op (SSR / sandbox)
  }
}

export function onOpenWelcomeTour(handler: () => void): () => void {
  window.addEventListener(OPEN_TOUR_EVENT, handler);
  return () => window.removeEventListener(OPEN_TOUR_EVENT, handler);
}
