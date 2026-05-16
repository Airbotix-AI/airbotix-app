import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';

export function DashboardPage() {
  const me = useMe();
  const user = me.data?.kind === 'user' ? me.data : null;
  const displayName = user?.display_name ?? null;
  const hasFamily = user?.family_id !== null && user?.family_id !== undefined;

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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-10">
            <div className="stat-tile coral">
              <div className="stat-num text-brand-coral">0</div>
              <div className="stat-label">Sessions today</div>
            </div>
            <div className="stat-tile mint">
              <div className="stat-num text-brand-mint">—</div>
              <div className="stat-label">Stars balance</div>
            </div>
            <div className="stat-tile sky">
              <div className="stat-num text-brand-sky">0</div>
              <div className="stat-label">Approvals waiting</div>
            </div>
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
        </>
      )}
    </div>
  );
}
