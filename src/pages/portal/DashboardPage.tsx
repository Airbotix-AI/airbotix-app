import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { useWsEvent } from '@/lib/useWsEvent';
import { FamilyGuidesRecommendation } from './guides/FamilyGuidesRecommendation';
import { GettingStartedCard } from './onboarding/GettingStartedCard';
import { WelcomeWizard } from './onboarding/WelcomeWizard';
import { openWelcomeTour } from './onboarding/welcomeTour';

interface Wallet {
  stars_balance: number;
  daily_used: number;
  daily_cap: number;
}

interface Approval {
  id: string;
  status: 'pending' | 'granted' | 'denied' | 'expired';
}

export function DashboardPage() {
  const me = useMe();
  const user = me.data?.kind === 'user' ? me.data : null;
  const displayName = user?.display_name ?? null;
  const familyId = user?.family_id ?? null;
  const hasFamily = familyId !== null && familyId !== undefined;
  const qc = useQueryClient();

  useWsEvent(
    'wallet.update',
    () => qc.invalidateQueries({ queryKey: ['wallet', familyId] }),
    [familyId],
  );
  useWsEvent(
    'approval.new',
    () => qc.invalidateQueries({ queryKey: ['approvals', familyId] }),
    [familyId],
  );
  useWsEvent(
    'approval.resolved',
    () => qc.invalidateQueries({ queryKey: ['approvals', familyId] }),
    [familyId],
  );

  const wallet = useQuery<Wallet>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<Wallet>(`/families/${familyId}/wallet`),
    enabled: hasFamily,
  });
  const approvals = useQuery<Approval[]>({
    queryKey: ['approvals', familyId],
    queryFn: () => api<Approval[]>(`/families/${familyId}/approvals`),
    enabled: hasFamily,
  });

  const starsToday = wallet.data?.daily_used ?? 0;
  const dailyCap = wallet.data?.daily_cap ?? 0;
  const starsBalance = wallet.data?.stars_balance;
  const pendingCount = approvals.data?.filter((a) => a.status === 'pending').length ?? 0;

  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow">Today</div>
        <h1 className="section-heading">
          Hello{displayName ? `, ${displayName}` : ''}.
        </h1>
        <p className="lead-text mt-3">
          5-second answer to "what's my kid doing and is everything OK?"
        </p>
        {hasFamily && (
          <button onClick={openWelcomeTour} className="btn-pill-ghost mt-4">
            <span aria-hidden="true">✨ </span>How it works
          </button>
        )}
      </div>

      {!hasFamily ? (
        <div className="card-base">
          <div className="mb-2">
            <span className="sticker-mint">Get started</span>
          </div>
          <h2 className="section-heading mt-6" style={{ fontSize: '32px' }}>
            Set up your family
          </h2>
          <p className="lead-text mt-3">
            Add your first kid, get a family code, and you're ready to log them in on any device.
          </p>
          <Link to="/portal/register" className="btn-pill-primary mt-6">
            Start setup →
          </Link>
        </div>
      ) : (
        <>
          <WelcomeWizard />
          <GettingStartedCard />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-10">
            <div className="stat-tile coral">
              <div className="stat-num text-brand-coral tabular-nums">{starsToday}</div>
              <div className="stat-label">
                Stars today{dailyCap > 0 ? ` / ${dailyCap}` : ''}
              </div>
            </div>
            <div className="stat-tile mint">
              <div className="stat-num text-brand-mint tabular-nums">
                {starsBalance ?? '—'}
              </div>
              <div className="stat-label">Stars balance</div>
            </div>
            <Link to="/portal/approvals" className="stat-tile sky">
              <div className="stat-num text-brand-sky tabular-nums">{pendingCount}</div>
              <div className="stat-label">Approvals waiting</div>
            </Link>
          </div>

          <div className="card-base">
            <div className="eyebrow eyebrow-sky">Quick actions</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/portal/wallet/topup" className="btn-pill-primary">
                Top up Stars
              </Link>
              <Link to="/portal/family" className="btn-pill-secondary">
                Manage kids
              </Link>
              <Link to="/portal/audit" className="btn-pill-secondary">
                View activity
              </Link>
            </div>
          </div>

          <FamilyGuidesRecommendation familyId={familyId} />
        </>
      )}
    </div>
  );
}
