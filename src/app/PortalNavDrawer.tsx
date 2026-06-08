import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useLogout, useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { useWsEvent } from '@/lib/useWsEvent';
import { listFamilyShareLinks, type FamilyShareLink } from '@/pages/learn/playground/sharingApi';

// Matches parent-portal-prd.md §2 nav drawer.
const ITEMS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/portal', label: 'Dashboard', end: true },
  { to: '/portal/courses', label: 'Courses' },
  { to: '/portal/family', label: 'My Family' },
  { to: '/portal/wallet', label: 'Wallet' },
  { to: '/portal/usage', label: 'Usage' },
  { to: '/portal/approvals', label: 'Approvals' },
  { to: '/portal/audit', label: 'Activity' },
  { to: '/portal/billing', label: 'Billing' },
  { to: '/portal/settings', label: 'Settings' },
];

const APPROVALS_PATH = '/portal/approvals';

interface ApprovalLite {
  status: string;
}

export function PortalNavDrawer() {
  const me = useMe();
  const logout = useLogout();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  // Pending-approval badge (§2 / §4.5). Shares the ['approvals', familyId] cache
  // with ApprovalsPage, and live-updates via the same WS events.
  const approvals = useQuery<ApprovalLite[]>({
    queryKey: ['approvals', familyId],
    queryFn: () => api<ApprovalLite[]>(`/families/${familyId}/approvals`),
    enabled: !!familyId,
  });
  // Pending game share-link requests count toward the Approvals badge too (J8) —
  // only `pending` (active links aren't waiting on the parent).
  const shareLinks = useQuery<FamilyShareLink[]>({
    queryKey: ['share-requests', familyId],
    queryFn: () => listFamilyShareLinks(familyId!),
    enabled: !!familyId,
  });
  const pendingCount =
    (approvals.data?.filter((a) => a.status === 'pending').length ?? 0) +
    (shareLinks.data?.filter((s) => s.status === 'pending').length ?? 0);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['approvals', familyId] });
    qc.invalidateQueries({ queryKey: ['share-requests', familyId] });
  };
  useWsEvent('approval.new', invalidate, [familyId]);
  useWsEvent('approval.resolved', invalidate, [familyId]);

  return (
    <nav className="hidden w-72 shrink-0 border-r border-hairline bg-canvas-pure p-6 md:flex md:flex-col">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-grad-coral shadow-brand-coral">
          <span className="text-[18px] font-extrabold text-white">A</span>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.10em] text-slate2">
            Airbotix
          </div>
          <div className="text-[15px] font-bold text-ink leading-tight">Parent Portal</div>
        </div>
      </div>

      <ul className="space-y-1">
        {ITEMS.map((item) => {
          const showBadge = item.to === APPROVALS_PATH && pendingCount > 0;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx('nav-link flex items-center justify-between', isActive && 'nav-link-active')
                }
              >
                <span>{item.label}</span>
                {showBadge && (
                  <span
                    className="ml-2 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-brand-coral px-1.5 text-[11px] font-bold text-white"
                    aria-label={`${pendingCount} pending approvals`}
                  >
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-6 border-t border-hairline">
        {me.data?.kind === 'user' && (
          <div className="mb-3">
            <div className="text-[14px] font-semibold text-ink truncate">
              {me.data.display_name ?? me.data.email}
            </div>
            <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 mt-0.5">
              {me.data.role}
            </div>
          </div>
        )}
        <button onClick={() => logout(false)} className="btn-pill-ghost w-full justify-start">
          Sign out
        </button>
      </div>
    </nav>
  );
}
