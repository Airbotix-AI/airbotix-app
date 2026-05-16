import { useLogout, useMe } from '@/auth/useAuth';

export function SettingsPage() {
  const me = useMe();
  const logout = useLogout();
  const principal = me.data?.kind === 'user' ? me.data : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mb-6 text-sm text-slate-600">
        Full settings UI per parent-portal-prd.md §4.7 — notifications, data export, account delete
        — coming next.
      </p>
      <dl className="space-y-2 rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <Row label="Email" value={principal?.email ?? '—'} />
        <Row label="Display name" value={principal?.display_name ?? '—'} />
        <Row label="Family ID" value={principal?.family_id ?? '—'} mono />
        <Row label="Role" value={principal?.role ?? '—'} />
      </dl>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => logout(false)}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
        <button
          onClick={() => logout(true)}
          className="rounded border border-danger-500 bg-white px-4 py-2 text-sm text-danger-600 hover:bg-danger-500/5"
        >
          Sign out everywhere
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? 'font-mono text-slate-900' : 'text-slate-900'}>{value}</dd>
    </div>
  );
}
