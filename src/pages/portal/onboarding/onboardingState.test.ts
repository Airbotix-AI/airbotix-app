import { describe, it, expect } from 'vitest';

import { computeOnboardingState, type OnboardingInputs } from './onboardingState';

// A freshly-registered parent: family + first kid exist, nothing else done.
const fresh: OnboardingInputs = {
  hasFamily: true,
  kidCount: 1,
  starsBalance: null,
  paymentMethodCount: 0,
  autoTopupEnabled: false,
  kidLoginShown: false,
  limitsReviewed: false,
};

const done = (s: ReturnType<typeof computeOnboardingState>, id: string) =>
  s.items.find((it) => it.id === id)!.done;

describe('computeOnboardingState', () => {
  it('brand-new parent: family + kid done, rest not, core incomplete', () => {
    const s = computeOnboardingState(fresh);
    expect(done(s, 'familySetup')).toBe(true);
    expect(done(s, 'kidAdded')).toBe(true);
    expect(done(s, 'kidLogin')).toBe(false);
    expect(done(s, 'addStars')).toBe(false);
    expect(done(s, 'setLimits')).toBe(false);
    expect(s.coreComplete).toBe(false);
  });

  it('null wallet balance is treated as not-done without throwing', () => {
    expect(() => computeOnboardingState({ ...fresh, starsBalance: null })).not.toThrow();
    expect(done(computeOnboardingState({ ...fresh, starsBalance: null }), 'addStars')).toBe(false);
  });

  it('positive stars balance completes addStars', () => {
    expect(done(computeOnboardingState({ ...fresh, starsBalance: 30 }), 'addStars')).toBe(true);
  });

  it('zero stars but a saved card completes addStars (OR branch)', () => {
    expect(
      done(computeOnboardingState({ ...fresh, starsBalance: 0, paymentMethodCount: 1 }), 'addStars'),
    ).toBe(true);
  });

  it('null stars but a saved card completes addStars', () => {
    expect(
      done(computeOnboardingState({ ...fresh, starsBalance: null, paymentMethodCount: 1 }), 'addStars'),
    ).toBe(true);
  });

  it('opening the kid-login helper completes kidLogin but not core (no stars yet)', () => {
    const s = computeOnboardingState({ ...fresh, kidLoginShown: true });
    expect(done(s, 'kidLogin')).toBe(true);
    expect(s.coreComplete).toBe(false);
  });

  it('kidLogin + stars => core complete', () => {
    const s = computeOnboardingState({ ...fresh, kidLoginShown: true, starsBalance: 10 });
    expect(s.coreComplete).toBe(true);
  });

  it('setLimits via auto_topup_enabled is done and optional, does not affect core', () => {
    const s = computeOnboardingState({ ...fresh, autoTopupEnabled: true });
    const item = s.items.find((it) => it.id === 'setLimits')!;
    expect(item.done).toBe(true);
    expect(item.optional).toBe(true);
    expect(s.coreComplete).toBe(false);
  });

  it('setLimits via the limitsReviewed flag is done', () => {
    expect(done(computeOnboardingState({ ...fresh, limitsReviewed: true }), 'setLimits')).toBe(true);
  });

  it('no kid yet => kidAdded not done', () => {
    expect(done(computeOnboardingState({ ...fresh, kidCount: 0 }), 'kidAdded')).toBe(false);
  });

  it('returns exactly 5 items in the documented order, optional only on setLimits', () => {
    const s = computeOnboardingState(fresh);
    expect(s.items.map((it) => it.id)).toEqual([
      'familySetup',
      'kidAdded',
      'kidLogin',
      'addStars',
      'setLimits',
    ]);
    expect(s.items.filter((it) => it.optional).map((it) => it.id)).toEqual(['setLimits']);
  });
});
