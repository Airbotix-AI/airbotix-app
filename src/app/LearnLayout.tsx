import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { sendWsEvent } from '@/lib/ws';

import { LearnTopBar } from './LearnTopBar';

const HEARTBEAT_INTERVAL_MS = 10_000;

// Routes that need to render full-bleed (no centered max-width container).
// Workspace is the IDE-style 3-pane surface and must use 100% width; the
// playground is the Phaser game-studio desktop (fills the area below the nav).
const FLUID_ROUTES = ['/learn/workspace', '/learn/code', '/learn/playground'];

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
      <LearnTopBar />
      <main className="flex-1 overflow-y-auto">
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
