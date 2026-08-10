// Parent-side Creative Code Challenge registration API
// (creative-code-challenge-prd.md §5 flow 1, §6 "airbotix-app — Portal" row).
//
// Every shape here mirrors `platform-backend/src/challenges/*` exactly; dates
// arrive as ISO strings because they cross JSON. Nothing in this file logs
// anything: the payloads carry a child's display name and consent choices.

import { api } from '@/lib/api';

export type ChallengeConsentDocType = 'parent_media_release' | 'competition_terms';

export type ChallengeEntryStatus = 'pending_payment' | 'registration_confirmed' | 'withdrawn';

export type ChallengeEditionStatus =
  | 'draft'
  | 'registration_open'
  | 'submissions_open'
  | 'judging'
  | 'results_locked'
  | 'published';

/** Why a document does not currently count as signed (computed server-side). */
export type ChallengeConsentGapReason = 'never_signed' | 'expired' | 'superseded_version';

export type ChallengeConsentLegalReviewStatus = 'draft_pending_legal_review' | 'legally_approved';

export interface ChallengeConsentChoice {
  key: string;
  label: string;
}

/** A channel choice 6 may be granted in. Served WITH the document version. */
export interface ChallengeConsentChannelOption {
  key: string;
  label: string;
}

/**
 * One consent document plus this family's signature state on it.
 *
 * `body` + `legal_review_status` come from the backend's versioned document
 * registry. The UI must never substitute wording of its own, and must render
 * the not-legally-approved disclosure for any version still served as
 * `draft_pending_legal_review`.
 */
export interface ChallengeConsentDocumentStatus {
  document_type: ChallengeConsentDocType;
  current_version: string;
  title: string;
  legal_review_status: ChallengeConsentLegalReviewStatus;
  body: string;
  choices: ChallengeConsentChoice[];
  channel_options: ChallengeConsentChannelOption[];
  /**
   * The declaration a parent ticks to accept this version, or `null` for a
   * document that is signed by making its `choices`. Served by the backend for
   * the same reason `body` is: it is the operative sentence the e-signature is
   * filed against, so a page that authored its own would file the signature
   * against words the version never carried.
   */
  attestation: string | null;
  /**
   * The declaration beside the drawn or typed signature, and the closed relationship set
   * the block offers. Served for the same reason `attestation` is — the sentence
   * an e-signature is filed against, and the answers it may be filed under,
   * belong to the version and not to this page.
   */
  signer_declaration: string;
  signer_relationship_options: ChallengeSignerRelationshipOption[];
  /** Assurances served WITH this version. Never substituted by page copy. */
  assurances: string[];
  signed: boolean;
  signed_at: string | null;
  expires_at: string | null;
  signed_version: string | null;
  grants: unknown;
  /** Who signed, as recorded. `null` until this document carries a signature. */
  signer: ChallengeConsentSigner | null;
  missing_reason: ChallengeConsentGapReason | null;
}

export interface ChallengeSignerRelationshipOption {
  key: string;
  label: string;
}

export interface ChallengeConsentSigner {
  full_name: string;
  relationship: string;
  email: string;
  signature: string;
}

/**
 * The Parent/Guardian Details block sent with every signature.
 *
 * There is no `date`: the server stamps `signed_at`. A page that posted a typed
 * date would be asking the parent to state something the record contradicts.
 */
export interface ChallengeSignerDetails {
  full_name: string;
  relationship: string;
  email: string;
  signature: string;
}

export interface ChallengeConsentStatus {
  edition_id: string;
  kid_id: string;
  entry_id: string | null;
  documents: ChallengeConsentDocumentStatus[];
  kid_assent_at: string | null;
  /**
   * The sentence a parent ticks to record the child's own assent. Ticking it
   * writes a permanent audited record, so the words come from the backend
   * registry, not from this page.
   */
  kid_assent_statement: string;
  all_documents_signed: boolean;
}

export interface ChallengeRegistrationEdition {
  id: string;
  slug: string;
  name: string;
  age_group: string;
  entry_fee_cents: number;
  status: ChallengeEditionStatus;
  registration_open: boolean;
  submission_open: string;
  submission_close: string;
  results_at: string;
}

export interface ChallengeRegistrationEntry {
  id: string;
  status: ChallengeEntryStatus;
  /** What ACTUALLY landed in the wallet — 0 until the webhook has credited it. */
  stars_granted: number;
  stars_granted_at: string | null;
  kid_assent_at: string | null;
  starter_lab_attended_at: string | null;
}

export interface ChallengeRegistrationView {
  edition: ChallengeRegistrationEdition;
  kid_id: string | null;
  entry: ChallengeRegistrationEntry | null;
}

