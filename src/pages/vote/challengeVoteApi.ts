// PUBLIC Creative Code Challenge voting + Creator Showcase API
// (`/vote/:slug` and `/challenge/:slug/showcase`;
// creative-code-challenge-prd.md §5 flow 7/9, §3 D-CCC-4, §6 "airbotix-app —
// Public" row).
//
// Every shape here mirrors `platform-backend/src/challenges/challenge-voting.service.ts`
// exactly; dates arrive as ISO strings because they cross JSON.
//
// ⚠️ **UNAUTHENTICATED on purpose, like `/play/:shareId`.** These four endpoints
// are the only `@Public()` routes in the backend's challenges controller, so the
// requests below use a bare `fetch` rather than `@/lib/api`:
//   - no `Authorization` header — a parent signed in on this browser must not
//     have their access token posted to a public vote endpoint;
//   - no `credentials`, so the refresh cookie is never sent either.
// D-CCC-4 removed voter verification entirely: there is NO OTP and NO sign-in
// here, and nothing in this file may grow one.
//
// ⚠️ Nothing here logs anything. The payloads carry a voter's email address and
// the display names of MINORS.

import { ApiError, BASE_URL } from '@/lib/api';

export type ChallengeProjectType = 'game' | 'interactive_web';

export type ChallengeBonusTaskStatus = 'pending_review' | 'granted' | 'rejected';

/**
 * One Creator Card. THREE fields, and that is the whole entry as far as an
 * anonymous visitor is concerned.
 *
 * There is no count, no rank, no timestamp and no review state to render,
 * because the backend serves none — the running tally is hidden for the entire
 * voting window (D-CCC-4) and any stable order is an implicit ranking.
 *
 * There is also no playable project and no pitch video: PRD §9 has NOT decided
 * what a declined `publish_face` / `publish_voice` grant does to publication, so
 * the safe presentation shipped and the media stayed private. A page that
 * reached for `/play/:shareId` with a `submission_id` would be publishing a
 * minor's work against a grant nobody has read.
 */
export interface ChallengeShowcaseEntry {
  submission_id: string;
  display_name: string;
  project_type: ChallengeProjectType;
}

export interface ChallengeShowcase {
  edition_id: string;
  edition_slug: string;
  edition_name: string;
  voting_open: string;
  voting_close: string;
  /** `now` is inside [voting_open, voting_close], inclusive both ends. */
  voting_window_open: boolean;
  submissions: ChallengeShowcaseEntry[];
}

/**
 * What the server hands back after a vote is written.
 *
 * ⚠️ `votes_used` / `votes_remaining` are typed because the endpoint returns
 * them, and they are deliberately **never rendered**. They are this voter's own
 * budget out of the 10 rather than any entry's tally, but a number on the vote
 * page is the shape a tally leaks in, and "1 of 10" invites a visitor to read
 * the page for standings. The receipt says the vote was recorded and nothing
 * else (`PublicVotePage`).
 */
export interface ChallengeVoteReceipt {
  edition_id: string;
  votes_used: number;
  votes_remaining: number;
  /** The status of the REFERRER's bonus, or `null` when no invite was used. */
  referral: ChallengeBonusTaskStatus | null;
  /**
   * The one-shot capability over this vote row, returned exactly once and never
   * re-derivable. The two bonus endpoints require it. Held in memory for the
   * life of the page only — see `PublicVotePage`.
   */
  bonus_token: string;
}

export interface ChallengeReferralLink {
  edition_id: string;
  referral_code: string;
  votes_used: number;
  votes_remaining: number;
}

export interface ChallengeBonusTaskReceipt {
  edition_id: string;
  status: ChallengeBonusTaskStatus;
  votes_used: number;
  votes_remaining: number;
}

export interface CastVoteBody {
  email: string;
  submission_id: string;
  /** The code belongs to whoever INVITED this voter; it credits them, not us. */
  referral_code?: string;
}

