/**
 * Pure onboarding completion logic (parent-portal-onboarding-prd.md §6).
 *
 * No React, no react-query, no localStorage, no clock — all inputs are passed in
 * already-resolved so this is deterministic and unit-testable in the node test
 * env. The hook (`useOnboardingState`) is a thin adapter that gathers these
 * inputs and calls `computeOnboardingState`. All "is this step done?" rules live
 * here, named once — never re-derived inline in components.
 */

export type OnboardingItemId =
  | 'familySetup'
  | 'kidAdded'
  | 'kidLogin'
  | 'addStars'
  | 'setLimits';

export interface OnboardingInputs {
  /** family_id != null */
  hasFamily: boolean;
  /** number of kids on the family (>= 1 expected post-register) */
  kidCount: number;
  /** wallet stars balance; null = unknown / endpoint 404 for a brand-new family */
  starsBalance: number | null;
  /** saved payment methods count */
  paymentMethodCount: number;
  /** auto-topup config enabled */
  autoTopupEnabled: boolean;
  /** parent has opened the kid-login helper (localStorage flag) */
  kidLoginShown: boolean;
  /** parent has visited the spending-limits page (localStorage flag) */
  limitsReviewed: boolean;
}

export interface OnboardingItem {
  id: OnboardingItemId;
  done: boolean;
  /** optional items never block core completion */
  optional: boolean;
}

export interface OnboardingState {
  /** fixed order: familySetup, kidAdded, kidLogin, addStars, setLimits */
  items: OnboardingItem[];
  /** the two steps that gate "ready to create": kidLogin && addStars */
  coreComplete: boolean;
}

export function computeOnboardingState(i: OnboardingInputs): OnboardingState {
  // null-safe: an unknown/404 wallet balance is simply "not yet topped up".
  const hasStars = i.starsBalance != null && i.starsBalance > 0;

  const familySetup = i.hasFamily;
  const kidAdded = i.kidCount >= 1;
  const kidLogin = i.kidLoginShown;
  const addStars = hasStars || i.paymentMethodCount > 0;
  const setLimits = i.autoTopupEnabled || i.limitsReviewed;

  const items: OnboardingItem[] = [
    { id: 'familySetup', done: familySetup, optional: false },
    { id: 'kidAdded', done: kidAdded, optional: false },
    { id: 'kidLogin', done: kidLogin, optional: false },
    { id: 'addStars', done: addStars, optional: false },
    { id: 'setLimits', done: setLimits, optional: true },
  ];

  return { items, coreComplete: kidLogin && addStars };
}
