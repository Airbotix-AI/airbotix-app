import { matchPath, useLocation } from 'react-router-dom';

import { PORTAL_NAV_ITEMS } from './portalNavigation';

const ROUTE_TITLES = [
  { path: '/portal/checkout/*', title: 'Checkout' },
  { path: '/portal/family/new', title: 'Add a kid' },
  { path: '/portal/family/:kidId/passport', title: 'Creator Passport' },
  { path: '/portal/family/:kidId/settings', title: 'Kid settings' },
  { path: '/portal/family/:kidId', title: 'Kid growth' },
] as const;

function getPortalTitle(pathname: string) {
  const specificTitle = ROUTE_TITLES.find(({ path }) => matchPath({ path, end: true }, pathname));
  if (specificTitle) return specificTitle.title;

  const navItem = [...PORTAL_NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => matchPath({ path: item.to, end: item.end ?? false }, pathname));

  return navItem?.label ?? 'Parent Portal';
}

export function PortalMobileHeader() {
  const { pathname } = useLocation();

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-canvas-pure/95 px-4 backdrop-blur sm:px-6 xl:hidden"
      data-testid="portal-mobile-header"
    >
      <img src="/logo-black-horizontal.png" alt="Airbotix" className="h-7 w-auto shrink-0" />
      <span className="h-8 w-px shrink-0 bg-hairline" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase leading-none tracking-[0.11em] text-slate2">
          Parent Portal
        </p>
        <p className="mt-1 truncate text-[15px] font-bold leading-none text-ink">
          {getPortalTitle(pathname)}
        </p>
      </div>
    </header>
  );
}
