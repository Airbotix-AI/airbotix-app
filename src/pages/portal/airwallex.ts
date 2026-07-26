// Airwallex browser drop-in loader (platform-backend-api-spec.md §5.4 / §5.10
// MIT note). The PAN never touches our servers: the backend issues a SetupIntent
// client_secret, the Airwallex Components SDK mounts a hosted card element in an
// iframe, tokenizes the card, and confirms the SetupIntent. We then tell the
// backend to persist the resulting tokenized `payment_method_id`.
//
// The SDK is loaded lazily from Airwallex's CDN (not bundled) so the rest of the
// app stays light and we never ship card-handling code ourselves. If the SDK
// can't load (offline / blocked / no creds), callers fall back to the
// "not ready" guard in AddCardModal — the flow degrades gracefully.

const SDK_SRC = 'https://static.airwallex.com/components/sdk/v1/index.js';

// Minimal shape of the parts of the Airwallex Components SDK we use. The SDK is
// untyped here (loaded from CDN), so we model only what we call.
interface AirwallexElement {
  mount(domId: string): void;
  unmount(): void;
  on(event: string, handler: (detail: unknown) => void): void;
}

interface HostedCheckoutParams {
  env: 'demo' | 'prod';
  mode: 'payment';
  intent_id: string;
  client_secret: string;
  currency: string;
  country_code: string;
}

interface AirwallexSdk {
  init(opts: { env: 'demo' | 'prod'; origin: string }): Promise<void> | void;
  createElement(type: 'card', opts?: Record<string, unknown>): AirwallexElement;
  confirmPaymentIntent?: never;
  createPaymentConsent(opts: {
    intent_id?: string;
    client_secret: string;
    currency?: string;
    element: AirwallexElement;
    next_triggered_by?: 'merchant' | 'customer';
  }): Promise<{ payment_consent_id?: string; payment_method?: { id?: string } }>;
  // Legacy airwallex-payment-elements shape: top-level redirect launcher.
  redirectToCheckout?(params: HostedCheckoutParams): void;
}

// The @airwallex/components-sdk (v1, the CDN bundle we load) exposes a separate
// global whose init() returns a `payments` sub-object carrying the HPP launcher.
// Older bundles alias the launcher onto window.Airwallex instead — we support
// both and, failing either, callers fall back to the hosted-page URL.
interface AirwallexComponentsSdk {
  init(opts: { env: 'demo' | 'prod'; enabledElements: string[] }): Promise<{
    payments?: { redirectToCheckout(params: HostedCheckoutParams): void };
  }>;
}

declare global {
  interface Window {
    Airwallex?: AirwallexSdk;
    AirwallexComponentsSDK?: AirwallexComponentsSdk;
  }
}

let loadPromise: Promise<AirwallexSdk> | null = null;

/** Lazily inject + init the Airwallex Components SDK. Resolves to the global. */
export function loadAirwallex(env: 'demo' | 'prod'): Promise<AirwallexSdk> {
  if (window.Airwallex) {
    return Promise.resolve(window.Airwallex).then(async (sdk) => {
      await sdk.init({ env, origin: window.location.origin });
      return sdk;
    });
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<AirwallexSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    const onLoad = async () => {
      if (!window.Airwallex) {
        reject(new Error('Airwallex SDK loaded but global missing'));
        return;
      }
      try {
        await window.Airwallex.init({ env, origin: window.location.origin });
        resolve(window.Airwallex);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Airwallex init failed'));
      }
    };
    if (existing) {
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', () => reject(new Error('Airwallex SDK failed to load')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', () => {
      loadPromise = null;
      reject(new Error('Airwallex SDK failed to load'));
    });
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Inject the SDK script (once) and resolve when either SDK global appears. */
function ensureSdkScript(): Promise<void> {
  if (window.AirwallexComponentsSDK || window.Airwallex) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const done = () =>
      window.AirwallexComponentsSDK || window.Airwallex
        ? resolve()
        : reject(new Error('Airwallex SDK loaded but global missing'));
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', done, { once: true });
      existing.addEventListener('error', () => reject(new Error('Airwallex SDK failed to load')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', () => reject(new Error('Airwallex SDK failed to load')), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

/** Derive the SDK env from the backend's hosted-page URL host. */
function envFromCheckoutUrl(checkoutUrl: string): 'demo' | 'prod' | null {
  try {
    const host = new URL(checkoutUrl).host;
    if (!host.endsWith('.airwallex.com')) return null; // mock/local — SDK not applicable
    return /(^|\.)checkout-demo\.|(^|\.)demo\./.test(host) ? 'demo' : 'prod';
  } catch {
    return null;
  }
}

/**
 * Launch the Airwallex Hosted Payment Page for an already-created PaymentIntent
 * via the SDK, so the card/payment form renders up-front (not behind a "Pay"
 * click, which is what the hand-built `#/standalone/checkout` deep link does).
 *
 * The SAME intent the backend created is used, so webhook reconciliation (keyed
 * on the intent id) is untouched. Any failure — SDK blocked/offline, missing
 * client_secret, non-Airwallex (mock) host — falls back to a plain redirect to
 * the backend's `checkout_url`, so this can never regress below today's flow.
 */
export async function startHostedCheckout(res: {
  payment_intent_id?: string;
  client_secret?: string;
  checkout_url: string;
}): Promise<void> {
  const env = envFromCheckoutUrl(res.checkout_url);
  if (res.payment_intent_id && res.client_secret && env) {
    try {
      await ensureSdkScript();
      const params: HostedCheckoutParams = {
        env,
        mode: 'payment',
        intent_id: res.payment_intent_id,
        client_secret: res.client_secret,
        currency: 'AUD',
        country_code: 'AU',
      };
      const components = window.AirwallexComponentsSDK;
      if (components) {
        const { payments } = await components.init({ env, enabledElements: ['payments'] });
        if (payments?.redirectToCheckout) {
          payments.redirectToCheckout(params);
          return;
        }
      }
      const legacy = window.Airwallex;
      if (legacy?.redirectToCheckout) {
        await legacy.init({ env, origin: window.location.origin });
        legacy.redirectToCheckout(params);
        return;
      }
    } catch {
      // fall through to the hosted-page URL redirect below
    }
  }
  window.location.href = res.checkout_url;
}

export type { AirwallexElement, AirwallexSdk };
