import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWsEvent } from '@/lib/useWsEvent';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

interface Wallet {
  id: string;
  family_id: string;
  stars_balance: number;
  daily_used: number;
  weekly_used: number;
  monthly_used: number;
  daily_cap: number;
  weekly_cap: number;
  monthly_cap: number;
  per_request_cap: number;
  paused: boolean;
}

interface TxRow {
  id: string;
  type: string;
  delta_stars: number;
  balance_after: number;
  reason: string;
  kid_id: string | null;
  created_at: string;
}

interface TxResp {
  items: TxRow[];
  next_cursor: string | null;
  has_more: boolean;
}

const TYPE_COLOR: Record<string, string> = {
  topup_card:        'mint',
  workshop_credit:   'sky',
  agent_spend:       'coral',
  mission_reward:    'sunshine',
  admin_adjust:      'bubblegum',
  refund:            'sunshine',
};

export function WalletPage() {
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  useWsEvent('wallet.update', () => { qc.invalidateQueries({ queryKey: ['wallet', familyId] }); qc.invalidateQueries({ queryKey: ['wallet', familyId, 'tx'] }); }, [familyId]);
  const [error, setError] = useState<string | null>(null);

  const wallet = useQuery<Wallet>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<Wallet>(`/families/${familyId}/wallet`),
    enabled: !!familyId,
  });

  const tx = useQuery<TxResp>({
    queryKey: ['wallet', familyId, 'tx'],
    queryFn: () => api<TxResp>(`/families/${familyId}/wallet/transactions?limit=20`),
    enabled: !!familyId,
  });

  const pauseMut = useMutation({
    mutationFn: () => api(`/families/${familyId}/wallet/pause`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet', familyId] }),
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not pause.'),
  });
  const resumeMut = useMutation({
    mutationFn: () => api(`/families/${familyId}/wallet/resume`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet', familyId] }),
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not resume.'),
  });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Wallet</div>
        <h1 className="section-heading">Set up your family first</h1>
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  const w = wallet.data;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-mint">Wallet</div>
          <h1 className="section-heading">Your Stars</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            Track balance, limits, and what your kids spent on.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/portal/wallet/topup" className="btn-pill-primary">+ Top up</Link>
          {w && (w.paused ? (
            <button onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending} className="btn-pill-secondary">
              Resume
            </button>
          ) : (
            <button onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending} className="btn-pill-secondary">
              Pause
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 mb-6 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      {w?.paused && (
        <div className="rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 mb-6 text-[14px] font-medium text-ink flex items-center gap-3">
          <span className="sticker-sunshine">Paused</span>
          <span>All kid spending is blocked until you resume.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-10">
        <div className="stat-tile mint">
          <div className="stat-num text-brand-mint">{w?.stars_balance ?? '—'}</div>
          <div className="stat-label">Balance</div>
        </div>
        <div className="stat-tile coral">
          <div className="stat-num text-brand-coral">{w ? `${w.daily_used}/${w.daily_cap}` : '—'}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-tile sky">
          <div className="stat-num text-brand-sky">{w ? `${w.weekly_used}/${w.weekly_cap}` : '—'}</div>
          <div className="stat-label">This week</div>
        </div>
      </div>

      {w && <CapsCard wallet={w} familyId={familyId} />}

      <h2 className="section-heading mt-10 mb-4" style={{ fontSize: '24px' }}>Recent activity</h2>
      {tx.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : tx.data && tx.data.items.length > 0 ? (
        <div className="card-base p-0 overflow-hidden">
          <ul className="divide-y divide-hairline">
            {tx.data.items.map((row) => {
              const color = TYPE_COLOR[row.type] ?? 'sky';
              const positive = row.delta_stars > 0;
              return (
                <li key={row.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`sticker-${color} shrink-0`} style={{ transform: 'rotate(-2deg)' }}>
                      {row.type.replace(/_/g, ' ')}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink truncate">{row.reason}</div>
                      <div className="text-[12px] text-slate2 mt-0.5">
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className={`text-[18px] font-bold tabular-nums ${positive ? 'text-brand-mint' : 'text-ink'}`}>
                    {positive ? '+' : ''}{row.delta_stars}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sky">All clear</span>
          <p className="lead-text mt-4">No activity yet. Top up to get started.</p>
        </div>
      )}
    </div>
  );
}

function CapsCard({ wallet, familyId }: { wallet: Wallet; familyId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState(wallet.daily_cap);
  const [wk, setWk] = useState(wallet.weekly_cap);
  const [m, setM] = useState(wallet.monthly_cap);
  const [pr, setPr] = useState(wallet.per_request_cap);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api(`/families/${familyId}/wallet/caps`, {
        method: 'PATCH',
        body: { daily_cap: d, weekly_cap: wk, monthly_cap: m, per_request_cap: pr },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['wallet', familyId] });
      setEditing(false);
      setErr(null);
    },
    onError: (e: unknown) =>
      setErr(e instanceof ApiError ? e.message : 'Could not save caps.'),
  });

  if (!editing) {
    return (
      <div className="card-base">
        <div className="flex items-center justify-between mb-2">
          <div className="eyebrow eyebrow-sky">Limits</div>
          <button onClick={() => setEditing(true)} className="btn-pill-ghost">Edit</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[14px]">
          <CapDisplay label="Daily" value={wallet.daily_cap} />
          <CapDisplay label="Weekly" value={wallet.weekly_cap} />
          <CapDisplay label="Monthly" value={wallet.monthly_cap} />
          <CapDisplay label="Per request" value={wallet.per_request_cap} />
        </div>
      </div>
    );
  }

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow eyebrow-sky">Edit limits</div>
        <button onClick={() => setEditing(false)} className="btn-pill-ghost">Cancel</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <CapInput label="Daily" value={d} setValue={setD} max={10000} />
        <CapInput label="Weekly" value={wk} setValue={setWk} max={50000} />
        <CapInput label="Monthly" value={m} setValue={setM} max={200000} />
        <CapInput label="Per request" value={pr} setValue={setPr} max={1000} />
      </div>
      {err && (
        <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          {err}
        </div>
      )}
      <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-pill-primary mt-4">
        {save.isPending ? 'Saving…' : 'Save limits'}
      </button>
    </div>
  );
}

function CapDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">{label}</div>
      <div className="font-bold text-ink mt-1">{value}</div>
    </div>
  );
}

function CapInput({ label, value, setValue, max }: { label: string; value: number; setValue: (n: number) => void; max: number }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="input-k12 mt-1"
      />
    </label>
  );
}
