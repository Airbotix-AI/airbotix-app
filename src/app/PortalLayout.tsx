import { Outlet } from 'react-router-dom';

import { IncidentBanner } from '@/components/IncidentBanner';
import { PortalAnalyticsConsentBanner } from '@/components/PortalAnalyticsConsentBanner';

import { PortalMobileHeader } from './PortalMobileHeader';
import { PortalMobileNav } from './PortalMobileNav';
import { PortalNavDrawer } from './PortalNavDrawer';
import { usePortalPendingCount } from './usePortalPendingCount';

export function PortalLayout() {
  const pendingCount = usePortalPendingCount();

  return (
    <div
      className="portal-shell fixed inset-0 flex h-dvh min-h-0 overflow-hidden bg-canvas"
      data-portal-shell="true"
      data-testid="portal-layout"
    >
      <PortalNavDrawer pendingCount={pendingCount} />
      <main
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain pb-[calc(4.5rem+env(safe-area-inset-bottom))] xl:pb-0"
        data-testid="portal-scroll-region"
      >
        <PortalMobileHeader />
        <IncidentBanner />
        {/* Portal-only: analytics is never offered, let alone loaded, on a kid
            surface (analytics.ts §"The hard boundary"). */}
        <PortalAnalyticsConsentBanner />
        <div
          className="portal-content-frame mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 xl:px-8 xl:py-9"
          data-testid="portal-content-frame"
        >
          <Outlet />
        </div>
      </main>
      <PortalMobileNav pendingCount={pendingCount} />
    </div>
  );
}
