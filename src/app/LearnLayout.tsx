import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { LiveAnnouncer, type Announcement } from '@/components/LiveAnnouncer';
import { SkipLink } from '@/components/SkipLink';
import { sendWsEvent } from '@/lib/ws';

import { LearnTopBar } from './LearnTopBar';

const HEARTBEAT_INTERVAL_MS = 10_000;

// Kid-relevant real-time updates, announced to screen readers.
const LEARN_ANNOUNCEMENTS: Announcement[] = [
  { event: 'wallet.update', message: 'Your Stars changed.' },
  { event: 'approval.resolved', message: 'A parent answered your request.' },
];

// Routes that need to render full-bleed (no centered max-width container).
// Workspace is the IDE-style 3-pane surface and must use 100% width.
const FLUID_ROUTES = ['/learn/workspace', '/learn/code'];

export function LearnLayout() {
  const { pathname } = useLocation();
  const fluid = FLUID_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    const tick = () => sendWsEvent('class.heartbeat', { ts: Date.now() });
    tick();
    const id = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col bg-canvas">
      <SkipLink />
      <LiveAnnouncer announcements={LEARN_ANNOUNCEMENTS} />
      <LearnTopBar />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
        {fluid ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
