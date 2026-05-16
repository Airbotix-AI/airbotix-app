import { Outlet } from 'react-router-dom';

import { PortalNavDrawer } from './PortalNavDrawer';

export function PortalLayout() {
  return (
    <div className="flex h-full">
      <PortalNavDrawer />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  );
}
