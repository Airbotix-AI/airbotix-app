import { Outlet } from 'react-router-dom';

import { IncidentBanner } from '@/components/IncidentBanner';
import { LiveAnnouncer, type Announcement } from '@/components/LiveAnnouncer';
import { SkipLink } from '@/components/SkipLink';

import { PortalNavDrawer } from './PortalNavDrawer';

// Parent-relevant real-time updates, announced to screen readers.
const PORTAL_ANNOUNCEMENTS: Announcement[] = [
  { event: 'approval.new', message: 'New request from your kid is waiting for your approval.' },
  { event: 'approval.resolved', message: 'An approval request was updated.' },
  { event: 'wallet.update', message: 'Your Stars balance changed.' },
];

export function PortalLayout() {
  return (
    <div className="flex h-full bg-canvas">
      <SkipLink />
      <LiveAnnouncer announcements={PORTAL_ANNOUNCEMENTS} />
      <PortalNavDrawer />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
        <IncidentBanner />
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
