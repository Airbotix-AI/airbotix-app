// @vitest-environment jsdom
// Creative Code Challenge parent registration — ASSENT + CHECKOUT
// (/portal/challenge/:slug/register, creative-code-challenge-prd.md §5 flow 1).
//
// One of four suites over this page; the shared fixtures are in
// `challengeRegisterTestKit.tsx`. What this one defends:
//   1. checkout hands the backend's OWN intent to the Airwallex SDK rather than
//      building a deep link;
//   2. a CONSENT_REQUIRED refusal is shown to the parent, names WHICH document,
//      and re-reads the consent state rather than just narrating it;
//   3. the child's assent is its own call against the child — and it does NOT
//      gate the entry fee, because the backend does not gate on it either.

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

import { api, MockApiError } from './challengeRegisterTestMocks';
import {
  bothSignedConsent,
  CONSENT_PATH,
  EDITION,
  PENDING_KEY,
  pickKid,
  REG_PATH,
  renderPage,
  installRegisterPageHarness,
  wireApi,
} from './challengeRegisterTestKit';

installRegisterPageHarness();

describe('ChallengeRegisterPage — checkout', () => {
  it("hands the backend's own intent to the Airwallex SDK (no hand-built deep link)", async () => {
    const redirectToCheckout = vi.fn();
    (window as { AirwallexComponentsSDK?: unknown }).AirwallexComponentsSDK = {
      init: vi.fn().mockResolvedValue({ payments: { redirectToCheckout } }),
    };
    wireApi({
      [`GET ${CONSENT_PATH}`]: bothSignedConsent(),
      'POST /challenges/ed_1/entries/checkout': {
        entry_id: 'entry_1',
        payment_intent_id: 'int_1',
        client_secret: 'cs_1',
        checkout_url: 'https://checkout.airwallex.com/#/standalone/checkout?intent_id=int_1',
      },
    });
    renderPage();
    await pickKid();
    await waitFor(() => expect(screen.getByTestId('challenge-pay')).toBeEnabled());

    fireEvent.click(screen.getByTestId('challenge-pay'));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/challenges/ed_1/entries/checkout', {
        method: 'POST',
        body: { kid_id: 'kid-1' },
      }),
    );
    await waitFor(() =>
      expect(redirectToCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ intent_id: 'int_1', client_secret: 'cs_1', mode: 'payment' }),
      ),
    );
    // The kid is stashed for the return trip; the nickname never is.
    expect(sessionStorage.getItem(PENDING_KEY)).toBe('kid-1');
    expect(sessionStorage.getItem(PENDING_KEY)).not.toContain('Mia');
  });

  it('surfaces a CONSENT_REQUIRED refusal in plain language and re-reads the consent state', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: bothSignedConsent(),
      'POST /challenges/ed_1/entries/checkout': new MockApiError(
        409,
        'CONSENT_REQUIRED',
        'Both consent documents must be signed by a parent or guardian before the entry fee can be paid.',
        {
          missing: [
            {
              document_type: 'competition_terms',
              current_version: '0.2',
              reason: 'superseded_version',
            },
          ],
        },
      ),
    });
    renderPage();
    await pickKid();
    await waitFor(() => expect(screen.getByTestId('challenge-pay')).toBeEnabled());

    const consentReadsBefore = api.mock.calls.filter(([p]) => p === CONSENT_PATH).length;
    fireEvent.click(screen.getByTestId('challenge-pay'));

    expect(await screen.findByTestId('challenge-pay-error')).toHaveTextContent(
      /Both consent forms need a parent or guardian signature/,
    );
    // …and it names WHICH form, from the backend's own `details.missing` — a
    // parent cannot act on "a form is missing".
    expect(screen.getByTestId('challenge-pay-error')).toHaveTextContent(
      /the competition terms was updated and needs signing again/,
    );
    // The refusal means our view of what is signed is stale — it is re-read, not
    // just narrated.
    await waitFor(() =>
      expect(api.mock.calls.filter(([p]) => p === CONSENT_PATH).length).toBeGreaterThan(
        consentReadsBefore,
      ),
    );
    // Nothing was stashed: no payment was started.
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('explains a closed registration window and refuses to offer payment', async () => {
    wireApi({
      [`GET ${REG_PATH}`]: {
        edition: { ...EDITION, status: 'judging', registration_open: false },
        kid_id: null,
        entry: null,
      },
      [`GET ${REG_PATH}?kid_id=kid-1`]: {
        edition: { ...EDITION, status: 'judging', registration_open: false },
        kid_id: 'kid-1',
        entry: null,
      },
      [`GET ${CONSENT_PATH}`]: bothSignedConsent(),
    });
    renderPage();
    await pickKid();

    expect(await screen.findByTestId('registration-closed')).toHaveTextContent(
      /not taking entries at the moment/,
    );
    await waitFor(() => expect(screen.getByTestId('challenge-pay')).toBeDisabled());
  });
});

describe('ChallengeRegisterPage — the child’s own assent', () => {
  it('records the assent against the child, in its own call', async () => {
    const recorded = vi.fn(() =>
      bothSignedConsent({ kid_assent_at: '2026-08-07T00:00:00.000Z' }),
    );
    wireApi({
      [`GET ${CONSENT_PATH}`]: bothSignedConsent(),
      'POST /challenges/ed_1/consent/kid-assent': recorded,
    });
    renderPage();
    await pickKid();

    fireEvent.click(await screen.findByTestId('kid-assent'));

    await waitFor(() => expect(recorded).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith('/challenges/ed_1/consent/kid-assent', {
      method: 'POST',
      body: { kid_id: 'kid-1', assented: true },
    });
    // It is the SERVER's stamp that ticks the box.
    await waitFor(() => expect(screen.getByTestId('kid-assent')).toBeChecked());
  });

  it('shows the server’s stamp rather than what was clicked', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: bothSignedConsent({ kid_assent_at: '2026-08-07T00:00:00.000Z' }),
    });
    renderPage();
    await pickKid();

    await waitFor(() => expect(screen.getByTestId('kid-assent')).toBeChecked());
  });

  it('says so when the write fails, instead of silently snapping back', async () => {
    wireApi({
      [`GET ${CONSENT_PATH}`]: bothSignedConsent(),
      'POST /challenges/ed_1/consent/kid-assent': new MockApiError(
        400,
        'EDITION_NOT_OPEN_FOR_REGISTRATION',
        'This challenge edition is not open for registration.',
      ),
    });
    renderPage();
    await pickKid();

    fireEvent.click(await screen.findByTestId('kid-assent'));

    expect(await screen.findByTestId('challenge-assent-error')).toHaveTextContent(
      /not taking entries at the moment/i,
    );
    expect(screen.getByTestId('kid-assent')).not.toBeChecked();
  });

  it('does NOT gate the entry fee — the two adult signatures do', async () => {
    wireApi({ [`GET ${CONSENT_PATH}`]: bothSignedConsent({ kid_assent_at: null }) });
    renderPage();
    await pickKid();

    // The backend deliberately does not gate checkout on assent
    // (challenge-consent.service.ts), so neither may this page.
    await waitFor(() => expect(screen.getByTestId('challenge-pay')).toBeEnabled());
    expect(screen.getByTestId('kid-assent')).not.toBeChecked();
  });
});
