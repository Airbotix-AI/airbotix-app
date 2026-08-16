// WHAT MAY BE ENTERED in the Creative Code Challenge
// (creative-code-challenge-entrant-onboarding-prd.md §8.1, D-CCE-1).
//
// **A project is eligible when a judge can open it and use it in a browser.**
// That sentence is the rule; the array below is only its current implementation.
//
// Today that means `game`, `code`, `blocks` and `website`. `creative` is the one
// deliberate exclusion — an Art Studio picture has nothing to operate.
//
// ⚠️ **WHEN A NEW `ProjectKind` SHIPS, RE-DERIVE THIS LIST FROM THE SENTENCE
// ABOVE IN THE SAME CHANGE.** `website` shipped without that step and was
// silently unenterable for the whole first edition, while the landing page was
// selling it — we took money for something the product then refused.
//
// The server enforces the same rule (`PLAYABLE_PROJECT_KINDS` in
// platform-backend). The two lists live in different repos and cannot import
// each other, so each side PINS its literal set in a test: a new kind then fails
// a test instead of silently narrowing what a child is allowed to enter.
//
// It lives in its own module (not beside the page component) so both the page
// and its test can import it without turning the page into a mixed-export file.

import type { KidProject } from '../projects/kidProject';

export const PLAYABLE_KINDS: ReadonlyArray<KidProject['kind']> = [
  'game',
  'code',
  'blocks',
  'website',
];
