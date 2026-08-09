// @vitest-environment jsdom
// Creative Code Challenge parent registration — THE TWO CONSENT DOCUMENTS
// (/portal/challenge/:slug/register, creative-code-challenge-prd.md §5 flow 1).
//
// One of four suites over this page; the shared fixtures are in
// `challengeRegisterTestKit.tsx`. What this one defends:
//   1. the two documents are signed SEPARATELY, and checkout is not reachable
//      until both are (D-CCC-7);
//   2. the six media-release choices are posted as six individual fields —
//      never collapsed, and a declined one is sent as `false`, not dropped;
//   3. nothing is signable once registration closes, because every sign is a
//      backend refusal in that state;
//   4. every operative sentence comes from the SERVER with the version being
//      signed — no consent wording is authored in this SPA.

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
  consentStatus,
  DOCUMENT_BODY,
  draftOverrides,
  lastConsentSignBody,
  mediaDoc,
  pickKid,
  renderPage,
  SIGNED_STAMP,
  termsDoc,
  installRegisterPageHarness,
  wireApi,
  wireClosedApi,
} from './challengeRegisterTestKit';

installRegisterPageHarness();

describe('ChallengeRegisterPage — the two documents are signed separately', () => {
  it('opens only the media release first, keeps the terms and the fee locked', async () => {
    wireApi({ [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(), termsDoc()]) });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('media-release-step')).toBeInTheDocument();
    // Step 2 is a SEPARATE act — it must not be reachable yet.
    expect(screen.queryByTestId('competition-terms-step')).not.toBeInTheDocument();
    expect(screen.getByTestId('terms-locked')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-pay')).toBeDisabled();
    expect(screen.getByTestId('pay-locked')).toBeInTheDocument();
  });

  it('opens the terms once the media release is signed — and the fee is STILL locked', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: { review: true, channels: [] } }),
        termsDoc(),
      ]),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('competition-terms-step')).toBeInTheDocument();
    expect(screen.getByTestId('signed-parent_media_release')).toBeInTheDocument();
    // One signature is not two: checkout stays out of reach (D-CCC-7).
    expect(screen.getByTestId('challenge-pay')).toBeDisabled();
    expect(screen.getByTestId('pay-locked')).toBeInTheDocument();
  });

  it('unlocks the fee only when BOTH documents are signed', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: { review: true, channels: [] } }),
        termsDoc({ ...SIGNED_STAMP, grants: { accepted: true } }),
      ]),
    });
    renderPage();
    await pickKid();

    await waitFor(() => expect(screen.getByTestId('challenge-pay')).toBeEnabled());
    expect(screen.queryByTestId('pay-locked')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay A\$19 & enter/ })).toBeInTheDocument();
  });

  it('renders the served document body verbatim, with no banner on an approved version', async () => {
    wireApi({ [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(), termsDoc()]) });
    renderPage();
    await pickKid();

    // The shipped documents are v1.0 approved, so the parent sees the wording
    // and nothing that undercuts it.
    expect(await screen.findByTestId('consent-document-body')).toHaveTextContent(DOCUMENT_BODY);
    expect(screen.queryByTestId('consent-draft-warning')).not.toBeInTheDocument();
  });

  it('still raises the not-legally-approved banner if a draft version is ever served', async () => {
    // The promotion to v1.0 did not delete the draft path — this is the guard
    // that a future re-draft cannot reach a parent looking like approved text.
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(draftOverrides()), termsDoc()]),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('consent-draft-warning')).toHaveTextContent(
      /not legally approved/i,
    );
    expect(screen.getByTestId('consent-document-body')).toHaveTextContent(
      /NOT LEGALLY APPROVED TEXT/,
    );
  });
});

