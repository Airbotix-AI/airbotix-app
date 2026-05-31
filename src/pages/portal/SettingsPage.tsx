import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useLogout, useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

interface FamilyData {
  id: string;
  name: string;
  code: string;
  region: string;
  city: string | null;
  primary_email: string;
}

const schema = z.object({
  name: z.string().min(1).max(120),
  region: z.string().length(2),
  city: z.string().max(80),
});
type FormValues = z.infer<typeof schema>;

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
      ? { name: family.data.name, region: family.data.region, city: family.data.city ?? '' }
      : undefined,
  });

  const saveMut = useMutation({
    mutationFn: (v: FormValues) => {
      const city = v.city.trim();
      return api(`/families/${familyId}`, {
        method: 'PATCH',
        body: { name: v.name, region: v.region, city: city === '' ? null : city },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', familyId] }),
    onError: (e: unknown) =>
      setSaveError(e instanceof ApiError ? e.message : 'Could not save.'),
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
      await logout(true);
      nav('/portal/login', { replace: true });
    },
  });

  if (!me.data) return <p className="lead-text">Loading…</p>;

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-sky">Settings</div>
        <h1 className="section-heading">Account & family</h1>
      </div>

      <section className="card-base mb-8" style={{ maxWidth: '560px' }}>
        <div className="eyebrow eyebrow-mint">You</div>
        <div className="mt-4 space-y-3 text-[14px]">
          {me.data.kind === 'user' && (
            <>
              <Row label="Email" value={me.data.email} />
              <Row label="Display name" value={me.data.display_name ?? '—'} />
              <Row label="Role" value={me.data.role} />
            </>
          )}
        </div>
        <button onClick={() => logout(true)} className="btn-pill-secondary mt-6">
          Sign out everywhere
        </button>
      </section>

      {familyId && (
        <>
          <form
            onSubmit={form.handleSubmit((v) => saveMut.mutate(v))}
            className="card-base mb-8 space-y-5"
            style={{ maxWidth: '560px' }}
          >
            <div className="eyebrow">Family</div>

            {family.data && (
              <div className="mb-2 flex items-center justify-between gap-4 rounded-2xl bg-wash-mint p-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">
                    Family code
                  </div>
                  <div className="font-mono font-extrabold tabular-nums text-ink" style={{ fontSize: '28px', letterSpacing: '0.2em' }}>
                    {family.data.code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(family.data!.code)}
                  className="btn-pill-secondary"
                >
                  Copy
                </button>
              </div>
            )}

            <label className="block">
              <span className="label-k12">Family name</span>
              <input className="input-k12" {...form.register('name')} />
              {form.formState.errors.name && (
                <span className="field-error">{form.formState.errors.name.message}</span>
              )}
            </label>
            <label className="block">
              <span className="label-k12">Region (2-letter)</span>
              <input className="input-k12 font-mono uppercase" maxLength={2} {...form.register('region')} />
            </label>
            <label className="block">
              <span className="label-k12">City (optional)</span>
              <input className="input-k12" placeholder="Sydney" {...form.register('city')} />
              {form.formState.errors.city && (
                <span className="field-error">{form.formState.errors.city.message}</span>
              )}
            </label>

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

            <button type="submit" disabled={saveMut.isPending} className="btn-pill-primary">
              {saveMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <section className="card-base mb-8" style={{ maxWidth: '560px' }}>
            <div className="eyebrow eyebrow-sky">Data export</div>
            <h3 className="text-[18px] font-bold text-ink mt-1">Download everything</h3>
            <p className="text-[13px] text-slate2 mt-2">
              All family data: parents, kids, wallet, transactions, projects, audit events.
              Downloads as JSON to your device.
            </p>
            <button
              onClick={() => exportMut.mutate()}
              disabled={exportMut.isPending}
              className="btn-pill-primary mt-4"
            >
              {exportMut.isPending ? 'Preparing…' : 'Download my family data'}
            </button>
            {exportData && (
              <>
                <p className="text-[12px] text-slate2 mt-3">
                  Downloaded {Math.round(exportData.length / 1024)} KB. Check your downloads folder.
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

          <section className="card-base" style={{ maxWidth: '560px' }}>
            <div className="eyebrow">Danger zone</div>
            <h3 className="text-[18px] font-bold text-ink mt-1">Delete this family</h3>
            <p className="text-[13px] text-slate2 mt-2">
              Soft-deletes everything. 30-day grace period before hard delete. Sign out everywhere immediately.
            </p>
            <button
              onClick={() => {
                if (confirm(`Delete ${family.data?.name ?? 'this family'}? Cannot be undone after 30 days.`))
                  deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
              className="mt-4 inline-flex items-center justify-center rounded-full border-2 border-danger-600 px-6 py-2.5 text-[13px] font-semibold text-danger-600 hover:bg-danger-600 hover:text-white transition-colors disabled:opacity-50"
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete family'}
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate2 font-medium">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
