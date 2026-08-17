// @vitest-environment jsdom
// Creative Code Challenge parent registration — THE RETURN TRIP FROM AIRWALLEX
// (/portal/challenge/:slug/register, creative-code-challenge-prd.md §5 flow 1).
//
// One of four suites over this page; the shared fixtures are in
// `challengeRegisterTestKit.tsx`. What this one defends:
//   1. the confirmation reports the entry status and the Stars the SERVER
//      reported — a redirect back is never treated as success;
//   2. a slow webhook stops the polling, says so, and NEVER re-offers Pay,
//      because a second intent here is a second charge;
//   3. a failed read is recoverable rather than a dead payment funnel, and a
//      stale or foreign handoff key is dropped rather than acted on.

import '@testing-library/jest-dom/vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async () => {
  const mocks = await import('./challengeRegisterTestMocks');
  return { api: mocks.api, ApiError: mocks.MockApiError };
});
vi.mock('@/auth/useAuth', async () => {
  const mocks = await import('./challengeRegisterTestMocks');
  return { useMe: () => mocks.me };
});

import { api, me, MockApiError } from './challengeRegisterTestMocks';
import {
  EDITION,
  PENDING_KEY,
  REG_PATH,
  renderPage,
  SLUG,
  installRegisterPageHarness,
  wireApi,
} from './challengeRegisterTestKit';

installRegisterPageHarness();

/** An entry row as the registration endpoint returns it. */
function entryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry_1',
    status: 'registration_confirmed',
    stars_granted: 500,
    stars_granted_at: '2026-08-06T01:00:00.000Z',
    kid_assent_at: null,
    starter_lab_attended_at: null,
    ...overrides,
  };
}

describe('ChallengeRegisterPage — the confirmation reports server truth', () => {
  it('shows the confirmed entry and the Stars the server says landed', async () => {
    sessionStorage.setItem(PENDING_KEY, 'kid-1');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-1`]: { edition: EDITION, kid_id: 'kid-1', entry: entryRow() },
    });
    renderPage();

    expect(await screen.findByTestId('challenge-registered')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-stars')).toHaveTextContent(
      '500 Stars have been added to your family wallet.',
    );
    // Handoff key cleared so a later visit doesn't re-enter the waiting state.
    await waitFor(() => expect(sessionStorage.getItem(PENDING_KEY)).toBeNull());
  });

  // The confirmation used to dead-end: "your Stars landed" and a link to the
  // wallet, which told a family nothing about what their child now does
  // (entrant-onboarding-prd §13).
  it('shows the walkthrough on the confirmation, at the moment it is needed', async () => {
    sessionStorage.setItem(PENDING_KEY, 'kid-1');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-1`]: { edition: EDITION, kid_id: 'kid-1', entry: entryRow() },
    });
    renderPage();

    expect(await screen.findByTestId('challenge-registered')).toBeInTheDocument();
    const video = screen.getByTestId('challenge-orientation-video');
    expect(video.querySelector('source')).toHaveAttribute('src', EDITION.orientation_video_url);
  });

  it('sends the family onward to the CHALLENGE, keeping the wallet as secondary', async () => {
    sessionStorage.setItem(PENDING_KEY, 'kid-1');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-1`]: { edition: EDITION, kid_id: 'kid-1', entry: entryRow() },
    });
    renderPage();

    expect(await screen.findByTestId('challenge-registered')).toBeInTheDocument();
    // Named for the child who was just entered, so it reads as their next step.
    const onward = screen.getByRole('link', { name: /open mia’s challenge/i });
    expect(onward).toHaveAttribute('href', `/portal/challenge/${SLUG}`);
    // The wallet survives — it is just no longer the only thing offered.
    expect(screen.getByRole('link', { name: /view wallet/i })).toBeInTheDocument();
  });

  it('renders no player when the edition carries no video', async () => {
    sessionStorage.setItem(PENDING_KEY, 'kid-1');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-1`]: {
        edition: { ...EDITION, orientation_video_url: null },
        kid_id: 'kid-1',
        entry: entryRow(),
      },
    });
    renderPage();

    expect(await screen.findByTestId('challenge-registered')).toBeInTheDocument();
    expect(screen.queryByTestId('challenge-orientation-video')).not.toBeInTheDocument();
    // The onward link is not conditional on the video existing.
    expect(screen.getByRole('link', { name: /open mia’s challenge/i })).toBeInTheDocument();
  });

  it('does NOT claim the Stars landed when the server says they have not', async () => {
    sessionStorage.setItem(PENDING_KEY, 'kid-1');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-1`]: {
        edition: EDITION,
        kid_id: 'kid-1',
        entry: entryRow({ stars_granted: 0, stars_granted_at: null }),
      },
    });
    renderPage();

    expect(await screen.findByTestId('challenge-stars')).toHaveTextContent(
      /have not been added yet/,
    );
    expect(screen.getByTestId('challenge-stars')).not.toHaveTextContent('500 Stars have been');
  });

  it('waits on the webhook for an unconfirmed entry and never re-offers Pay', async () => {
    sessionStorage.setItem(PENDING_KEY, 'kid-1');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-1`]: {
        edition: EDITION,
        kid_id: 'kid-1',
        entry: entryRow({
          status: 'pending_payment',
          stars_granted: 0,
          stars_granted_at: null,
        }),
      },
    });
    renderPage();

    expect(await screen.findByTestId('challenge-confirming')).toBeInTheDocument();
    // A second intent here could double-charge — the Pay button must be gone.
    expect(screen.queryByTestId('challenge-pay')).not.toBeInTheDocument();
    expect(screen.queryByTestId('challenge-registered')).not.toBeInTheDocument();
  });

  it('states a failed load as a failure, not as an empty page', async () => {
    wireApi({
      [`GET ${REG_PATH}`]: new MockApiError(404, 'NOT_FOUND', 'Challenge edition not found.'),
    });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not find this challenge/i);
    expect(screen.queryByTestId('challenge-kid')).not.toBeInTheDocument();
  });

  it('sends a parent with no family to family setup before anything is signed', async () => {
    me.data = { kind: 'user', family_id: null, email: 'parent@example.com' };
    wireApi();
    renderPage();

    expect(await screen.findByText('REGISTER PAGE')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/challenges/ed_1/consent', expect.anything());
  });
});

