import { Outlet } from 'react-router-dom';

import { PortalNavDrawer } from './PortalNavDrawer';

export function PortalLayout() {
  return (
    <div className="flex h-full bg-canvas">
      <PortalNavDrawer />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
