import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';

import { PORTAL_NAV_SECTIONS } from './portalNavigation';

const APPROVALS_ID = 'approvals';

export function PortalNavDrawer({ pendingCount }: { pendingCount: number }) {
  const me = useMe();
  const logout = useLogout();

  return (
    <nav
      aria-label="Parent Portal desktop"
      className="hidden w-56 shrink-0 border-r border-hairline bg-canvas-pure p-4 xl:flex xl:flex-col"
    >
      <div className="mb-5 flex items-center gap-2 px-2 pt-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-grad-coral shadow-brand-coral">
          <span className="text-[16px] font-extrabold text-white">A</span>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.10em] text-slate2">
            Airbotix
          </div>
          <div className="text-[15px] font-bold text-ink leading-tight">Parent Portal</div>
        </div>
      </div>

      <div className="min-h-0 space-y-4 overflow-y-auto">
        {PORTAL_NAV_SECTIONS.map((section) => (
          <div key={section.id}>
            {section.label && (
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate2">
                {section.label}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const showBadge = item.id === APPROVALS_ID && pendingCount > 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        clsx(
                          'nav-link flex items-center justify-between',
                          isActive && 'nav-link-active',
                        )
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
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
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-hairline px-2 pt-4">
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
        <button
          onClick={() => logout('user', false)}
          className="btn-pill-ghost w-full justify-start"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
