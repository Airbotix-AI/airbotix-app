// What the report endpoint's refusals MEAN to a parent, as a closed set.
//
// The distinction this file exists to keep is the one the page would otherwise
// blur: **a failed request is not "there is no report"**. The backend answers
// three DEFINITE things — not locked yet, locked but this entry produces no
// report, and "no such child/challenge" — and everything else (500, offline, a
// code this build has never heard of) is a FAILURE that must be shown as one,
// with a way to try again. A parent told "no report" by a dropped connection
// would reasonably conclude their child was left out of the judging.

import { ApiError } from '@/lib/api';

import type {
  ChallengeReportJudge,
  ChallengeReportRubric,
  ChallengeRubricDimensionKey,
} from './challengeReportApi';

/** `details.reason` on a 409 REPORT_NOT_AVAILABLE (backend `ChallengeReportUnavailableReason`). */
export type ChallengeReportUnavailableReason =
  | 'no_submission'
  | 'not_in_locked_results'
  | 'no_valid_judge_scores'
  | 'report_inconsistent';

export type ChallengeReportRefusal =
  /** Results are not locked. There is no preview and no partial — by design. */
  | { kind: 'not_locked'; results_at: string | null; message: string }
  /** Locked, but this child's entry yields no report. The backend says why. */
  | { kind: 'unavailable'; reason: ChallengeReportUnavailableReason | null; message: string }
  /**
   * The backend's deliberately ambiguous 404: a missing edition, a kid id that
   * is not this family's, and a child with no entry all answer alike, because
   * distinguishing them would confirm another family's kid id exists.
   */
  | { kind: 'not_found'; message: string }
  /** Anything else. NEVER rendered as an absence of a report. */
  | { kind: 'failed'; message: string };

const NOT_LOCKED_FALLBACK =
  'The results for this challenge have not been published yet, so there is no report to show ' +
  'yet. It becomes available once judging closes and the results are finalised.';

const UNAVAILABLE_FALLBACK =
  'There is no judges’ report for this child in this challenge. Please contact Airbotix if you ' +
  'expected one.';

const NOT_FOUND_FALLBACK =
  'We could not open a report for this child in this challenge. Check the link you followed, or ' +
  'choose a different child.';

/**
 * The backend's own sentence when it wrote one, our fallback when it did not.
 *
 * Preferring the server's wording matters here: it names the actual reason (an
 * entry that was never submitted reads differently from one whose marks did not
 * line up), and it is the wording the PRD holds to review.
 */
function serverMessage(error: ApiError, fallback: string): string {
  return error.message?.trim() ? error.message : fallback;
}

function detailString(error: ApiError, key: string): string | null {
  const details = error.details as Record<string, unknown> | undefined;
  const value = details?.[key];
  return typeof value === 'string' ? value : null;
}

const UNAVAILABLE_REASONS: ChallengeReportUnavailableReason[] = [
  'no_submission',
  'not_in_locked_results',
  'no_valid_judge_scores',
  'report_inconsistent',
];

function unavailableReason(error: ApiError): ChallengeReportUnavailableReason | null {
  const raw = detailString(error, 'reason');
  return UNAVAILABLE_REASONS.find((reason) => reason === raw) ?? null;
}

/**
 * Classify a failed report read. Unrecognised failures fall through to
 * `failed` — the page must never dress an unknown error as a known absence.
 */
export function classifyReportError(error: unknown, fallback: string): ChallengeReportRefusal {
  if (!(error instanceof ApiError)) return { kind: 'failed', message: fallback };
  switch (error.code) {
    case 'RESULTS_NOT_LOCKED':
      return {
        kind: 'not_locked',
        results_at: detailString(error, 'results_at'),
        message: serverMessage(error, NOT_LOCKED_FALLBACK),
      };
    case 'REPORT_NOT_AVAILABLE':
      return {
        kind: 'unavailable',
        reason: unavailableReason(error),
        message: serverMessage(error, UNAVAILABLE_FALLBACK),
      };
    case 'NOT_FOUND':
      return { kind: 'not_found', message: serverMessage(error, NOT_FOUND_FALLBACK) };
    default:
      return { kind: 'failed', message: serverMessage(error, fallback) };
  }
}

/** A mark against its dimension's own maximum, e.g. `12 / 20`. */
export function markOutOf(value: number, max: number): string {
  // The server already froze these to 2dp, so this only strips trailing zeros:
  // a mean of 12 reads as "12", 12.5 as "12.5". Printed against the dimension's
  // OWN maximum and never as a percentage — a percentage invites reading the
  // marks as a school-style score, which is what the served framing rules out.
  return `${Number(value.toFixed(2))} / ${max}`;
}

/**
 * What a dimension with no mark in it reads as.
 *
 * NOT `0`. A dimension a judge never scored — because the rubric gained one
 * after these marks were frozen, or because the stored map is short — is
 * "we don't know", and a family handed a judgement about their child must not
 * read our ignorance as a mark of nothing. This mirrors the backend's own rule
 * at `challenge-review.service.ts` `displayNameMatches`, where "no basis to
 * compare" returns `null` rather than `false`.
 */
export const NOT_MARKED = 'Not marked';

/** One judge's mark for one dimension, or `NOT_MARKED` when they gave none. */
export function judgeMark(
  scores: ChallengeReportJudge['scores'],
  key: ChallengeRubricDimensionKey,
  max: number,
): string {
  const value: number | undefined = scores?.[key];
  // `Number.isFinite` and not truthiness: a genuine 0 IS a mark and must print
  // as `0 / 15`, while `undefined` / `null` / `NaN` must never become one.
  return typeof value === 'number' && Number.isFinite(value) ? markOutOf(value, max) : NOT_MARKED;
}

/**
 * Whether the marks in this report were given under the rubric it also carries.
 *
 * `false` means the served `dimensions` / `total_points` are NOT the ones these
 * marks were scored against, so nothing derived from them may be printed — see
 * `ChallengeReportRubric` and PRD §7 v0.19. A `null` `scored_under_version` is
 * treated as a disagreement on purpose: an unrecorded version is not a matching
 * one, and guessing it matches is exactly the assumption that prints a mark
 * against the wrong maximum.
 */
export function rubricVersionsAgree(rubric: ChallengeReportRubric): boolean {
  return rubric.scored_under_version !== null &&
    rubric.scored_under_version === rubric.current_version;
}
