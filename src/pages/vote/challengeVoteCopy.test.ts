// Public vote-page copy rules (creative-code-challenge-prd.md §5 flow 7).
//
// These are the sentences an anonymous visitor reads when something goes wrong,
// so the tests here are about what must NEVER come out: a raw server string on
// the load path, something inherited off Object.prototype, an empty string, or
// anything that could read as success after a failure.

import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api';
import { referralShareUrl } from './challengeVoteApi';
import {
  bonusTaskMessage,
  dayLabel,
  isReferralRefusal,
  referralOutcomeMessage,
  showcaseLoadMessage,
  voteErrorMessage,
} from './challengeVoteCopy';

const FALLBACK = 'fallback sentence';

describe('voteErrorMessage', () => {
  it('speaks the duplicate, window and rate-limit refusals in plain language', () => {
    expect(voteErrorMessage(new ApiError(409, 'ALREADY_VOTED', 'x'), FALLBACK)).toMatch(
      /already voted in this challenge/i,
    );
    expect(voteErrorMessage(new ApiError(400, 'VOTING_NOT_OPEN', 'x'), FALLBACK)).toMatch(
      /has not opened yet, so no vote was recorded/i,
    );
    expect(voteErrorMessage(new ApiError(400, 'VOTING_CLOSED', 'x'), FALLBACK)).toMatch(
      /has closed, so no vote was recorded/i,
    );
    // The code the backend REALLY emits for a 429 (its global filter maps every
    // 429 to `RATE_LIMITED` inside the §7 envelope). Keying only on `HTTP_429`
    // meant every real throttle fell through and echoed the raw server sentence
    // at an anonymous visitor.
    expect(
      voteErrorMessage(
        new ApiError(429, 'RATE_LIMITED', 'ThrottlerException: Too Many Requests'),
        FALLBACK,
      ),
    ).toMatch(/wait a minute/i);
    // The no-envelope fallback (a proxy throttling ahead of Nest) says the same.
    expect(voteErrorMessage(new ApiError(429, 'HTTP_429', 'Too Many Requests'), FALLBACK)).toMatch(
      /wait a minute/i,
    );
  });

  it('keeps the server’s own wording when it has no copy of its own', () => {
    expect(
      voteErrorMessage(new ApiError(400, 'SOMETHING_NEW', 'The entry fee is unpaid.'), FALLBACK),
    ).toBe('The entry fee is unpaid.');
  });

  it('falls back rather than rendering an empty or inherited string', () => {
    expect(voteErrorMessage(new ApiError(500, 'X', '   '), FALLBACK)).toBe(FALLBACK);
    expect(voteErrorMessage(new Error('not an ApiError'), FALLBACK)).toBe(FALLBACK);
    // A server-sent code of `__proto__` / `constructor` must not resolve off
    // Object.prototype and be rendered as if it were our copy.
    expect(voteErrorMessage(new ApiError(500, '__proto__', 'raw'), FALLBACK)).toBe('raw');
    expect(voteErrorMessage(new ApiError(500, 'constructor', 'raw'), FALLBACK)).toBe('raw');
  });
});

describe('showcaseLoadMessage', () => {
  it('never repeats a raw server message on the load path', () => {
    const message = showcaseLoadMessage(new ApiError(500, 'INTERNAL', 'boom'));
    expect(message).not.toContain('boom');
    expect(message).toMatch(/not an empty challenge/i);
  });

  it('still names the failures a visitor can act on', () => {
    expect(showcaseLoadMessage(new ApiError(404, 'NOT_FOUND', 'x'))).toMatch(/check the link/i);
    expect(showcaseLoadMessage(new ApiError(0, 'NETWORK', 'x'))).toMatch(/could not reach/i);
  });
});

describe('isReferralRefusal', () => {
  it('is true only for the two refusals dropping the code can clear', () => {
    expect(isReferralRefusal(new ApiError(400, 'REFERRAL_CODE_INVALID', 'x'))).toBe(true);
    expect(isReferralRefusal(new ApiError(400, 'REFERRAL_SELF_REDEMPTION', 'x'))).toBe(true);
    expect(isReferralRefusal(new ApiError(409, 'ALREADY_VOTED', 'x'))).toBe(false);
    expect(isReferralRefusal(new Error('x'))).toBe(false);
  });
});

describe('bonus wording', () => {
  it('never states a count, and never promises an unreviewed bonus counted', () => {
    for (const message of [
      referralOutcomeMessage('granted'),
      referralOutcomeMessage('pending_review'),
      referralOutcomeMessage('rejected'),
      bonusTaskMessage('granted'),
      bonusTaskMessage('pending_review'),
      bonusTaskMessage('rejected'),
    ]) {
      expect(message).toBeTruthy();
      expect(message!).not.toMatch(/\d/);
    }
    expect(bonusTaskMessage('pending_review')).toMatch(/counts nothing until/i);
    // No invite used → nothing at all is said about a referral.
    expect(referralOutcomeMessage(null)).toBeNull();
  });
});

describe('referralShareUrl', () => {
  it('carries the code and nothing else', () => {
    const url = referralShareUrl('https://app.airbotix.ai', 'ccc-2026-junior', 'abc/123');
    expect(url).toBe('https://app.airbotix.ai/vote/ccc-2026-junior?ref=abc%2F123');
  });
});

describe('dayLabel', () => {
  it('says so rather than printing "Invalid Date" at a visitor', () => {
    expect(dayLabel('not-a-date')).toBe('a date we could not read');
    expect(dayLabel('2026-09-10T12:00:00.000Z')).toMatch(/2026/);
  });
});
