// Backend refusals → words a visitor with no account can act on
// (creative-code-challenge-prd.md §5 flow 7).
//
// The voting endpoints are UNAUTHENTICATED and deliberately vague: one code
// covers "no such entry", "not approved" and "the family withdrew" so that a
// public endpoint is not an existence probe. That vagueness is a security
// property, so the copy below restates it as an unsurprising sentence rather
// than trying to guess which case it was.

import { ApiError } from '@/lib/api';
import type { ChallengeBonusTaskStatus, ChallengeProjectType } from './challengeVoteApi';
import { VOTE_NETWORK_CODE } from './challengeVoteApi';

const MESSAGES: Record<string, string> = {
  // The DB unique constraint on (edition, email). This is the duplicate-vote
  // refusal, and it says what actually happened rather than "error 409".
  ALREADY_VOTED:
    'This email address has already voted in this challenge. Every address gets one vote, ' +
    'so nothing was added this time.',
  VOTING_NOT_OPEN: 'Voting has not opened yet, so no vote was recorded.',
  VOTING_CLOSED: 'Voting has closed, so no vote was recorded.',
  SUBMISSION_NOT_VOTABLE:
    'That entry cannot be voted for right now. Pick another one from the Showcase — nothing ' +
    'was recorded.',
  REFERRAL_CODE_INVALID:
    'The invite link you followed is not valid for this challenge. You can still vote without it.',
  REFERRAL_SELF_REDEMPTION:
    'This is your own invite link, so it cannot be used on your own vote. You can still vote ' +
    'without it.',
  // Every failure of the two bonus endpoints returns this one code, on purpose.
  VOTE_REQUIRED:
    'We could not match this to your vote on this device. Your vote itself is safe — only the ' +
    'bonus tasks need the link from the receipt on this page.',
  NOT_FOUND: 'We could not find this challenge. Check the link you followed.',
  // The public endpoints are rate-limited per connection. The code the backend
  // actually emits is `RATE_LIMITED` — its global filter maps every 429 to that
  // inside the standard §7 envelope (`common/filters/http-exception.filter.ts`).
  // `HTTP_429` is only ever seen when the response is NOT that envelope (a proxy
  // or load-balancer throttling ahead of Nest, where `publicRequest` synthesises
  // the status-based code), so both are mapped to the same sentence: a visitor
  // does not care which box refused them.
  RATE_LIMITED: 'That is a lot of tries from this connection. Wait a minute and try again.',
  HTTP_429: 'That is a lot of tries from this connection. Wait a minute and try again.',
  [VOTE_NETWORK_CODE]:
    'We could not reach Airbotix just now. Check your connection and try again — nothing was sent.',
};

/**
 * A sentence for any failed request on the public vote page. Never empty, and
 * never something that could read as success: an unrecognised failure is still
 * stated as a failure.
 */
export function voteErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  // `typeof === 'string'`, not truthiness: a server-sent code of `__proto__`
  // would otherwise resolve off Object.prototype and render as if it were copy.
  const mapped = MESSAGES[error.code];
  if (typeof mapped === 'string') return mapped;
  return error.message?.trim() ? error.message : fallback;
}

/**
 * Why the Showcase itself did not load.
 *
 * Unlike a refused vote — where the server's own wording is written for the
 * person who pressed the button — a failed READ can be any 500 with an
 * engineer's sentence in it ("boom", a proxy's HTML). So only the codes we have
 * written copy for are spoken, and everything else falls back to the one thing
 * a visitor must not be left guessing about: this is our failure, not an empty
 * challenge.
 */
export function showcaseLoadMessage(error: unknown): string {
  const fallback =
    'The Showcase did not load. This is a problem at our end, not an empty challenge — ' +
    'please try again.';
  if (!(error instanceof ApiError)) return fallback;
  const mapped = MESSAGES[error.code];
  return typeof mapped === 'string' ? mapped : fallback;
}

/** True for the two refusals a voter can clear by dropping the invite code. */
export function isReferralRefusal(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'REFERRAL_CODE_INVALID' || error.code === 'REFERRAL_SELF_REDEMPTION')
  );
}

/**
 * What kind of thing an entry is. Both labels are written to the same length
 * and the same tone: a Showcase where one project type reads as the impressive
 * one is not the fair, identical presentation the entries were promised.
 */
const PROJECT_TYPE_LABELS: Record<ChallengeProjectType, string> = {
  game: 'A game you play',
  interactive_web: 'A web page you click around',
};

export function projectTypeLabel(type: ChallengeProjectType): string {
  return PROJECT_TYPE_LABELS[type] ?? 'A project';
}

/**
 * What EVERY entry is, stated once for all of them.
 *
 * The 60–90 second pitch video is part of every entry (PRD §2), and saying so
 * once — rather than per card — keeps the cards free of any number at all,
 * which is what makes "this page shows no counts" checkable rather than
 * intended. Neither the video nor the playable project is served publicly: see
 * `MEDIA_NOTE`.
 */
export const ENTRY_FORMAT_NOTE =
  'Every entry is one project a young person built, plus a 60–90 second video where they ' +
  'talk about it. Every entry on this page is shown exactly the same way.';

/**
 * Why there is nothing to watch or play here.
 *
 * This is not a gap to fill in later without a decision: PRD §9 asks what a
 * public vote page may show of a child's entry, and the individual
 * `publish_face` / `publish_voice` grants are lawfully `false` for some
 * families. Until an owner answers, the page publishes the one thing the media
 * release consents to by name — the display name — and never falls back to
 * exposing media a parent refused.
 */
export const MEDIA_NOTE =
  'The children’s videos and projects are not published on this page. Families choose ' +
  'separately whether their child’s face, voice and work may be shown, so nothing here shows ' +
  'more of one entry than another.';

/** The tally is hidden for the whole voting window (D-CCC-4). Say so plainly. */
export const HIDDEN_TALLY_NOTE =
  'Results are not shown while voting is open — no one can see who is ahead, including us.';

/** The identical call to action every card carries. */
export const VOTE_CTA = 'Vote for this entry';

/**
 * What happened to the bonus the person who invited this voter earned. It is
 * about THEIR ledger, never a count, and `pending_review` deliberately does not
 * say why (the server does not distinguish "at their cap" from "being checked").
 */
export function referralOutcomeMessage(status: ChallengeBonusTaskStatus | null): string | null {
  if (status === null) return null;
  if (status === 'granted') return 'The person who invited you earned their bonus vote.';
  if (status === 'rejected') return 'The invite bonus was not counted. Your own vote still counts.';
  return 'The invite bonus is with our team to check. Your own vote counts either way.';
}

/** What a filed group-share claim means right now. Never a count. */
export function bonusTaskMessage(status: ChallengeBonusTaskStatus): string {
  if (status === 'granted') return 'Your group share has been checked and counted.';
  if (status === 'rejected') return 'Your group share was not counted. Your vote still counts.';
  return 'Thanks — a person will check your group share. It counts nothing until they do.';
}

/**
 * A date a visitor can plan around, in THEIR timezone. Deliberately date-only:
 * the window ends at a moment, but a page that prints a time invites somebody
 * to refresh at 23:59 for a result that is not published there anyway.
 */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'a date we could not read';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
