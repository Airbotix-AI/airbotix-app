import { useMe } from '@/auth/useAuth';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export function DashboardPage() {
  const me = useMe();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Hello{me.data?.kind === 'user' && me.data.display_name ? `, ${me.data.display_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          5-second answer to "what's my kid doing and is everything OK?"
        </p>
      </div>
      <PagePlaceholder
        title="Dashboard"
        prdRef="parent-portal-prd.md §4.1"
        description="Today's stats: sessions, Stars, approvals; per-kid cards; recent family activity; quick actions."
      />
    </div>
  );
}
