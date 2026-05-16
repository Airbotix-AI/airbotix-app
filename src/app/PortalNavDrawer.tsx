import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';

// Matches parent-portal-prd.md §2 nav drawer.
const ITEMS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/portal', label: 'Dashboard', end: true },
  { to: '/portal/family', label: 'My Family' },
  { to: '/portal/wallet', label: 'Wallet' },
  { to: '/portal/approvals', label: 'Approvals' },
  { to: '/portal/audit', label: 'Activity' },
  { to: '/portal/billing', label: 'Billing' },
  { to: '/portal/settings', label: 'Settings' },
];

export function PortalNavDrawer() {
  const me = useMe();
  const logout = useLogout();

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
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx('nav-link', isActive && 'nav-link-active')}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
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
