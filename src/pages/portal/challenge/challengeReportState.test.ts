// The one distinction the report page must never blur: a FAILED request is not
// "there is no report" (creative-code-challenge-prd.md §5 flow 10).

import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api';
import type { ChallengeReportRubric } from './challengeReportApi';
import {
  classifyReportError,
  judgeMark,
  markOutOf,
  NOT_MARKED,
  rubricVersionsAgree,
} from './challengeReportState';

const FALLBACK = 'We could not load this report.';

describe('classifyReportError', () => {
  it('reads a pre-lock refusal as "not published yet", carrying the results date', () => {
    const refusal = classifyReportError(
      new ApiError(409, 'RESULTS_NOT_LOCKED', 'Results have not been locked yet.', {
        results_at: '2026-09-14T00:00:00.000Z',
      }),
      FALLBACK,
    );

    expect(refusal.kind).toBe('not_locked');
    expect(refusal.kind === 'not_locked' && refusal.results_at).toBe('2026-09-14T00:00:00.000Z');
    expect(refusal.message).toBe('Results have not been locked yet.');
  });

  it('reads REPORT_NOT_AVAILABLE with the backend’s own reason and sentence', () => {
    const refusal = classifyReportError(
      new ApiError(409, 'REPORT_NOT_AVAILABLE', 'No entry was sent in.', {
        reason: 'no_submission',
      }),
      FALLBACK,
    );

    expect(refusal.kind).toBe('unavailable');
    expect(refusal.kind === 'unavailable' && refusal.reason).toBe('no_submission');
    expect(refusal.message).toBe('No entry was sent in.');
  });

  it('ignores a reason it does not recognise rather than rendering a raw code', () => {
    const refusal = classifyReportError(
      new ApiError(409, 'REPORT_NOT_AVAILABLE', 'Something else.', { reason: 'brand_new_reason' }),
      FALLBACK,
    );

    expect(refusal.kind === 'unavailable' && refusal.reason).toBeNull();
  });

  it('treats 404 as the backend’s deliberately ambiguous "no such child/challenge"', () => {
    const refusal = classifyReportError(
      new ApiError(404, 'NOT_FOUND', 'This child has no entry in this challenge.'),
      FALLBACK,
    );

    expect(refusal.kind).toBe('not_found');
  });

  it('classifies a 500, an unknown code and a non-ApiError all as FAILED', () => {
    expect(classifyReportError(new ApiError(500, 'INTERNAL', 'boom'), FALLBACK).kind).toBe('failed');
    expect(classifyReportError(new ApiError(418, 'BRAND_NEW_CODE', 'huh'), FALLBACK).kind).toBe(
      'failed',
    );
    const offline = classifyReportError(new TypeError('Failed to fetch'), FALLBACK);
    expect(offline.kind).toBe('failed');
    expect(offline.message).toBe(FALLBACK);
  });
});

describe('markOutOf', () => {
  it('prints a mark against its OWN dimension maximum, never as a percentage', () => {
    expect(markOutOf(12, 20)).toBe('12 / 20');
    expect(markOutOf(12.5, 20)).toBe('12.5 / 20');
    // The 2dp the backend froze survive; a trailing zero does not.
    expect(markOutOf(12.75, 20)).toBe('12.75 / 20');
    expect(markOutOf(12.5, 20)).not.toContain('%');
    expect(markOutOf(0, 5)).toBe('0 / 5');
  });
});

describe('judgeMark', () => {
  it('prints a real mark, including a genuine zero', () => {
    const scores = { original_idea: 20, responsible_creation: 0 } as never;
    expect(judgeMark(scores, 'original_idea', 25)).toBe('20 / 25');
    // A judge who marked 0 DID mark it — that must not be hidden behind
    // "Not marked" any more than an absent mark may be shown as a 0.
    expect(judgeMark(scores, 'responsible_creation', 5)).toBe('0 / 5');
  });

  it('never fabricates a 0 for a dimension this judge did not score', () => {
    // The failure this exists to stop: after a rubric version bump a dimension
    // absent from the frozen marks printed as `0 / 15` — a mark the child never
    // received, on the one screen that judges their child.
    const scores = { original_idea: 20 } as never;
    expect(judgeMark(scores, 'code_understanding', 15)).toBe(NOT_MARKED);
    expect(judgeMark(scores, 'code_understanding', 15)).not.toContain('0');
    expect(judgeMark(undefined as never, 'pitch', 15)).toBe(NOT_MARKED);
    expect(judgeMark({ pitch: Number.NaN } as never, 'pitch', 15)).toBe(NOT_MARKED);
  });
});

describe('rubricVersionsAgree', () => {
  const rubric = (over: Partial<ChallengeReportRubric>): ChallengeReportRubric => ({
    current_version: '1.0',
    scored_under_version: '1.0',
    total_points: 100,
    dimensions: [],
    ...over,
  });

  it('is true only when the marks were given under the rubric being served', () => {
    expect(rubricVersionsAgree(rubric({}))).toBe(true);
    expect(rubricVersionsAgree(rubric({ scored_under_version: '0.9' }))).toBe(false);
  });

  it('treats an unrecorded version as a disagreement, never as a match', () => {
    // "We do not know which rubric these marks were given under" is not
    // "they were given under this one".
    expect(rubricVersionsAgree(rubric({ scored_under_version: null }))).toBe(false);
  });
});
