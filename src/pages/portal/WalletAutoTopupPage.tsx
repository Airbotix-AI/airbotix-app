import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { AddCardModal } from './AddCardModal';
import {
  AUTO_TOPUP_SKUS,
  DAILY_CAP_OPTIONS_CENTS,
  FAILURE_THRESHOLD_OPTIONS,
  MONTHLY_CAP_OPTIONS_CENTS,
  THRESHOLD_OPTIONS,
  aud,
  type AutoTopupConfig,
  type AutoTopupSku,
  type PaymentMethod,
} from './walletTypes';

/** Auto-topup config — `/portal/wallet/auto-topup` (parent-portal-prd §4.4.1). */
export function WalletAutoTopupPage() {
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cfg = useQuery<AutoTopupConfig>({
    queryKey: ['wallet', familyId, 'auto-topup'],
    queryFn: () => api<AutoTopupConfig>(`/families/${familyId}/wallet/auto-topup`),
    enabled: !!familyId,
  });

  const methods = useQuery<PaymentMethod[]>({
    queryKey: ['family', familyId, 'payment-methods'],
    queryFn: () => api<PaymentMethod[]>(`/families/${familyId}/payment-methods`),
    enabled: !!familyId,
  });

  // Local editable copy seeded from server config.
  const [form, setForm] = useState<AutoTopupConfig | null>(null);
  useEffect(() => {
    if (cfg.data && !form) setForm(cfg.data);
  }, [cfg.data, form]);

  const save = useMutation({
    mutationFn: (body: Partial<AutoTopupConfig>) =>
      api(`/families/${familyId}/wallet/auto-topup`, { method: 'PUT', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['wallet', familyId, 'auto-topup'] });
      setNotice('Saved.');
      setError(null);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not save.'),
  });

  const testCharge = useMutation({
    mutationFn: () => api(`/families/${familyId}/wallet/auto-topup/test`, { method: 'POST' }),
    onSuccess: () => {
      setNotice('Test charge sent (A$1, refunded). Check your card works.');
      setError(null);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Test charge failed.'),
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

  const f = form;
  const set = <K extends keyof AutoTopupConfig>(key: K, value: AutoTopupConfig[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div>
      <Link to="/portal/wallet" className="btn-pill-ghost mb-4 -ml-3">← Wallet</Link>
      <div className="mb-8">
        <div className="eyebrow eyebrow-mint">Wallet</div>
        <h1 className="section-heading">Auto-topup</h1>
        <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
          Keep your kids’ Stars topped up automatically so they’re never interrupted mid-mission.
        </p>
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

      {!f ? (
        <p className="lead-text">Loading…</p>
      ) : (
        <div className="space-y-6">
          {/* On/off */}
          <div className="card-base flex items-center justify-between">
            <div>
              <div className="text-[16px] font-bold text-ink">Auto-topup</div>
              <div className="text-[13px] text-slate2 mt-0.5">Off by default. Opt-in.</div>
            </div>
            <button
              onClick={() => set('auto_topup_enabled', !f.auto_topup_enabled)}
              className={`rounded-full px-5 py-2 text-[14px] font-bold transition-colors ${
                f.auto_topup_enabled ? 'bg-brand-mint text-white' : 'bg-surface text-ink-soft'
              }`}
              aria-pressed={f.auto_topup_enabled}
            >
              {f.auto_topup_enabled ? '● ON' : '○ OFF'}
            </button>
          </div>

          {/* Threshold */}
          <div className="card-base">
            <span className="label-k12">When balance falls below</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {THRESHOLD_OPTIONS.map((opt) => (
                <Pill
                  key={opt}
                  active={f.auto_topup_threshold_stars === opt}
                  onClick={() => set('auto_topup_threshold_stars', opt)}
                >
                  {opt}★
                </Pill>
              ))}
            </div>
          </div>

          {/* SKU */}
          <div className="card-base">
            <span className="label-k12">Top up by</span>
            <div className="mt-2 space-y-2">
              {AUTO_TOPUP_SKUS.map((s) => (
                <label
                  key={s.sku}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 px-4 py-3 transition-colors ${
                    f.auto_topup_sku === s.sku ? 'border-brand-mint bg-wash-mint' : 'border-hairline hover:border-brand-mint'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      className="sr-only"
                      checked={f.auto_topup_sku === s.sku}
                      onChange={() => set('auto_topup_sku', s.sku as AutoTopupSku)}
                    />
                    <span className="text-[14px] font-bold text-ink">{s.label}</span>
                    <span className="text-[13px] text-slate2">
                      A${s.price_aud} ({s.stars}★)
                    </span>
                  </span>
                  {s.sku === 'family_30' && <span className="sticker-mint text-[10px]">Best value</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          <PaymentMethodsCard familyId={familyId} methods={methods.data ?? []} onError={setError} onNotice={setNotice} />

          {/* Safety limits */}
          <div className="card-base">
            <div className="eyebrow eyebrow-sky mb-3">Safety limits</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <SelectField
                label="Max auto-topup per day"
                value={f.auto_topup_daily_cap_aud_cents}
                onChange={(v) => set('auto_topup_daily_cap_aud_cents', v)}
                options={DAILY_CAP_OPTIONS_CENTS.map((c) => ({ value: c, label: `${aud(c)}/day` }))}
              />
              <SelectField
                label="Max auto-topup per month"
                value={f.auto_topup_monthly_cap_aud_cents}
                onChange={(v) => set('auto_topup_monthly_cap_aud_cents', v)}
                options={MONTHLY_CAP_OPTIONS_CENTS.map((c) => ({ value: c, label: `${aud(c)}/month` }))}
              />
              <SelectField
                label="Pause after N failed charges"
                value={f.auto_topup_failure_threshold}
                onChange={(v) => set('auto_topup_failure_threshold', v)}
                options={FAILURE_THRESHOLD_OPTIONS.map((n) => ({ value: n, label: `${n}` }))}
              />
              <label className="flex items-center gap-3 self-end">
                <input
                  type="checkbox"
                  checked={f.email_on_charge ?? true}
                  onChange={(e) => set('email_on_charge', e.target.checked)}
                  className="h-5 w-5 accent-brand-mint"
                />
                <span className="text-[14px] font-semibold text-ink">Email me each time</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setNotice(null);
                save.mutate({
                  auto_topup_enabled: f.auto_topup_enabled,
                  auto_topup_threshold_stars: f.auto_topup_threshold_stars,
                  auto_topup_sku: f.auto_topup_sku,
                  auto_topup_payment_method_id: f.auto_topup_payment_method_id,
                  auto_topup_daily_cap_aud_cents: f.auto_topup_daily_cap_aud_cents,
                  auto_topup_monthly_cap_aud_cents: f.auto_topup_monthly_cap_aud_cents,
                  auto_topup_failure_threshold: f.auto_topup_failure_threshold,
                  email_on_charge: f.email_on_charge,
                });
              }}
              disabled={save.isPending}
              className="btn-pill-primary"
            >
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => testCharge.mutate()}
              disabled={testCharge.isPending || (methods.data?.length ?? 0) === 0}
              className="btn-pill-secondary"
            >
              {testCharge.isPending ? 'Testing…' : 'Run a test topup (A$1, refunded)'}
            </button>
          </div>

          {/* Recent attempts */}
          {f.recent_attempts && f.recent_attempts.length > 0 && (
            <div>
              <h2 className="section-heading mt-4 mb-3" style={{ fontSize: '20px' }}>Recent auto-topups</h2>
              <div className="card-base p-0 overflow-hidden">
                <ul className="divide-y divide-hairline">
                  {f.recent_attempts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={a.status === 'succeeded' ? 'text-brand-mint' : a.status === 'failed' ? 'text-brand-coral' : 'text-slate2'}>
                          {a.status === 'succeeded' ? '✓' : a.status === 'failed' ? '✕' : '·'}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-ink truncate">
                            {aud(a.amount_aud_cents)}
                            {a.stars_credited != null ? ` → ${a.stars_credited}★` : ''}
                            {a.reason ? ` · ${a.reason}` : ''}
                          </div>
                          <div className="text-[11px] text-slate2">{new Date(a.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                      <span className="text-[12px] text-slate2">{a.payment_method_label ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[13px] font-bold border-2 transition-colors ${
        active ? 'border-brand-mint bg-brand-mint text-white' : 'border-hairline bg-canvas-pure text-ink-soft hover:border-brand-mint'
      }`}
    >
      {children}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: Array<{ value: number; label: string }>;
}) {
  return (
    <label className="block">
      <span className="label-k12">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-k12 mt-1"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Saved cards + add-a-card via the Airwallex Components drop-in (§5.4 / MIT note
 * §5.10). The PAN never hits our servers: AddCardModal fetches a SetupIntent
 * client_secret, the Airwallex SDK mounts a hosted card iframe, tokenizes the
 * card, and the tokenized `payment_method_id` is persisted backend-side.
 */
function PaymentMethodsCard({
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
