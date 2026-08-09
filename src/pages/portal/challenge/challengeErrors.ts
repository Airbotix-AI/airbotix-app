// Backend error codes → copy a non-technical parent can act on
// (creative-code-challenge-prd.md §5 flow 1).
//
// The backend's own `message` is often already parent-readable (PAYMENT_PENDING
// spells out what to do), so it is preferred wherever it says more than a
// generic sentence would. The codes mapped here are the ones whose backend
// wording is written for an API consumer, not for a parent standing at a
// checkout with a card in hand.

import { ApiError } from '@/lib/api';
import type { ChallengeConsentDocType, ChallengeConsentGapReason } from './challengeApi';

/** `details.missing[]` on a 409 CONSENT_REQUIRED. */
export interface MissingConsentDocument {
  document_type: ChallengeConsentDocType;
  current_version: string;
  reason: ChallengeConsentGapReason | null;
}

const MESSAGES: Record<string, string> = {
  // The checkout gate (D-CCC-7). The page also reopens the outstanding document,
  // so this copy says what happened rather than what to click.
  CONSENT_REQUIRED:
    'Both consent forms need a parent or guardian signature before the entry fee can be paid. ' +
    'The outstanding form is open below.',
  // A signature was filed against wording the parent was not shown.
  CONSENT_DOCUMENT_SUPERSEDED:
    'This form was updated while it was open. Reload the page and read the current version ' +
    'before signing — nothing was recorded.',
  EDITION_NOT_OPEN_FOR_REGISTRATION:
    'This challenge is not taking entries at the moment, so nothing can be signed or paid ' +
    'right now. Check the challenge page for the next registration window.',
  ALREADY_ENTERED: 'This child is already entered in this challenge.',
  FAMILY_REQUIRED: 'Finish setting up your family profile before registering a child.',
  NOT_FOUND: 'We could not find this challenge. Check the link you followed.',
  FORBIDDEN: 'Only a parent or guardian can register a child for this challenge.',
};

/**
 * A parent-facing sentence for any failed challenge request. Never returns an
 * empty string, and never returns something that could read as success — an
 * unrecognised failure is still stated as a failure.
 */
export function challengeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  // `typeof === 'string'`, not just truthiness: a server-sent code of
  // `__proto__` / `constructor` would otherwise resolve to something off
  // Object.prototype and be rendered as if it were our copy.
  const mapped = MESSAGES[error.code];
  if (typeof mapped === 'string') return mapped;
  return error.message?.trim() ? error.message : fallback;
}

/** True when the backend refused checkout because a signature is outstanding. */
export function isConsentRequired(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'CONSENT_REQUIRED';
}

/**
 * True for the backend's deliberately ambiguous 404. The registration read
 * answers NOT_FOUND for a missing edition AND for a kid id that is not this
 * family's (`challenge-registration-context.ts` — never leak another family's
 * kid ids), so a page that treats it as "this challenge does not exist" tells a
 * parent the wrong thing whenever a stale kid id is what actually failed.
 */
export function isChallengeNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_FOUND';
}

/**
 * Which documents the backend says are outstanding, when it told us. Returns an
 * empty list rather than guessing — the refreshed consent status is the source
 * of truth for what the page renders.
 */
export function missingConsentDocuments(error: unknown): MissingConsentDocument[] {
  if (!(error instanceof ApiError)) return [];
  const details = error.details as { missing?: unknown } | undefined;
  if (!details || !Array.isArray(details.missing)) return [];
  return details.missing.filter(
    (entry): entry is MissingConsentDocument =>
      typeof entry === 'object' && entry !== null && 'document_type' in entry,
  );
}

const DOC_NAMES: Record<ChallengeConsentDocType, string> = {
  parent_media_release: 'the media release',
  competition_terms: 'the competition terms',
};

const GAP_REASONS: Record<ChallengeConsentGapReason, string> = {
  never_signed: 'has not been signed yet',
  // A record exists but no longer counts — the parent has to sign again, and
  // saying only "not signed" would read as though their earlier signature had
  // been lost rather than lapsed.
  expired: 'has expired and needs signing again',
  superseded_version: 'was updated and needs signing again',
};

/**
 * Which document the backend says is outstanding, in words. Returns `null` when
 * the refusal carried no usable detail — the caller must NOT invent one, since
 * naming the wrong form sends a parent to re-sign something that was fine.
 */
export function consentGapDetail(error: unknown): string | null {
  const missing = missingConsentDocuments(error);
  const phrases = missing
    .map((doc) => {
      const name = DOC_NAMES[doc.document_type];
      const reason = doc.reason ? GAP_REASONS[doc.reason] : undefined;
      if (!name) return null;
      return `${name} ${reason ?? 'still needs signing'}`;
    })
    .filter((phrase): phrase is string => phrase !== null);
  return phrases.length > 0 ? phrases.join(' and ') : null;
}
