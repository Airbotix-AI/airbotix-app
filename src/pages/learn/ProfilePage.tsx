import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

interface Project {
  id: string;
  status: string;
  star_cost_total: number;
}

/** Display form of a kid claim code: ABCDEFGHJ3 → ABCD-EFGH-J3. */
function formatKidCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}

// Walk-in kids' claim code (auth-system-prd §5.2): big, copyable, with
// kid-friendly instructions — a parent uses it later to add this kid to their
// family, keeping all workshop projects. Gone once claimed.
function KidCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card-base mb-10" style={{ maxWidth: '520px' }} data-testid="kid-code-card">
      <div className="eyebrow eyebrow-mint">My kid code</div>
      <div className="mt-3 font-mono font-extrabold text-ink" style={{ fontSize: '32px', letterSpacing: '0.15em' }} data-testid="kid-code">
        {formatKidCode(code)}
      </div>
      <p className="mt-3 text-[14px] text-slate2">
        Give this code to your parent! They can use it to add you to your family account — all your
        projects come with you. It never expires.
      </p>
      <button
        type="button"
        className="btn-pill-secondary mt-4"
        onClick={() => {
          void navigator.clipboard?.writeText(formatKidCode(code));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? 'Copied ✓' : 'Copy my code'}
      </button>
    </div>
  );
}

export function ProfilePage() {
  const me = useMe();
  const logout = useLogout();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : '—';
  const claimCode =
    me.data?.kind === 'kid' && me.data.is_ephemeral && me.data.claim_code
      ? me.data.claim_code
      : null;

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

      {claimCode && <KidCodeCard code={claimCode} />}

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
