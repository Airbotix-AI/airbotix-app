import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { useWsEvent } from '@/lib/useWsEvent';
import { FamilyGuidesRecommendation } from './guides/FamilyGuidesRecommendation';
import { CreativeSpacesPanel } from './CreativeSpacesPanel';
import { NowEnrollingPanel } from './NowEnrollingPanel';
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

  useWsEvent('wallet.update', () => qc.invalidateQueries({ queryKey: ['wallet', familyId] }), [
    familyId,
  ]);
  useWsEvent('approval.new', () => qc.invalidateQueries({ queryKey: ['approvals', familyId] }), [
    familyId,
  ]);
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
        <h1 className="section-heading">Hello{displayName ? `, ${displayName}` : ''}.</h1>
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
          <div
            className="grid items-start gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]"
            data-testid="dashboard-grid"
          >
            <div className="min-w-0" data-testid="dashboard-primary">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="stat-tile coral !rounded-2xl !px-2 !py-5 sm:!rounded-3xl sm:!px-6 sm:!py-8">
                  <div className="stat-num !text-[36px] text-brand-coral tabular-nums sm:!text-[56px]">
                    {starsToday}
                  </div>
                  <div className="stat-label !text-[9px] !leading-tight sm:!text-[11px]">
                    Stars today{dailyCap > 0 ? ` / ${dailyCap}` : ''}
                  </div>
                </div>
                <div className="stat-tile mint !rounded-2xl !px-2 !py-5 sm:!rounded-3xl sm:!px-6 sm:!py-8">
                  <div className="stat-num !text-[36px] text-brand-mint tabular-nums sm:!text-[56px]">
                    {starsBalance ?? '—'}
                  </div>
                  <div className="stat-label !text-[9px] !leading-tight sm:!text-[11px]">
                    Stars balance
                  </div>
                </div>
                <Link
                  to="/portal/approvals"
                  className="stat-tile sky !rounded-2xl !px-2 !py-5 sm:!rounded-3xl sm:!px-6 sm:!py-8"
                >
                  <div className="stat-num !text-[36px] text-brand-sky tabular-nums sm:!text-[56px]">
                    {pendingCount}
                  </div>
                  <div className="stat-label !text-[9px] !leading-tight sm:!text-[11px]">
                    Approvals waiting
                  </div>
                </Link>
              </div>
            </div>

            <aside
              className="min-w-0 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start"
              aria-label="Getting started"
              data-testid="dashboard-side-rail"
            >
              <GettingStartedCard variant="sidebar" />
            </aside>

            <div className="min-w-0 lg:col-start-1 lg:row-start-2" data-testid="dashboard-actions">
              <div className="card-base mb-10">
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

              <NowEnrollingPanel />
            </div>

            <div
              className="min-w-0 lg:col-start-1 lg:row-start-3"
              data-testid="dashboard-discovery"
            >
              <CreativeSpacesPanel />
              <FamilyGuidesRecommendation familyId={familyId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
