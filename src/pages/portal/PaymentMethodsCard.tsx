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
}: {
  familyId: string;
  methods: PaymentMethod[];
  onError: (s: string) => void;
  onNotice: (s: string) => void;
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
      <div className="eyebrow eyebrow-sky mb-3">Payment method</div>
      {methods.length === 0 ? (
        <p className="text-[13px] text-slate2">No saved cards yet.</p>
      ) : (
        <ul className="space-y-2">
          {methods.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-2xl border-2 border-hairline px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold text-ink capitalize">{m.brand} ••{m.last4}</span>
                <span className="text-[12px] text-slate2">
                  exp {String(m.exp_month).padStart(2, '0')}/{String(m.exp_year).slice(-2)}
                </span>
                {m.is_default && <span className="sticker-mint text-[10px]">Default</span>}
              </div>
              <div className="flex gap-2">
                {!m.is_default && (
                  <button onClick={() => setDefault.mutate(m.id)} className="btn-pill-ghost text-[12px]">
                    Make default
                  </button>
                )}
                <button onClick={() => remove.mutate(m.id)} className="btn-pill-ghost text-[12px]">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => setAdding(true)} className="btn-pill-secondary mt-4">
        + Add a card
      </button>

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
