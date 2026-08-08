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

    fireEvent.click(await screen.findByRole('button', { name: /Update these choices/ }));
    await screen.findByTestId('media-release-amending');

    // Everything the parent already granted is on screen as granted.
    expect(screen.getByTestId('grant-review')).toBeChecked();
    expect(screen.getByTestId('grant-publish-face')).toBeChecked();
    expect(screen.getByTestId('grant-display-name')).toHaveValue('Mia K.');
    expect(screen.getByTestId('grant-channel-airbotix_website')).toBeChecked();

    // Withdraw exactly one.
    fireEvent.click(screen.getByTestId('grant-publish-face'));
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

  it('asks when a channel permission ends, once a channel is ticked', async () => {
    await openForm();
    fireEvent.change(screen.getByTestId('grant-display-name'), { target: { value: 'Mia K.' } });
    fireEvent.click(screen.getByTestId('grant-channel-airbotix_website'));
    fireEvent.click(screen.getByTestId('sign-media-release'));

    expect(await screen.findByText(/Choose the date this permission ends/)).toBeInTheDocument();
    expect(consentSignPosts()).toHaveLength(0);
  });

  it('refuses an end date in the past — the backend requires a future one', async () => {
    await openForm();
    fireEvent.change(screen.getByTestId('grant-display-name'), { target: { value: 'Mia K.' } });
    fireEvent.click(screen.getByTestId('grant-channel-airbotix_website'));
    fireEvent.change(screen.getByTestId('grant-channels-until'), {
      target: { value: '2020-01-01' },
    });
    fireEvent.click(screen.getByTestId('sign-media-release'));

    expect(await screen.findByText(/Choose a date in the future/)).toBeInTheDocument();
    expect(consentSignPosts()).toHaveLength(0);
  });

  it('leaves the end date inert until a channel is actually granted', async () => {
    await openForm();
    expect(screen.getByTestId('grant-channels-until')).toBeDisabled();

    fireEvent.click(screen.getByTestId('grant-channel-airbotix_website'));
    await waitFor(() => expect(screen.getByTestId('grant-channels-until')).toBeEnabled());
  });
});