/**
 * The SIX choices the media release records SEPARATELY (upstream SOT §8,
 * D-CCC-7). They are six fields, never one blanket flag, and every boolean may
 * legitimately be `false` — a declined grant is a recorded decision.
 */
export interface MediaReleaseGrants {
  review: boolean;
  publish_title: boolean;
  publish_voice: boolean;
  publish_face: boolean;
  display_name: string;
  channels: string[];
  /** ISO date; required by the backend only when a channel is granted. */
  channels_until?: string;
}

/**
 * The same six choices as the SERVER stored them, which is a weaker shape than
 * what we post: an older record may predate a field, so every key is optional
 * and nothing here is assumed present.
 */
export interface StoredMediaReleaseGrants {
  review?: boolean;
  publish_title?: boolean;
  publish_voice?: boolean;
  publish_face?: boolean;
  display_name?: string;
  channels?: string[];
  channels_until?: string;
}

/**
 * Narrow a stored `grants` blob. Returns `null` for anything that is not an
 * object — a record whose permissions cannot be read must never be rendered (or
 * re-submitted) as though it granted something.
 */
export function readStoredMediaReleaseGrants(grants: unknown): StoredMediaReleaseGrants | null {
  if (typeof grants !== 'object' || grants === null || Array.isArray(grants)) return null;
  return grants as StoredMediaReleaseGrants;
}

export interface CompetitionTermsGrants {
  accepted: true;
}

export interface SignConsentBody {
  kid_id: string;
  document_type: ChallengeConsentDocType;
  /** The version the page DISPLAYED — the backend refuses a stale one. */
  document_version: string;
  grants: MediaReleaseGrants | CompetitionTermsGrants;
  /** Required on BOTH documents — each signature identifies its own signer. */
  signer: ChallengeSignerDetails;
}

export interface ChallengeCheckoutResult {
  entry_id: string;
  payment_intent_id: string;
  client_secret: string;
  checkout_url: string;
}

export function getChallengeRegistration(
  slug: string,
  kidId?: string,
): Promise<ChallengeRegistrationView> {
  const query = kidId ? `?kid_id=${encodeURIComponent(kidId)}` : '';
  return api<ChallengeRegistrationView>(
    `/challenges/by-slug/${encodeURIComponent(slug)}/registration${query}`,
  );
}

export function getChallengeConsent(
  editionId: string,
  kidId: string,
): Promise<ChallengeConsentStatus> {
  return api<ChallengeConsentStatus>(
    `/challenges/${encodeURIComponent(editionId)}/consent?kid_id=${encodeURIComponent(kidId)}`,
  );
}

/**
 * ONE document, ONE call (D-CCC-7). The two documents are deliberately never
 * posted together — a single request carrying both would be the blanket
 * checkbox the decision rules out.
 */
export function signChallengeConsent(
  editionId: string,
  body: SignConsentBody,
): Promise<ChallengeConsentStatus> {
  return api<ChallengeConsentStatus>(`/challenges/${encodeURIComponent(editionId)}/consent`, {
    method: 'POST',
    body,
  });
}

/** The child's own assent — a recorded fact, not a signature, and not a gate. */
export function recordChallengeKidAssent(
  editionId: string,
  kidId: string,
  assented: boolean,
): Promise<ChallengeConsentStatus> {
  return api<ChallengeConsentStatus>(
    `/challenges/${encodeURIComponent(editionId)}/consent/kid-assent`,
    { method: 'POST', body: { kid_id: kidId, assented } },
  );
}

export function startChallengeCheckout(
  editionId: string,
  kidId: string,
): Promise<ChallengeCheckoutResult> {
  return api<ChallengeCheckoutResult>(
    `/challenges/${encodeURIComponent(editionId)}/entries/checkout`,
    { method: 'POST', body: { kid_id: kidId } },
  );
}

/**
 * One dimension of the 100-point rubric, exactly as the backend serves it.
 *
 * ⚠️ NEVER hardcode these labels, weights or constraints in the SPA. They are
 * the operative judging rules — the same constant the judging UI renders and
 * the score validator enforces — so a local copy could show a family a
 * weighting no version ever carried. See `challenge-judging-rubric.ts`.
 */
export interface ChallengeRubricDimension {
  key: string;
  label: string;
  max_points: number;
  description: string;
  /** Hard limits on what may NOT influence this mark (e.g. accent). */
  constraints: string[];
}

export interface ChallengeRubric {
  version: string;
  total_points: number;
  dimensions: ChallengeRubricDimension[];
}

/** Published criteria — no account needed, and it names no entrant or judge. */
export function getChallengeRubric(): Promise<ChallengeRubric> {
  return api<ChallengeRubric>('/challenges/rubric');
}
