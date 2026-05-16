import { useMe } from '@/auth/useAuth';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export function HomePage() {
  const me = useMe();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : 'friend';
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-charcoal">Hi {nickname}!</h1>
        <p className="mt-1 text-sm text-slate-600">Pick a mission or open a project to keep going.</p>
      </div>
      <PagePlaceholder
        title="Kid home"
        prdRef="airbotix-app-learn-prd.md §4"
        description="Mission carousel, current projects, class wall preview."
      />
    </div>
  );
}