describe('ChallengeRegisterPage — the six grants are recorded individually', () => {
  it('posts all six choices as separate fields, including the declined ones', async () => {
    const signed = vi.fn(() =>
      consentStatus([mediaDoc({ ...SIGNED_STAMP, grants: {} }), termsDoc()]),
    );
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(), termsDoc()]),
      'POST /challenges/ed_1/consent': signed,
    });
    renderPage();
    await pickKid();
    await screen.findByTestId('media-release-step');

    fireEvent.click(screen.getByTestId('grant-review'));
    fireEvent.click(screen.getByTestId('grant-publish-title'));
    // Face and voice are deliberately LEFT OFF — a declined grant must still be
    // transmitted as an explicit `false`, not silently omitted.
    fireEvent.change(screen.getByTestId('grant-display-name'), { target: { value: 'Mia K.' } });
    fireEvent.click(screen.getByTestId('grant-channel-airbotix_website'));
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(signed).toHaveBeenCalled());
    const body = lastConsentSignBody();
    expect(body.document_type).toBe('parent_media_release');
    expect(body.document_version).toBe('1.0');
    expect(body.kid_id).toBe('kid-1');
    expect(body.grants).toMatchObject({
      review: true,
      publish_title: true,
      publish_voice: false,
      publish_face: false,
      display_name: 'Mia K.',
      channels: ['airbotix_website'],
    });
    // Six distinct recorded choices — never one blanket flag. The reuse window
    // is derived (12 months, the consent's own life), not typed by the parent.
    expect(new Date(body.grants.channels_until as string).getTime()).toBeGreaterThan(Date.now());
    expect(Object.keys(body.grants).sort()).toEqual(
      [
        'channels',
        'channels_until',
        'display_name',
        'publish_face',
        'publish_title',
        'publish_voice',
        'review',
      ].sort(),
    );
  });

  it('accepts the terms in its own call, carrying no media-release payload', async () => {
    const accepted = vi.fn(() =>
      consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: {} }),
        termsDoc({ ...SIGNED_STAMP, grants: { accepted: true } }),
      ]),
    );
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: {} }),
        termsDoc(),
      ]),
      'POST /challenges/ed_1/consent': accepted,
    });
    renderPage();
    await pickKid();
    await screen.findByTestId('competition-terms-step');

    // The accept button is inert until the parent says they have read it.
    expect(screen.getByTestId('sign-competition-terms')).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I am the parent or legal guardian/));
    fireEvent.click(screen.getByTestId('sign-competition-terms'));

    await waitFor(() => expect(accepted).toHaveBeenCalled());
    const body = lastConsentSignBody();
    expect(body.document_type).toBe('competition_terms');
    expect(body.grants).toEqual({ accepted: true });
  });
});

/**
 * Registration being closed is a BACKEND refusal
 * (`EDITION_NOT_OPEN_FOR_REGISTRATION`, 400, on every sign as well as on
 * checkout). A live signing form in that state offers a parent something the
 * server will reject — the exact failure `challenge-registration.service.ts`
 * exists to keep off this page.
 */
describe('ChallengeRegisterPage — nothing is signable once registration closes', () => {
  it('the media release cannot be signed, down to its individual choices', async () => {
    wireClosedApi(consentStatus([mediaDoc(), termsDoc()]));
    renderPage();
    await pickKid();

    await screen.findByTestId('media-release-step');
    expect(screen.getByTestId('sign-media-release')).toBeDisabled();
    expect(screen.getByTestId('grant-review')).toBeDisabled();
    expect(screen.getByTestId('grant-publish-face')).toBeDisabled();
    expect(screen.getByTestId('grant-display-name')).toBeDisabled();
    expect(screen.getByTestId('grant-channel-airbotix_website')).toBeDisabled();
  });

  it('the competition terms cannot be accepted', async () => {
    wireClosedApi(
      consentStatus([mediaDoc({ ...SIGNED_STAMP, grants: { review: true } }), termsDoc()]),
    );
    renderPage();
    await pickKid();

    await screen.findByTestId('competition-terms-step');
    expect(screen.getByTestId('sign-competition-terms')).toBeDisabled();
    // Ticking the declaration must not resurrect the button either.
    expect(screen.getByLabelText(/I am the parent or legal guardian/)).toBeDisabled();
  });

  it('the child’s assent cannot be recorded, and the signed release cannot be reopened', async () => {
    wireClosedApi(
      consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: { review: true, channels: [] } }),
        termsDoc({ ...SIGNED_STAMP, grants: { accepted: true } }),
      ]),
    );
    renderPage();
    await pickKid();

    await screen.findByTestId('signed-parent_media_release');
    expect(screen.getByTestId('kid-assent')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Update these choices/ })).not.toBeInTheDocument();
  });
});

/**
 * Every operative sentence a signature is filed against comes from the backend
 * WITH the version being signed. Page-authored wording would neither move with
 * `document_version` nor invalidate prior acceptance, so a parent could be
 * recorded as agreeing to words no version ever carried.
 */
