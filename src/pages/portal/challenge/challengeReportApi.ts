// The parent's PRIVATE Creative Code Challenge report
// (creative-code-challenge-prd.md §5 flow 10, §7; backend
// `platform-backend/src/challenges/challenge-parent-report{,.service}.ts`).
//
// Every shape here mirrors that backend contract exactly; dates arrive as ISO
// strings because they cross JSON. Nothing in this file logs anything: the
// payload carries a child's project name and the judges' written comments about
// their work.
//
// ⚠️ Two things this module deliberately does NOT declare, because the backend
// deliberately does not send them:
//   • any placing / rank / percentile / cohort statistic. The private report
//     carries no ranking of any kind, not even this child's own placing — the
//     public results page is where placings are published. A field added here
//     would be a field a page could render, so there is none to render.
//   • any other entrant's id, display name, marks or comments.
// If either ever appears in the response, it must be answered in the PRD before
// it is answered in a type.

import { api } from '@/lib/api';

export type ChallengeRubricDimensionKey =
  | 'original_idea'
  | 'playable_result'
  | 'testing_improvement'
  | 'code_understanding'
  | 'pitch'
  | 'responsible_creation';

/** The four-band scale (`challenge-parent-report.ts` CHALLENGE_REPORT_BAND_IDS). */
export type ChallengeReportBandId = 'starting' | 'developing' | 'capable' | 'extending';

export interface ChallengeRubricDimension {
  key: ChallengeRubricDimensionKey;
  label: string;
  max_points: number;
  description: string;
  /** Fairness rules served WITH the dimension (the English-pitch rule lives here). */
  constraints: string[];
}

export interface ChallengeReportBand {
  id: ChallengeReportBandId;
  label: string;
  from_ratio: number;
  to_ratio: number;
  /** Authored server-side and scoped to "in this entry" — never restated here. */
  description: string;
}

/** One judge's marks, anonymised to a position by the backend (PRD §7). */
export interface ChallengeReportJudge {
  /** `Judge 1`, `Judge 2`… — a position in this report, never an identity. */
  label: string;
  scores: Record<ChallengeRubricDimensionKey, number>;
  total: number;
  comments: string | null;
}

export interface ChallengeReportAggregate {
  judge_count: number;
  minimum_independent_scores: number;
  below_minimum_independent_scores: boolean;
  mean_total: number;
  total_points: number;
  dimensions: {
    key: ChallengeRubricDimensionKey;
    label: string;
    max_points: number;
    mean: number;
  }[];
}

export interface ChallengeReportCapabilityPart {
  rubric_dimension: ChallengeRubricDimensionKey;
  capability_id: string;
  title: string;
  evidence_of: string;
  max_points: number;
  mean: number;
  band: ChallengeReportBandId;
  band_label: string;
  band_description: string;
}

export interface ChallengeReportNextStep {
  kind: 'course' | 'practice';
  rubric_dimension: ChallengeRubricDimensionKey;
  capability_id: string;
  focus_title: string;
  course: {
    slug: string;
    title: string;
    target_age_min: number;
    target_age_max: number;
    /** The catalogue's OWN authored evidence line. Never written by this app. */
    why: string;
  } | null;
  practice: string[];
}

/**
 * The framing constraint, carried as DATA on every response.
 *
 * The page renders these sentences verbatim and never substitutes its own: the
 * whole point of the backend serving them is that a copy edit in a React file
 * cannot turn "what this one entry showed" into a grade, a qualification or a
 * label about a child.
 */
export interface ChallengeReportFraming {
  scope: string;
  not_a: string[];
  rubric_note: string;
  privacy_note: string;
}

/**
 * The rubric the report is READ against, plus the version the marks were
 * actually GIVEN under.
 *
 * ⚠️ `dimensions` / `total_points` describe the rubric published TODAY
 * (`CHALLENGE_JUDGING_RUBRIC`), while every mark in `judges` / `aggregate` is
 * frozen under `scored_under_version`. When the two versions disagree the
 * dimension list is not the list these marks were given against, so a page that
 * pairs them prints a mark against a maximum the child was never scored on —
 * which is why `scored_under_version` is carried at all (PRD §7 v0.19: "without
 * the version a total scored under a 25-point dimension and one scored under a
 * 20-point dimension are the same integer"). Never render one without checking
 * the other: see `rubricVersionsAgree` in `challengeReportState.ts`.
 */
export interface ChallengeReportRubric {
  current_version: string;
  /** `null` when the frozen standing did not record which version it used. */
  scored_under_version: string | null;
  total_points: number;
  dimensions: ChallengeRubricDimension[];
}

export interface ChallengeParentReport {
  edition: { id: string; slug: string; name: string; results_at: string };
  results_locked_at: string;
  kid_id: string;
  submission: {
    id: string;
    display_name: string;
    project_type: 'game' | 'interactive_web';
    one_change_note: string;
  };
  rubric: ChallengeReportRubric;
  judges: ChallengeReportJudge[];
  aggregate: ChallengeReportAggregate;
  capability_picture: ChallengeReportCapabilityPart[];
  bands: ChallengeReportBand[];
  next_steps: ChallengeReportNextStep[];
  framing: ChallengeReportFraming;
}

/**
 * GET /challenges/by-slug/:slug/report?kid_id= — this child's report.
 *
 * `@Roles('parent')` server-side, and the child is resolved through the same
 * family loader consent and checkout use, so another family's kid id 404s here
 * exactly as it does there. The client passes the kid id it was given and gates
 * nothing itself.
 */
export function getChallengeReport(slug: string, kidId: string): Promise<ChallengeParentReport> {
  return api<ChallengeParentReport>(
    `/challenges/by-slug/${encodeURIComponent(slug)}/report?kid_id=${encodeURIComponent(kidId)}`,
  );
}
