import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { CliReturnBanner } from '@/components/CliReturnBanner';
import { api, ApiError } from '@/lib/api';
import { TopupLimitModal } from './TopupLimitModal';
import { asTopupLimit, type TopupLimitInfo } from './walletTypes';

type PackSku = 'starter_10' | 'family_30' | 'mega_50' | 'school_100';

interface Pack {
  sku: PackSku;
  label: string;
  stars: number;
  bonus: number;
  price_aud: number;
  color: 'sky' | 'mint' | 'bubblegum' | 'coral';
  tag?: string;
}

// Mirror of platform-backend STARS_PACKS (src/wallet/wallet.dto.ts).
const PACKS: Pack[] = [
  { sku: 'starter_10', label: 'Starter',  stars: 10,  bonus: 0,  price_aud: 10,  color: 'sky' },
  { sku: 'family_30',  label: 'Family',   stars: 30,  bonus: 5,  price_aud: 30,  color: 'mint',      tag: 'Popular' },
  { sku: 'mega_50',    label: 'Mega',     stars: 50,  bonus: 15, price_aud: 50,  color: 'bubblegum', tag: 'Best value' },
  { sku: 'school_100', label: 'School',   stars: 100, bonus: 40, price_aud: 100, color: 'coral' },
];

interface TopupResponse {
  payment_id: string;
  payment_intent_id?: string;
  checkout_url: string;
  pack: string;
  stars_credited_pending: number;
}

export function WalletTopupPage() {
  const me = useMe();
  const nav = useNavigate();
  const [busy, setBusy] = useState<PackSku | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<TopupLimitInfo | null>(null);

  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const choose = async (pack: Pack) => {
    if (!familyId) return;
    setBusy(pack.sku);
    setError(null);
    try {
      const res = await api<TopupResponse>(`/families/${familyId}/wallet/topup`, {
        method: 'POST',
        body: { pack: pack.sku },
      });
      // Dev: log the mock checkout url so we can verify it round-tripped.
      console.info('[topup]', res);
      window.location.href = res.checkout_url;
    } catch (e) {
      // Anti-fraud 429s (TOPUP_*) get the dedicated §4.4.2 limit modal; anything
      // else falls back to the inline error banner.
      const topupLimit = e instanceof ApiError ? asTopupLimit(e) : null;
      if (topupLimit) {
        setLimit(topupLimit);
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not start checkout.');
      }
      setBusy(null);
    }
  };

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Wallet</div>
        <h1 className="section-heading">Set up your family first</h1>
        <p className="lead-text mt-3">
          You need a family before you can top up Stars.
        </p>
        <button onClick={() => nav('/portal/register')} className="btn-pill-primary mt-6">
          Start setup →
        </button>
      </div>
    );
  }

  return (
    <div>
      <CliReturnBanner />
      <div className="mb-8">
        <div className="eyebrow">Wallet</div>
        <h1 className="section-heading">Top up Stars</h1>
        <p className="lead-text mt-3">
          Pick a pack. Bigger packs include bonus Stars.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PACKS.map((pack) => {
          const total = pack.stars + pack.bonus;
          const isBusy = busy === pack.sku;
          return (
            <button
              key={pack.sku}
              type="button"
              disabled={busy !== null}
              onClick={() => choose(pack)}
              className={`pack-card ${pack.color}`}
            >
              <span className="pack-blob" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-85">
                    {pack.label}
                  </div>
                  <div className="mt-2 font-extrabold leading-none" style={{ fontSize: '56px', letterSpacing: '-0.03em' }}>
                    {total}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold opacity-90">
                    Stars
                    {pack.bonus > 0 && (
                      <span className="ml-2 text-[12px] opacity-75">
                        ({pack.stars} + {pack.bonus} bonus)
                      </span>
                    )}
                  </div>
                </div>
                {pack.tag && (
                  <span
                    className={`sticker bg-canvas-pure text-ink ${'alt'}`}
                  >
                    {pack.tag}
                  </span>
                )}
              </div>
              <div className="relative mt-8 flex items-end justify-between">
                <div className="text-[16px] font-semibold opacity-95">
                  A${pack.price_aud}
                </div>
                <div className="rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
                  {isBusy ? 'Loading…' : 'Choose →'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      <p className="mt-8 text-[13px] text-slate2">
        Powered by Airwallex. Cards charged in AUD.
      </p>

      {limit && <TopupLimitModal info={limit} onClose={() => setLimit(null)} />}
    </div>
  );
}
