import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { PaymentMethodsCard } from './PaymentMethodsCard';
import {
  AUTO_TOPUP_SKUS,
  DAILY_CAP_OPTIONS_CENTS,
  FAILURE_THRESHOLD_OPTIONS,
  MONTHLY_CAP_OPTIONS_CENTS,
  THRESHOLD_OPTIONS,
  aud,
  type AutoTopupConfig,
  type AutoTopupResponse,
  type AutoTopupSku,
  type PaymentMethod,
  type UpdateAutoTopupInput,
} from './walletTypes';

const DEFAULT_CONFIG: AutoTopupConfig = {
  enabled: false,
  threshold_stars: 500,
  sku: 'family_30',
  payment_method_id: null,
  daily_cap_aud_cents: 3000,
  monthly_cap_aud_cents: 10000,
  daily_used_aud_cents: 0,
  monthly_used_aud_cents: 0,
  failure_threshold: 3,
  consecutive_failures: 0,
  cooldown_minutes: 30,
  last_auto_topup_at: null,
};

/** Guided auto-topup setup for parents. */
export function WalletAutoTopupPage() {
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const [form, setForm] = useState<AutoTopupConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cfg = useQuery<AutoTopupResponse>({
    queryKey: ['wallet', familyId, 'auto-topup'],
    queryFn: () => api<AutoTopupResponse>(`/families/${familyId}/wallet/auto-topup`),
    enabled: !!familyId,
  });
  const methods = useQuery<PaymentMethod[]>({
    queryKey: ['family', familyId, 'payment-methods'],
    queryFn: () => api<PaymentMethod[]>(`/families/${familyId}/payment-methods`),
    enabled: !!familyId,
  });

  const f = form ?? cfg.data?.config ?? null;
  const initial = cfg.data?.config ?? null;
  const activeMethods = (methods.data ?? []).filter((method) => method.status === 'active');
  const selectedPack = AUTO_TOPUP_SKUS.find((pack) => pack.sku === f?.sku) ?? AUTO_TOPUP_SKUS[1];
  const isDirty = useMemo(() => Boolean(f && initial && JSON.stringify(f) !== JSON.stringify(initial)), [f, initial]);
  const canSave = Boolean(f && (!f.enabled || (f.sku && f.payment_method_id)));

  const save = useMutation({
    mutationFn: (body: UpdateAutoTopupInput) =>
      api<AutoTopupConfig>(`/families/${familyId}/wallet/auto-topup`, { method: 'PUT', body }),
    onSuccess: (saved) => {
      setForm(saved);
      qc.setQueryData<AutoTopupResponse>(['wallet', familyId, 'auto-topup'], (current) => ({
        config: saved,
        recent_attempts: current?.recent_attempts ?? [],
      }));
      setNotice('Auto-topup settings saved.');
      setError(null);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not save auto-topup.'),
  });
  const testCharge = useMutation({
    mutationFn: () => api(`/families/${familyId}/wallet/auto-topup/test`, { method: 'POST' }),
    onSuccess: () => {
      setNotice('Test charge sent. A$1 will be refunded.');
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

  const set = <K extends keyof AutoTopupConfig>(key: K, value: AutoTopupConfig[K]) => {
    setNotice(null);
    setForm((current) => ({ ...(current ?? cfg.data?.config ?? DEFAULT_CONFIG), [key]: value }));
  };

  if (cfg.isLoading || methods.isLoading) return <LoadingState />;
  if (cfg.isError) {
    return (
      <div className="card-base mx-auto max-w-xl text-center">
        <div className="text-[30px]" aria-hidden="true">↻</div>
        <h1 className="mt-3 text-xl font-bold text-ink">We couldn’t load auto-topup</h1>
        <p className="mt-2 text-[14px] text-slate2">Your wallet was not changed. Try loading the page again.</p>
        <button onClick={() => cfg.refetch()} className="btn-pill-primary mt-5">Try again</button>
      </div>
    );
  }
  if (!f) return null;

  const submit = () => {
    if (!canSave || !f.sku) {
      setError('Choose a saved card before switching auto-topup on.');
      return;
    }
    save.mutate({
      enabled: f.enabled,
      threshold_stars: f.threshold_stars,
      sku: f.sku,
      payment_method_id: f.payment_method_id,
      daily_cap_aud_cents: f.daily_cap_aud_cents,
      monthly_cap_aud_cents: f.monthly_cap_aud_cents,
      failure_threshold: f.failure_threshold,
    });
  };

  return (
    <div className="mx-auto max-w-6xl pb-28 lg:pb-8">
      <Link to="/portal/wallet" className="btn-pill-ghost mb-4 -ml-3">← Wallet</Link>

      <section className="overflow-hidden rounded-[28px] border border-brand-mint/25 bg-wash-mint px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="eyebrow eyebrow-mint">Wallet safety net</div>
            <h1 className="section-heading mt-2">Never run out mid-mission</h1>
            <p className="lead-text mt-3 text-[15px]">
              Set a low-balance trigger, choose a Stars pack and cap your spending. You stay in control of every automatic top-up.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={f.enabled}
            onClick={() => set('enabled', !f.enabled)}
            className={`flex min-h-14 min-w-[170px] items-center justify-between rounded-full px-5 text-[14px] font-bold shadow-sm transition-colors ${
              f.enabled ? 'bg-brand-mint text-white' : 'bg-white text-ink'
            }`}
          >
            <span>{f.enabled ? 'Auto-topup on' : 'Auto-topup off'}</span>
            <span className={`relative h-7 w-12 rounded-full ${f.enabled ? 'bg-white/30' : 'bg-surface'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${f.enabled ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
        </div>
      </section>

      {(error || notice) && (
        <div role="status" className={`mt-5 rounded-2xl border px-4 py-3 text-[13px] font-semibold ${
          error ? 'border-brand-coral/30 bg-wash-coral text-ink' : 'border-brand-mint/30 bg-wash-mint text-ink'
        }`}>
          {error ?? notice}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          <StepCard number="1" title="Choose your low-balance trigger" description="We check after Stars are used. No charge happens above this level.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THRESHOLD_OPTIONS.map((value) => (
                <ChoiceButton key={value} active={f.threshold_stars === value} onClick={() => set('threshold_stars', value)}>
                  <span className="block text-lg font-extrabold">{value}★</span>
                  <span className="mt-0.5 block text-[11px] font-medium opacity-75">about A${value / 50}</span>
                </ChoiceButton>
              ))}
            </div>
          </StepCard>

          <StepCard number="2" title="Pick the pack to add" description="The selected pack is purchased only when the balance crosses your trigger.">
            <div className="grid gap-3 sm:grid-cols-3">
              {AUTO_TOPUP_SKUS.map((pack) => (
                <ChoiceButton key={pack.sku} active={f.sku === pack.sku} onClick={() => set('sku', pack.sku as AutoTopupSku)}>
                  <span className="block text-[12px] font-bold uppercase tracking-wide opacity-70">{pack.label}</span>
                  <span className="mt-2 block text-xl font-extrabold">{pack.stars}★</span>
                  <span className="block text-[13px]">A${pack.price_aud}</span>
                  {pack.sku === 'family_30' && <span className="sticker-mint mt-2 inline-block text-[10px]">Best value</span>}
                </ChoiceButton>
              ))}
            </div>
          </StepCard>

          <PaymentMethodsCard
            familyId={familyId}
            methods={activeMethods}
            onError={setError}
            onNotice={setNotice}
            selectedPaymentMethodId={f.payment_method_id}
            onSelect={(id) => set('payment_method_id', id)}
          />

          <StepCard number="3" title="Set your safety limits" description="Charges stop automatically when either spending cap is reached.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Daily maximum" value={f.daily_cap_aud_cents} onChange={(v) => set('daily_cap_aud_cents', v)} options={DAILY_CAP_OPTIONS_CENTS} suffix="/day" />
              <SelectField label="Monthly maximum" value={f.monthly_cap_aud_cents} onChange={(v) => set('monthly_cap_aud_cents', v)} options={MONTHLY_CAP_OPTIONS_CENTS} suffix="/month" />
              <label className="block sm:col-span-2">
                <span className="label-k12">Pause after failed charges</span>
                <select value={f.failure_threshold} onChange={(e) => set('failure_threshold', Number(e.target.value))} className="input-k12 mt-1">
                  {FAILURE_THRESHOLD_OPTIONS.map((value) => <option key={value} value={value}>{value} consecutive {value === 1 ? 'failure' : 'failures'}</option>)}
                </select>
              </label>
            </div>
          </StepCard>

          {cfg.data && cfg.data.recent_attempts.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-extrabold text-ink">Recent auto-topups</h2>
              <ul className="card-base divide-y divide-hairline p-0">
                {cfg.data.recent_attempts.map((attempt) => (
                  <li key={attempt.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-[14px] font-bold text-ink">{aud(attempt.amount_aud_cents)}</span>
                      {attempt.stars_credited != null && <span className="ml-2 text-[13px] text-slate2">+{attempt.stars_credited}★</span>}
                      {attempt.reason && <p className="mt-0.5 text-[12px] text-slate2">{attempt.reason}</p>}
                    </div>
                    <div className="text-left sm:text-right">
                      <span className={`text-[12px] font-bold capitalize ${attempt.status === 'succeeded' ? 'text-brand-mint' : attempt.status === 'failed' ? 'text-brand-coral' : 'text-slate2'}`}>{attempt.status}</span>
                      <p className="text-[11px] text-slate2">{new Date(attempt.created_at).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="card-base top-6 lg:sticky">
          <div className="eyebrow eyebrow-sky">Setup summary</div>
          <h2 className="mt-2 text-xl font-extrabold text-ink">Your safety net</h2>
          <dl className="mt-5 space-y-4 text-[13px]">
            <SummaryRow label="Trigger" value={`Below ${f.threshold_stars}★`} />
            <SummaryRow label="Adds" value={`${selectedPack.stars}★ for A$${selectedPack.price_aud}`} />
            <SummaryRow label="Daily cap" value={aud(f.daily_cap_aud_cents)} />
            <SummaryRow label="Monthly cap" value={aud(f.monthly_cap_aud_cents)} />
          </dl>
          {!f.payment_method_id && f.enabled && <p className="mt-4 rounded-xl bg-wash-coral px-3 py-2 text-[12px] font-semibold text-ink">Choose a saved card to finish setup.</p>}
          <button onClick={submit} disabled={save.isPending || !isDirty || !canSave} className="btn-pill-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">
            {save.isPending ? 'Saving…' : isDirty ? 'Save auto-topup' : 'Settings saved'}
          </button>
          <button onClick={() => testCharge.mutate()} disabled={testCharge.isPending || isDirty || !f.enabled || !f.payment_method_id} className="btn-pill-secondary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50">
            {testCharge.isPending ? 'Testing…' : 'Test saved card (A$1)'}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate2">The test charge is refunded. Save changes first.</p>
        </aside>
      </div>
    </div>
  );
}

function StepCard({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="card-base">
      <div className="mb-5 flex gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-extrabold text-white">{number}</span>
        <div><h2 className="text-[17px] font-extrabold text-ink">{title}</h2><p className="mt-1 text-[13px] text-slate2">{description}</p></div>
      </div>
      {children}
    </section>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-20 rounded-2xl border-2 p-3 text-center transition-all ${active ? 'border-brand-mint bg-wash-mint text-ink shadow-sm' : 'border-hairline bg-white text-ink-soft hover:border-brand-mint'}`}>{children}</button>;
}

function SelectField({ label, value, onChange, options, suffix }: { label: string; value: number; onChange: (value: number) => void; options: readonly number[]; suffix: string }) {
  return <label className="block"><span className="label-k12">{label}</span><select value={value} onChange={(e) => onChange(Number(e.target.value))} className="input-k12 mt-1">{options.map((option) => <option key={option} value={option}>{aud(option)}{suffix}</option>)}</select></label>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3"><dt className="text-slate2">{label}</dt><dd className="font-bold text-ink">{value}</dd></div>;
}

function LoadingState() {
  return <div aria-label="Loading auto-topup" className="animate-pulse space-y-5"><div className="h-44 rounded-[28px] bg-surface" /><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><div className="h-96 rounded-3xl bg-surface" /><div className="h-72 rounded-3xl bg-surface" /></div></div>;
}
