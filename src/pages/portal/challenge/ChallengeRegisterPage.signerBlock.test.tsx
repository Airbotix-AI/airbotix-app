// @vitest-environment jsdom
// The Parent/Guardian Details block on both consent documents
// (creative-code-challenge-prd.md §5 flow 1).
//
// Shares the fixtures in `challengeRegisterTestKit.tsx`. What this suite
// defends, none of which the other consent suites cover:
//   1. the block is COLLECTED and POSTED with each signature — a consent record
//      that cannot say who signed it is not evidence of anything;
//   2. the signer can draw a real signature, with typed input retained as an
//      accessibility fallback;
//   3. the DATE is displayed and never asked for — the server stamps it;
//   4. the declaration and the relationship options come from the document
//      version, so neither can be authored by this page;
//   5. both documents carry their own block (D-CCC-7 — separate signing acts).

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
  installRegisterPageHarness,
  lastConsentSignBody,
  mediaDoc,
  pickKid,
  renderPage,
  SIGNED_STAMP,
  SIGNER_DECLARATION,
  SIGNER_RELATIONSHIP_OPTIONS,
  termsDoc,
  wireApi,
} from './challengeRegisterTestKit';

installRegisterPageHarness();

/** Opens the media release with its choices filled, ready to sign. */
async function openMediaRelease() {
  wireApi({
    [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(), termsDoc()]),
    'POST /challenges/ed_1/consent': () =>
      consentStatus([mediaDoc({ ...SIGNED_STAMP, grants: {} }), termsDoc()]),
  });
  renderPage();
  await pickKid();
  await screen.findByTestId('media-release-step');
  fireEvent.click(screen.getByTestId('grant-review'));
  fireEvent.change(screen.getByTestId('grant-display-name'), { target: { value: 'Mia K.' } });
}

describe('the Parent/Guardian Details block is posted with the signature', () => {
  it('sends full name, relationship, email and the typed signature', async () => {
    await openMediaRelease();
    fillSignerBlock();
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(consentSignPosts()).toHaveLength(1));
    expect(lastConsentSignBody().signer).toEqual({
      full_name: 'Mary Chen',
      relationship: 'mother',
      email: 'mary@example.com',
      signature: 'Mary Chen',
    });
  });

  it('captures an actual hand-drawn signature instead of requiring signature text', async () => {
    await openMediaRelease();
    fireEvent.change(screen.getByTestId('signer-full-name'), {
      target: { value: 'Mary Chen' },
    });
    fireEvent.change(screen.getByTestId('signer-relationship'), {
      target: { value: 'mother' },
    });
    fireEvent.change(screen.getByTestId('signer-email'), {
      target: { value: 'mary@example.com' },
    });

    const canvas = screen.getByTestId('signature-canvas');
    const draw = (type: string, clientX: number, clientY: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX, clientY });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      fireEvent(canvas, event);
    };
    draw('pointerdown', 80, 100);
    draw('pointermove', 200, 45);
    draw('pointermove', 320, 125);
    draw('pointerup', 470, 70);
    expect(screen.getByTestId('signature-captured')).toBeVisible();
    expect(screen.getByTestId('signer-signature').getAttribute('value')).toMatch(/^drawn:v1:/);
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(consentSignPosts()).toHaveLength(1));
    expect(lastConsentSignBody().signer.signature).toMatch(/^drawn:v1:/);
    expect(lastConsentSignBody().signer.signature.length).toBeLessThanOrEqual(120);
  });

  /**
   * The date is `signed_at`, stamped server-side. The form shows it so the
   * parent knows what will be recorded, and offers nowhere to type one — a
   * stated date the server can contradict is worse than no date at all.
   */
  it('shows the signing date and never asks the parent to type one', async () => {
    await openMediaRelease();
    expect(screen.getByTestId('signer-date')).toBeInTheDocument();
    expect(screen.queryByTestId('signer-date-input')).not.toBeInTheDocument();

    fillSignerBlock();
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(consentSignPosts()).toHaveLength(1));
    expect(lastConsentSignBody().signer).not.toHaveProperty('date');
  });

  it.each([
    ['mary chen', 'differing only in case'],
    ['  Mary   Chen  ', 'differing only in spacing'],
    ['Yanbo', 'different from the full name'],
    ['✓', 'a chosen signature mark'],
  ])('accepts a signature %s (%s)', async (signature) => {
    await openMediaRelease();
    fillSignerBlock({ signature });
    fireEvent.click(screen.getByTestId('sign-media-release'));

    await waitFor(() => expect(consentSignPosts()).toHaveLength(1));
  });
});