describe('ChallengeRegisterPage — a failed read is recoverable, not a dead funnel', () => {
  it('offers a retry after a transient failure, and recovers on it', async () => {
    let attempt = 0;
    wireApi({
      [`GET ${REG_PATH}`]: () => {
        attempt += 1;
        return attempt === 1
          ? new MockApiError(500, 'INTERNAL', 'Something went wrong.')
          : { edition: EDITION, kid_id: null, entry: null };
      },
    });
    renderPage();

    fireEvent.click(await screen.findByTestId('challenge-retry'));

    // A blip must not permanently close a payment funnel a marketing CTA links into.
    expect(await screen.findByTestId('challenge-kid')).toBeInTheDocument();
  });

  it('drops a stale kid id instead of telling a parent the challenge does not exist', async () => {
    // Left behind by an earlier session in this tab; the backend answers the
    // same 404 for "not your family's kid" as for "no such edition".
    sessionStorage.setItem(PENDING_KEY, 'kid-gone');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-gone`]: new MockApiError(404, 'NOT_FOUND', 'Not found.'),
    });
    renderPage();

    expect(await screen.findByTestId('challenge-kid-notice')).toHaveTextContent(/Choose a child/i);
    // The picker is back, and the challenge is NOT reported as missing.
    expect(screen.getByTestId('challenge-kid')).toHaveValue('');
    expect(screen.queryByText(/could not find this challenge/i)).not.toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem(PENDING_KEY)).toBeNull());
  });

  it('never reads a handoff stashed under a different family', async () => {
    sessionStorage.setItem(`challenge_entry:${SLUG}:fam-other`, 'kid-other');
    wireApi();
    renderPage();

    // No waiting screen, no foreign kid id on the wire.
    expect(await screen.findByTestId('challenge-kid')).toHaveValue('');
    expect(screen.queryByTestId('challenge-confirming')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith(`${REG_PATH}?kid_id=kid-other`);
  });
});

describe('ChallengeRegisterPage — a slow webhook', () => {
  it('stops polling, says it is still confirming, and never re-offers Pay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    sessionStorage.setItem(PENDING_KEY, 'kid-1');
    wireApi({
      [`GET ${REG_PATH}?kid_id=kid-1`]: {
        edition: EDITION,
        kid_id: 'kid-1',
        entry: entryRow({
          status: 'pending_payment',
          stars_granted: 0,
          stars_granted_at: null,
        }),
      },
    });
    renderPage();

    await screen.findByTestId('challenge-confirming');
    // Burn through the polling budget (POLL_MAX_ATTEMPTS × POLL_INTERVAL_MS).
    for (let i = 0; i < 60 && !screen.queryByTestId('challenge-abandon'); i += 1) {
      await vi.advanceTimersByTimeAsync(3_000);
    }

    const card = screen.getByTestId('challenge-confirming');
    expect(card).toHaveTextContent(/We have not received your payment confirmation yet/);
    // The single most damaging thing this screen could do is invite a second payment.
    expect(screen.queryByTestId('challenge-pay')).not.toBeInTheDocument();
    expect(screen.getByTestId('challenge-recheck')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('challenge-abandon'));
    await waitFor(() => expect(sessionStorage.getItem(PENDING_KEY)).toBeNull());
    vi.useRealTimers();
  });
});
