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
}

declare global {
  interface Window {
    Airwallex?: AirwallexSdk;
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

export type { AirwallexElement, AirwallexSdk };