/** Identity + proof, for the two bonus endpoints. */
export interface VoterBonusIdentity {
  email: string;
  bonus_token: string;
}

/** Thrown when the request never reached the backend at all. */
export const VOTE_NETWORK_CODE = 'NETWORK';

interface PublicRequestInit {
  method?: 'GET' | 'POST';
  body?: unknown;
}

/**
 * A bare, token-free request against a `@Public()` endpoint, with the platform's
 * §7 error envelope narrowed to an `ApiError` so the page can speak the server's
 * refusals in plain language.
 *
 * A transport failure becomes an `ApiError` too, with its own code: a page that
 * cannot tell "the network died" from "the server said no" ends up showing an
 * empty Showcase for a failed load, which is the one thing this surface must
 * never do.
 */
async function publicRequest<T>(path: string, init: PublicRequestInit = {}): Promise<T> {
  const { method = 'GET', body } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      // No `authorization`, and no `credentials` — see the file header.
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, VOTE_NETWORK_CODE, 'The connection dropped.');
  }

  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = res.statusText;
    let details: unknown;
    try {
      const errBody = (await res.json()) as {
        error?: { code: string; message: string; details?: unknown };
      };
      if (errBody.error) {
        code = errBody.error.code;
        message = errBody.error.message;
        details = errBody.error.details;
      }
    } catch {
      // Not a JSON envelope (a proxy 502, say) — keep the status-based defaults.
    }
    throw new ApiError(res.status, code, message, details);
  }

  return (await res.json()) as T;
}

/**
 * The Showcase, addressed by SLUG because that is what a share link carries and
 * an anonymous caller has no way to turn one into an edition id.
 *
 * ⚠️ The server re-shuffles this list on EVERY request and the response carries
 * no field an order could be reconstructed from. Callers must render
 * `submissions` in the order received and must never sort it.
 */
export function getChallengeShowcase(slug: string): Promise<ChallengeShowcase> {
  return publicRequest<ChallengeShowcase>(`/challenges/by-slug/${encodeURIComponent(slug)}/showcase`);
}

export function castChallengeVote(slug: string, body: CastVoteBody): Promise<ChallengeVoteReceipt> {
  return publicRequest<ChallengeVoteReceipt>(
    `/challenges/by-slug/${encodeURIComponent(slug)}/votes`,
    { method: 'POST', body },
  );
}

/**
 * This voter's own shareable invite code. IDEMPOTENT — asking twice returns the
 * same code. Creating a link earns NOTHING; the +1 is the invited person's vote.
 */
export function createChallengeReferralLink(
  slug: string,
  body: VoterBonusIdentity,
): Promise<ChallengeReferralLink> {
  return publicRequest<ChallengeReferralLink>(
    `/challenges/by-slug/${encodeURIComponent(slug)}/votes/referral`,
    { method: 'POST', body },
  );
}

/**
 * File evidence of a group share. The row lands `pending_review` and counts
 * nothing until a human decides it — the UI must not imply otherwise.
 */
export function submitChallengeGroupShare(
  slug: string,
  body: VoterBonusIdentity & { evidence_ref: string },
): Promise<ChallengeBonusTaskReceipt> {
  return publicRequest<ChallengeBonusTaskReceipt>(
    `/challenges/by-slug/${encodeURIComponent(slug)}/votes/bonus/group-share`,
    { method: 'POST', body },
  );
}

/**
 * The link a voter copies and shares themselves.
 *
 * The code alone travels — never the `bonus_token`. Whether the capability
 * should ride along in the URL is an OPEN question (PRD §9, "should a voter's
 * bonus capability be recoverable"), and answering it here would hand a bearer
 * credential to every group chat the link is pasted into.
 */
export function referralShareUrl(origin: string, slug: string, referralCode: string): string {
  return `${origin}/vote/${encodeURIComponent(slug)}?ref=${encodeURIComponent(referralCode)}`;
}
