import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { sendWsEvent } from '@/lib/ws';

import { LearnTopBar } from './LearnTopBar';

const HEARTBEAT_INTERVAL_MS = 10_000;

export function LearnLayout() {
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
        <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
