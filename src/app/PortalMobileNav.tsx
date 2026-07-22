import clsx from 'clsx';
import { MoreHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { matchPath, NavLink, useLocation } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';

import {
  PORTAL_MOBILE_MORE_ITEMS,
  PORTAL_MOBILE_PRIMARY_ITEMS,
  type PortalNavItem,
} from './portalNavigation';

const APPROVALS_ID = 'approvals';

interface MobileNavLinkProps {
  item: PortalNavItem;
  pendingCount: number;
  onNavigate?: () => void;
  variant: 'tab' | 'sheet';
}

function MobileNavLink({ item, pendingCount, onNavigate, variant }: MobileNavLinkProps) {
  const Icon = item.icon;
  const showBadge = item.id === APPROVALS_ID && pendingCount > 0;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'relative flex min-h-11 items-center rounded-2xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral',
          variant === 'tab'
            ? 'min-w-0 flex-1 flex-col justify-center gap-1 px-1 text-[11px]'
            : 'justify-start gap-3 px-4 py-3 text-[15px]',
          isActive ? 'bg-wash-coral text-ink' : 'text-slate2 hover:bg-canvas hover:text-ink',
        )
      }
    >
      <Icon aria-hidden="true" className={variant === 'tab' ? 'h-5 w-5' : 'h-5 w-5'} />
      <span className={variant === 'tab' ? 'truncate' : undefined}>
        {variant === 'tab' ? (item.mobileLabel ?? item.label) : item.label}
      </span>
      {showBadge && (
        <span
          className={clsx(
            'inline-flex min-w-5 items-center justify-center rounded-full bg-brand-coral px-1.5 text-[11px] font-bold text-white',
            variant === 'tab' ? 'absolute right-[18%] top-1 h-5' : 'ml-auto h-5',
          )}
          aria-label={`${pendingCount} pending approvals`}
        >
          {pendingCount}
        </span>
      )}
    </NavLink>
  );
}

interface PortalMobileNavProps {
  pendingCount: number;
}

export function PortalMobileNav({ pendingCount }: PortalMobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const me = useMe();
  const logout = useLogout();
  const moreRouteActive = PORTAL_MOBILE_MORE_ITEMS.some((item) =>
    matchPath({ path: item.to, end: item.end ?? false }, location.pathname),
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close more navigation"
            className="fixed inset-0 z-40 bg-ink/30 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <section
            id="portal-more-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="More Parent Portal navigation"
            className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 max-h-[70dvh] overflow-y-auto rounded-t-[28px] border border-hairline bg-canvas-pure px-4 pb-5 pt-3 shadow-card-soft md:hidden"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate2">
                  Airbotix
                </p>
                <h2 className="text-lg font-bold text-ink">Parent Portal</h2>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate2 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
                aria-label="Close more menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {PORTAL_MOBILE_MORE_ITEMS.map((item) => (
                <MobileNavLink
                  key={item.id}
                  item={item}
                  pendingCount={pendingCount}
                  onNavigate={() => setMoreOpen(false)}
                  variant="sheet"
                />
              ))}
            </div>

            <div className="mt-4 border-t border-hairline px-2 pt-4">
              {me.data?.kind === 'user' && (
                <p className="mb-3 truncate text-sm font-semibold text-ink">
                  {me.data.display_name ?? me.data.email}
                </p>
              )}
              <button
                type="button"
                onClick={() => logout('user', false)}
                className="btn-pill-ghost min-h-11 w-full justify-center"
              >
                Sign out
              </button>
            </div>
          </section>
        </>
      )}

      <nav
        aria-label="Parent Portal mobile"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-canvas-pure/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-card-soft backdrop-blur md:hidden"
      >
        <div className="mx-auto flex h-[72px] max-w-lg items-stretch gap-1 py-2">
          {PORTAL_MOBILE_PRIMARY_ITEMS.map((item) => (
            <MobileNavLink key={item.id} item={item} pendingCount={pendingCount} variant="tab" />
          ))}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="portal-more-navigation"
            onClick={() => setMoreOpen((open) => !open)}
            className={clsx(
              'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral',
              moreOpen || moreRouteActive
                ? 'bg-wash-coral text-ink'
                : 'text-slate2 hover:bg-canvas hover:text-ink',
            )}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            <span>More</span>
            {pendingCount > 0 && (
              <span
                className="absolute right-[18%] top-1 h-2.5 w-2.5 rounded-full bg-brand-coral ring-2 ring-canvas-pure"
                aria-label={`${pendingCount} pending approvals in More`}
              />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
