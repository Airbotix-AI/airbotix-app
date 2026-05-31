import { useEffect, useId, useRef, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { loadAirwallex, type AirwallexElement } from './airwallex';
import type { ConfirmCardBody, PaymentMethod, SetupIntentResponse } from './walletTypes';

// MIT (stored-credential) consent copy — captured at card-add time so auto-topup
// can charge later (§5.10 MIT note). Stored alongside the PaymentMethod backend-side.
const MIT_CONSENT =
  'I allow Airbotix to securely save this card and charge it automatically for ' +
  'Stars top-ups, up to the limits I set, until I remove it.';

interface AddCardModalProps {
  familyId: string;
  onClose: () => void;
  /** Called once the card is tokenized + persisted, so the caller can refetch. */
  onAdded: () => void;
}

type Phase = 'loading' | 'consent' | 'mounting' | 'ready' | 'confirming' | 'done' | 'unavailable';

/**
 * Add-a-card via the Airwallex Components drop-in (platform-backend-api-spec
 * §5.4 + §5.10 MIT). Flow:
 *   1. fetch SetupIntent client_secret from the backend
 *   2. lazily load the Airwallex SDK + mount a hosted card element (iframe)
 *   3. capture MIT consent, create the payment consent (tokenizes the card)
 *   4. POST the tokenized ids back to the backend to persist the PaymentMethod
 *
 * If the SDK can't load or the SetupIntent endpoint isn't live yet, the modal
 * shows a clear "not ready" guard instead of crashing.
 */
export function AddCardModal({ familyId, onClose, onAdded }: AddCardModalProps) {
  const cardDomId = useId().replace(/:/g, '_'); // SDK mount targets need a CSS-safe id
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);

  const intentRef = useRef<SetupIntentResponse | null>(null);
  const elementRef = useRef<AirwallexElement | null>(null);
  const sdkRef = useRef<Awaited<ReturnType<typeof loadAirwallex>> | null>(null);

  // Step 1+2: fetch SetupIntent, load SDK, mount the card element.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const intent = await api<SetupIntentResponse>(
          `/families/${familyId}/payment-methods/setup-intent`,
          { method: 'POST' },
        );
        if (cancelled) return;
        intentRef.current = intent;

        const sdk = await loadAirwallex(intent.airwallex_env ?? 'demo');
        if (cancelled) return;
        sdkRef.current = sdk;
        setPhase('consent');
      } catch (e) {
        if (cancelled) return;
        // Backend route not live, or SDK blocked → graceful not-ready guard.
        if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
          setError('Card setup isn’t switched on yet. Please check back soon.');
        } else {
          setError(
            e instanceof ApiError
              ? e.message
              : 'We couldn’t load the secure card form. Check your connection and try again.',
          );
        }
        setPhase('unavailable');
      }
    })();
    return () => {
      cancelled = true;
      elementRef.current?.unmount();
    };
  }, [familyId]);

  // Step 2b: once consent is given, mount the hosted card iframe element.
  useEffect(() => {
    if (phase !== 'consent' || !consented || !sdkRef.current) return;
    setPhase('mounting');
    try {
      const el = sdkRef.current.createElement('card');
      el.mount(cardDomId);
      el.on('ready', () => setPhase('ready'));
      el.on('error', () =>
        setError('That card form had a problem. Close and try again.'),
      );
      elementRef.current = el;
    } catch {
      setError('We couldn’t show the secure card form.');
      setPhase('unavailable');
    }
  }, [phase, consented, cardDomId]);

  // Step 3+4: tokenize the card, then persist the PaymentMethod backend-side.
  const confirm = async () => {
    const sdk = sdkRef.current;
    const el = elementRef.current;
    const intent = intentRef.current;
    if (!sdk || !el || !intent) return;
    setPhase('confirming');
    setError(null);
    try {
      const consent = await sdk.createPaymentConsent({
        intent_id: intent.setup_intent_id,
        client_secret: intent.client_secret,
        currency: 'AUD',
        element: el,
        next_triggered_by: 'merchant', // MIT — auto-topup charges later
      });

      const body: ConfirmCardBody = {
        setup_intent_id: intent.setup_intent_id,
        payment_consent_id: consent.payment_consent_id,
        airwallex_pm_id: consent.payment_method?.id,
      };
      await api<PaymentMethod>(`/families/${familyId}/payment-methods`, {
        method: 'POST',
        body: { ...body, mit_consent_text: MIT_CONSENT },
      });
      setPhase('done');
      onAdded();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'We couldn’t save that card. Please try again.',
      );
      setPhase('ready');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-hero bg-canvas-pure p-7 shadow-card-soft">
        <div className="eyebrow eyebrow-mint">Wallet</div>
        <h2 className="section-heading" style={{ fontSize: '22px' }}>
          Add a card
        </h2>
        <p className="lead-text mt-1" style={{ fontSize: '14px' }}>
          Your card is handled by Airwallex. We never see or store your card number.
        </p>

        {phase === 'loading' && <p className="lead-text mt-6">Loading secure form…</p>}

        {phase === 'unavailable' && (
          <div className="mt-6">
            <div className="rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
            <button onClick={onClose} className="btn-pill-secondary mt-6">
              Close
            </button>
          </div>
        )}

        {(phase === 'consent' || phase === 'mounting' || phase === 'ready' || phase === 'confirming') && (
          <>
            {/* Airwallex mounts its hosted card iframe into this element. */}
            <div id={cardDomId} className="mt-5 min-h-[44px] rounded-2xl border-2 border-hairline px-3 py-2" />

            {(phase === 'mounting' || phase === 'consent') && (
              <p className="lead-text mt-2" style={{ fontSize: '13px' }}>
                {consented ? 'Loading card form…' : ''}
              </p>
            )}

            <label className="mt-5 flex items-start gap-3">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-brand-mint"
              />
              <span className="text-[13px] text-ink-soft">{MIT_CONSENT}</span>
            </label>

            {error && (
              <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-2 text-[13px] font-medium text-ink">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button onClick={onClose} className="btn-pill-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={phase !== 'ready' || !consented}
                className="btn-pill-primary flex-1"
              >
                {phase === 'confirming' ? 'Saving…' : 'Save card'}
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="mt-6 text-center">
            <span className="sticker-mint">Saved ✓</span>
            <p className="lead-text mt-4" style={{ fontSize: '14px' }}>
              Your card is saved securely. You can now turn on auto-topup.
            </p>
            <button onClick={onClose} className="btn-pill-primary mt-6">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
