import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { KidGrowthTeaser } from './KidGrowthTeaser';

interface Kid {
  id: string;
  nickname: string;
  age: number;
  pin_hash: string | null;
  is_active: boolean;
  daily_star_cap: number | null;
  created_at: string;
  deleted_at: string | null;
}

interface FamilyData {
  id: string;
  name: string;
  code: string;
  region: string;
  primary_email: string;
}

export function FamilyListPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const family = useQuery<FamilyData>({
    queryKey: ['family', familyId],
    queryFn: () => api<FamilyData>(`/families/${familyId}`),
    enabled: !!familyId,
  });

  const kids = useQuery<Kid[]>({
    queryKey: ['family', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">My family</div>
        <h1 className="section-heading">No family yet</h1>
        <p className="lead-text mt-3">Set up your family first.</p>
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-sky">My family</div>
          <h1 className="section-heading">{family.data?.name ?? 'Loading…'}</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            {kids.data?.length ?? 0} kid{(kids.data?.length ?? 0) === 1 ? '' : 's'} ·{' '}
            {family.data?.region ?? '—'}
          </p>
        </div>
        <Link to="/portal/family/new" className="btn-pill-primary">+ Add kid</Link>
      </div>

      {kids.isLoading ? (
        <div className="lead-text">Loading kids…</div>
      ) : kids.data && kids.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {kids.data.map((kid, i) => {
            const palette = ['coral', 'bubblegum', 'sunshine', 'sky', 'mint'] as const;
            const color = palette[i % palette.length];
            return (
              <Link
                key={kid.id}
                to={`/portal/family/${kid.id}`}
                className={`stat-tile ${color} block text-left transition-transform hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[28px] font-bold text-ink leading-tight">{kid.nickname}</div>
                    <div className="text-[13px] text-slate2 mt-1">Age {kid.age}</div>
                  </div>
                  <span className={`sticker-${color}`}>{kid.is_active ? 'Active' : 'Paused'}</span>
                </div>

                <KidGrowthTeaser kidId={kid.id} name={kid.nickname} />

                <div className="mt-5 text-[13px] font-semibold text-brand-coral">See growth →</div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card-base text-center">
          <div className="mb-3">
            <span className="sticker-mint">Empty</span>
          </div>
          <h2 className="section-heading mt-4" style={{ fontSize: '24px' }}>
            No kids yet
          </h2>
          <p className="lead-text mt-2">Add your first kid to get them signed in.</p>
          <Link to="/portal/family/new" className="btn-pill-primary mt-6">+ Add kid</Link>
        </div>
      )}

      {family.data && (
        <div className="card-base mt-8 flex items-center justify-between gap-6">
          <div>
            <div className="eyebrow eyebrow-mint">Family code</div>
            <div
              className="font-mono font-extrabold text-ink mt-1"
              style={{ fontSize: '40px', letterSpacing: '0.2em' }}
            >
              {family.data.code}
            </div>
            <p className="text-[13px] text-slate2 mt-2">
              Kids type this code, their nickname, and PIN to sign in.
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(family.data!.code)}
            className="btn-pill-secondary"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
