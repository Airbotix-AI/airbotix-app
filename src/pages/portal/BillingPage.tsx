import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

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

export function BillingPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const tx = useQuery<TxResp>({
    queryKey: ['billing', familyId],
    queryFn: () => api<TxResp>(`/families/${familyId}/wallet/transactions?type=topup_card&limit=50`),
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

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-mint">Billing</div>
          <h1 className="section-heading">Payment history</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            Every Stars Pack you bought. Receipts via Airwallex.
          </p>
        </div>
        <Link to="/portal/wallet/topup" className="btn-pill-primary">+ Top up</Link>
      </div>

      {tx.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : tx.data && tx.data.items.length > 0 ? (
        <div className="card-base p-0 overflow-hidden">
          <ul className="divide-y divide-hairline">
            {tx.data.items.map((row) => {
              const meta = row.metadata as { airwallex_payment_id?: string; pack_sku?: string };
              return (
                <li key={row.id} className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="sticker-mint">paid</span>
                      <div className="text-[14px] font-bold text-ink truncate">
                        {meta.pack_sku ? meta.pack_sku.replace(/_/g, ' ') : row.reason}
                      </div>
                    </div>
                    <div className="text-[12px] text-slate2 mt-2">
                      {new Date(row.created_at).toLocaleString()}
                      {meta.airwallex_payment_id && (
                        <span className="ml-2 font-mono">· {meta.airwallex_payment_id.slice(-12)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[18px] font-bold tabular-nums text-brand-mint shrink-0">
                    +{row.delta_stars}★
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
