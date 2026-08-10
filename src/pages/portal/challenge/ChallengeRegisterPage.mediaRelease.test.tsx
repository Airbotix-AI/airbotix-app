// @vitest-environment jsdom
// Creative Code Challenge parent registration — THE MEDIA-RELEASE FORM ITSELF
// (/portal/challenge/:slug/register, creative-code-challenge-prd.md §5 flow 1).
//
// One of four suites over this page; the shared fixtures are in
// `challengeRegisterTestKit.tsx`. What this one defends:
//   1. re-signing REPLACES the whole record, so the reopened form must start
//      from what is already on record — otherwise a parent who came back to
//      withdraw one grant silently revokes the other five;
//   2. the form catches what `MediaReleaseGrantsSchema` would otherwise reject
//      as a raw 400 a parent cannot act on.

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

import {
  CONSENT_PATH,
  consentSignPosts,
  consentStatus,
  fillSignerBlock,
  lastConsentSignBody,
  mediaDoc,
  pickKid,
  renderPage,
  SIGNED_STAMP,
  termsDoc,
  installRegisterPageHarness,
  wireApi,
} from './challengeRegisterTestKit';

installRegisterPageHarness();

/**
 * Consent records are append-only and the NEWEST valid one wins, so re-signing
 * REPLACES all six choices. A blank reopened form would therefore let a parent
 * who came back to withdraw one grant silently revoke the other five.
 */
describe('ChallengeRegisterPage — re-signing the media release', () => {
  const signedWithEverything = () =>
    consentStatus([
      mediaDoc({
        ...SIGNED_STAMP,
        grants: {
          review: true,
          publish_title: true,
          publish_voice: true,
          publish_face: true,
          display_name: 'Mia K.',
          channels: ['airbotix_website'],
          channels_until: '2027-06-30T13:59:59.999Z',
        },
      }),
      termsDoc({ ...SIGNED_STAMP, grants: { accepted: true } }),
    ]);

  it('says that signing again replaces the whole record', async () => {
    wireApi({ [`GET ${CONSENT_PATH}`]: signedWithEverything() });
    renderPage();
    await pickKid();

    fireEvent.click(await screen.findByTestId('review-authorization'));
    expect(await screen.findByTestId('reopen-note')).toHaveTextContent(
      /replaces all of the choices/i,
    );
  });

  it('opens from what is on record, so withdrawing ONE grant keeps the other five', async () => {
    const signed = vi.fn(() => signedWithEverything());
    wireApi({
      [`GET ${CONSENT_PATH}`]: signedWithEverything(),
      'POST /challenges/ed_1/consent': signed,
    });
    renderPage();
    await pickKid();

    fireEvent.click(await screen.findByTestId('review-authorization'));
    fireEvent.click(await screen.findByRole('button', { name: /Update these choices/ }));
    await screen.findByTestId('media-release-amending');

    // Everything the parent already granted is on screen as granted.
    expect(screen.getByTestId('grant-review')).toBeChecked();
    expect(screen.getByTestId('grant-publish-face')).toBeChecked();
    expect(screen.getByTestId('grant-display-name')).toHaveValue('Mia K.');
    expect(screen.getByTestId('grant-channel-airbotix_website')).toBeChecked();

    // Withdraw exactly one.
    fireEvent.click(screen.getByTestId('grant-publish-face'));
    // A re-sign is a fresh signing act, so the block is signed again — it is
    // deliberately NOT restored from the previous signature.
    fillSignerBlock();
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(signed).toHaveBeenCalled());
    expect(lastConsentSignBody().grants).toMatchObject({
      review: true,
      publish_title: true,
      publish_voice: true,
      // …and only this one changed.
      publish_face: false,
      display_name: 'Mia K.',
      channels: ['airbotix_website'],
    });
  });

  it('a FIRST signature still starts with nothing ticked', async () => {
    wireApi({ [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(), termsDoc()]) });
    renderPage();
    await pickKid();

    await screen.findByTestId('media-release-step');
    expect(screen.queryByTestId('media-release-amending')).not.toBeInTheDocument();
    for (const id of [
      'grant-review',
      'grant-publish-title',
      'grant-publish-voice',
      'grant-publish-face',
    ]) {
      expect(screen.getByTestId(id)).not.toBeChecked();
    }
    expect(screen.getByTestId('grant-display-name')).toHaveValue('');
  });
});

/**
 * These rules are what keeps the backend's `MediaReleaseGrantsSchema`
 * refinements from being hit as raw 400s a parent cannot act on.
 */
describe('ChallengeRegisterPage — the media release validates before it posts', () => {
  async function openForm() {
    wireApi({ [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(), termsDoc()]) });
    renderPage();
    await pickKid();
    await screen.findByTestId('media-release-step');
  }

  it('will not sign without the name the work would be published under', async () => {
    await openForm();
    fireEvent.click(screen.getByTestId('sign-media-release'));

    expect(await screen.findByText(/Add the name to publish/)).toBeInTheDocument();
    expect(consentSignPosts()).toHaveLength(0);
  });

  it('refuses a display name over 60 characters', async () => {
    await openForm();
    fireEvent.change(screen.getByTestId('grant-display-name'), {
      target: { value: 'M'.repeat(61) },
    });
    fireEvent.click(screen.getByTestId('sign-media-release'));

    expect(await screen.findByText(/60 characters or fewer/)).toBeInTheDocument();
    expect(consentSignPosts()).toHaveLength(0);
  });

  // The parent used to TYPE the end date, which was both extra work and a
  // contradiction with the Terms ("valid for 12 months from signing"). The
  // window is now derived, so these three tests assert the derivation instead of
  // the old validation.
  it('states the end date only once a channel is actually granted', async () => {
    await openForm();
    expect(screen.queryByTestId('grant-channels-until')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('grant-channel-airbotix_website'));
    await waitFor(() =>
      expect(screen.getByTestId('grant-channels-until')).toHaveTextContent(/12 months from today/i),
    );
  });

  it('signs with no date entered at all — the parent is never asked for one', async () => {
    await openForm();
    fireEvent.change(screen.getByTestId('grant-display-name'), { target: { value: 'Mia K.' } });
    fireEvent.click(screen.getByTestId('grant-channel-airbotix_website'));
    fillSignerBlock();
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(consentSignPosts()).toHaveLength(1));
  });

  it('derives channels_until as ~12 months out, always in the future', async () => {
    await openForm();
    fireEvent.change(screen.getByTestId('grant-display-name'), { target: { value: 'Mia K.' } });
    fireEvent.click(screen.getByTestId('grant-channel-airbotix_website'));
    fillSignerBlock();
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(consentSignPosts()).toHaveLength(1));
    const until = new Date(lastConsentSignBody().grants.channels_until as string);
    // Strictly future is the backend's hard requirement; the ~12-month window is
    // the product rule. A month-arithmetic result can land a day either side, so
    // assert a band rather than an exact instant.
    expect(until.getTime()).toBeGreaterThan(Date.now());
    const monthsOut = (until.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4);
    expect(monthsOut).toBeGreaterThan(11.5);
    expect(monthsOut).toBeLessThan(12.5);
  });
});
