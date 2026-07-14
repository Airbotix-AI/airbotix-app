// Academy — NAPLAN Maths practice backend contract. Rides the shared kid-JWT
// `api` client (auth + silent refresh) exactly like every other Learn feature;
// image assets are PUBLIC (no auth header) so they load through a plain <img>.

import { api, BASE_URL } from '@/lib/api';

export const ACADEMY_YEAR_LEVELS = ['Year 3', 'Year 5', 'Year 7', 'Year 9'] as const;
export type AcademyYearLevel = (typeof ACADEMY_YEAR_LEVELS)[number];

export const ACADEMY_DEFAULT_YEAR: AcademyYearLevel = 'Year 5';
// Numeracy is the only subject for now (task scope); kept named so the selector
// and the fetch share one source of truth.
export const ACADEMY_SUBJECT = 'Numeracy' as const;
export const ACADEMY_SET_SIZE = 20;

export type AcademyAnswerType = 'choice' | 'value';

// One practice question. The official answer is deliberately NOT part of this
// shape — it only comes back from POST /academy/attempts after a kid answers.
export interface AcademyQuestion {
  id: string;
  source_ref: string;
  exam: string;
  subject: string;
  year_level: string;
  variant: string;
  paper_year: number;
  q_no: number;
  answer_type: AcademyAnswerType;
  q_image_key: string | null;
  page_image_key: string | null;
  stem_text: string | null;
  options: string[] | null;
  figure_keys: string[] | null;
  ac9_code: string | null;
  difficulty: string | null;
}

export interface AcademyAttemptResult {
  is_correct: boolean;
  correct_answer: string;
}

export interface AcademyProgress {
  attempts: number;
  correct: number;
  accuracy: number;
}

/** Absolute URL for a PUBLIC image asset (figure / question / page image key). */
export function academyAssetUrl(key: string): string {
  return `${BASE_URL}/academy/assets/${key}`;
}

/** Load a practice set for the selected year level (subject fixed to Numeracy). */
export function listAcademyQuestions(args: {
  yearLevel: AcademyYearLevel;
  limit?: number;
}): Promise<AcademyQuestion[]> {
  const params = new URLSearchParams({
    year_level: args.yearLevel,
    subject: ACADEMY_SUBJECT,
    limit: String(args.limit ?? ACADEMY_SET_SIZE),
  });
  return api<AcademyQuestion[]>(`/academy/questions?${params.toString()}`);
}

/** Submit one answer; the response reveals correctness + the official answer. */
export function submitAcademyAttempt(args: {
  questionId: string;
  submitted: string;
  timeMs?: number;
}): Promise<AcademyAttemptResult> {
  return api<AcademyAttemptResult>('/academy/attempts', {
    method: 'POST',
    body: {
      question_id: args.questionId,
      submitted: args.submitted,
      time_ms: args.timeMs,
    },
  });
}

/** This kid's running practice tally (shown on the end-of-set summary). */
export function getAcademyProgress(kidId: string): Promise<AcademyProgress> {
  return api<AcademyProgress>(`/academy/kids/${kidId}/progress`);
}
