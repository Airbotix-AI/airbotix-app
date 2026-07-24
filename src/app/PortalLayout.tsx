import { Outlet } from 'react-router-dom';

import { IncidentBanner } from '@/components/IncidentBanner';

import { PortalMobileNav } from './PortalMobileNav';
import { PortalNavDrawer } from './PortalNavDrawer';
import { usePortalPendingCount } from './usePortalPendingCount';

export function PortalLayout() {
  const pendingCount = usePortalPendingCount();

  return (
    <div
      className="fixed inset-0 flex h-dvh min-h-0 overflow-hidden bg-canvas"
      data-testid="portal-layout"
    >
      <PortalNavDrawer pendingCount={pendingCount} />
      <main
        className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
        data-testid="portal-scroll-region"
      >
        <IncidentBanner />
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
      <PortalMobileNav pendingCount={pendingCount} />
    </div>
  );
}