describe('the block refuses to produce an unidentified signature', () => {
  it.each([
    ['signer-full-name', /Add your full name/i],
    ['signer-email', /Add your email/i],
    ['signer-signature', /Draw or type your signature/i],
  ])('will not sign with %s left empty', async (testId, message) => {
    await openMediaRelease();
    fillSignerBlock();
    fireEvent.change(screen.getByTestId(testId), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('sign-media-release'));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(consentSignPosts()).toHaveLength(0);
  });

  it('will not sign without a relationship to the student', async () => {
    await openMediaRelease();
    fillSignerBlock({ relationship: '' });
    fireEvent.click(screen.getByTestId('sign-media-release'));

    expect(await screen.findByText(/Choose your relationship/i)).toBeInTheDocument();
    expect(consentSignPosts()).toHaveLength(0);
  });

  it('refuses an email we could not reach the signer at', async () => {
    await openMediaRelease();
    fillSignerBlock({ email: 'not-an-email' });
    fireEvent.click(screen.getByTestId('sign-media-release'));

    expect(await screen.findByText(/email we can reach you at/i)).toBeInTheDocument();
    expect(consentSignPosts()).toHaveLength(0);
  });
});

describe('the block is served by the document version, not authored here', () => {
  it('renders the served declaration verbatim', async () => {
    await openMediaRelease();
    expect(screen.getByTestId('signer-declaration')).toHaveTextContent(SIGNER_DECLARATION);
  });

  it('offers exactly the relationships the document declares — no more', async () => {
    await openMediaRelease();
    const options = Array.from(
      screen.getByTestId('signer-relationship').querySelectorAll('option'),
    ).map((option) => (option as HTMLOptionElement).value);
    // The leading '' is the unchosen placeholder, which is why a relationship
    // is a required choice rather than a silently-defaulted one.
    expect(options).toEqual(['', ...SIGNER_RELATIONSHIP_OPTIONS.map((o) => o.key)]);
  });
});

describe('each document carries its OWN signature block (D-CCC-7)', () => {
  it('the competition terms collect and post their own block', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: {} }),
        termsDoc(),
      ]),
      'POST /challenges/ed_1/consent': () =>
        consentStatus([
          mediaDoc({ ...SIGNED_STAMP, grants: {} }),
          termsDoc({ ...SIGNED_STAMP, grants: { accepted: true } }),
        ]),
    });
    renderPage();
    await pickKid();
    await screen.findByTestId('competition-terms-step');

    expect(screen.getByTestId('parent-guardian-details')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I am the parent or legal guardian of the child/));
    fillSignerBlock({ relationship: 'legal_guardian' });
    fireEvent.click(screen.getByTestId('sign-competition-terms'));

    await waitFor(() => expect(consentSignPosts()).toHaveLength(1));
    const body = lastConsentSignBody();
    expect(body.document_type).toBe('competition_terms');
    expect(body.signer).toMatchObject({ relationship: 'legal_guardian' });
  });

  /**
   * The signature is never pre-typed, on either document. A block that arrived
   * already signed would let the tick-and-go path produce a signature the parent
   * did not make.
   */
  it('prefills the name and email from the account but never the signature', async () => {
    await openMediaRelease();
    expect(screen.getByTestId('signer-signature')).toHaveValue('');
    // The prefill is a convenience and stays editable — asserted by the tests
    // above, which overwrite every field and are accepted.
    expect(screen.getByTestId('signer-full-name')).toBeEnabled();
    expect(screen.getByTestId('signer-email')).toBeEnabled();
  });
});

/**
 * The frontend can reach production BEFORE the backend that serves the block
 * (`airbotix-app` deploys on push to main; the backend deploy is manual). An
 * older API response carries no `signer_declaration` and no
 * `signer_relationship_options`, and the form must fail HONESTLY rather than
 * throwing on `.map` and handing the parent a blank page.
 */
describe('a document served without the signature block', () => {
  const withoutBlock = { signer_declaration: '', signer_relationship_options: [] };

  it('refuses to render the media release rather than signing without a signer', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([mediaDoc(withoutBlock), termsDoc()]),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('media-release-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('media-release-step')).toBeNull();
    expect(consentSignPosts()).toHaveLength(0);
  });

  it('refuses to render the competition terms for the same reason', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: consentStatus([
        mediaDoc({ ...SIGNED_STAMP, grants: {} }),
        termsDoc(withoutBlock),
      ]),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('competition-terms-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('competition-terms-step')).toBeNull();
  });
});
