import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

interface Project {
  id: string;
  status: string;
  star_cost_total: number;
}

export function ProfilePage() {
  const me = useMe();
  const logout = useLogout();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : '—';

  const projects = useQuery<Project[]>({
    queryKey: ['projects', 'kid', kidId, 'profile'],
    queryFn: () => api<Project[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });

  const total = projects.data?.length ?? 0;
  const completed = projects.data?.filter((p) => p.status === 'accepted').length ?? 0;
  const starsSpent = projects.data?.reduce((s, p) => s + (p.star_cost_total ?? 0), 0) ?? 0;

  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow eyebrow-bubblegum">Profile</div>
        <h1 className="hero-display">
          I'm <span className="squiggle-word">{nickname}</span>.
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-10">
        <div className="stat-tile coral">
          <div className="stat-num text-brand-coral">{total}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-tile mint">
          <div className="stat-num text-brand-mint">{completed}</div>
          <div className="stat-label">Finished</div>
        </div>
        <div className="stat-tile sunshine">
          <div className="stat-num" style={{ color: '#C99A00' }}>{starsSpent}</div>
          <div className="stat-label">Stars used</div>
        </div>
      </div>

      <div className="card-base" style={{ maxWidth: '520px' }}>
        <div className="eyebrow">Account</div>
        <div className="mt-4 space-y-3 text-[14px]">
          {me.data?.kind === 'kid' && (
            <>
              <Row label="Nickname" value={me.data.nickname} />
              <Row label="Family" value={me.data.family_id ?? 'Workshop session'} />
              {me.data.age !== undefined && me.data.age > 0 && (
                <Row label="Age" value={String(me.data.age)} />
              )}
            </>
          )}
        </div>
        <button onClick={() => logout('kid', false)} className="btn-pill-secondary mt-6">
          Sign out
        </button>
      </div>

      <p className="mt-8 text-[13px] text-slate2">
        Want to change your nickname or PIN?{' '}
        <Link to="/learn" className="text-brand-coral font-semibold hover:underline">
          Ask a parent →
        </Link>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate2 font-medium">{label}</span>
      <span className="font-semibold text-ink truncate">{value}</span>
    </div>
  );
}
