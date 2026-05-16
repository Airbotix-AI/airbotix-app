import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';

// Matches parent-portal-prd.md §2 nav drawer mockup.
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
    <nav className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:flex md:flex-col">
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Airbotix
        </div>
        <div className="text-sm font-semibold text-slate-900">Parent Portal</div>
      </div>

      <ul className="space-y-0.5">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'block rounded px-3 py-1.5 text-sm',
                  isActive
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-slate-700 hover:bg-slate-100',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t border-slate-200 pt-4">
        {me.data?.kind === 'user' && (
          <div className="mb-2 text-xs text-slate-600">
            <div className="font-medium text-slate-900">
              {me.data.display_name ?? me.data.email}
            </div>
            <div className="font-mono">{me.data.role}</div>
          </div>
        )}
        <button
          onClick={() => logout(false)}
          className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
