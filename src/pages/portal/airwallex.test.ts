// @vitest-environment jsdom
// startHostedCheckout (airwallex.ts): launches the Airwallex Hosted Payment Page
// via the browser SDK for an already-created intent so the card form renders
// up-front, and falls back to the backend `checkout_url` redirect whenever the
// SDK is unusable (blocked/offline, missing client_secret, or a non-Airwallex
// mock host) — so it can never regress below the plain-redirect flow.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startHostedCheckout } from './airwallex';

const PROD_URL = 'https://checkout.airwallex.com/#/standalone/checkout?intent_id=int_1';
const DEMO_URL = 'https://checkout-demo.airwallex.com/#/standalone/checkout?intent_id=int_1';

let hrefSetTo: string | null;

beforeEach(() => {
  hrefSetTo = null;
  // jsdom throws on real navigation — capture href assignments instead.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin: 'https://app.airbotix.ai',
      set href(v: string) {
        hrefSetTo = v;
      },
      get href() {
        return hrefSetTo ?? '';
      },
    },
  });
});

afterEach(() => {
  delete (window as { AirwallexComponentsSDK?: unknown }).AirwallexComponentsSDK;
  delete (window as { Airwallex?: unknown }).Airwallex;
  vi.restoreAllMocks();
});

describe('startHostedCheckout', () => {
  it('falls back to checkout_url when client_secret is missing', async () => {
    await startHostedCheckout({ payment_intent_id: 'int_1', checkout_url: PROD_URL });
    expect(hrefSetTo).toBe(PROD_URL);
  });

  it('falls back to checkout_url for a non-Airwallex (mock) host', async () => {
    const url = 'https://mock.airwallex.local/checkout/int_1';
    await startHostedCheckout({ payment_intent_id: 'int_1', client_secret: 'cs_1', checkout_url: url });
    expect(hrefSetTo).toBe(url);
  });

  it('launches the SDK Hosted Payment Page (no redirect) when secret + prod host + components SDK are present', async () => {
    const redirectToCheckout = vi.fn();
    const init = vi.fn().mockResolvedValue({ payments: { redirectToCheckout } });
    (window as { AirwallexComponentsSDK?: unknown }).AirwallexComponentsSDK = { init };

    await startHostedCheckout({
      payment_intent_id: 'int_1',
      client_secret: 'cs_1',
      checkout_url: PROD_URL,
    });

    expect(init).toHaveBeenCalledWith({ env: 'prod', enabledElements: ['payments'] });
    expect(redirectToCheckout).toHaveBeenCalledWith({
      env: 'prod',
      mode: 'payment',
      intent_id: 'int_1',
      client_secret: 'cs_1',
      currency: 'AUD',
      country_code: 'AU',
    });
    expect(hrefSetTo).toBeNull(); // SDK navigates; we must not double-redirect
  });

  it('derives the demo env from a checkout-demo host', async () => {
    const redirectToCheckout = vi.fn();
    const init = vi.fn().mockResolvedValue({ payments: { redirectToCheckout } });
    (window as { AirwallexComponentsSDK?: unknown }).AirwallexComponentsSDK = { init };

    await startHostedCheckout({
      payment_intent_id: 'int_1',
      client_secret: 'cs_1',
      checkout_url: DEMO_URL,
    });

    expect(init).toHaveBeenCalledWith({ env: 'demo', enabledElements: ['payments'] });
    expect(redirectToCheckout).toHaveBeenCalledWith(expect.objectContaining({ env: 'demo' }));
  });

  it('falls back to checkout_url when the SDK init throws', async () => {
    const init = vi.fn().mockRejectedValue(new Error('blocked'));
    (window as { AirwallexComponentsSDK?: unknown }).AirwallexComponentsSDK = { init };

    await startHostedCheckout({
      payment_intent_id: 'int_1',
      client_secret: 'cs_1',
      checkout_url: PROD_URL,
    });

    expect(hrefSetTo).toBe(PROD_URL);
  });

  it('uses the legacy window.Airwallex launcher when the components SDK is absent', async () => {
    const redirectToCheckout = vi.fn();
    const legacyInit = vi.fn().mockResolvedValue(undefined);
    (window as { Airwallex?: unknown }).Airwallex = { init: legacyInit, redirectToCheckout };

    await startHostedCheckout({
      payment_intent_id: 'int_1',
      client_secret: 'cs_1',
      checkout_url: PROD_URL,
    });

    expect(redirectToCheckout).toHaveBeenCalledWith(expect.objectContaining({ intent_id: 'int_1' }));
    expect(hrefSetTo).toBeNull();
  });
});
