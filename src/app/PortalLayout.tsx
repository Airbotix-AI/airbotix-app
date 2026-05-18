import { Outlet } from 'react-router-dom';

import { IncidentBanner } from '@/components/IncidentBanner';

import { PortalNavDrawer } from './PortalNavDrawer';

export function PortalLayout() {
  return (
    <div className="flex h-full bg-canvas">
      <PortalNavDrawer />
      <main className="flex-1 overflow-y-auto">
        <IncidentBanner />
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
