import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '@/lib/api';
import { AddCardModal } from './AddCardModal';
import type { PaymentMethod } from './walletTypes';

/**
 * Saved cards + add-a-card via the Airwallex Components drop-in (§5.4 / MIT note
 * §5.10). The PAN never hits our servers: AddCardModal fetches a SetupIntent
 * client_secret, the Airwallex SDK mounts a hosted card iframe, tokenizes the
 * card, and the tokenized `payment_method_id` is persisted backend-side.
 *
 * Shared by `/portal/wallet/auto-topup` and `/portal/billing` (§4.4.1 / §4.8).
 */
export function PaymentMethodsCard({
  familyId,
  methods,
  onError,
  onNotice,
  selectedPaymentMethodId,
  onSelect,
}: {
  familyId: string;
  methods: PaymentMethod[];
  onError: (s: string) => void;
  onNotice: (s: string) => void;
  selectedPaymentMethodId?: string | null;
  onSelect?: (paymentMethodId: string) => void;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const setDefault = useMutation({
    mutationFn: (pmId: string) =>
      api(`/families/${familyId}/payment-methods/${pmId}/set-default`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', familyId, 'payment-methods'] }),
    onError: (e: unknown) => onError(e instanceof ApiError ? e.message : 'Could not set default.'),
  });

  const remove = useMutation({
    mutationFn: (pmId: string) =>
      api(`/families/${familyId}/payment-methods/${pmId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', familyId, 'payment-methods'] }),
    onError: (e: unknown) => onError(e instanceof ApiError ? e.message : 'Could not remove card.'),
  });

  return (
    <div className="card-base">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="eyebrow eyebrow-sky">Payment method</div>
          <p className="mt-1 text-[13px] text-slate2">
            {onSelect ? 'Choose the exact card to use for automatic charges.' : 'Manage your securely saved cards.'}
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-pill-secondary">
          + Add a card
        </button>
      </div>
      {methods.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-hairline bg-surface px-5 py-6 text-center">
          <div className="text-[24px]" aria-hidden="true">💳</div>
          <p className="mt-2 text-[14px] font-bold text-ink">No saved card yet</p>
          <p className="mt-1 text-[13px] text-slate2">Add one before switching auto-topup on.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {methods.map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl border-2 p-3 transition-colors ${
                selectedPaymentMethodId === m.id ? 'border-brand-mint bg-wash-mint' : 'border-hairline'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(m.id)}
                  className="flex min-h-11 flex-1 items-center gap-3 text-left disabled:cursor-default"
                >
                  {onSelect && (
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                      selectedPaymentMethodId === m.id ? 'border-brand-mint bg-brand-mint' : 'border-slate2'
                    }`}>
                      {selectedPaymentMethodId === m.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  )}
                  <span>
                    <span className="block text-[14px] font-bold capitalize text-ink">{m.brand} ••{m.last4}</span>
                    <span className="text-[12px] text-slate2">
                      Expires {String(m.exp_month).padStart(2, '0')}/{String(m.exp_year).slice(-2)}
                    </span>
                  </span>
                  {m.is_default && <span className="sticker-mint text-[10px]">Default</span>}
                </button>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                {!m.is_default && (
                  <button onClick={() => setDefault.mutate(m.id)} className="btn-pill-ghost text-[12px]">
                    Make default
                  </button>
                )}
                <button onClick={() => remove.mutate(m.id)} className="btn-pill-ghost text-[12px]">
                  Remove
                </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddCardModal
          familyId={familyId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['family', familyId, 'payment-methods'] });
            onNotice('Card saved securely.');
          }}
        />
      )}
    </div>
  );
}
