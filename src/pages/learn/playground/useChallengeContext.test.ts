// The strip's exclusion set as a pure predicate (entrant-onboarding-prd §8.3).
//
// `PlaygroundApp.challenge.test.tsx` proves the strip is absent in each real
// mode; this file pins the RULE, so a future mode added to the studio has one
// obvious place to be classified rather than six render paths to re-audit.

import { describe, expect, it } from 'vitest';

import { challengeStripApplies, type ChallengeStripConditions } from './useChallengeContext';

/** A signed-in child, arriving from their challenge link. */
const ENTRANT: ChallengeStripConditions = {
  readOnly: false,
  prepHost: false,
  demoMode: false,
  classCreate: false,
  isKid: true,
  slug: 'creative-code-challenge-2026-junior',
  editionId: null,
};

describe('challengeStripApplies', () => {
  it('applies to a signed-in child arriving from a challenge link', () => {
    expect(challengeStripApplies(ENTRANT)).toBe(true);
  });

  it('applies to a resumed project whose challenge context is persisted', () => {
    expect(challengeStripApplies({ ...ENTRANT, slug: null, editionId: 'ed_1' })).toBe(true);
  });

  it.each<[string, Partial<ChallengeStripConditions>]>([
    ['read-only teacher live view', { readOnly: true }],
    ['teacher-prep host', { prepHost: true }],
    ['public try-demo', { demoMode: true }],
    ['class work', { classCreate: true }],
    ['no signed-in child', { isKid: false }],
    ['an ordinary personal project (no challenge context)', { slug: null, editionId: null }],
  ])('does not apply to %s', (_label, override) => {
    expect(challengeStripApplies({ ...ENTRANT, ...override })).toBe(false);
  });
});
