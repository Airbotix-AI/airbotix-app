import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { setPassword, useLogout, useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { clearOnboardingFlag } from '@/lib/onboardingStorage';
import { CityField } from './CityField';

import {
  AU_STATES,
  PREFERRED_LANGUAGES,
  PREFERRED_LANGUAGE_LABELS,
  type AuState,
  type PreferredLanguage,
} from './familyProfile';

interface FamilyData {
  id: string;
  name: string;
  code: string;
  region: string;
  city: string | null;
  state: AuState | null;
  postcode: string | null;
  school_name: string | null;
  preferred_language: PreferredLanguage | null;
  marketing_opt_in: boolean | null;
  phone: string | null;
  parent_occupation: string | null;
  parent_industry: string | null;
  primary_email: string;
}

const schema = z.object({
  name: z.string().min(1).max(120),
  region: z.string().length(2),
  city: z.string().max(80),
  state: z.enum(AU_STATES).or(z.literal('')),
  postcode: z.string().max(8),
  school_name: z.string().max(120),
  preferred_language: z.enum(PREFERRED_LANGUAGES),
  marketing_opt_in: z.boolean(),
  phone: z.string().max(40),
  parent_occupation: z.string().max(120),
  parent_industry: z.string().max(120),
});
type FormValues = z.infer<typeof schema>;

/** Trim a free-text field; empty string becomes null for the PATCH body. */
function nullable(v: string): string | null {
  const t = v.trim();
  return t === '' ? null : t;
}

export function SettingsPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const logout = useLogout();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<string | null>(null);

  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const family = useQuery<FamilyData>({
    queryKey: ['family', familyId],
    queryFn: () => api<FamilyData>(`/families/${familyId}`),
    enabled: !!familyId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: family.data
      ? {
          name: family.data.name,
          region: family.data.region,
          city: family.data.city ?? '',
          state: family.data.state ?? '',
          postcode: family.data.postcode ?? '',
          school_name: family.data.school_name ?? '',
          preferred_language: family.data.preferred_language ?? 'en',
          marketing_opt_in: family.data.marketing_opt_in ?? false,
          phone: family.data.phone ?? '',
          parent_occupation: family.data.parent_occupation ?? '',
          parent_industry: family.data.parent_industry ?? '',
        }
      : undefined,
  });

  const saveMut = useMutation({
    mutationFn: (v: FormValues) =>
      api(`/families/${familyId}`, {
        method: 'PATCH',
        body: {
          name: v.name,
          region: v.region,
          city: nullable(v.city),
          state: v.state === '' ? null : v.state,
          postcode: nullable(v.postcode),
          school_name: nullable(v.school_name),
          preferred_language: v.preferred_language,
          marketing_opt_in: v.marketing_opt_in,
          phone: nullable(v.phone),
          parent_occupation: nullable(v.parent_occupation),
          parent_industry: nullable(v.parent_industry),
        },
      }),
    onSuccess: () => {
      setSaveError(null);
      qc.invalidateQueries({ queryKey: ['family', familyId] });
    },
    onError: (e: unknown) => setSaveError(e instanceof ApiError ? e.message : 'Could not save.'),
  });

  const exportMut = useMutation({
    mutationFn: () => api<unknown>(`/families/${familyId}/export`),
    onSuccess: (data) => {
      const pretty = JSON.stringify(data, null, 2);
      setExportData(pretty);
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([pretty], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `airbotix-family-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api(`/families/${familyId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await logout('user', true);
      nav('/portal/login', { replace: true });
    },
  });

  if (!me.data) return <p className="lead-text">Loading…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow eyebrow-sky">Settings</div>
          <h1 className="section-heading">Account & family</h1>
        </div>
        {family.data && (
          <span className="sticker-mint hidden sm:inline-block">{family.data.region}</span>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {familyId ? (
            <form
              onSubmit={form.handleSubmit((v) => saveMut.mutate(v))}
              className="card-base space-y-7"
            >
              <div className="border-b border-hairline pb-6">
                <div className="eyebrow">Family</div>
                <h2 className="text-[24px] font-bold leading-tight text-ink">Family profile</h2>
                {family.isLoading && (
                  <p className="mt-2 text-[13px] font-medium text-slate2">
                    Loading family details…
                  </p>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.10em] text-slate2">
                    Basics
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
                    <label className="block">
                      <span className="label-k12">Family name</span>
                      <input className="input-k12" {...form.register('name')} />
                      {form.formState.errors.name && (
                        <span className="field-error">{form.formState.errors.name.message}</span>
                      )}
                    </label>
                    <label className="block">
                      <span className="label-k12">Region</span>
                      <input
                        className="input-k12 font-mono uppercase"
                        maxLength={2}
                        {...form.register('region')}
                      />
                      {form.formState.errors.region && (
                        <span className="field-error">{form.formState.errors.region.message}</span>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.10em] text-slate2">
                    Location
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="label-k12">City (optional)</span>
                      <Controller
                        name="city"
                        control={form.control}
                        render={({ field }) => (
                          <CityField value={field.value ?? ''} onChange={field.onChange} />
                        )}
                      />
                      {form.formState.errors.city && (
                        <span className="field-error">{form.formState.errors.city.message}</span>
                      )}
                    </label>
                    <div className="grid gap-4 min-[420px]:grid-cols-2">
                      <label className="block min-w-0">
                        <span className="label-k12">State</span>
                        <select className="input-k12" {...form.register('state')}>
                          <option value="">Choose…</option>
                          {AU_STATES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block min-w-0">
                        <span className="label-k12">Postcode</span>
                        <input
                          className="input-k12"
                          inputMode="numeric"
                          placeholder="2000"
                          {...form.register('postcode')}
                        />
                      </label>
                    </div>
                    <label className="block sm:col-span-2">
                      <span className="label-k12">School name (optional)</span>
                      <input
                        className="input-k12"
                        placeholder="Sunnydale Public School"
                        {...form.register('school_name')}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.10em] text-slate2">
                    Preferences
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="label-k12">Preferred language</span>
                      <select className="input-k12" {...form.register('preferred_language')}>
                        {PREFERRED_LANGUAGES.map((lng) => (
                          <option key={lng} value={lng}>
                            {PREFERRED_LANGUAGE_LABELS[lng]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-h-[58px] items-start gap-3 rounded-2xl border-2 border-hairline bg-surface px-4 py-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0 accent-brand-coral"
                        {...form.register('marketing_opt_in')}
                      />
                      <span className="text-[13px] font-medium leading-snug text-ink-soft">
                        Send me tips &amp; updates about Airbotix. No spam — promise.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <details className="rounded-2xl bg-wash-sky px-4 py-3">
                <summary className="label-k12 cursor-pointer select-none">
                  About your family (optional)
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="label-k12">Phone (optional)</span>
                    <input
                      className="input-k12"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0400 000 000"
                      {...form.register('phone')}
                    />
                  </label>
                  <label className="block">
                    <span className="label-k12">Your occupation (optional)</span>
                    <input
                      className="input-k12"
                      placeholder="Teacher"
                      {...form.register('parent_occupation')}
                    />
                  </label>
                  <label className="block">
                    <span className="label-k12">Your industry (optional)</span>
                    <input
                      className="input-k12"
                      placeholder="Education"
                      {...form.register('parent_industry')}
                    />
                  </label>
                </div>
              </details>

              {saveError && (
                <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
                  {saveError}
                </div>
              )}
              {saveMut.isSuccess && (
                <div className="rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 text-[13px] font-medium text-ink">
                  Saved ✓
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] font-medium text-slate2">
                  Changes apply to the parent portal and kid sign-in profile.
                </p>
                <button type="submit" disabled={saveMut.isPending} className="btn-pill-primary">
                  {saveMut.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <section className="card-base">
              <div className="eyebrow">Family</div>
              <h2 className="text-[24px] font-bold leading-tight text-ink">No family linked</h2>
              <p className="mt-2 text-[14px] font-medium text-slate2">
                Complete family setup before editing portal settings.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="card-base">
            <div className="eyebrow eyebrow-mint">You</div>
            <div className="space-y-4 text-[14px]">
              {me.data.kind === 'user' && (
                <>
                  <Row label="Email" value={me.data.email} />
                  <DisplayNameEditor current={me.data.display_name} />
                  <Row label="Role" value={me.data.role} />
                  <PasswordEditor hasPassword={me.data.has_password ?? false} />
                </>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              {me.data.kind === 'user' && (
                <button
                  onClick={() => {
                    clearOnboardingFlag(me.data.sub, 'welcomeSeen');
                    nav('/portal');
                  }}
                  className="btn-pill-secondary w-full gap-2 px-5"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Replay intro
                </button>
              )}
              <button onClick={() => logout('user', true)} className="btn-pill-ghost w-full gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out everywhere
              </button>
            </div>
          </section>

          {family.data && (
            <section className="overflow-hidden rounded-2xl bg-wash-mint shadow-card-soft">
              <div className="p-6">
                <div className="eyebrow eyebrow-mint">Family code</div>
                <div className="font-mono text-[38px] font-extrabold leading-none text-ink [letter-spacing:0.18em]">
                  {family.data.code}
                </div>
                <p className="mt-3 text-[13px] font-medium leading-relaxed text-slate2">
                  Kids use this with their nickname and PIN.
                </p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(family.data!.code)}
                  className="btn-pill-secondary mt-5 w-full gap-2 px-5"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy
                </button>
              </div>
            </section>
          )}

          {familyId && (
            <section className="card-base">
              <div className="eyebrow eyebrow-sky">Data export</div>
              <h3 className="text-[18px] font-bold text-ink mt-1">Download everything</h3>
              <p className="text-[13px] text-slate2 mt-2">
                All family data: parents, kids, wallet, transactions, projects, audit events.
                Downloads as JSON to your device.
              </p>
              <button
                onClick={() => exportMut.mutate()}
                disabled={exportMut.isPending}
                className="btn-pill-primary mt-4 w-full gap-2 px-5"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {exportMut.isPending ? 'Preparing…' : 'Download my family data'}
              </button>
              {exportMut.error && (
                <p className="field-error mt-3">
                  {exportMut.error instanceof ApiError ? exportMut.error.message : 'Export failed.'}
                </p>
              )}
              {exportData && (
                <>
                  <p className="text-[12px] text-slate2 mt-3">
                    Downloaded {Math.round(exportData.length / 1024)} KB. Check your downloads
                    folder.
                  </p>
                  <details className="mt-3">
                    <summary className="text-[13px] font-semibold text-brand-coral cursor-pointer">
                      Preview here
                    </summary>
                    <pre className="text-[11px] text-ink-soft mt-3 bg-surface-soft p-4 rounded-xl overflow-auto max-h-96 font-mono">
                      {exportData}
                    </pre>
                  </details>
                </>
              )}
            </section>
          )}

          {familyId && (
            <section className="rounded-2xl border-2 border-danger-600/20 bg-canvas-pure p-6 shadow-card-soft">
              <div className="eyebrow">Danger zone</div>
              <h3 className="text-[18px] font-bold text-ink mt-1">Delete this family</h3>
              <p className="text-[13px] text-slate2 mt-2">
                Soft-deletes everything. 30-day grace period before hard delete. Sign out everywhere
                immediately.
              </p>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Delete ${family.data?.name ?? 'this family'}? Cannot be undone after 30 days.`,
                    )
                  )
                    deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-danger-600 px-6 py-2.5 text-[13px] font-semibold text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {deleteMut.isPending ? 'Deleting…' : 'Delete family'}
              </button>
              {deleteMut.error && (
                <p className="field-error mt-3">
                  {deleteMut.error instanceof ApiError ? deleteMut.error.message : 'Delete failed.'}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
      <span className="text-slate2 font-medium">{label}</span>
      <span className="min-w-0 break-words font-semibold text-ink">{value}</span>
    </div>
  );
}

/**
 * Set or change the parent's optional login password (auth-system-prd §4.8).
 * OTP stays available, so this is purely a convenience — a forgotten password is
 * recovered by signing in with a code, not a reset flow. `hasPassword` toggles the
 * copy between "Set" and "Change"; on success we invalidate /auth/me so the flag
 * flips without a reload.
 */
function PasswordEditor({ hasPassword }: { hasPassword: boolean }) {
  const qc = useQueryClient();
  const [value, setValue] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: (password: string) => setPassword(password),
    onSuccess: () => {
      setErr(null);
      setValue('');
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (e: unknown) => setErr(e instanceof ApiError ? e.message : 'Could not save password.'),
  });

  const tooShort = value.length > 0 && value.length < 8;
  const canSave = value.length >= 8 && !mut.isPending;

  return (
    <div className="border-b border-hairline pb-4 last:border-b-0 last:pb-0">
      <div className="space-y-2">
        <span className="text-slate2 font-medium">Password</span>
        <p className="text-[12px] font-medium leading-snug text-slate2">
          {hasPassword
            ? 'Log in faster with your email + password. You can still use a code anytime.'
            : 'Optional — set a password to log in without waiting for a code each time.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input-k12 min-w-0 py-2 text-[14px]"
            type="password"
            autoComplete="new-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hasPassword ? 'New password' : 'At least 8 characters'}
            maxLength={200}
          />
          <button
            type="button"
            disabled={!canSave}
            onClick={() => mut.mutate(value)}
            className="btn-pill-secondary px-5 py-2 text-[13px]"
          >
            {mut.isPending ? 'Saving…' : hasPassword ? 'Change' : 'Set password'}
          </button>
        </div>
      </div>
      {tooShort && <p className="field-error mt-1">At least 8 characters.</p>}
      {err && <p className="field-error mt-1 text-right">{err}</p>}
      {mut.isSuccess && !err && (
        <p className="text-[12px] font-semibold text-brand-mint mt-1 text-right">
          Password saved ✓
        </p>
      )}
    </div>
  );
}

/** Inline editor for the parent's own display_name via PATCH /auth/me. */
function DisplayNameEditor({ current }: { current: string | null }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(current ?? '');
  const [err, setErr] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: (display_name: string) =>
      api('/auth/me', { method: 'PATCH', body: { display_name } }),
    onSuccess: () => {
      setErr(null);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (e: unknown) => setErr(e instanceof ApiError ? e.message : 'Could not save.'),
  });

  const trimmed = value.trim();
  const dirty = trimmed !== (current ?? '') && trimmed.length > 0;

  return (
    <div className="border-b border-hairline pb-4">
      <div className="space-y-2">
        <span className="text-slate2 font-medium">Display name</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input-k12 min-w-0 py-2 text-[14px]"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your name"
            maxLength={120}
          />
          <button
            type="button"
            disabled={!dirty || mut.isPending}
            onClick={() => mut.mutate(trimmed)}
            className="btn-pill-secondary px-5 py-2 text-[13px]"
          >
            {mut.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {err && <p className="field-error mt-1 text-right">{err}</p>}
      {mut.isSuccess && !dirty && !err && (
        <p className="text-[12px] font-semibold text-brand-mint mt-1 text-right">Saved ✓</p>
      )}
    </div>
  );
}
