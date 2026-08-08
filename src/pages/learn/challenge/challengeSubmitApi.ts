// Kid-side Creative Code Challenge submission API
// (`/learn/challenge/:slug/submit`; creative-code-challenge-prd.md §5 flow 4,
// §6 "airbotix-app — Learn" row).
//
// Every shape mirrors `platform-backend/src/challenges/challenge-submissions.service.ts`
// exactly; dates arrive as ISO strings because they cross JSON.
//
// ⚠️ Nothing in this file logs anything. Every payload here carries a MINOR's own
// work, the words they wrote and the name they would be published under.

import { api } from '@/lib/api';

export type ChallengeProjectType = 'game' | 'interactive_web';

export type ChallengeSubmissionStatus =
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type ChallengeEntryStatus = 'pending_payment' | 'registration_confirmed' | 'withdrawn';

/** The submission as its OWN family sees it — never the reviewing staff member. */
export interface ChallengeSubmission {
  id: string;
  entry_id: string;
  edition_id: string;
  project_type: ChallengeProjectType;
  project_id: string;
  pitch_artifact_id: string;
  one_change_note: string;
  display_name: string;
  status: ChallengeSubmissionStatus;
  reviewed_at: string | null;
  /** Populated on rejection so the child is told what to fix (PRD §5 flow 5). */
  rejection_reason: string | null;
  created_at: string;
}

/** Everything the submit page needs to render itself, in one read. */
export interface ChallengeSubmissionState {
  edition_id: string;
  edition_slug: string;
  edition_name: string;
  kid_id: string;
  entry_id: string | null;
  entry_status: ChallengeEntryStatus | null;
  submission_open: string;
  submission_close: string;
  /** `now` is inside [submission_open, submission_close], inclusive both ends. */
  window_open: boolean;
  submission: ChallengeSubmission | null;
}

export interface ChallengeSubmissionBody {
  project_type: ChallengeProjectType;
  project_id: string;
  pitch_artifact_id: string;
  one_change_note: string;
  display_name: string;
}

/**
 * Addressed by SLUG because that is what is in the child's URL. A kid token
 * cannot call the parent-only `…/by-slug/:slug/registration` read, so this is
 * the only way the page can turn `/learn/challenge/:slug/submit` into an
 * edition id (platform-backend `ChallengeSubmissionsService.getStateBySlug`).
 */
export function getChallengeSubmissionState(slug: string): Promise<ChallengeSubmissionState> {
  return api<ChallengeSubmissionState>(
    `/challenges/by-slug/${encodeURIComponent(slug)}/submission`,
  );
}

export function createChallengeSubmission(
  editionId: string,
  body: ChallengeSubmissionBody,
): Promise<ChallengeSubmission> {
  return api<ChallengeSubmission>(`/challenges/${encodeURIComponent(editionId)}/submission`, {
    method: 'POST',
    body,
  });
}

export function updateChallengeSubmission(
  editionId: string,
  body: ChallengeSubmissionBody,
): Promise<ChallengeSubmission> {
  return api<ChallengeSubmission>(`/challenges/${encodeURIComponent(editionId)}/submission`, {
    method: 'PATCH',
    body,
  });
}

// ── Pitch video upload (D-CCC-8) ────────────────────────────────────────────

/**
 * The backend's own cap (`artifacts.dto.ts` `SignUploadSchema.size_bytes`).
 * Checked here so an oversized phone recording gets a sentence a child can act
 * on instead of a raw 400 from the presign call.
 */
export const PITCH_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Why there is no usable pitch video. Never a raw status code — and `missing`
 * is its OWN reason on purpose: "your video did not finish uploading" in front
 * of a child who simply has not picked one yet sends them to fix a problem that
 * does not exist.
 */
export type PitchUploadReason = 'missing' | 'too_big' | 'not_video' | 'upload_failed';

export class PitchUploadError extends Error {
  constructor(public readonly reason: PitchUploadReason) {
    super(reason);
    this.name = 'PitchUploadError';
  }
}

/** Shape of `POST /projects/:id/artifacts/upload-url` (artifacts.service). */
interface SignedUpload {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  s3_key: string;
}

/**
 * Put the pitch video where the backend already expects it: the EXISTING
 * presign → S3 PUT → register-artifact pipeline, hung off the child's own
 * project. No new upload path is introduced (PRD §5 flow 4).
 *
 * ⚠️ A failed S3 PUT **throws** and registers NOTHING. The music-score saver
 * registers its artifact with `upload_failed: true` because there the inline
 * JSON is the render source — here the uploaded bytes ARE the content, so a
 * registered-but-empty artifact would produce a submission that looks complete
 * and has no video in it. After `submission_close` nobody could fix that.
 */
export async function uploadPitchVideo(projectId: string, file: File): Promise<string> {
  if (!file.type.startsWith('video/')) throw new PitchUploadError('not_video');
  if (file.size > PITCH_MAX_BYTES) throw new PitchUploadError('too_big');

  const signed = await api<SignedUpload>(`/projects/${projectId}/artifacts/upload-url`, {
    method: 'POST',
    body: {
      kind: 'video',
      mime_type: file.type,
      size_bytes: file.size,
      filename: file.name,
    },
  });

  let put: Response;
  try {
    put = await fetch(signed.url, { method: signed.method, headers: signed.headers, body: file });
  } catch {
    throw new PitchUploadError('upload_failed');
  }
  if (!put.ok) throw new PitchUploadError('upload_failed');

  const artifact = await api<{ id: string }>(`/projects/${projectId}/artifacts`, {
    method: 'POST',
    body: {
      kind: 'video',
      s3_key: signed.s3_key,
      mime_type: file.type,
      size_bytes: file.size,
      // No filename, no note, no child's name — the metadata says only what this
      // artifact is FOR, so an S3 object listing carries nothing about a minor.
      metadata: { source: 'challenge-pitch' },
    },
  });
  return artifact.id;
}