describe('ChallengeRegisterPage — no consent wording is authored in the SPA', () => {
  it('renders the labels and assurances the SERVER served, not a local copy', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({
          choices: [
            { key: 'review', label: 'REVIEW LABEL v2' },
            { key: 'publish_title', label: 'TITLE LABEL v2' },
            { key: 'publish_voice', label: 'VOICE LABEL v2' },
            { key: 'publish_face', label: 'FACE LABEL v2' },
            { key: 'display_name', label: 'NAME LABEL v2' },
            { key: 'channels', label: 'CHANNELS LABEL v2' },
          ],
          assurances: ['ASSURANCE FROM THE SERVER v2'],
        }),
        termsDoc(),
      ]),
    });
    renderPage();
    await pickKid();

    await screen.findByTestId('media-release-step');
    expect(screen.getByLabelText('FACE LABEL v2')).toBeInTheDocument();
    expect(screen.getByText('NAME LABEL v2')).toBeInTheDocument();
    expect(screen.getByText('CHANNELS LABEL v2')).toBeInTheDocument();
    expect(screen.getByText('ASSURANCE FROM THE SERVER v2')).toBeInTheDocument();
    // The wording the old build carried locally must be gone, not merely unused.
    expect(screen.queryByText(/judged in exactly the same way/)).not.toBeInTheDocument();
  });

  it('refuses to render the media release when the version omits a choice it records', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        // `publish_face` is not declared by this version — there is no honest
        // way to ask for it, and substituting our own sentence would file the
        // grant against text the parent was never served.
        mediaDoc({
          choices: [
            { key: 'review', label: 'Review' },
            { key: 'publish_title', label: 'Title' },
            { key: 'publish_voice', label: 'Voice' },
            { key: 'display_name', label: 'Name' },
            { key: 'channels', label: 'Channels' },
          ],
        }),
        termsDoc(),
      ]),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('media-release-unavailable')).toHaveTextContent(
      /nothing can be signed/i,
    );
    expect(screen.queryByTestId('sign-media-release')).not.toBeInTheDocument();
  });

  it('takes the terms acceptance declaration from the document version', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: { review: true } }),
        termsDoc({ attestation: 'ATTESTATION FROM THE SERVER v2' }),
      ]),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('terms-attestation')).toHaveTextContent(
      'ATTESTATION FROM THE SERVER v2',
    );
  });

  it('refuses to offer acceptance when the version serves no declaration', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: { review: true } }),
        termsDoc({ attestation: null }),
      ]),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('competition-terms-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('sign-competition-terms')).not.toBeInTheDocument();
  });

  it('describes an already-signed record in the document’s own words', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({
          ...SIGNED_STAMP,
          choices: [
            { key: 'review', label: 'REVIEW LABEL v2' },
            { key: 'publish_title', label: 'TITLE LABEL v2' },
            { key: 'publish_voice', label: 'VOICE LABEL v2' },
            { key: 'publish_face', label: 'FACE LABEL v2' },
            { key: 'display_name', label: 'NAME LABEL v2' },
            { key: 'channels', label: 'CHANNELS LABEL v2' },
          ],
          grants: { review: true, publish_face: false, display_name: 'Mia K.', channels: [] },
        }),
        termsDoc(),
      ]),
    });
    renderPage();
    await pickKid();

    const card = await screen.findByTestId('signed-parent_media_release');
    expect(card).toHaveTextContent('✓ REVIEW LABEL v2');
    expect(card).toHaveTextContent('✗ FACE LABEL v2');
    expect(card).toHaveTextContent('NAME LABEL v2: Mia K.');
    // Never our own paraphrase of what was recorded.
    expect(card).not.toHaveTextContent('Publish face');
  });

  it('does not render the draft banner for a version that has passed legal review', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ legal_review_status: 'legally_approved', body: 'Approved wording.' }),
        termsDoc(),
      ]),
    });
    renderPage();
    await pickKid();

    await screen.findByTestId('media-release-step');
    expect(screen.getByTestId('consent-document-body')).toHaveTextContent('Approved wording.');
    // PRD §8 makes "do not open paid registration against a draft" a launch
    // gate, so the banner must be exactly as truthful in the negative case.
    expect(screen.queryByTestId('consent-draft-warning')).not.toBeInTheDocument();
  });
});
