import { useLogout, useMe } from '@/auth/useAuth';

export function ProfilePage() {
  const me = useMe();
  const logout = useLogout();
  const principal = me.data?.kind === 'kid' ? me.data : null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold text-charcoal">Me</h1>
      <dl className="space-y-2 rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <Row label="Nickname" value={principal?.nickname ?? '—'} />
        <Row label="Age" value={String(principal?.age ?? '—')} />
        <Row label="Profile ID" value={principal?.sub ?? '—'} mono />
        {principal?.class_id && <Row label="Class" value={principal.class_id} mono />}
      </dl>
      <button
        onClick={() => logout(false)}
        className="mt-6 w-full rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? 'font-mono text-charcoal' : 'text-charcoal'}>{value}</dd>
    </div>
  );
}
