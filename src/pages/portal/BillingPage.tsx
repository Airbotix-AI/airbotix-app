import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { PaymentMethodsCard } from './PaymentMethodsCard';
import type { PaymentMethod } from './walletTypes';

interface TxRow {
  id: string;
  type: string;
  delta_stars: number;
  reason: string;
  metadata: { airwallex_payment_id?: string; pack_sku?: string } | Record<string, unknown>;
  created_at: string;
}

interface TxResp {
  items: TxRow[];
  has_more: boolean;
  next_cursor: string | null;
}

// Transaction types that belong on the billing/payment history (money in/out),
// not Stars spend. Matches the backend `types` filter param.
const BILLING_TYPES = ['topup_card', 'topup_auto', 'refund'] as const;
const BILLING_TYPE_SET: ReadonlySet<string> = new Set(BILLING_TYPES);

const TYPE_LABEL: Record<string, string> = {
  topup_card: 'Card top-up',
  topup_auto: 'Auto top-up',
  refund: 'Refund',
};

export function BillingPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tx = useQuery<TxResp>({
    queryKey: ['billing', familyId],
    queryFn: () =>
      api<TxResp>(`/families/${familyId}/wallet/transactions?types=${BILLING_TYPES.join(',')}&limit=50`),
    enabled: !!familyId,
  });

  const methods = useQuery<PaymentMethod[]>({
    queryKey: ['family', familyId, 'payment-methods'],
    queryFn: () => api<PaymentMethod[]>(`/families/${familyId}/payment-methods`),
    enabled: !!familyId,
  });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Billing</div>
        <h1 className="section-heading">Set up your family first</h1>
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  // Defensive client-side filter: keeps the page correct even against a backend
  // that doesn't yet honour the `types` param (would otherwise return all types).
  const rows = (tx.data?.items ?? []).filter((r) => BILLING_TYPE_SET.has(r.type));

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-mint">Billing</div>
          <h1 className="section-heading">Payment history</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            Every Stars Pack you bought — card and auto top-ups, plus refunds. Receipts via Airwallex.
          </p>
        </div>
        <Link to="/portal/wallet/topup" className="btn-pill-primary">+ Top up</Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 mb-6 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 mb-6 text-[13px] font-medium text-ink">
          {notice}
        </div>
      )}

      {/* Saved payment methods (§4.8 "payment methods saved") */}
      <div className="mb-8">
        <PaymentMethodsCard
          familyId={familyId}
          methods={methods.data ?? []}
          onError={setError}
          onNotice={setNotice}
        />
      </div>

      <h2 className="section-heading mb-4" style={{ fontSize: '22px' }}>Purchases &amp; refunds</h2>
      {tx.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : rows.length > 0 ? (
        <div className="card-base p-0 overflow-hidden">
          <ul className="divide-y divide-hairline">
            {rows.map((row) => {
              const meta = row.metadata as { airwallex_payment_id?: string; pack_sku?: string };
              const isRefund = row.type === 'refund';
              const label =
                TYPE_LABEL[row.type] ?? (meta.pack_sku ? meta.pack_sku.replace(/_/g, ' ') : row.reason);
              return (
                <li key={row.id} className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={isRefund ? 'sticker-coral' : 'sticker-mint'}>
                        {isRefund ? 'refund' : 'paid'}
                      </span>
                      <div className="text-[14px] font-bold text-ink truncate">
                        {label}
                        {meta.pack_sku && !isRefund && (
                          <span className="ml-2 text-[12px] font-medium text-slate2">
                            {meta.pack_sku.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[12px] text-slate2 mt-2">
                      {new Date(row.created_at).toLocaleString()}
                      {meta.airwallex_payment_id && (
                        <span className="ml-2 font-mono">· {meta.airwallex_payment_id.slice(-12)}</span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-[18px] font-bold tabular-nums shrink-0 ${
                      row.delta_stars < 0 ? 'text-brand-coral' : 'text-brand-mint'
                    }`}
                  >
                    {row.delta_stars > 0 ? '+' : ''}
                    {row.delta_stars}★
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sky">No purchases</span>
          <p className="lead-text mt-4">You haven't bought any Stars yet.</p>
          <Link to="/portal/wallet/topup" className="btn-pill-primary mt-6">Top up Stars →</Link>
        </div>
      )}

      <p className="mt-6 text-[12px] text-slate2">
        Paid via Airwallex. For tax invoices, email <a href="mailto:billing@airbotix.ai" className="text-brand-coral font-semibold hover:underline">billing@airbotix.ai</a>.
      </p>
    </div>
  );
}
